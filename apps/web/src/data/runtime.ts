import type * as Y from "yjs";
import { deviceId } from "@/auth/deviceKey";
import { getSession, refreshSession } from "@/auth/session";
import { initAccountDoc } from "@/domain/account";
import { notebookMaps } from "@/domain/notebook";
import { refreshAccount, refreshNotebook, resetWorkspace, useWorkspace } from "@/domain/workspace";
import type { HelloAuth } from "@/lib/shared";
import { SyncEngine, useSyncStatus, type OutgoingMessage, type SyncHost } from "@/sync/engine";
import { accountDb } from "./db";
import { DocStore, ORIGIN_REMOTE } from "./docStore";
import { Indexer } from "./indexer";
import { clearKeys, notebookKey, prefetchNotebookKeys } from "./keys";
import { flushOps, onOpsChanged } from "./ops";
import { receivePresence } from "./presence";

export class AccountRuntime {
  readonly store = new DocStore();
  readonly indexer: Indexer;
  readonly engine: SyncEngine;
  private cleanups: (() => void)[] = [];
  private observedNotebooks = new Map<string, () => void>();
  private knownNotes = new Map<string, Set<string>>();
  private touchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  account!: Y.Doc;

  constructor(readonly accountDocId: string) {
    this.indexer = new Indexer(
      this.store,
      (noteId) => {
        const n = useWorkspace.getState().notes[noteId];
        return n ? { notebookId: n.notebookId, kind: n.kind, trashed: !!n.trashedAt } : null;
      },
      (noteId, title, tags) => this.syncNoteMetaFromContent(noteId, title, tags),
    );
    this.engine = new SyncEngine(this.host(), useSyncStatus);
  }

  async start(opts: { bootstrap?: (rt: AccountRuntime) => Promise<void> } = {}) {
    await this.store.ensureRow(this.accountDocId, "account", null, 1);
    this.account = await this.store.acquire(this.accountDocId);
    if (opts.bootstrap) {
      this.account.transact(() => initAccountDoc(this.account));
      await opts.bootstrap(this);
      useWorkspace.setState({ accountSynced: true });
    }
    const onAccount = () => {
      refreshAccount(this.account);
      void this.syncNotebookDocs();
    };
    this.account.on("afterTransaction", onAccount);
    this.cleanups.push(() => this.account.off("afterTransaction", onAccount));
    refreshAccount(this.account);
    await this.syncNotebookDocs();

    this.cleanups.push(
      this.store.onChange((docId, origin) => {
        const row = useWorkspace.getState().notes[docId];
        if (!row) return;
        this.indexer.schedule(docId);
        if (origin !== ORIGIN_REMOTE) this.touch(docId);
      }),
      this.store.onOutbox(() => this.scheduleFlush()),
      onOpsChanged(() => this.scheduleFlush()),
    );

    await this.indexer.loadFromDisk();
    void this.indexer.reconcile(Object.keys(useWorkspace.getState().notes));
    void prefetchNotebookKeys().then(() => this.engine.reconnectNow());
    this.engine.start();
  }

  stop() {
    this.engine.stop();
    for (const c of this.cleanups) c();
    for (const c of this.observedNotebooks.values()) c();
    for (const t of this.touchTimers.values()) clearTimeout(t);
    this.cleanups = [];
    this.observedNotebooks.clear();
    this.store.destroyAll();
    clearKeys();
    resetWorkspace();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.engine.flush();
      void this.updatePending();
    }, 40);
  }

  private async updatePending() {
    const db = accountDb();
    const [o, p] = await Promise.all([db.outbox.count(), db.ops.count()]);
    useSyncStatus.setState({ pending: o + p });
  }

  /** Bump NoteMeta.updatedAt after local edits (throttled). */
  private touch(noteId: string) {
    if (this.touchTimers.has(noteId)) return;
    this.touchTimers.set(
      noteId,
      setTimeout(() => {
        this.touchTimers.delete(noteId);
        const n = useWorkspace.getState().notes[noteId];
        if (!n) return;
        const nb = this.store.get(n.notebookId);
        const meta = nb && notebookMaps(nb).notes.get(noteId);
        meta?.set("updatedAt", new Date().toISOString());
      }, 1500),
    );
  }

  /** The editor owns the title/tags in content; mirror them into the notebook index for lists. */
  private syncNoteMetaFromContent(noteId: string, title: string, tags: string[]) {
    const n = useWorkspace.getState().notes[noteId];
    if (!n) return;
    const nb = this.store.get(n.notebookId);
    const meta = nb && notebookMaps(nb).notes.get(noteId);
    if (!meta) return;
    nb.transact(() => {
      if (meta.get("title") !== title) meta.set("title", title);
      const cur = (meta.get("tags") as string[] | undefined) ?? [];
      if (cur.join("\u0000") !== tags.join("\u0000")) meta.set("tags", tags);
    });
  }

  private async syncNotebookDocs() {
    const refs = useWorkspace.getState().account.notebooks;
    const ids = new Set(refs.map((r) => r.id));
    for (const ref of refs) {
      if (this.observedNotebooks.has(ref.id)) continue;
      this.observedNotebooks.set(ref.id, () => undefined);
      const row = await this.store.ensureRow(ref.id, "notebook", null, 1);
      const doc = await this.store.acquire(ref.id);
      const handler = () => {
        refreshNotebook(ref.id, doc);
        void this.syncNoteRows(ref.id, doc);
      };
      doc.on("afterTransaction", handler);
      this.observedNotebooks.set(ref.id, () => doc.off("afterTransaction", handler));
      handler();
      if (row.registered) this.engine.subscribe([{ docId: ref.id, since: row.lastSeq }]);
    }
    for (const [id, off] of [...this.observedNotebooks]) {
      if (ids.has(id)) continue;
      off();
      this.observedNotebooks.delete(id);
      refreshNotebook(id, null);
      const notes = this.knownNotes.get(id) ?? new Set();
      for (const n of notes) void this.indexer.remove(n);
      this.engine.unsubscribe([id, ...notes]);
      this.knownNotes.delete(id);
    }
  }

  private async syncNoteRows(notebookId: string, doc: Y.Doc) {
    const known = this.knownNotes.get(notebookId) ?? new Set<string>();
    this.knownNotes.set(notebookId, known);
    const current = new Set<string>();
    const fresh: { docId: string; since: number }[] = [];
    for (const noteId of notebookMaps(doc).notes.keys()) {
      current.add(noteId);
      if (known.has(noteId)) continue;
      known.add(noteId);
      const row = await this.store.ensureRow(noteId, "note", notebookId, 1);
      if (row.registered) fresh.push({ docId: noteId, since: row.lastSeq });
      this.indexer.schedule(noteId, 300);
    }
    for (const noteId of [...known]) {
      if (current.has(noteId)) continue;
      known.delete(noteId);
      void this.indexer.remove(noteId);
      this.engine.unsubscribe([noteId]);
    }
    if (fresh.length) this.engine.subscribe(fresh);
  }

  private host(): SyncHost {
    return {
      deviceId: () => deviceId(),
      auth: async (): Promise<HelloAuth | null> => {
        let s = getSession();
        if (s && Date.parse(s.accessExpiresAt) - Date.now() < 60_000) s = await refreshSession();
        return s ? { kind: "user", accessToken: s.accessToken } : null;
      },
      refreshAuth: async () => !!(await refreshSession()),
      subscriptions: async () => {
        const rows = await this.store.allRows();
        const ws = useWorkspace.getState();
        const out: { docId: string; since: number }[] = [];
        for (const r of rows) {
          if (!r.registered) continue;
          if (r.kind === "account") out.push({ docId: r.docId, since: r.lastSeq });
          else if (r.kind === "notebook") {
            if (ws.account.notebooks.some((n) => n.id === r.docId) && (await notebookKey(r.docId)))
              out.push({ docId: r.docId, since: r.lastSeq });
          } else if (ws.notes[r.docId]) out.push({ docId: r.docId, since: r.lastSeq });
        }
        // Account first, then notebooks, then notes: keys flow downwards.
        const rank = (id: string) => (id === this.accountDocId ? 0 : rows.find((r) => r.docId === id)?.kind === "notebook" ? 1 : 2);
        return out.sort((a, b) => rank(a.docId) - rank(b.docId));
      },
      beforeFlush: () => flushOps(),
      outgoing: async () => {
        const db = accountDb();
        const rows = await db.outbox.orderBy("id").toArray();
        const registered = new Set((await this.store.allRows()).filter((r) => r.registered).map((r) => r.docId));
        return rows
          .filter((r) => registered.has(r.docId))
          .map(
            (r): OutgoingMessage =>
              r.type === "snapshot"
                ? { type: "snapshot", docId: r.docId, clientMsgId: r.clientMsgId, baseSeq: r.baseSeq ?? 0, payload: r.payload }
                : { type: "push", docId: r.docId, clientMsgId: r.clientMsgId, payload: r.payload },
          );
      },
      onUpdates: async (msg) => {
        await this.store.applyRemote(msg.docId, msg.items, msg.snapshot);
        if (msg.upToDate && msg.docId === this.accountDocId) useWorkspace.setState({ accountSynced: true });
      },
      onUpdate: (msg) => this.store.applyRemote(msg.docId, [msg], null),
      onAck: async (msg) => {
        await this.store.acked(msg.docId, msg.clientMsgId, msg.seq);
        void this.store.maybeSnapshot(msg.docId);
        void this.updatePending();
      },
      onAwareness: (msg) => void receivePresence(msg.docId, msg.payload),
      onError: (msg) => {
        if (msg.code === "doc_not_found" && msg.ref) console.warn("Server does not know doc", msg.ref);
      },
    };
  }
}

let current: AccountRuntime | null = null;

export function runtime(): AccountRuntime {
  if (!current) throw new Error("Account runtime is not started");
  return current;
}

export function hasRuntime() {
  return current !== null;
}

export async function startRuntime(accountDocId: string, opts: { bootstrap?: (rt: AccountRuntime) => Promise<void> } = {}) {
  if (current?.accountDocId === accountDocId) return current;
  current?.stop();
  current = new AccountRuntime(accountDocId);
  if (import.meta.env.DEV) (window as unknown as { __ds?: unknown }).__ds = current;
  await current.start(opts);
  return current;
}

export function stopRuntime() {
  current?.stop();
  current = null;
}
