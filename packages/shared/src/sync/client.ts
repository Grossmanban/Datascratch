// Client side of the sync protocol (sync-protocol.md v1) for browsers and Node.
// Responsibilities: authenticate, subscribe documents from their last seq,
// encrypt local Yjs updates into a persistent outbox and resend until `ack`,
// decrypt and apply remote updates, reconnect with backoff, and upload
// compaction snapshots when the thresholds of §5 are exceeded.
import * as Y from "yjs";
import {
  MAX_SNAPSHOT_BYTES,
  MAX_UPDATE_BYTES,
  SNAPSHOT_THRESHOLD_BYTES,
  SNAPSHOT_THRESHOLD_UPDATES,
  SYNC_PROTOCOL_VERSION,
  parseServerMessage,
  type ClientMessage,
  type ClientPlatform,
  type ServerMessage,
  type SyncAuth,
  type SyncErrorCode,
} from "../contracts/sync.js";
import { fromBase64Url, toBase64Url } from "../crypto/base64url.js";
import {
  decryptAwareness,
  decryptDocUpdate,
  encryptAwareness,
  encryptDocUpdate,
} from "../crypto/keys.js";
import { uuidv7 } from "../ids.js";
import {
  EMPTY_DOC_STATE,
  type DocSyncState,
  type OutboxItem,
  type SyncStorage,
} from "./storage.js";

/** Transaction origin of updates applied from the server (ignored by the outbox). */
export const REMOTE_ORIGIN: unique symbol = Symbol("datascratch.sync.remote");

/** The subset of the WebSocket API the client uses (browser WebSocket and `ws` both fit). */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}
export type WebSocketFactory = (url: string) => WebSocketLike;

const WS_OPEN = 1;

export type SyncStatus = "idle" | "connecting" | "online" | "offline" | "unauthorized" | "stopped";

export interface SyncClientError {
  code: SyncErrorCode | "decrypt_failed" | "apply_failed" | "too_large";
  message: string;
  docId?: string;
  ref?: string;
}

export interface SyncClientOptions {
  /** `wss://host/v1/sync`. */
  url: string;
  /** Called on every connection attempt, so it can refresh the access token. */
  auth: () => SyncAuth | Promise<SyncAuth>;
  deviceId: string;
  client: { platform: ClientPlatform; version: string };
  storage: SyncStorage;
  /** Encryption key of a document (masterKey / notebookKey / noteKey). */
  keyFor: (docId: string) => Uint8Array | Promise<Uint8Array>;
  /** Defaults to the global WebSocket (browsers, Node ≥ 22). */
  createSocket?: WebSocketFactory;
  backoff?: { initialMs?: number; maxMs?: number };
  /** Local updates within this window are merged into one push. Default 30 ms. */
  batchMs?: number;
  /** Sync cursors are written to storage in batches at most this often. Default 200 ms. */
  stateFlushMs?: number;
  snapshotThresholds?: { updates?: number; bytes?: number };
  /** Required for addStoredDocs / closeDoc. */
  storedDocs?: StoredDocsHandler;
  /** Hook before a compaction snapshot of a live document (e.g. purge orphaned strokes, D-35). */
  beforeSnapshot?: (docId: string, doc: Y.Doc) => void;
  /** Consecutive auth failures before giving up (status "unauthorized"). Default 3. */
  maxAuthFailures?: number;
  random?: () => number;
}

interface Listeners {
  status: (status: SyncStatus) => void;
  synced: (docId: string) => void;
  error: (error: SyncClientError) => void;
  awareness: (docId: string, payload: Uint8Array, deviceId: string) => void;
  remoteUpdate: (docId: string, update: Uint8Array) => void;
}

/**
 * Documents kept in the app's storage instead of a live Y.Doc ("stored" mode,
 * e.g. every note except the open ones). Remote updates are handed to the app,
 * which merges them into its saved state (`Y.mergeUpdates`) — no Y.Doc needed.
 */
export interface StoredDocsHandler {
  /**
   * Remote updates of a stored document, in order. Persist them (merged into
   * the saved state) before resolving: the sync cursor advances afterwards.
   */
  onUpdates(docId: string, updates: Uint8Array[]): void | Promise<void>;
  /** Saved state of a stored document (for compaction snapshots); null if none. */
  loadState(docId: string): Uint8Array | null | Promise<Uint8Array | null>;
}

interface DocEntry {
  /** null = stored mode (no Y.Doc in memory). */
  doc: Y.Doc | null;
  /** Remote updates of a stored document not yet handed to the app. */
  stored: Uint8Array[];
  state: DocSyncState;
  synced: boolean;
  pending: Uint8Array[];
  pendingBytes: number;
  timer: ReturnType<typeof setTimeout> | null;
  snapshotInFlight: string | null;
  detach: () => void;
}

export class SyncClient {
  private readonly opts: Required<
    Omit<
      SyncClientOptions,
      "beforeSnapshot" | "createSocket" | "backoff" | "snapshotThresholds" | "storedDocs"
    >
  > &
    SyncClientOptions;
  private readonly docs = new Map<string, DocEntry>();
  private readonly listeners: { [K in keyof Listeners]: Set<Listeners[K]> } = {
    status: new Set(),
    synced: new Set(),
    error: new Set(),
    awareness: new Set(),
    remoteUpdate: new Set(),
  };
  private socket: WebSocketLike | null = null;
  private _status: SyncStatus = "idle";
  private welcomed = false;
  private attempt = 0;
  private authFailures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  /** Serializes storage access and message handling. */
  private chain: Promise<unknown> = Promise.resolve();
  /** In-memory mirror of the stored outbox (loaded once; this client is its only writer). */
  private outbox: Map<string, OutboxItem> | null = null;
  /** Doc states changed since the last batch write. */
  private readonly dirty = new Set<string>();
  private stateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SyncClientOptions) {
    this.opts = {
      batchMs: 30,
      stateFlushMs: 200,
      maxAuthFailures: 3,
      random: Math.random,
      ...options,
    };
  }

  get status(): SyncStatus {
    return this._status;
  }

  on<K extends keyof Listeners>(event: K, fn: Listeners[K]): () => void {
    this.listeners[event].add(fn);
    return () => this.listeners[event].delete(fn);
  }

  /** Start connecting (and keep reconnecting until stop()). */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.attempt = 0;
    this.authFailures = 0;
    this.connect();
  }

  /** Close the connection and stop reconnecting. Pending outbox items stay stored. */
  async stop(): Promise<void> {
    this.running = false;
    this.clearReconnect();
    for (const [docId, entry] of this.docs) await this.flushPending(docId, entry);
    const s = this.socket;
    this.socket = null;
    this.welcomed = false;
    if (s) {
      s.onclose = null;
      s.close(1000, "client stop");
    }
    this.setStatus("stopped");
    await this.chain;
    await this.flushStates();
  }

  /** Reconnect now (e.g. the OS reports the network is back, or after re-login). */
  reconnect(): void {
    this.running = true;
    this.attempt = 0;
    this.authFailures = 0;
    this.clearReconnect();
    if (this.socket) {
      const s = this.socket;
      this.socket = null;
      s.onclose = null;
      s.close(1000, "reconnect");
    }
    this.connect();
  }

  /** Start syncing a document. Local updates are pushed; remote ones applied with REMOTE_ORIGIN. */
  async addDoc(docId: string, doc: Y.Doc): Promise<void> {
    await this.addDocs([{ docId, doc }]);
  }

  /**
   * Start syncing many documents at once (first sync, app start): one batch
   * read of their cursors and one `subscribe` message.
   */
  async addDocs(list: { docId: string; doc: Y.Doc }[]): Promise<void> {
    await this.register(list);
  }

  /**
   * Start syncing documents in stored mode: no Y.Doc in memory, remote
   * updates go to `storedDocs.onUpdates`. Open one with openDoc() when the
   * user opens it. Requires the `storedDocs` option.
   */
  async addStoredDocs(docIds: string[]): Promise<void> {
    if (!this.opts.storedDocs) throw new Error("addStoredDocs needs the storedDocs option");
    await this.register(docIds.map((docId) => ({ docId, doc: null })));
  }

  /**
   * Switch a stored document to a live Y.Doc. `load` builds the Y.Doc from the
   * saved state; it runs while no sync message is being processed, so no
   * remote update can slip between the saved state and the live document.
   */
  async openDoc(docId: string, load: () => Y.Doc | Promise<Y.Doc>): Promise<Y.Doc> {
    const entry = this.docs.get(docId);
    if (!entry) throw new Error(`document ${docId} is not synced`);
    return this.serial(async () => {
      if (entry.doc) return entry.doc;
      await this.flushStored(docId, entry);
      const doc = await load();
      this.attach(docId, entry, doc);
      return doc;
    });
  }

  /**
   * Switch a live document back to stored mode. Local edits are queued first;
   * `save` persists the Y.Doc's final state and runs before any later remote
   * update is handed to `storedDocs.onUpdates`, so nothing can be overwritten.
   */
  async closeDoc(docId: string, save: (doc: Y.Doc) => void | Promise<void>): Promise<void> {
    if (!this.opts.storedDocs) throw new Error("closeDoc needs the storedDocs option");
    const entry = this.docs.get(docId);
    if (!entry?.doc) return;
    await this.flushPending(docId, entry);
    await this.serial(async () => {
      if (!entry.doc) return;
      entry.detach();
      // Edits made after the flush above but before detaching.
      await this.enqueuePending(docId, entry);
      await save(entry.doc);
      entry.doc = null;
      entry.detach = () => {};
    });
  }

  isLive(docId: string): boolean {
    return this.docs.get(docId)?.doc != null;
  }

  private attach(docId: string, entry: DocEntry, doc: Y.Doc): void {
    const handler = (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE_ORIGIN) return;
      this.queueLocalUpdate(docId, update);
    };
    doc.on("update", handler);
    entry.doc = doc;
    entry.detach = () => doc.off("update", handler);
  }

  private async register(list: { docId: string; doc: Y.Doc | null }[]): Promise<void> {
    for (const { docId } of list) {
      if (this.docs.has(docId)) throw new Error(`document ${docId} is already synced`);
    }
    const ids = list.map((d) => d.docId);
    const storage = this.opts.storage;
    const states = storage.getDocStates
      ? await storage.getDocStates(ids)
      : new Map(
          (
            await Promise.all(ids.map(async (id) => [id, await storage.getDocState(id)] as const))
          ).filter((e): e is readonly [string, DocSyncState] => e[1] !== null),
        );
    for (const { docId, doc } of list) {
      const entry: DocEntry = {
        doc: null,
        stored: [],
        state: states.get(docId) ?? { ...EMPTY_DOC_STATE },
        synced: false,
        pending: [],
        pendingBytes: 0,
        timer: null,
        snapshotInFlight: null,
        detach: () => {},
      };
      this.docs.set(docId, entry);
      if (doc) this.attach(docId, entry, doc);
    }
    if (this.welcomed && list.length > 0) {
      // Subscribe before pushing (sync-protocol.md §3), then send what was queued for these docs.
      this.send({
        type: "subscribe",
        docs: ids.map((docId) => ({ docId, since: this.docs.get(docId)!.state.lastSeq })),
      });
      const added = new Set(ids);
      await this.serial(async () => {
        for (const item of (await this.outboxItems()).values()) {
          if (added.has(item.docId)) this.sendItem(item);
        }
      });
    }
  }

  /** Hand buffered remote updates of a stored document to the app. */
  private async flushStored(docId: string, entry: DocEntry): Promise<void> {
    if (entry.stored.length === 0) return;
    const updates = entry.stored;
    entry.stored = [];
    await this.opts.storedDocs!.onUpdates(docId, updates);
  }

  /** Stop syncing a document (its pending local updates are still stored and sent). */
  async removeDoc(docId: string): Promise<void> {
    const entry = this.docs.get(docId);
    if (!entry) return;
    await this.flushPending(docId, entry);
    await this.serial(() => this.flushStored(docId, entry));
    await this.flushStates();
    entry.detach();
    this.docs.delete(docId);
    if (this.welcomed) this.send({ type: "unsubscribe", docIds: [docId] });
  }

  isSynced(docId: string): boolean {
    return this.docs.get(docId)?.synced ?? false;
  }

  /** Send an awareness update (y-protocols encoding); dropped while offline. */
  async sendAwareness(docId: string, update: Uint8Array): Promise<void> {
    // Presence only makes sense for documents open on this device.
    if (!this.welcomed || !this.docs.get(docId)?.doc) return;
    const key = await this.opts.keyFor(docId);
    this.send({
      type: "awareness",
      docId,
      payload: toBase64Url(encryptAwareness(key, docId, update)),
    });
  }

  /** Flush batched local updates to the outbox now. */
  async flush(): Promise<void> {
    for (const [docId, entry] of this.docs) await this.flushPending(docId, entry);
    await this.chain;
    await this.flushStates();
  }

  /**
   * Upload a snapshot now (e.g. when leaving a document after many own edits,
   * for version history). Returns false when the document is not caught up yet
   * or a snapshot is already in flight.
   */
  async requestSnapshot(docId: string): Promise<boolean> {
    const entry = this.docs.get(docId);
    if (!entry) throw new Error(`document ${docId} is not synced`);
    await this.flushPending(docId, entry);
    return this.serial(async () => {
      if (!entry.synced || entry.snapshotInFlight) return false;
      await this.enqueueSnapshot(docId, entry, false);
      return entry.snapshotInFlight !== null;
    });
  }

  /**
   * Subscribe again and resend the document's queued messages — e.g. after
   * `POST /v1/docs` registered a document created offline (the first
   * subscribe got `doc_not_found`).
   */
  async resubscribe(docId: string): Promise<void> {
    const entry = this.docs.get(docId);
    if (!entry) throw new Error(`document ${docId} is not synced`);
    await this.serial(async () => {
      if (!this.welcomed) return; // the next welcome subscribes anyway
      this.send({ type: "subscribe", docs: [{ docId, since: entry.state.lastSeq }] });
      for (const item of (await this.outboxItems()).values())
        if (item.docId === docId) this.sendItem(item);
    });
  }

  /** Resend every outbox item (e.g. after registering a document that got `doc_not_found`). */
  async resendOutbox(): Promise<void> {
    await this.serial(async () => {
      if (!this.welcomed) return;
      for (const item of (await this.outboxItems()).values()) this.sendItem(item);
    });
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  private setStatus(status: SyncStatus): void {
    if (this._status === status) return;
    this._status = status;
    for (const fn of this.listeners.status) fn(status);
  }

  private emitError(error: SyncClientError): void {
    for (const fn of this.listeners.error) fn(error);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private connect(): void {
    if (!this.running) return;
    this.setStatus("connecting");
    this.welcomed = false;
    const factory =
      this.opts.createSocket ??
      ((url: string) => {
        const WS = (globalThis as { WebSocket?: new (url: string) => WebSocketLike }).WebSocket;
        if (!WS) throw new Error("no global WebSocket: pass createSocket");
        return new WS(url);
      });
    let socket: WebSocketLike;
    try {
      socket = factory(this.opts.url);
    } catch (e) {
      this.emitError({ code: "internal", message: `cannot open socket: ${String(e)}` });
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      void this.sendHello(socket);
    };
    socket.onmessage = (ev) => {
      if (socket !== this.socket) return;
      const raw = typeof ev.data === "string" ? ev.data : String(ev.data);
      const msg = parseServerMessage(raw);
      if (!msg) {
        this.emitError({ code: "internal", message: "invalid server message" });
        return;
      }
      void this.serial(() => this.handle(msg));
    };
    socket.onclose = () => {
      if (socket !== this.socket) return;
      this.socket = null;
      this.welcomed = false;
      for (const entry of this.docs.values()) {
        entry.synced = false;
        entry.snapshotInFlight = null;
      }
      if (this.running && this._status !== "unauthorized" && this._status !== "stopped") {
        this.setStatus("offline");
        this.scheduleReconnect();
      }
    };
    socket.onerror = () => {
      // onclose follows and handles reconnecting.
    };
  }

  private async sendHello(socket: WebSocketLike): Promise<void> {
    let auth: SyncAuth;
    try {
      auth = await this.opts.auth();
    } catch (e) {
      this.emitError({ code: "unauthorized", message: `auth provider failed: ${String(e)}` });
      socket.close(1000, "no auth");
      return;
    }
    if (socket !== this.socket) return;
    this.send({
      type: "hello",
      protocol: SYNC_PROTOCOL_VERSION,
      auth,
      deviceId: this.opts.deviceId,
      client: this.opts.client,
    });
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnectTimer) return;
    const initial = this.opts.backoff?.initialMs ?? 500;
    const max = this.opts.backoff?.maxMs ?? 30_000;
    const exp = Math.min(max, initial * 2 ** this.attempt);
    // Full jitter in [exp/2, exp] spreads reconnect storms after a server restart.
    const delay = exp / 2 + (exp / 2) * this.opts.random();
    this.attempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(msg: ClientMessage): boolean {
    const s = this.socket;
    if (!s || s.readyState !== WS_OPEN) return false;
    s.send(JSON.stringify(msg));
    return true;
  }

  private sendItem(item: OutboxItem): void {
    // Items of documents not subscribed on this connection wait until addDoc().
    if (!this.docs.has(item.docId)) return;
    if (item.kind === "push") {
      this.send({
        type: "push",
        docId: item.docId,
        clientMsgId: item.clientMsgId,
        payload: item.payload,
      });
    } else {
      this.send({
        type: "snapshot",
        docId: item.docId,
        clientMsgId: item.clientMsgId,
        baseSeq: item.baseSeq ?? 0,
        payload: item.payload,
      });
    }
  }

  private async outboxItems(): Promise<Map<string, OutboxItem>> {
    if (!this.outbox) {
      const items = await this.opts.storage.listOutbox();
      this.outbox ??= new Map(items.map((i) => [i.clientMsgId, i]));
    }
    return this.outbox;
  }

  private async enqueue(item: OutboxItem): Promise<void> {
    await this.opts.storage.enqueue(item);
    (await this.outboxItems()).set(item.clientMsgId, item);
  }

  private async removeOutbox(clientMsgId: string): Promise<void> {
    (await this.outboxItems()).delete(clientMsgId);
    await this.opts.storage.removeOutbox(clientMsgId);
  }

  /** Persist cursors lazily: a lost write only means re-fetching a few updates. */
  private markDirty(docId: string): void {
    this.dirty.add(docId);
    this.stateTimer ??= setTimeout(() => {
      this.stateTimer = null;
      void this.flushStates();
    }, this.opts.stateFlushMs);
  }

  private async flushStates(): Promise<void> {
    if (this.stateTimer) clearTimeout(this.stateTimer);
    this.stateTimer = null;
    if (this.dirty.size === 0) return;
    const entries: [string, DocSyncState][] = [];
    for (const id of this.dirty) {
      const entry = this.docs.get(id);
      if (entry) entries.push([id, { ...entry.state }]);
    }
    this.dirty.clear();
    const storage = this.opts.storage;
    if (storage.setDocStates) await storage.setDocStates(entries);
    else for (const [id, state] of entries) await storage.setDocState(id, state);
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.chain.then(fn, fn);
    this.chain = next.catch(() => undefined);
    return next;
  }

  // -------------------------------------------------------------------------
  // Server messages
  // -------------------------------------------------------------------------

  private async handle(msg: ServerMessage): Promise<void> {
    switch (msg.type) {
      case "welcome": {
        this.welcomed = true;
        this.attempt = 0;
        this.authFailures = 0;
        this.setStatus("online");
        const docs = [...this.docs].map(([docId, e]) => ({ docId, since: e.state.lastSeq }));
        if (docs.length > 0) this.send({ type: "subscribe", docs });
        for (const item of (await this.outboxItems()).values()) this.sendItem(item);
        return;
      }
      case "updates": {
        const entry = this.docs.get(msg.docId);
        if (!entry) return;
        if (msg.snapshot) {
          if (await this.applyRemote(msg.docId, entry, msg.snapshot.payload)) {
            entry.state.updatesSinceSnapshot = 0;
            entry.state.bytesSinceSnapshot = 0;
          }
          entry.state.lastSeq = Math.max(entry.state.lastSeq, msg.snapshot.seq);
        }
        for (const item of msg.items) {
          const size = await this.applyRemote(msg.docId, entry, item.payload);
          this.count(entry, size);
          entry.state.lastSeq = Math.max(entry.state.lastSeq, item.seq);
        }
        await this.flushStored(msg.docId, entry);
        this.markDirty(msg.docId);
        if (msg.upToDate && !entry.synced) {
          entry.synced = true;
          for (const fn of this.listeners.synced) fn(msg.docId);
        }
        await this.maybeSnapshot(msg.docId, entry);
        return;
      }
      case "update": {
        const entry = this.docs.get(msg.docId);
        if (!entry) return;
        const size = await this.applyRemote(msg.docId, entry, msg.payload);
        this.count(entry, size);
        entry.state.lastSeq = Math.max(entry.state.lastSeq, msg.seq);
        await this.flushStored(msg.docId, entry);
        this.markDirty(msg.docId);
        await this.maybeSnapshot(msg.docId, entry);
        return;
      }
      case "ack": {
        const item = (await this.outboxItems()).get(msg.clientMsgId);
        await this.removeOutbox(msg.clientMsgId);
        const entry = this.docs.get(msg.docId);
        if (!entry) return;
        entry.state.lastSeq = Math.max(entry.state.lastSeq, msg.seq);
        if (item?.kind === "snapshot" || entry.snapshotInFlight === msg.clientMsgId) {
          entry.snapshotInFlight = null;
          entry.state.updatesSinceSnapshot = 0;
          entry.state.bytesSinceSnapshot = 0;
        } else if (item) {
          this.count(entry, item.size);
        }
        this.markDirty(msg.docId);
        await this.maybeSnapshot(msg.docId, entry);
        return;
      }
      case "awareness": {
        if (!this.docs.get(msg.docId)?.doc) return;
        try {
          const key = await this.opts.keyFor(msg.docId);
          const payload = decryptAwareness(key, msg.docId, fromBase64Url(msg.payload));
          for (const fn of this.listeners.awareness) fn(msg.docId, payload, msg.deviceId);
        } catch {
          // Awareness is ephemeral; a bad frame is simply dropped.
        }
        return;
      }
      case "error":
        await this.handleError(msg.code, msg.message, msg.ref);
        return;
    }
  }

  private async handleError(code: SyncErrorCode, message: string, ref?: string): Promise<void> {
    const item = ref ? (await this.outboxItems()).get(ref) : undefined;
    const docId = item?.docId ?? (ref && this.docs.has(ref) ? ref : undefined);
    this.emitError({ code, message, ...(ref ? { ref } : {}), ...(docId ? { docId } : {}) });
    switch (code) {
      case "unauthorized":
        this.authFailures++;
        if (this.authFailures >= this.opts.maxAuthFailures) {
          this.setStatus("unauthorized");
          this.running = false;
        }
        this.socket?.close(1000, "unauthorized");
        return;
      case "protocol_mismatch":
        this.running = false;
        this.setStatus("stopped");
        this.socket?.close(1000, "protocol mismatch");
        return;
      case "rate_limited":
        this.socket?.close(1000, "rate limited");
        return;
      case "payload_too_large":
        if (item) {
          await this.removeOutbox(item.clientMsgId);
          const entry = this.docs.get(item.docId);
          // An oversized update is replaced by a snapshot (limit 50 MiB), which contains it.
          if (item.kind === "push" && entry) await this.enqueueSnapshot(item.docId, entry, true);
          else if (entry) entry.snapshotInFlight = null;
        }
        return;
      case "forbidden":
        // E.g. a view-only guest pushing: the update can never be accepted.
        if (item) await this.removeOutbox(item.clientMsgId);
        return;
      default:
        return;
    }
  }

  /** Decrypt and apply; returns the plaintext size (0 on failure). */
  private async applyRemote(docId: string, entry: DocEntry, payload: string): Promise<number> {
    let update: Uint8Array;
    try {
      const key = await this.opts.keyFor(docId);
      update = decryptDocUpdate(key, docId, fromBase64Url(payload));
    } catch (e) {
      this.emitError({ code: "decrypt_failed", message: String(e), docId });
      return 0;
    }
    if (!entry.doc) {
      entry.stored.push(update);
      for (const fn of this.listeners.remoteUpdate) fn(docId, update);
      return update.length;
    }
    try {
      Y.applyUpdate(entry.doc, update, REMOTE_ORIGIN);
    } catch (e) {
      this.emitError({ code: "apply_failed", message: String(e), docId });
      return 0;
    }
    for (const fn of this.listeners.remoteUpdate) fn(docId, update);
    return update.length;
  }

  private count(entry: DocEntry, size: number): void {
    entry.state.updatesSinceSnapshot++;
    entry.state.bytesSinceSnapshot += size;
  }

  // -------------------------------------------------------------------------
  // Local updates and snapshots
  // -------------------------------------------------------------------------

  private queueLocalUpdate(docId: string, update: Uint8Array): void {
    const entry = this.docs.get(docId);
    if (!entry) return;
    entry.pending.push(update);
    entry.pendingBytes += update.length;
    if (entry.pendingBytes >= MAX_UPDATE_BYTES / 2) {
      void this.flushPending(docId, entry);
      return;
    }
    if (!entry.timer) {
      entry.timer = setTimeout(() => void this.flushPending(docId, entry), this.opts.batchMs);
    }
  }

  private flushPending(docId: string, entry: DocEntry): Promise<void> {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = null;
    if (entry.pending.length === 0) return Promise.resolve();
    return this.serial(() => this.enqueuePending(docId, entry));
  }

  /** Merge pending local updates into one outbox push (call inside serial()). */
  private async enqueuePending(docId: string, entry: DocEntry): Promise<void> {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = null;
    if (entry.pending.length === 0) return;
    const updates = entry.pending;
    entry.pending = [];
    entry.pendingBytes = 0;
    {
      const update = updates.length === 1 ? updates[0]! : Y.mergeUpdates(updates);
      if (update.length > MAX_UPDATE_BYTES) {
        await this.enqueueSnapshot(docId, entry, true);
        return;
      }
      const key = await this.opts.keyFor(docId);
      const item: OutboxItem = {
        clientMsgId: uuidv7(),
        docId,
        kind: "push",
        payload: toBase64Url(encryptDocUpdate(key, docId, update)),
        size: update.length,
        createdAt: Date.now(),
      };
      await this.enqueue(item);
      if (this.welcomed) this.sendItem(item);
    }
  }

  private async maybeSnapshot(docId: string, entry: DocEntry): Promise<void> {
    if (!entry.synced || entry.snapshotInFlight) return;
    const maxUpdates = this.opts.snapshotThresholds?.updates ?? SNAPSHOT_THRESHOLD_UPDATES;
    const maxBytes = this.opts.snapshotThresholds?.bytes ?? SNAPSHOT_THRESHOLD_BYTES;
    if (
      entry.state.updatesSinceSnapshot <= maxUpdates &&
      entry.state.bytesSinceSnapshot <= maxBytes
    )
      return;
    await this.enqueueSnapshot(docId, entry, false);
  }

  private async enqueueSnapshot(docId: string, entry: DocEntry, force: boolean): Promise<void> {
    if (entry.snapshotInFlight && !force) return;
    let state: Uint8Array;
    if (entry.doc) {
      this.opts.beforeSnapshot?.(docId, entry.doc);
      // Updates made by the hook are part of the state below; their pushes are harmless duplicates.
      state = Y.encodeStateAsUpdate(entry.doc);
    } else {
      // Stored mode: the saved state already contains every handed-over update.
      await this.flushStored(docId, entry);
      const saved = await this.opts.storedDocs!.loadState(docId);
      if (!saved) return;
      state = Y.mergeUpdates([saved]);
    }
    if (state.length > MAX_SNAPSHOT_BYTES) {
      this.emitError({ code: "too_large", message: "document exceeds the snapshot limit", docId });
      return;
    }
    const key = await this.opts.keyFor(docId);
    const item: OutboxItem = {
      clientMsgId: uuidv7(),
      docId,
      kind: "snapshot",
      baseSeq: entry.state.lastSeq,
      payload: toBase64Url(encryptDocUpdate(key, docId, state)),
      size: state.length,
      createdAt: Date.now(),
    };
    entry.snapshotInFlight = item.clientMsgId;
    await this.enqueue(item);
    if (this.welcomed) this.sendItem(item);
  }
}
