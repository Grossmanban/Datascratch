import { REMOTE_ORIGIN } from "@datascratch/shared";
import * as Y from "yjs";
import { getMasterKey } from "@/auth/session";
import { fromBase64Url, toBase64Url, type DocKind } from "@/lib/shared";
import { accountDb, hasAccountDb, type DocRow } from "./db";
import { cachedNoteKey, notebookKey, noteKey } from "./keys";
import { enqueueOp, flushOps } from "./ops";

/** Transaction origins. REMOTE comes from SyncClient; anything else is a local edit. */
export const ORIGIN_REMOTE = REMOTE_ORIGIN;
export const ORIGIN_LOAD = Symbol("load");
/** Edits saved to localStorage as the page closed, applied on the next load (flushUnsaved). */
const ORIGIN_TAIL = Symbol("unsaved-tail");

export const TAIL_PREFIX = "ds.unsaved.";
const tailKey = (dbName: string, docId: string) => `${TAIL_PREFIX}${dbName}.${docId}`;

const COMPACT_LOCAL_AFTER = 200;
/** How long a held doc waits for its row before loading unsynced (see open()). */
const ROW_WAIT_MS = 15_000;

type Listener = (docId: string, origin: unknown) => void;

/**
 * How note docs go live (SyncClient "stored" mode): a note is a Y.Doc only while something
 * holds it (an open editor, an action editing it); otherwise it lives as saved state in
 * IndexedDB and remote updates are merged there without a Y.Doc.
 */
export interface NoteSync {
  open(docId: string, load: () => Promise<Y.Doc>): Promise<Y.Doc>;
  close(docId: string, save: (doc: Y.Doc) => Promise<void>): Promise<void>;
}

/**
 * Owns every loaded Y.Doc of the signed-in account and persists all of its updates
 * (local and remote) in IndexedDB, so the app opens offline. Encryption, the outbox and sync
 * cursors belong to SyncClient (`runtime.ts`). The account and notebook indexes are pinned in
 * memory; a note is loaded only while it is held (reference-counted) and goes back to stored
 * state when released (see NoteSync).
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
  private closing = new Map<string, Promise<void>>();
  private rowWaiters = new Map<string, Set<() => void>>();
  private noteSync: NoteSync | null = null;

  /** Set by the runtime once SyncClient runs; until then notes load straight from disk. */
  setNoteSync(sync: NoteSync | null) {
    this.noteSync = sync;
  }

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
    for (const fn of this.rowWaiters.get(docId) ?? []) fn();
    this.rowWaiters.delete(docId);
    return row;
  }

  /**
   * Remove documents from this device entirely (D-54: a shared resource this account no longer has):
   * the loaded doc, its row, its saved updates and any saved tail. SyncClient detaches them first.
   */
  async forget(docIds: string[]) {
    const db = accountDb();
    for (const docId of docIds) {
      this.docs.get(docId)?.destroy();
      this.docs.delete(docId);
      this.pinned.delete(docId);
      this.refs.delete(docId);
      this.rows.delete(docId);
      this.unsaved.delete(docId);
      this.sessionEdits.delete(docId);
      try {
        localStorage.removeItem(tailKey(db.name, docId));
      } catch {
        // storage blocked: nothing was saved there
      }
    }
    await db.transaction("rw", db.docs, db.updates, async () => {
      await db.docs.bulkDelete(docIds);
      await db.updates.where("docId").anyOf(docIds).delete();
    });
  }

  /** Kind of a known doc (from the cached rows), without waiting for storage. */
  rowKind(docId: string): DocKind | undefined {
    return this.rows.get(docId)?.kind;
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
    const doc = this.docs.get(docId);
    if (!doc) return;
    // From here a new load waits for this close and builds a fresh Y.Doc from the saved state.
    this.docs.delete(docId);
    const sync = this.noteSync;
    const settled = () => this.chains.get(docId) ?? Promise.resolve();
    const done = (async () => {
      try {
        // SyncClient queues the last edits, then `save` waits until every update is on disk.
        if (sync) await sync.close(docId, async () => void (await settled()));
        else await settled();
      } catch {
        // Not synced (e.g. signed out meanwhile): the updates are on disk all the same.
      } finally {
        doc.destroy();
        this.closing.delete(docId);
      }
    })();
    this.closing.set(docId, done);
  }

  load(docId: string): Promise<Y.Doc> {
    const doc = this.docs.get(docId);
    if (doc) return Promise.resolve(doc);
    let p = this.loading.get(docId);
    if (!p) {
      p = this.open(docId).finally(() => this.loading.delete(docId));
      this.loading.set(docId, p);
    }
    return p;
  }

  private async open(docId: string): Promise<Y.Doc> {
    await this.closing.get(docId);
    let row = await this.row(docId);
    // A note opened by a link on a fresh device can be listed by its notebook a moment before its
    // row is stored; without the row it would load as a plain doc that never syncs.
    if (!row && !this.pinned.has(docId)) row = await this.waitForRow(docId, ROW_WAIT_MS);
    if (row?.kind === "note" && this.noteSync) {
      const doc = await this.noteSync.open(docId, () => this.loadFromDisk(docId));
      // Live in SyncClient by now: the tail is written and sent like any edit.
      this.applyTail(docId);
      return doc;
    }
    return this.loadFromDisk(docId);
  }

  /**
   * Apply the tail saved as the page closed (flushUnsaved) to a loaded doc, once it is attached to
   * SyncClient (for indexes: after addDocs), so it is written to IndexedDB and sent like any edit.
   */
  applyTail(docId: string) {
    const doc = this.docs.get(docId);
    if (!doc || !hasAccountDb()) return;
    const key = tailKey(accountDb().name, docId);
    let tail: string | null = null;
    try {
      tail = localStorage.getItem(key);
      localStorage.removeItem(key);
    } catch {
      return;
    }
    if (!tail) return;
    let update: Uint8Array;
    try {
      update = fromBase64Url(tail);
      Y.applyUpdate(doc, update, ORIGIN_TAIL);
    } catch {
      return; // a damaged tail is dropped
    }
    // Applying emits only what this doc lacked; what had reached IndexedDB but never the sync
    // outbox would stay unsent. So the whole tail goes to the update listeners again, and SyncClient
    // queues it (updates are idempotent). The listeners here — docStore's and SyncClient's — read
    // only the update and its origin.
    doc.emit("update", [update, ORIGIN_TAIL, doc, null as unknown as Y.Transaction]);
  }

  /** Docs of this account with a tail saved as a page closed (applied when they are loaded). */
  tailDocIds(): string[] {
    if (!hasAccountDb()) return [];
    const prefix = `${TAIL_PREFIX}${accountDb().name}.`;
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
    } catch {
      return [];
    }
  }

  private waitForRow(docId: string, ms: number): Promise<DocRow | undefined> {
    return new Promise((resolve) => {
      const waiters = this.rowWaiters.get(docId) ?? new Set<() => void>();
      this.rowWaiters.set(docId, waiters);
      const done = () => {
        clearTimeout(timer);
        waiters.delete(done);
        resolve(this.rows.get(docId));
      };
      const timer = setTimeout(done, ms);
      waiters.add(done);
    });
  }

  /**
   * Remote updates of a note in stored mode (no Y.Doc): kept on disk as one merged update,
   * before SyncClient moves its cursor on.
   */
  async appendStored(docId: string, updates: Uint8Array[]): Promise<void> {
    if (!updates.length) return;
    await this.serial(docId, () => accountDb().updates.add({ docId, update: updates.length === 1 ? updates[0]! : Y.mergeUpdates(updates) }));
  }

  /** The current state of a doc: the live Y.Doc if loaded, else its saved updates merged. */
  async loadState(docId: string): Promise<Uint8Array | null> {
    const live = this.docs.get(docId);
    if (live) return Y.encodeStateAsUpdate(live);
    return this.serial(docId, async () => {
      const db = accountDb();
      const rows = await db.updates.where("docId").equals(docId).toArray();
      if (!rows.length) return null;
      if (rows.length === 1) return rows[0]!.update;
      const merged = Y.mergeUpdates(rows.map((r) => r.update));
      // Keep stored notes compact: one row per note.
      if (rows.length > 8 && !this.docs.has(docId)) {
        await db.transaction("rw", db.updates, async () => {
          await db.updates.bulkDelete(rows.map((r) => r.id!));
          await db.updates.add({ docId, update: merged });
        });
      }
      return merged;
    });
  }

  /** Whether any state of the doc is saved on this device. */
  async hasState(docId: string): Promise<boolean> {
    return this.docs.has(docId) || (await accountDb().updates.where("docId").equals(docId).count()) > 0;
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
      this.persistUpdate(docId, update);
      if (origin !== ORIGIN_REMOTE) this.noteSessionEdit(docId, update);
      this.emit(docId, origin);
    });

    this.docs.set(docId, doc);
    return doc;
  }

  /**
   * Updates waiting to be written, per doc. Each keystroke is an update; written one row at a time
   * they queue up behind IndexedDB, and leaving the page (closing the tab, a reload) dropped the
   * queued tail: the last words typed were lost (seen as a cut title in e2e). Now everything that
   * arrives while a write is in flight goes into the next write as one merged row, so at most the
   * one write in flight is at risk.
   */
  private unsaved = new Map<string, Uint8Array[]>();

  /**
   * Local edits of this page session, per doc (merged as they grow). SyncClient batches edits before
   * putting them in its outbox, so an edit can reach IndexedDB and still never be sent if the page
   * closes in between — and on the next start nothing compares the device with the server. So the
   * tail saved as the page closes holds all of them, and applying it hands it to SyncClient again
   * (applyTail); updates are idempotent, sending some twice is harmless.
   */
  private sessionEdits = new Map<string, Uint8Array[]>();

  private noteSessionEdit(docId: string, update: Uint8Array) {
    const parts = this.sessionEdits.get(docId) ?? [];
    parts.push(update);
    this.sessionEdits.set(docId, parts.length > 64 ? [Y.mergeUpdates(parts)] : parts);
  }

  /** Merged updates being written now (an IndexedDB write the browser aborts if the page goes away). */
  private writing = new Map<string, Uint8Array[]>();

  /**
   * Leaving the page (pagehide, tab hidden): IndexedDB writes that have not committed are aborted
   * on navigation, so what is still waiting or being written is put into localStorage, which
   * writes synchronously. The next load of the doc applies it and removes it (Yjs updates are
   * idempotent, so a tail that did reach IndexedDB is harmless). It is no more exposed than the
   * unencrypted updates in IndexedDB, and deleteAccountDb clears it with them.
   */
  flushUnsaved() {
    if (!hasAccountDb()) return;
    const db = accountDb();
    for (const docId of new Set([...this.unsaved.keys(), ...this.writing.keys(), ...this.sessionEdits.keys()])) {
      const parts = [...(this.writing.get(docId) ?? []), ...(this.unsaved.get(docId) ?? []), ...(this.sessionEdits.get(docId) ?? [])];
      if (!parts.length) continue;
      try {
        localStorage.setItem(tailKey(db.name, docId), toBase64Url(Y.mergeUpdates(parts)));
      } catch {
        // storage full or blocked: nothing more can be done synchronously
      }
    }
  }

  private persistUpdate(docId: string, update: Uint8Array) {
    const waiting = this.unsaved.get(docId);
    if (waiting) {
      waiting.push(update);
      return;
    }
    this.unsaved.set(docId, [update]);
    void this.serial(docId, async () => {
      const batch = this.unsaved.get(docId) ?? [];
      this.unsaved.delete(docId);
      if (!batch.length) return;
      const merged = batch.length === 1 ? batch[0]! : Y.mergeUpdates(batch);
      this.writing.set(docId, [...(this.writing.get(docId) ?? []), merged]);
      try {
        await accountDb().updates.add({ docId, update: merged });
      } finally {
        const left = (this.writing.get(docId) ?? []).filter((u) => u !== merged);
        if (left.length) this.writing.set(docId, left);
        else this.writing.delete(docId);
      }
    });
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
    // A note shared on its own (D-54): its key came with «Общие со мной».
    if (!row.notebookId) return cachedNoteKey(docId) ?? null;
    let notebookId = row.notebookId;
    let meta = (await this.load(notebookId)).getMap<Y.Map<unknown>>("notes").get(docId);
    // Moved to another notebook (api.md «Перенос заметки»): find the index that lists it now. If none
    // has arrived yet, the answer is «no key yet» (null) and SyncClient pauses the note until the
    // runtime calls keyAvailable.
    if (!meta?.get("wrappedKey")) {
      const found = this.findNoteMeta(docId);
      if (found) {
        ({ notebookId, meta } = found);
        if (row.notebookId !== notebookId) await this.patchRow(docId, { notebookId });
      }
    }
    return noteKey(docId, notebookId, {
      wrappedKey: meta?.get("wrappedKey") as string | undefined,
      keyVersion: meta?.get("keyVersion") as number | undefined,
      keyChain: meta?.get("keyChain") as string[] | undefined,
    });
  }

  private findNoteMeta(docId: string): { notebookId: string; meta: Y.Map<unknown> } | null {
    for (const [id, doc] of this.docs) {
      if (this.rows.get(id)?.kind !== "notebook") continue;
      const m = doc.getMap<Y.Map<unknown>>("notes").get(docId);
      if (m?.get("wrappedKey")) return { notebookId: id, meta: m };
    }
    return null;
  }

  /** Create a brand-new doc on this device: registers it (queued) and applies `init` as a local edit. */
  async create(docId: string, kind: DocKind, notebookId: string | null, init: (doc: Y.Doc) => void): Promise<Y.Doc> {
    const existing = await this.row(docId);
    if (!existing) {
      await this.ensureRow(docId, kind, notebookId, kind === "account" ? 1 : 0);
      if (kind !== "account") {
        // A notebook index belongs to its own notebook (api.md: notebook docId = notebookId).
        const owner = kind === "notebook" ? docId : notebookId;
        await enqueueOp({ method: "POST", path: "/docs", body: { docId, kind, notebookId: owner }, registersDoc: docId });
        // Online: register before SyncClient subscribes. Offline: re-attached after registering.
        await Promise.race([flushOps().catch(() => false), new Promise((r) => setTimeout(r, 3000))]);
      }
    }
    if (kind === "note") {
      // Known to sync (stored) first, then opened live for the first edit, then released.
      for (const fn of this.createdListeners) await fn(docId);
      const doc = await this.acquire(docId);
      doc.transact(() => init(doc));
      this.release(docId);
      return doc;
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
    this.closing.clear();
    this.noteSync = null;
    this.listeners.clear();
    this.createdListeners.clear();
  }
}
