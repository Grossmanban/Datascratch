import * as Y from "yjs";
import { getMasterKey } from "@/auth/session";
import { ad, fromBase64Url, open, seal, toBase64Url, uuidv7, type DocKind } from "@/lib/shared";
import { accountDb, type DocRow } from "./db";
import { notebookKey, noteKey } from "./keys";
import { enqueueOp } from "./ops";

/** Transaction origins. Anything else (editor, app code) counts as a local edit. */
export const ORIGIN_REMOTE = Symbol("remote");
export const ORIGIN_LOAD = Symbol("load");

const COMPACT_LOCAL_AFTER = 200;
export const SNAPSHOT_AFTER = 500;

type Listener = (docId: string, origin: unknown) => void;

/**
 * Owns every loaded Y.Doc of the signed-in account, persists updates in IndexedDB and
 * queues encrypted pushes. Account and notebook docs are pinned; note docs are
 * reference-counted so the task/search indexer can load and drop them.
 */
export class DocStore {
  private docs = new Map<string, Y.Doc>();
  private loading = new Map<string, Promise<Y.Doc>>();
  private refs = new Map<string, number>();
  private chains = new Map<string, Promise<unknown>>();
  private listeners = new Set<Listener>();
  private outboxListeners = new Set<() => void>();
  private rows = new Map<string, DocRow>();

  onChange(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onOutbox(fn: () => void) {
    this.outboxListeners.add(fn);
    return () => this.outboxListeners.delete(fn);
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
    const row: DocRow = { docId, kind, notebookId, lastSeq: 0, registered, sinceSnapshot: 0 };
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
    const row = this.rows.get(docId);
    if (row?.kind !== "note") return;
    // Let pending writes settle before dropping the in-memory doc.
    void (this.chains.get(docId) ?? Promise.resolve()).then(() => {
      if (this.refs.has(docId)) return;
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
      if (origin === ORIGIN_REMOTE) {
        this.emit(docId, origin);
        return;
      }
      void this.serial(docId, () => this.persistLocal(docId, update));
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

  async keyFor(docId: string): Promise<Uint8Array | null> {
    const row = await this.row(docId);
    if (!row) return null;
    if (row.kind === "account") return getMasterKey();
    if (row.kind === "notebook") return notebookKey(docId);
    if (!row.notebookId) return null;
    const nb = await this.load(row.notebookId);
    const meta = nb.getMap<Y.Map<unknown>>("notes").get(docId);
    return noteKey(docId, row.notebookId, meta?.get("wrappedKey") as string | undefined);
  }

  private async persistLocal(docId: string, update: Uint8Array) {
    const key = await this.keyFor(docId);
    const db = accountDb();
    const payload = key ? toBase64Url(await seal(key, update, ad.doc(docId))) : null;
    await db.transaction("rw", db.updates, db.outbox, async () => {
      await db.updates.add({ docId, update });
      if (payload)
        await db.outbox.add({ docId, clientMsgId: uuidv7(), type: "push", payload, createdAt: Date.now() });
    });
    if (!payload) console.error("No key for local update; kept locally only", docId);
    for (const fn of this.outboxListeners) fn();
  }

  /** Decrypt and apply server updates (subscribe catch-up or live). */
  async applyRemote(
    docId: string,
    items: { seq: number; payload: string }[],
    snapshot: { seq: number; payload: string } | null,
  ): Promise<void> {
    await this.serial(docId, async () => {
      const key = await this.keyFor(docId);
      if (!key) {
        console.error("No key for remote update", docId);
        return;
      }
      const row = await this.row(docId);
      if (!row) return;
      const decoded: Uint8Array[] = [];
      let lastSeq = row.lastSeq;
      const all = snapshot && snapshot.seq > lastSeq ? [snapshot, ...items] : items;
      for (const it of all) {
        if (it.seq <= lastSeq && it !== snapshot) continue;
        try {
          decoded.push(await open(key, fromBase64Url(it.payload), ad.doc(docId)));
        } catch (e) {
          console.error("Failed to decrypt update", docId, it.seq, e);
        }
        lastSeq = Math.max(lastSeq, it.seq);
      }
      if (!decoded.length && lastSeq === row.lastSeq) return;
      const db = accountDb();
      await db.transaction("rw", db.updates, db.docs, async () => {
        await db.updates.bulkAdd(decoded.map((update) => ({ docId, update })));
        await db.docs.update(docId, { lastSeq, sinceSnapshot: row.sinceSnapshot + decoded.length });
      });
      this.rows.set(docId, { ...row, lastSeq, sinceSnapshot: row.sinceSnapshot + decoded.length });
      const doc = this.docs.get(docId);
      if (doc) {
        Y.transact(
          doc,
          () => {
            for (const u of decoded) Y.applyUpdate(doc, u, ORIGIN_REMOTE);
          },
          ORIGIN_REMOTE,
        );
      } else {
        this.emit(docId, ORIGIN_REMOTE);
      }
    });
  }

  /** Our own push was stored as `seq` (sync-protocol.md §4: lastSeq = max of updates/update/ack). */
  async acked(docId: string, clientMsgId: string, seq: number) {
    await this.serial(docId, async () => {
      const db = accountDb();
      const row = await this.row(docId);
      await db.outbox.where("clientMsgId").equals(clientMsgId).delete();
      if (row && seq > row.lastSeq) {
        const sinceSnapshot = row.sinceSnapshot + 1;
        await db.docs.update(docId, { lastSeq: seq, sinceSnapshot });
        this.rows.set(docId, { ...row, lastSeq: seq, sinceSnapshot });
      }
    });
    for (const fn of this.outboxListeners) fn();
  }

  /** Queue a compaction snapshot (sync-protocol.md §5) for docs with long histories. */
  async maybeSnapshot(docId: string, threshold = SNAPSHOT_AFTER) {
    const row = await this.row(docId);
    if (!row || row.sinceSnapshot < threshold || !row.registered) return;
    const doc = await this.acquire(docId);
    try {
      await this.serial(docId, async () => {
        const key = await this.keyFor(docId);
        if (!key) return;
        const payload = toBase64Url(await seal(key, Y.encodeStateAsUpdate(doc), ad.doc(docId)));
        const db = accountDb();
        await db.transaction("rw", db.outbox, db.docs, async () => {
          await db.outbox.where("docId").equals(docId).and((r) => r.type === "snapshot").delete();
          await db.outbox.add({
            docId,
            clientMsgId: uuidv7(),
            type: "snapshot",
            baseSeq: row.lastSeq,
            payload,
            createdAt: Date.now(),
          });
          await db.docs.update(docId, { sinceSnapshot: 0 });
        });
        this.rows.set(docId, { ...row, sinceSnapshot: 0 });
      });
    } finally {
      this.release(docId);
    }
    for (const fn of this.outboxListeners) fn();
  }

  /** Create a brand-new doc on this device: registers it (queued) and applies `init` as a local edit. */
  async create(docId: string, kind: DocKind, notebookId: string | null, init: (doc: Y.Doc) => void): Promise<Y.Doc> {
    const existing = await this.row(docId);
    if (!existing) {
      await this.ensureRow(docId, kind, notebookId, kind === "account" ? 1 : 0);
      if (kind !== "account") {
        await enqueueOp({
          method: "POST",
          path: "/docs",
          body: { docId, kind, notebookId },
          registersDoc: docId,
        });
      }
    }
    const doc = await this.acquire(docId);
    doc.transact(() => init(doc));
    this.release(docId);
    return doc;
  }

  destroyAll() {
    for (const d of this.docs.values()) d.destroy();
    this.docs.clear();
    this.loading.clear();
    this.refs.clear();
    this.rows.clear();
    this.chains.clear();
    this.listeners.clear();
    this.outboxListeners.clear();
  }
}
