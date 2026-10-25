import { SyncClient } from "@datascratch/shared";
import type * as Y from "yjs";
import { deviceId } from "@/auth/deviceKey";
import { getSession, refreshSession } from "@/auth/session";
import { APP_VERSION, syncUrl } from "@/config";
import { notebookMaps, syncNotebookMetaCopy } from "@/domain/notebook";
import { sodiumReady } from "@/lib/shared";
import { refreshAccount, refreshNotebook, resetWorkspace, useWorkspace } from "@/domain/workspace";
import { uiStatus, useSyncStatus } from "@/sync/engine";
import { uploadPending } from "./attachments";
import { accountDb } from "./db";
import { DocStore, ORIGIN_REMOTE } from "./docStore";
import { Indexer } from "./indexer";
import { clearKeys, prefetchNotebookKeys } from "./keys";
import { flushOps, onDocRegistered, onOpsChanged } from "./ops";
import { receivePresence } from "./presence";
import { DexieSyncStorage } from "./syncStorage";

/**
 * Everything that runs while an account is signed in: the local doc store, SyncClient
 * (@datascratch/shared/sync) with IndexedDB storage, the REST op queue, the indexer and the
 * observers that mirror Y.Docs into the workspace store.
 */
export class AccountRuntime {
  readonly store = new DocStore();
  readonly indexer: Indexer;
  readonly storage = new DexieSyncStorage(accountDb());
  client!: SyncClient;
  account!: Y.Doc;
  private cleanups: (() => void)[] = [];
  private observedNotebooks = new Map<string, () => void>();
  private knownNotes = new Map<string, Set<string>>();
  private notebookPass: Promise<void> = Promise.resolve();
  private attached = new Set<string>();
  private touchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(readonly accountDocId: string) {
    this.indexer = new Indexer(
      this.store,
      (noteId) => {
        const n = useWorkspace.getState().notes[noteId];
        return n ? { notebookId: n.notebookId, kind: n.kind, trashed: !!n.trashedAt } : null;
      },
      (noteId, title, tags) => this.syncNoteMetaFromContent(noteId, title, tags),
    );
  }

  async start() {
    // SyncClient encrypts synchronously with libsodium: it must be ready first.
    await sodiumReady();
    this.client = new SyncClient({
      url: syncUrl(),
      deviceId: getSession()?.deviceId ?? (await deviceId()),
      client: { platform: "web", version: APP_VERSION },
      storage: this.storage,
      auth: async () => {
        let s = getSession();
        if (s && Date.parse(s.accessExpiresAt) - Date.now() < 60_000) s = await refreshSession();
        if (!s) throw new Error("signed out");
        return { kind: "user", accessToken: s.accessToken };
      },
      keyFor: async (docId) => {
        const key = await this.store.keyFor(docId);
        if (!key) throw new Error(`no key for ${docId}`);
        return key;
      },
    });
    this.cleanups.push(
      this.client.on("status", () => this.updateStatus()),
      this.client.on("synced", (docId) => {
        if (docId === this.accountDocId) useWorkspace.setState({ accountSynced: true });
        this.updateStatus();
      }),
      this.client.on("awareness", (docId, payload) => receivePresence(docId, payload)),
      this.client.on("error", (e) => {
        if (e.code === "unauthorized") void refreshSession().then((s) => s && this.client.reconnect());
        useSyncStatus.setState({ error: `${e.code}: ${e.message}` });
      }),
    );

    await this.store.ensureRow(this.accountDocId, "account", null, 1);
    this.account = await this.store.pin(this.accountDocId);
    await this.attach([this.accountDocId]);
    const onAccount = () => {
      refreshAccount(this.account);
      void this.syncNotebookDocs().then(() => this.copyNotebookNames());
    };
    this.account.on("afterTransaction", onAccount);
    this.cleanups.push(() => this.account.off("afterTransaction", onAccount));
    refreshAccount(this.account);
    await this.syncNotebookDocs();
    this.copyNotebookNames();

    this.cleanups.push(
      this.store.onCreated((docId) => this.attach([docId])),
      // A doc created offline got registered: re-attach so SyncClient subscribes and resends.
      onDocRegistered((docId) => void this.reattach(docId)),
      this.store.onChange((docId, origin) => {
        if (!useWorkspace.getState().notes[docId]) return;
        this.indexer.schedule(docId);
        if (origin !== ORIGIN_REMOTE) this.touch(docId);
      }),
      onOpsChanged(() => this.scheduleFlush()),
    );
    const onOnline = () => {
      this.client.reconnect();
      this.scheduleFlush();
    };
    // Browsers keep an open WebSocket alive across "offline"; reconnecting surfaces the real state.
    const onOffline = () => this.client.reconnect();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    this.cleanups.push(() => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    });

    await this.indexer.loadFromDisk();
    void this.indexer.reconcile(Object.keys(useWorkspace.getState().notes));
    void prefetchNotebookKeys();
    this.client.start();
    this.scheduleFlush();
    this.pendingTimer = setInterval(() => void this.updatePending(), 2000);
  }

  async stop() {
    for (const c of this.cleanups) c();
    for (const c of this.observedNotebooks.values()) c();
    for (const t of this.touchTimers.values()) clearTimeout(t);
    if (this.pendingTimer) clearInterval(this.pendingTimer);
    this.cleanups = [];
    this.observedNotebooks.clear();
    await this.client?.stop().catch(() => undefined);
    useSyncStatus.setState({ status: "offline", pending: 0 });
    this.store.destroyAll();
    clearKeys();
    resetWorkspace();
  }

  /** Version snapshot (history) when leaving a document after many own edits (sync-protocol.md §5). */
  requestSnapshot(docId: string) {
    if (this.attached.has(docId)) void this.client.requestSnapshot(docId).catch(() => false);
  }

  sendAwareness(docId: string, update: Uint8Array) {
    void this.client.sendAwareness(docId, update);
  }

  private async attach(docIds: string[]) {
    const fresh = docIds.filter((id) => !this.attached.has(id));
    if (!fresh.length) return;
    for (const id of fresh) this.attached.add(id);
    const docs = await Promise.all(fresh.map(async (docId) => ({ docId, doc: await this.store.pin(docId) })));
    await this.client.addDocs(docs);
    this.updateStatus();
  }

  private async reattach(docId: string) {
    await this.store.patchRow(docId, { registered: 1 });
    if (!this.attached.has(docId)) return;
    await this.client.resubscribe(docId);
  }

  private updateStatus() {
    const allSynced = [...this.attached].every((id) => this.client.isSynced(id));
    const status = uiStatus(this.client.status, allSynced);
    useSyncStatus.setState({ status, ...(status === "online" ? { lastSyncedAt: Date.now(), error: null } : {}) });
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      const ok = await flushOps().catch(() => false);
      // Attachments upload in the background and never hold back document sync.
      if (ok) void uploadPending();
      void this.updatePending();
    }, 40);
  }

  private async updatePending() {
    const db = accountDb();
    const [o, p] = await Promise.all([this.storage.count(), db.ops.count()]);
    useSyncStatus.setState({ pending: o + p });
    this.updateStatus();
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

  /** Keep name/icon/space copies in each notebook doc's meta up to date (for agents). */
  private copyNotebookNames() {
    const { account } = useWorkspace.getState();
    for (const ref of account.notebooks) {
      const doc = this.store.get(ref.id);
      if (!doc) continue;
      const space = account.spaces.find((s) => s.id === ref.spaceId) ?? null;
      syncNotebookMetaCopy(doc, ref, space);
    }
  }

  /** Serialised: an older pass must not detach a notebook a newer pass has just added. */
  private syncNotebookDocs(): Promise<void> {
    this.notebookPass = this.notebookPass
      .then(() => this.syncNotebookDocsNow())
      .catch((e) => console.warn("notebook sync failed", e));
    return this.notebookPass;
  }

  private async syncNotebookDocsNow() {
    const refs = useWorkspace.getState().account.notebooks;
    for (const ref of refs) {
      if (this.observedNotebooks.has(ref.id)) continue;
      this.observedNotebooks.set(ref.id, () => undefined);
      await this.store.ensureRow(ref.id, "notebook", null, 1);
      const doc = await this.store.pin(ref.id);
      const handler = () => {
        refreshNotebook(ref.id, doc);
        void this.syncNoteRows(ref.id, doc);
      };
      doc.on("afterTransaction", handler);
      this.observedNotebooks.set(ref.id, () => doc.off("afterTransaction", handler));
      handler();
      await this.attach([ref.id]);
    }
    const ids = new Set(useWorkspace.getState().account.notebooks.map((r) => r.id));
    for (const [id, off] of [...this.observedNotebooks]) {
      if (ids.has(id)) continue;
      off();
      this.observedNotebooks.delete(id);
      refreshNotebook(id, null);
      const notes = this.knownNotes.get(id) ?? new Set();
      for (const n of notes) void this.indexer.remove(n);
      await this.detach([id, ...notes]);
      this.knownNotes.delete(id);
    }
  }

  private async detach(docIds: string[]) {
    for (const id of docIds) {
      if (!this.attached.delete(id)) continue;
      await this.client.removeDoc(id);
    }
  }

  private async syncNoteRows(notebookId: string, doc: Y.Doc) {
    const known = this.knownNotes.get(notebookId) ?? new Set<string>();
    this.knownNotes.set(notebookId, known);
    const current = new Set<string>();
    const fresh: string[] = [];
    for (const noteId of notebookMaps(doc).notes.keys()) {
      current.add(noteId);
      if (known.has(noteId)) continue;
      known.add(noteId);
      const row = await this.store.ensureRow(noteId, "note", notebookId, 1);
      // Moved here from another notebook: its key is now wrapped by this one.
      if (row.notebookId !== notebookId) await this.store.patchRow(noteId, { notebookId });
      fresh.push(noteId);
      this.indexer.schedule(noteId, 300);
    }
    for (const noteId of [...known]) {
      if (current.has(noteId)) continue;
      known.delete(noteId);
      // Moved to another notebook (its index already lists it): keep it attached.
      const movedTo = [...this.knownNotes].find(([, set]) => set.has(noteId))?.[0];
      if (movedTo) {
        await this.store.patchRow(noteId, { notebookId: movedTo });
        continue;
      }
      void this.indexer.remove(noteId);
      await this.detach([noteId]);
    }
    if (fresh.length) await this.attach(fresh);
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

export async function startRuntime(accountDocId: string) {
  if (current?.accountDocId === accountDocId) return current;
  void current?.stop();
  current = new AccountRuntime(accountDocId);
  if (import.meta.env.DEV) (window as unknown as { __ds?: unknown }).__ds = current;
  await current.start();
  return current;
}

export function stopRuntime() {
  void current?.stop();
  current = null;
}
