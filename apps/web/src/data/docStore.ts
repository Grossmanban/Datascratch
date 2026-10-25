import { REMOTE_ORIGIN } from "@datascratch/shared";
import * as Y from "yjs";
import { getMasterKey } from "@/auth/session";
import type { DocKind } from "@/lib/shared";
import { accountDb, type DocRow } from "./db";
import { notebookKey, noteKey } from "./keys";
import { enqueueOp, flushOps } from "./ops";

/** Transaction origins. REMOTE comes from SyncClient; anything else is a local edit. */
export const ORIGIN_REMOTE = REMOTE_ORIGIN;
export const ORIGIN_LOAD = Symbol("load");

const COMPACT_LOCAL_AFTER = 200;

type Listener = (docId: string, origin: unknown) => void;

/**
 * Owns every loaded Y.Doc of the signed-in account and persists all of its updates
 * (local and remote) in IndexedDB, so the app opens offline. Encryption, the outbox and sync
 * cursors belong to SyncClient (`runtime.ts`). Docs handed to sync are pinned in memory;
 * other note docs (e.g. loaded only for indexing) are reference-counted.
 */
export class DocStore {
  private docs = new Map<string, Y.Doc>();
  private loading = new Map<string, Promise<Y.Doc>>();
  private refs = new Map<string, number>();
  private pinned = new Set<string>();
  private chains = new Map<string, Promise<unknown>>();
  private listeners = new Set<Listener>();
  private createdListeners = new Set<(docId: string) => Promise<void>>();
  private rows = new Map<string, DocRow>();

  onChange(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** A doc was created on this device (it still needs registering and syncing). */
  onCreated(fn: (docId: string) => Promise<void>) {
    this.createdListeners.add(fn);
    return () => this.createdListeners.delete(fn);
  }

  private emit(docId: string, origin: unknown) {
    for (const fn of this.listeners) fn(docId, origin);
  }

  private serial<T>(docId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(docId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.chains.set(
      docId,
      next.catch(() => undefined),
    );
    return next;
  }

  async row(docId: string): Promise<DocRow | undefined> {
    const cached = this.rows.get(docId);
    if (cached) return cached;
    const r = await accountDb().docs.get(docId);
    if (r) this.rows.set(docId, r);
    return r;
  }

  async allRows(): Promise<DocRow[]> {
    const rows = await accountDb().docs.toArray();
    for (const r of rows) this.rows.set(r.docId, r);
    return rows;
  }

  async patchRow(docId: string, patch: Partial<DocRow>) {
    await accountDb().docs.update(docId, patch);
    const r = this.rows.get(docId);
    if (r) this.rows.set(docId, { ...r, ...patch });
  }

  /** Known to this device (from a notebook index or created here). Idempotent. */
  async ensureRow(docId: string, kind: DocKind, notebookId: string | null, registered: 0 | 1): Promise<DocRow> {
    const existing = await this.row(docId);
    if (existing) return existing;
    const row: DocRow = { docId, kind, notebookId, registered };
    await accountDb().docs.put(row);
    this.rows.set(docId, row);
    return row;
  }

  get(docId: string): Y.Doc | undefined {
    return this.docs.get(docId);
  }

  isLoaded(docId: string) {
    return this.docs.has(docId);
  }

  /** Keep a doc in memory for good (it is attached to SyncClient). */
  async pin(docId: string): Promise<Y.Doc> {
    this.pinned.add(docId);
    return this.load(docId);
  }

  /** Load (or return) a doc; increments its reference count. */
  async acquire(docId: string): Promise<Y.Doc> {
    this.refs.set(docId, (this.refs.get(docId) ?? 0) + 1);
    return this.load(docId);
  }

  release(docId: string) {
    const n = (this.refs.get(docId) ?? 1) - 1;
    if (n > 0) {
      this.refs.set(docId, n);
      return;
    }
    this.refs.delete(docId);
    if (this.pinned.has(docId) || this.rows.get(docId)?.kind !== "note") return;
    // Let pending writes settle before dropping the in-memory doc.
    void (this.chains.get(docId) ?? Promise.resolve()).then(() => {
      if (this.refs.has(docId) || this.pinned.has(docId)) return;
      const doc = this.docs.get(docId);
      this.docs.delete(docId);
      doc?.destroy();
    });
  }

  load(docId: string): Promise<Y.Doc> {
    const doc = this.docs.get(docId);
    if (doc) return Promise.resolve(doc);
    let p = this.loading.get(docId);
    if (!p) {
      p = this.loadFromDisk(docId).finally(() => this.loading.delete(docId));
      this.loading.set(docId, p);
    }
    return p;
  }

  private async loadFromDisk(docId: string): Promise<Y.Doc> {
    const doc = new Y.Doc({ guid: docId, gc: false });
    const rows = await accountDb().updates.where("docId").equals(docId).toArray();
    if (rows.length) {
      Y.transact(
        doc,
        () => {
          for (const r of rows) Y.applyUpdate(doc, r.update, ORIGIN_LOAD);
        },
        ORIGIN_LOAD,
      );
    }
    if (rows.length > COMPACT_LOCAL_AFTER) void this.compactLocal(docId, doc, rows.map((r) => r.id!));
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === ORIGIN_LOAD) return;
      void this.serial(docId, () => accountDb().updates.add({ docId, update }));
      this.emit(docId, origin);
    });
    this.docs.set(docId, doc);
    return doc;
  }

  private async compactLocal(docId: string, doc: Y.Doc, ids: number[]) {
    await this.serial(docId, async () => {
      const db = accountDb();
      const merged = Y.encodeStateAsUpdate(doc);
      await db.transaction("rw", db.updates, async () => {
        await db.updates.bulkDelete(ids);
        await db.updates.add({ docId, update: merged });
      });
    });
  }

  /** Encryption key of a doc (crypto.md §1): master / notebook / note key. */
  async keyFor(docId: string): Promise<Uint8Array | null> {
    const row = await this.row(docId);
    if (!row) return null;
    if (row.kind === "account") return getMasterKey();
    if (row.kind === "notebook") return notebookKey(docId);
    if (!row.notebookId) return null;
    let notebookId = row.notebookId;
    let meta = (await this.load(notebookId)).getMap<Y.Map<unknown>>("notes").get(docId);
    if (!meta) {
      // Moved to another notebook (api.md «Перенос заметки»): find the index that lists it now.
      for (const [id, doc] of this.docs) {
        const m = this.rows.get(id)?.kind === "notebook" ? doc.getMap<Y.Map<unknown>>("notes").get(docId) : undefined;
        if (!m) continue;
        notebookId = id;
        meta = m;
        await this.patchRow(docId, { notebookId });
        break;
      }
    }
    return noteKey(docId, notebookId, meta?.get("wrappedKey") as string | undefined);
  }

  /** Create a brand-new doc on this device: registers it (queued) and applies `init` as a local edit. */
  async create(docId: string, kind: DocKind, notebookId: string | null, init: (doc: Y.Doc) => void): Promise<Y.Doc> {
    const existing = await this.row(docId);
    if (!existing) {
      await this.ensureRow(docId, kind, notebookId, kind === "account" ? 1 : 0);
      if (kind !== "account") {
        await enqueueOp({ method: "POST", path: "/docs", body: { docId, kind, notebookId }, registersDoc: docId });
        // Online: register before SyncClient subscribes. Offline: re-attached after registering.
        await Promise.race([flushOps().catch(() => false), new Promise((r) => setTimeout(r, 3000))]);
      }
    }
    const doc = await this.pin(docId);
    // Attach to sync before the first edit so it is captured into the outbox.
    for (const fn of this.createdListeners) await fn(docId);
    doc.transact(() => init(doc));
    return doc;
  }

  destroyAll() {
    for (const d of this.docs.values()) d.destroy();
    this.docs.clear();
    this.loading.clear();
    this.refs.clear();
    this.pinned.clear();
    this.rows.clear();
    this.chains.clear();
    this.listeners.clear();
    this.createdListeners.clear();
  }
}
