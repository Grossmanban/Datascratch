import Dexie, { type Table } from "dexie";
import type { DocKind, TaskState } from "@/lib/shared";
import { withTimeout } from "@/lib/timeout";

// ---------- device-wide database (survives logout) ----------

export type KvRow = { key: string; value: unknown };

class DeviceDB extends Dexie {
  kv!: Table<KvRow, string>;
  constructor() {
    super("ds-device");
    this.version(1).stores({ kv: "key" });
  }
}

export const deviceDb = new DeviceDB();
// Another tab holding an older version open: say so instead of hanging silently.
deviceDb.on("blocked", () => console.warn("[ds] device database upgrade is blocked by another tab"));

/**
 * IndexedDB can hang in some browser contexts (an in-app browser, a blocked upgrade): every
 * device-store operation gives up after KV_TIMEOUT_MS instead of leaving the app loading forever.
 */
const KV_TIMEOUT_MS = 4_000;

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await withTimeout(deviceDb.kv.get(key), KV_TIMEOUT_MS, `storage read ${key}`))?.value as T | undefined;
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await withTimeout(deviceDb.kv.put({ key, value }), KV_TIMEOUT_MS, `storage write ${key}`);
}
export async function kvDelete(key: string): Promise<void> {
  await withTimeout(deviceDb.kv.delete(key), KV_TIMEOUT_MS, `storage delete ${key}`);
}

// ---------- per-account database (wiped on logout) ----------

export type DocRow = {
  docId: string;
  kind: DocKind;
  notebookId: string | null;
  /** Registered on the server via POST /v1/docs. */
  registered: 0 | 1;
};

export type UpdateRow = { id?: number; docId: string; update: Uint8Array };

/** Pre-v3 outbox row (kept only for the upgrade above). */
type OutboxRow = {
  id?: number;
  docId: string;
  clientMsgId: string;
  type: "push" | "snapshot";
  payload: string;
  baseSeq?: number;
  createdAt: number;
};

export type OpRow = {
  id?: number;
  method: "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  body?: unknown;
  /** Docs that become pushable once this op succeeds (POST /docs). */
  registersDoc?: string;
  createdAt: number;
};

export type TaskRow = {
  key: string; // `${noteId}:${taskId}`
  noteId: string;
  taskId: string;
  notebookId: string;
  text: string;
  state: TaskState;
  scheduled: string | null;
  deadline: string | null;
  completedAt: string | null;
  noteKind: "note" | "daily" | "inbox";
  order: number;
};

export type NoteIndexRow = {
  noteId: string;
  notebookId: string;
  title: string;
  text: string;
  tags: string[];
  links: string[];
  updatedAt: number;
};

export type AttachmentRow = {
  id: string;
  noteId: string;
  mime: string;
  /** Plaintext size in bytes. */
  plainSize: number;
  /** Ciphertext size in bytes (sum of envelopes), as registered on the server. */
  size: number;
  chunkCount: number;
  /** Server has the metadata (POST /attachments done). */
  registered: 0 | 1;
  /** Indexes of chunks already uploaded. */
  uploaded: number[];
  /** All chunks are stored locally (encrypted). */
  local: 0 | 1;
  createdAt: number;
};

/** SyncClient cursor per document (@datascratch/shared/sync DocSyncState). */
export type SyncDocRow = { docId: string; lastSeq: number; updatesSinceSnapshot: number; bytesSinceSnapshot: number };

/** SyncClient outbox item, ordered by `seq` (insertion order = sending order). */
export type SyncOutboxRow = {
  seq?: number;
  clientMsgId: string;
  docId: string;
  kind: "push" | "snapshot";
  payload: string;
  baseSeq?: number;
  size: number;
  createdAt: number;
};

/** Encrypted chunk envelope as uploaded (crypto.md §6). */
export type ChunkRow = { key: string; attachmentId: string; index: number; data: Uint8Array };

export class AccountDB extends Dexie {
  docs!: Table<DocRow, string>;
  updates!: Table<UpdateRow, number>;
  ops!: Table<OpRow, number>;
  tasks!: Table<TaskRow, string>;
  noteIndex!: Table<NoteIndexRow, string>;
  kv!: Table<KvRow, string>;
  attachments!: Table<AttachmentRow, string>;
  chunks!: Table<ChunkRow, string>;
  syncDocs!: Table<SyncDocRow, string>;
  syncOutbox!: Table<SyncOutboxRow, number>;

  constructor(userId: string) {
    super(`ds-account-${userId}`);
    this.version(1).stores({
      docs: "docId, kind, notebookId",
      updates: "++id, docId",
      outbox: "++id, docId, clientMsgId",
      ops: "++id",
      tasks: "key, noteId, notebookId, state, scheduled, deadline",
      noteIndex: "noteId, notebookId, *tags, *links",
      kv: "key",
    });
    this.version(2).stores({
      attachments: "id, noteId, registered, local",
      chunks: "key, attachmentId",
    });
    // v3: sync cursors and outbox are owned by SyncClient (@datascratch/shared/sync).
    this.version(3)
      .stores({
        syncDocs: "docId",
        syncOutbox: "++seq, &clientMsgId, docId",
      })
      .upgrade(async (tx) => {
        // Carry unsent pushes of the old engine over: same envelopes, same protocol.
        const old = await tx.table("outbox").toArray();
        await tx.table("syncOutbox").bulkAdd(
          old.map((o: OutboxRow) => ({
            clientMsgId: o.clientMsgId,
            docId: o.docId,
            kind: o.type,
            payload: o.payload,
            ...(o.baseSeq !== undefined ? { baseSeq: o.baseSeq } : {}),
            size: 0,
            createdAt: o.createdAt,
          })),
        );
      });
    this.version(4).stores({ outbox: null });
  }
}

let current: AccountDB | null = null;

export function openAccountDb(userId: string): AccountDB {
  if (current && current.name === `ds-account-${userId}`) return current;
  current?.close();
  current = new AccountDB(userId);
  return current;
}

export function accountDb(): AccountDB {
  if (!current) throw new Error("Account database is not open");
  return current;
}

export function hasAccountDb(): boolean {
  return current !== null;
}

/** Close without deleting (a revoked session keeps unsent changes until the next sign-in). */
export function closeAccountDb() {
  current?.close();
  current = null;
}

export async function deleteAccountDb(userId: string): Promise<void> {
  if (current?.name === `ds-account-${userId}`) {
    current.close();
    current = null;
  }
  await Dexie.delete(`ds-account-${userId}`);
  // Edits saved as a page closed (docStore.flushUnsaved) go with the account's data.
  try {
    const prefix = `ds.unsaved.ds-account-${userId}.`;
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k);
  } catch {
    // storage blocked: nothing was saved there either
  }
}
