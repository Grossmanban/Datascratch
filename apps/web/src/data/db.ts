import Dexie, { type Table } from "dexie";
import type { DocKind, TaskState } from "@/lib/shared";

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

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await deviceDb.kv.get(key))?.value as T | undefined;
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await deviceDb.kv.put({ key, value });
}
export async function kvDelete(key: string): Promise<void> {
  await deviceDb.kv.delete(key);
}

// ---------- per-account database (wiped on logout) ----------

export type DocRow = {
  docId: string;
  kind: DocKind;
  notebookId: string | null;
  /** Highest contiguous server seq applied locally. */
  lastSeq: number;
  /** Registered on the server via POST /v1/docs. */
  registered: 0 | 1;
  /** Remote/local updates applied since the last snapshot we uploaded. */
  sinceSnapshot: number;
};

export type UpdateRow = { id?: number; docId: string; update: Uint8Array };

export type OutboxRow = {
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

export class AccountDB extends Dexie {
  docs!: Table<DocRow, string>;
  updates!: Table<UpdateRow, number>;
  outbox!: Table<OutboxRow, number>;
  ops!: Table<OpRow, number>;
  tasks!: Table<TaskRow, string>;
  noteIndex!: Table<NoteIndexRow, string>;
  kv!: Table<KvRow, string>;

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

export async function deleteAccountDb(userId: string): Promise<void> {
  if (current?.name === `ds-account-${userId}`) {
    current.close();
    current = null;
  }
  await Dexie.delete(`ds-account-${userId}`);
}
