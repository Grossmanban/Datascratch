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
  snapshotThresholds?: { updates?: number; bytes?: number };
  /** Hook before a compaction snapshot (e.g. purge orphaned strokes, D-35). */
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

interface DocEntry {
  doc: Y.Doc;
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
    Omit<SyncClientOptions, "beforeSnapshot" | "createSocket" | "backoff" | "snapshotThresholds">
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

  constructor(options: SyncClientOptions) {
    this.opts = {
      batchMs: 30,
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
    if (this.docs.has(docId)) throw new Error(`document ${docId} is already synced`);
    const state = (await this.opts.storage.getDocState(docId)) ?? { ...EMPTY_DOC_STATE };
    const handler = (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE_ORIGIN) return;
      this.queueLocalUpdate(docId, update);
    };
    doc.on("update", handler);
    const entry: DocEntry = {
      doc,
      state,
      synced: false,
      pending: [],
      pendingBytes: 0,
      timer: null,
      snapshotInFlight: null,
      detach: () => doc.off("update", handler),
    };
    this.docs.set(docId, entry);
    if (this.welcomed) this.send({ type: "subscribe", docs: [{ docId, since: state.lastSeq }] });
  }

  /** Stop syncing a document (its pending local updates are still stored and sent). */
  async removeDoc(docId: string): Promise<void> {
    const entry = this.docs.get(docId);
    if (!entry) return;
    await this.flushPending(docId, entry);
    entry.detach();
    this.docs.delete(docId);
    if (this.welcomed) this.send({ type: "unsubscribe", docIds: [docId] });
  }

  isSynced(docId: string): boolean {
    return this.docs.get(docId)?.synced ?? false;
  }

  /** Send an awareness update (y-protocols encoding); dropped while offline. */
  async sendAwareness(docId: string, update: Uint8Array): Promise<void> {
    if (!this.welcomed) return;
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
  }

  /** Resend every outbox item (e.g. after registering a document that got `doc_not_found`). */
  async resendOutbox(): Promise<void> {
    await this.serial(async () => {
      if (!this.welcomed) return;
      for (const item of await this.opts.storage.listOutbox()) this.sendItem(item);
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
        for (const item of await this.opts.storage.listOutbox()) this.sendItem(item);
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
        await this.opts.storage.setDocState(msg.docId, entry.state);
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
        await this.opts.storage.setDocState(msg.docId, entry.state);
        await this.maybeSnapshot(msg.docId, entry);
        return;
      }
      case "ack": {
        const item = (await this.opts.storage.listOutbox()).find(
          (o) => o.clientMsgId === msg.clientMsgId,
        );
        await this.opts.storage.removeOutbox(msg.clientMsgId);
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
        await this.opts.storage.setDocState(msg.docId, entry.state);
        await this.maybeSnapshot(msg.docId, entry);
        return;
      }
      case "awareness": {
        if (!this.docs.has(msg.docId)) return;
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
    const item = ref
      ? (await this.opts.storage.listOutbox()).find((o) => o.clientMsgId === ref)
      : undefined;
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
          await this.opts.storage.removeOutbox(item.clientMsgId);
          const entry = this.docs.get(item.docId);
          // An oversized update is replaced by a snapshot (limit 50 MiB), which contains it.
          if (item.kind === "push" && entry) await this.enqueueSnapshot(item.docId, entry, true);
          else if (entry) entry.snapshotInFlight = null;
        }
        return;
      case "forbidden":
        // E.g. a view-only guest pushing: the update can never be accepted.
        if (item) await this.opts.storage.removeOutbox(item.clientMsgId);
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
    const updates = entry.pending;
    entry.pending = [];
    entry.pendingBytes = 0;
    return this.serial(async () => {
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
      await this.opts.storage.enqueue(item);
      if (this.welcomed) this.sendItem(item);
    });
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
    this.opts.beforeSnapshot?.(docId, entry.doc);
    // Updates made by the hook are part of the state below; their pushes are harmless duplicates.
    const state = Y.encodeStateAsUpdate(entry.doc);
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
    await this.opts.storage.enqueue(item);
    if (this.welcomed) this.sendItem(item);
  }
}
