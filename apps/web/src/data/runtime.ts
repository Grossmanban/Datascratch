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
import { checkNotebookKeys, clearKeys, onNotebookKeyReplaced, retiredKeysFor, type ReplacedNotebookKey } from "./keys";
import { notebooksApi } from "@/api/endpoints";
import { pushNotebookMode } from "@/domain/actions";
import { ad, unwrapKey, wrapKey } from "@/lib/shared";
import { enqueueOp } from "./ops";
import { flushOps, onDocRegistered, onNotebookConflict, onOpsChanged } from "./ops";
import { connectWithTimeout } from "@/sync/socket";
import { receivePresence } from "./presence";
import { DexieSyncStorage } from "./syncStorage";

/**
 * Everything that runs while an account is signed in: the local doc store, SyncClient
 * (@datascratch/shared/sync) with IndexedDB storage, the REST op queue, the indexer and the
 * observers that mirror Y.Docs into the workspace store.
 */
/** Server refusals of a push that leave the change undelivered. */
const REFUSED = new Set(["forbidden", "doc_not_found", "bad_request", "internal"]);

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
  private attaching = new Map<string, Promise<void>>();
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
      createSocket: connectWithTimeout,
      // Items sealed with a key this device used before switching to the server's stay readable.
      alternateKeysFor: (docId) => retiredKeysFor(docId),
      // After skipping unreadable items, ask once for the server's latest snapshot (it may cover them).
      recoverSkippedFromSnapshot: true,
      auth: async () => {
        let s = getSession();
        if (s && Date.parse(s.accessExpiresAt) - Date.now() < 60_000) s = await refreshSession();
        if (!s) throw new Error("signed out");
        return { kind: "user", accessToken: s.accessToken };
      },
      // null = «no key yet» (e.g. a moved note whose new index has not arrived): SyncClient pauses
      // the document without skipping anything until keyAvailable(docId) (see resumeKeyed).
      keyFor: (docId) => this.store.keyFor(docId),
      // Notes sync in stored mode: no Y.Doc unless open (10 000 notes stay on disk, not in memory).
      storedDocs: {
        onUpdates: async (docId, updates) => {
          await this.store.appendStored(docId, updates);
          if (useWorkspace.getState().notes[docId]) this.indexer.schedule(docId);
        },
        loadState: (docId) => this.store.loadState(docId),
      },
    });
    this.store.setNoteSync({
      open: (docId, load) => this.openNote(docId, load),
      close: (docId, save) => this.client.closeDoc(docId, save),
    });
    this.cleanups.push(
      this.client.on("status", () => this.updateStatus()),
      this.client.on("synced", (docId) => {
        if (docId === this.accountDocId) useWorkspace.setState({ accountSynced: true });
        this.updateStatus();
      }),
      this.client.on("awareness", (docId, payload) => receivePresence(docId, payload)),
      this.client.on("skipped", (item) => this.onSkipped(item)),
      this.client.on("error", (e) => {
        if (e.code === "unauthorized") void refreshSession().then((s) => s && this.client.reconnect());
        useSyncStatus.setState({ error: `${e.code}: ${e.message}` });
        // An update that cannot be decrypted or applied is otherwise invisible (it is skipped).
        if ((e.code === "decrypt_failed" || e.code === "apply_failed") && e.docId) {
          const id = e.docId;
          void this.store.row(id).then((r) => console.warn(`[ds] sync ${e.code}`, r?.kind ?? "unknown", id, e.message));
        }
        // Waiting for a key for long: the indicator stops spinning for it (it resumes when the key comes).
        if (e.code === "key_missing" && e.docId) {
          this.longWaiting.add(e.docId);
          this.updateStatus();
        }
        // A document the server does not know never becomes «synced»: it must not keep the spinner.
        if (e.code === "doc_not_found" && e.docId && e.ref === e.docId) {
          this.unknownOnServer.add(e.docId);
          this.updateStatus();
        }
        // A push the server refused (`ref` is its clientMsgId): the change has not reached the server.
        if (e.docId && e.ref && e.ref !== e.docId && REFUSED.has(e.code)) void this.markFailed(e.docId, e.code, e.message);
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
      // A doc created offline got registered: re-attach so SyncClient subscribes and resends;
      // attachments of a new note wait for this too.
      onDocRegistered((docId) => {
        void this.reattach(docId);
        void uploadPending();
      }),
      this.client.on("keyMissing", (docId) => {
        this.waitingForKey.add(docId);
        this.updateStatus();
        this.resumeKeyed(); // the index may have arrived between keyFor and the pause
      }),
      this.store.onChange((docId, origin) => {
        // A notebook index changed: a paused note may have its key now.
        if (this.waitingForKey.size && this.store.rowKind(docId) === "notebook") this.resumeKeyed();
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
    this.cleanups.push(
      onNotebookKeyReplaced((r) => void this.adoptNotebookKey(r)),
      onNotebookConflict(() => void this.reconcileNotebooks()),
      // Back online after a drop: whatever did not reach the server meanwhile is reconciled.
      this.client.on("status", (s) => {
        if (s === "online" && this.wasOffline) void this.reconcileNotebooks();
        this.wasOffline = s !== "online";
      }),
    );
    this.client.start();
    void this.reconcileNotebooks();
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
    useSyncStatus.setState({ status: "offline", pending: 0, failed: {} });
    this.store.destroyAll();
    clearKeys();
    resetWorkspace();
  }

  private reconciling: Promise<void> | null = null;
  private wasOffline = false;

  /**
   * Make the server agree with this device (on every sync start and reconnect, and after a
   * notebook registration conflict): notebook keys are the server's (see checkNotebookKeys);
   * a notebook the account lists but the server lacks is registered; the server's mode follows
   * the account doc's NotebookRef.mode (a mode change may not have reached it).
   */
  reconcileNotebooks(): Promise<void> {
    this.reconciling ??= (async () => {
      try {
        const list = await notebooksApi.list();
        for (const r of await checkNotebookKeys(list)) await this.adoptNotebookKey(r);
        const onServer = new Map(list.map((n) => [n.id, n]));
        const pending = new Set((await accountDb().ops.toArray()).filter((o) => o.path === "/notebooks").map((o) => (o.body as { notebookId?: string })?.notebookId));
        for (const ref of useWorkspace.getState().account.notebooks) {
          const server = onServer.get(ref.id);
          if (!server) {
            // Registration lost (dropped op): register the key this device holds.
            const wrapped = (await accountDb().kv.get(`nbkey:${ref.id}`))?.value as string | undefined;
            if (wrapped && !pending.has(ref.id)) await enqueueOp({ method: "POST", path: "/notebooks", body: { notebookId: ref.id, mode: "private", wrappedKey: wrapped } });
            continue;
          }
          if (server.mode !== ref.mode) {
            await pushNotebookMode(ref.id, ref.mode).catch((e) => console.warn("[ds] notebook mode not synced to the server yet", ref.id, e));
          }
        }
      } catch (e) {
        console.warn("[ds] notebook reconciliation postponed", e);
      } finally {
        this.reconciling = null;
      }
    })();
    return this.reconciling;
  }

  private covered = new Set<string>();
  private unknownOnServer = new Set<string>();
  private waitingForKey = new Set<string>();
  private longWaiting = new Set<string>();
  private resuming = false;

  /** Paused documents whose key is known now resume (SyncClient.keyAvailable). */
  private resumeKeyed() {
    if (this.resuming) return;
    this.resuming = true;
    setTimeout(async () => {
      try {
        for (const docId of [...this.waitingForKey]) {
          if (!(await this.store.keyFor(docId).catch(() => null))) continue;
          this.waitingForKey.delete(docId);
          this.longWaiting.delete(docId);
          await this.client.keyAvailable(docId).catch(() => undefined);
        }
      } finally {
        this.resuming = false;
        this.updateStatus();
      }
    }, 100);
  }

  /**
   * A server item this device could not read with the key it has (sealed with a key nobody
   * holds, e.g. from a wiped device): SyncClient skips it and keeps going. It is counted for a calm
   * note, and once this device's key is confirmed canonical it uploads a snapshot of what it did
   * read, so other clients stop meeting the item.
   */
  private onSkipped(item: { docId: string }) {
    const skipped = useSyncStatus.getState().skipped;
    useSyncStatus.setState({ skipped: { ...skipped, [item.docId]: (skipped[item.docId] ?? 0) + 1 } });
    if (this.covered.has(item.docId)) return;
    this.covered.add(item.docId);
    // Only with the server's key (reconciliation done): a snapshot sealed otherwise would add to the problem.
    setTimeout(async () => {
      await this.reconciling?.catch(() => undefined);
      if (this.attached.has(item.docId)) await this.client.requestSnapshot(item.docId).catch(() => false);
    }, 3000);
  }

  /** The client is caught up with the server for this document (nothing more to receive). */
  isDocSynced(docId: string): boolean {
    return this.client.isSynced(docId);
  }

  /** What keeps sync busy (console: `__dsSyncDebug()`); ids only, no content. */
  async syncDebug() {
    const outbox = await this.storage.listOutbox();
    const byDoc: Record<string, number> = {};
    for (const i of outbox) byDoc[i.docId] = (byDoc[i.docId] ?? 0) + 1;
    const rows = await Promise.all([...this.attached].map(async (id) => [id, (await this.store.row(id))?.kind] as const));
    return {
      status: this.client.status,
      notSynced: rows.filter(([id]) => !this.client.isSynced(id) && !this.unknownOnServer.has(id)).map(([id, kind]) => ({ id, kind, paused: this.client.isPaused(id) })),
      unknownOnServer: [...this.unknownOnServer],
      outbox: byDoc,
      ops: (await accountDb().ops.toArray()).map((o) => `${o.method} ${o.path}`),
      skipped: this.client.getSkipped().map((s) => ({ docId: s.docId, seq: s.seq, reason: s.reason })),
      failed: useSyncStatus.getState().failed,
    };
  }

  /** Read a document again from seq 0 (updates that could not be decrypted were skipped). */
  private async rereadDoc(docId: string) {
    await this.client.removeDoc(docId).catch(() => undefined);
    const st = await this.storage.getDocState(docId);
    if (st) await this.storage.setDocState(docId, { ...st, lastSeq: 0 });
    this.attached.delete(docId);
    await this.attach([docId]);
    // An open note is live in the client again only through openDoc.
    const live = this.store.get(docId);
    if (live && (await this.store.row(docId))?.kind === "note") await this.client.openDoc(docId, () => live).catch(() => undefined);
  }

  /**
   * This device sealed a notebook's index with a key the server (and other devices) don't use.
   * Note keys wrapped with the old key are rewrapped with the server's, the index is re-read from
   * the start (others' updates were unreadable here) and re-uploaded whole with the right key.
   */
  private async adoptNotebookKey({ notebookId, oldKey, newKey }: ReplacedNotebookKey) {
    const doc = this.store.get(notebookId);
    if (!doc) return;
    if (this.attached.has(notebookId)) {
      await this.rereadDoc(notebookId);
      // Items skipped with the old key are fetched again (the old key is an alternate key now).
      await this.client.retrySkipped(notebookId).catch(() => false);
    }
    const notes = notebookMaps(doc).notes;
    const rewrapped: [Y.Map<unknown>, string][] = [];
    for (const [noteId, m] of notes) {
      const wrapped = m.get("wrappedKey") as string | undefined;
      if (!wrapped) continue;
      const ok = await unwrapKey(newKey, wrapped, ad.noteKey(noteId)).then(() => true, () => false);
      if (ok) continue;
      const key = await unwrapKey(oldKey, wrapped, ad.noteKey(noteId)).catch(() => null);
      if (key) rewrapped.push([m, await wrapKey(newKey, key, ad.noteKey(noteId))]);
    }
    if (rewrapped.length) doc.transact(() => rewrapped.forEach(([m, w]) => m.set("wrappedKey", w)));
    await this.client.requestSnapshot(notebookId).catch(() => false);
    console.warn(`[ds] notebook ${notebookId}: switched to the server's key, ${rewrapped.length} note key(s) rewrapped`);
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
    const done = (async () => {
      const rows = await Promise.all(fresh.map((docId) => this.store.row(docId)));
      const notes = fresh.filter((_, i) => rows[i]?.kind === "note");
      const live = fresh.filter((_, i) => rows[i]?.kind !== "note");
      // Account and notebook indexes are live Y.Docs; notes are stored (opened on demand).
      if (notes.length) await this.client.addStoredDocs(notes);
      if (live.length) await this.client.addDocs(await Promise.all(live.map(async (docId) => ({ docId, doc: await this.store.pin(docId) }))));
    })();
    for (const id of fresh) this.attaching.set(id, done);
    try {
      await done;
    } finally {
      for (const id of fresh) if (this.attaching.get(id) === done) this.attaching.delete(id);
    }
    this.updateStatus();
  }

  /** A note becomes a live Y.Doc while held (DocStore.acquire): SyncClient.openDoc. */
  private async openNote(docId: string, load: () => Promise<Y.Doc>): Promise<Y.Doc> {
    await this.attach([docId]);
    await this.attaching.get(docId);
    return this.client.openDoc(docId, load);
  }

  private async reattach(docId: string) {
    await this.store.patchRow(docId, { registered: 1 });
    // Registration may finish while the doc is still being added to the client.
    await this.attaching.get(docId)?.catch(() => undefined);
    if (!this.attached.has(docId)) return;
    // Detached meanwhile (the client throws for unknown docs): nothing to resubscribe.
    await this.client.resubscribe(docId).catch(() => undefined);
  }

  private updateStatus() {
    const allSynced = [...this.attached].every((id) => this.unknownOnServer.has(id) || this.longWaiting.has(id) || this.client.isSynced(id));
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
    await this.clearDelivered();
  }

  private async markFailed(docId: string, code: string, reason: string) {
    // Not registered yet: SyncClient resends once POST /docs went through (reattach).
    if ((await this.store.row(docId))?.registered === 0) return;
    const failed = useSyncStatus.getState().failed;
    if (failed[docId]?.reason === reason) return;
    useSyncStatus.setState({ failed: { ...failed, [docId]: { code, reason } } });
  }

  /** A refused document counts as sent again once nothing of it waits in the outbox. */
  private async clearDelivered() {
    const failed = useSyncStatus.getState().failed;
    const ids = Object.keys(failed).filter((id) => failed[id]!.code !== "forbidden");
    if (!ids.length) return;
    const waiting = new Set((await this.storage.listOutbox()).map((i) => i.docId));
    const delivered = ids.filter((id) => !waiting.has(id));
    if (!delivered.length) return;
    const next = { ...useSyncStatus.getState().failed };
    for (const id of delivered) delete next[id];
    useSyncStatus.setState({ failed: next });
  }

  /** «Повторить»: send everything that is still waiting again. */
  async retryFailed() {
    const ids = Object.keys(useSyncStatus.getState().failed);
    // A refused change that was dropped (forbidden) cannot be resent; retrying clears the notice.
    const keep = Object.fromEntries(Object.entries(useSyncStatus.getState().failed).filter(([, f]) => f.code !== "forbidden"));
    useSyncStatus.setState({ failed: keep });
    await flushOps().catch(() => false);
    for (const id of ids) if (this.attached.has(id)) await this.client.resubscribe(id).catch(() => undefined);
    await this.client.resendOutbox().catch(() => undefined);
    void uploadPending();
    void this.updatePending();
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

  /** Keep name/icon/colour/space copies in each notebook doc's meta up to date (for agents). */
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
  // Support readout in the browser console (ids and counts only).
  (window as unknown as { __dsSyncDebug?: () => Promise<unknown> }).__dsSyncDebug = async () => {
    const d = await current?.syncDebug();
    console.log("[ds] sync debug", d);
    return d;
  };
  // Dev tools and e2e performance tests (a build with VITE_DS_TEST_HOOKS=1) reach the runtime here.
  if (import.meta.env.DEV || import.meta.env.VITE_DS_TEST_HOOKS) {
    const w = window as unknown as { __ds?: unknown; __dsTest?: unknown };
    w.__ds = current;
    w.__dsTest = {
      Y: await import("yjs"),
      db: accountDb,
      refresh: refreshSession,
      // e2e: this device holds its own key for a notebook (as after a POST /notebooks that got 409).
      corruptNotebookKey: async (notebookId: string) => {
        const { getMasterKey } = await import("@/auth/session");
        const { randomKey } = await import("@/lib/shared");
        const wrapped = await wrapKey(getMasterKey(), randomKey(), ad.notebookKey(notebookId));
        await accountDb().kv.put({ key: `nbkey:${notebookId}`, value: wrapped });
      },
    };
  }
  await current.start();
  return current;
}

export function stopRuntime() {
  void current?.stop();
  current = null;
}
