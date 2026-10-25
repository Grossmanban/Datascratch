import { create } from "zustand";
import { APP_VERSION, syncUrl } from "@/config";
import type { ClientMessage, HelloAuth, ServerMessage } from "@/lib/shared";

export type SyncStatus = "offline" | "connecting" | "syncing" | "online";

export type OutgoingMessage =
  | { type: "push"; docId: string; clientMsgId: string; payload: string }
  | { type: "snapshot"; docId: string; clientMsgId: string; baseSeq: number; payload: string };

/** Storage and crypto side of sync; the engine only owns the socket. */
export interface SyncHost {
  deviceId(): Promise<string>;
  auth(): Promise<HelloAuth | null>;
  /** Called on auth failure; return true if credentials were refreshed and a retry makes sense. */
  refreshAuth(): Promise<boolean>;
  /** Docs to (re)subscribe after connecting. */
  subscriptions(): Promise<{ docId: string; since: number }[]>;
  /** Runs before pushes (REST op queue). Return false if the server is unreachable. */
  beforeFlush(): Promise<boolean>;
  /** Pushes ready to be sent (docs registered, keys known). */
  outgoing(): Promise<OutgoingMessage[]>;
  onUpdates(msg: Extract<ServerMessage, { type: "updates" }>): Promise<void>;
  onUpdate(msg: Extract<ServerMessage, { type: "update" }>): Promise<void>;
  onAck(msg: Extract<ServerMessage, { type: "ack" }>): Promise<void>;
  onAwareness?(msg: Extract<ServerMessage, { type: "awareness" }>): void;
  onError?(msg: Extract<ServerMessage, { type: "error" }>): void;
  onUpToDate?(docId: string): void;
}

type SyncState = { status: SyncStatus; pending: number; lastSyncedAt: number | null; error: string | null };

export function createSyncStatusStore() {
  return create<SyncState>(() => ({ status: "offline", pending: 0, lastSyncedAt: null, error: null }));
}

export const useSyncStatus = createSyncStatusStore();

const BACKOFF = [500, 1000, 2000, 5000, 10000, 20000, 30000];

export class SyncEngine {
  private ws: WebSocket | null = null;
  private welcomed = false;
  private stopped = true;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight = new Set<string>();
  private subscribed = new Set<string>();
  private flushing = false;
  private flushAgain = false;
  private catchingUp = new Set<string>();
  private onlineHandler = () => this.reconnectNow();
  private offlineHandler = () => this.ws?.close();

  constructor(
    private host: SyncHost,
    private status = useSyncStatus,
    private url: () => string = syncUrl,
  ) {}

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineHandler);
      window.addEventListener("offline", this.offlineHandler);
    }
    void this.connect();
  }

  stop() {
    this.stopped = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
      window.removeEventListener("offline", this.offlineHandler);
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.ws?.close();
    this.ws = null;
    this.status.setState({ status: "offline" });
  }

  get connected() {
    return this.welcomed && this.ws?.readyState === WebSocket.OPEN;
  }

  reconnectNow() {
    if (this.stopped) return;
    this.attempt = 0;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) void this.connect();
  }

  private scheduleReconnect() {
    if (this.stopped || this.timer) return;
    const delay = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)]! * (0.8 + Math.random() * 0.4);
    this.attempt++;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.connect();
    }, delay);
  }

  private async connect() {
    if (this.stopped) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.status.setState({ status: "offline" });
      this.scheduleReconnect();
      return;
    }
    // Run REST ops first: also refreshes the access token if needed.
    await this.host.beforeFlush().catch(() => false);
    const auth = await this.host.auth();
    if (!auth || this.stopped) {
      this.status.setState({ status: "offline" });
      this.scheduleReconnect();
      return;
    }
    this.status.setState({ status: "connecting" });
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url());
    } catch {
      this.status.setState({ status: "offline" });
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    this.welcomed = false;
    this.inflight.clear();
    this.subscribed.clear();
    ws.onopen = async () => {
      this.send({
        type: "hello",
        protocol: 1,
        auth,
        deviceId: await this.host.deviceId(),
        client: { platform: "web", version: APP_VERSION },
      });
    };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      void this.handle(msg);
    };
    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
        this.welcomed = false;
        this.inflight.clear();
        this.status.setState({ status: "offline" });
        this.scheduleReconnect();
      }
    };
    ws.onerror = () => ws.close();
  }

  private send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Subscribe to more docs (e.g. a note appeared in a notebook index). */
  subscribe(docs: { docId: string; since: number }[]) {
    const fresh = docs.filter((d) => !this.subscribed.has(d.docId));
    if (!fresh.length || !this.connected) return;
    for (const d of fresh) {
      this.subscribed.add(d.docId);
      this.catchingUp.add(d.docId);
    }
    this.status.setState({ status: "syncing" });
    // Keep frames reasonably small for accounts with thousands of notes.
    for (let i = 0; i < fresh.length; i += 200) this.send({ type: "subscribe", docs: fresh.slice(i, i + 200) });
  }

  unsubscribe(docIds: string[]) {
    for (const id of docIds) this.subscribed.delete(id);
    if (this.connected) this.send({ type: "unsubscribe", docIds });
  }

  sendAwareness(docId: string, payload: string) {
    if (this.connected) this.send({ type: "awareness", docId, payload });
  }

  /** Send everything that is queued. Safe to call often. */
  async flush() {
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }
    this.flushing = true;
    try {
      do {
        this.flushAgain = false;
        const ok = await this.host.beforeFlush().catch(() => false);
        if (!ok || !this.connected) break;
        const out = await this.host.outgoing();
        for (const m of out) {
          if (this.inflight.has(m.clientMsgId)) continue;
          if (!this.subscribed.has(m.docId)) this.subscribe([{ docId: m.docId, since: 0 }]);
          this.inflight.add(m.clientMsgId);
          this.send(m);
        }
      } while (this.flushAgain);
    } finally {
      this.flushing = false;
    }
  }

  private async handle(msg: ServerMessage) {
    switch (msg.type) {
      case "welcome": {
        this.welcomed = true;
        this.attempt = 0;
        this.status.setState({ status: "syncing", error: null });
        const subs = await this.host.subscriptions();
        this.subscribe(subs);
        if (!subs.length) this.status.setState({ status: "online", lastSyncedAt: Date.now() });
        void this.flush();
        break;
      }
      case "updates":
        await this.host.onUpdates(msg);
        if (msg.upToDate) {
          this.catchingUp.delete(msg.docId);
          this.host.onUpToDate?.(msg.docId);
          if (!this.catchingUp.size) this.status.setState({ status: "online", lastSyncedAt: Date.now() });
        }
        break;
      case "update":
        await this.host.onUpdate(msg);
        this.status.setState({ lastSyncedAt: Date.now() });
        break;
      case "ack":
        this.inflight.delete(msg.clientMsgId);
        await this.host.onAck(msg);
        this.status.setState({ lastSyncedAt: Date.now() });
        break;
      case "awareness":
        this.host.onAwareness?.(msg);
        break;
      case "error":
        if (msg.code === "unauthorized") {
          const ok = await this.host.refreshAuth();
          this.ws?.close();
          if (!ok) this.stop();
          return;
        }
        if (msg.ref) {
          this.inflight.delete(msg.ref);
          this.catchingUp.delete(msg.ref);
        }
        this.status.setState({ error: `${msg.code}: ${msg.message}` });
        this.host.onError?.(msg);
        break;
    }
  }
}
