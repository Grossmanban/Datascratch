// In-memory implementation of the server side of the sync protocol. It is
// the executable reference for sync-protocol.md and the fake server for tests
// of every client (shared, web). Not for production.
import {
  MAX_SNAPSHOT_BYTES,
  MAX_UPDATE_BYTES,
  SYNC_CLOSE_DEVICE_REVOKED,
  SYNC_PROTOCOL_VERSION,
  base64UrlDecodedLength,
  parseClientMessage,
  type DeviceRevokedReason,
  type ServerMessage,
  type SyncAuth,
  type SyncErrorCode,
  type UpdateItem,
} from "../contracts/index.js";
import type { WebSocketFactory, WebSocketLike } from "./client.js";

export interface HubPrincipal {
  userId: string | null;
  canRead(docId: string): boolean;
  canWrite(docId: string): boolean;
}

export interface MemorySyncHubOptions {
  /** Map hello.auth to a principal; null = unauthorized. Default: every user token is accepted. */
  authenticate?: (auth: SyncAuth) => HubPrincipal | null;
  /** Unknown docIds are created on first use (default) or rejected with doc_not_found. */
  autoCreateDocs?: boolean;
  /** Items per `updates` part of a catch-up (default 100). */
  catchUpChunk?: number;
  /** Server clock (default Date.now). */
  now?: () => number;
  /**
   * Send the latest snapshot whenever `since` is below its seq (sync-protocol
   * §5, default); false = only when older updates were compacted away.
   */
  preferSnapshot?: boolean;
}

interface HubDoc {
  seq: number;
  items: UpdateItem[];
  snapshot: { seq: number; payload: string } | null;
}

interface Connection {
  send: (msg: ServerMessage) => void;
  close: (code?: number, reason?: string) => void;
  principal: HubPrincipal | null;
  deviceId: string | null;
  subscriptions: Set<string>;
}

export class MemorySyncHub {
  readonly docs = new Map<string, HubDoc>();
  private readonly connections = new Set<Connection>();
  private readonly revoked = new Map<string, DeviceRevokedReason>();
  private readonly opts: Required<Omit<MemorySyncHubOptions, "authenticate">> &
    MemorySyncHubOptions;

  constructor(options: MemorySyncHubOptions = {}) {
    this.opts = {
      autoCreateDocs: true,
      catchUpChunk: 100,
      now: Date.now,
      preferSnapshot: true,
      ...options,
    };
  }

  /** Register a document (the equivalent of `POST /v1/docs`). */
  registerDoc(docId: string): void {
    if (!this.docs.has(docId)) this.docs.set(docId, { seq: 0, items: [], snapshot: null });
  }

  /** Attach a transport. `send` delivers a text frame to the client. */
  connect(
    send: (raw: string) => void,
    close: (code?: number, reason?: string) => void,
  ): { receive(raw: string): void; disconnect(): void } {
    const conn: Connection = {
      send: (msg) => send(JSON.stringify(msg)),
      close,
      principal: null,
      deviceId: null,
      subscriptions: new Set(),
    };
    this.connections.add(conn);
    return {
      receive: (raw) => this.receive(conn, raw),
      disconnect: () => this.connections.delete(conn),
    };
  }

  /** Close every connection (simulates a server restart or network loss). */
  dropAll(): void {
    for (const c of [...this.connections]) {
      this.connections.delete(c);
      c.close();
    }
  }

  /**
   * Revoke a device (D-53): its open connections get `error device_revoked`
   * and close 4410; later hellos from it are refused the same way.
   */
  revokeDevice(deviceId: string, reason: DeviceRevokedReason): void {
    this.revoked.set(deviceId, reason);
    for (const c of [...this.connections]) {
      if (c.deviceId === deviceId) this.kickRevoked(c, reason);
    }
  }

  private kickRevoked(conn: Connection, reason: DeviceRevokedReason): void {
    conn.send({ type: "error", code: "device_revoked", message: "device revoked", reason });
    this.connections.delete(conn);
    conn.close(SYNC_CLOSE_DEVICE_REVOKED, reason);
  }

  get connectionCount(): number {
    return this.connections.size;
  }

  /** A WebSocketFactory whose sockets talk to this hub asynchronously, in order. */
  socketFactory(): WebSocketFactory {
    return () => {
      const socket: WebSocketLike & { readyState: number } = {
        readyState: 0,
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
        send: (data: string) => {
          if (socket.readyState !== 1) throw new Error("socket not open");
          deliver(() => link.receive(data));
        },
        close: () => shut(),
      };
      let closed = false;
      const shut = (code = 1000, reason = "") => {
        if (closed) return;
        closed = true;
        socket.readyState = 3;
        link.disconnect();
        deliver(() => socket.onclose?.({ code, reason }));
      };
      const link = this.connect(
        (raw) => {
          // Frames sent before close() are still delivered, as on a real socket.
          if (!closed) deliver(() => socket.onmessage?.({ data: raw }));
        },
        (code, reason) => shut(code, reason),
      );
      deliver(() => {
        if (closed) return;
        socket.readyState = 1;
        socket.onopen?.({});
      });
      return socket;
    };
  }

  private error(conn: Connection, code: SyncErrorCode, message: string, ref?: string): void {
    conn.send({ type: "error", code, message, ...(ref ? { ref } : {}) });
  }

  private doc(conn: Connection, docId: string, ref?: string): HubDoc | null {
    let d = this.docs.get(docId);
    if (!d && this.opts.autoCreateDocs) {
      this.registerDoc(docId);
      d = this.docs.get(docId);
    }
    if (!d) {
      this.error(conn, "doc_not_found", `document ${docId} is not registered`, ref ?? docId);
      return null;
    }
    return d;
  }

  private receive(conn: Connection, raw: string): void {
    const msg = parseClientMessage(raw);
    if (!msg) {
      const hello = safeJson(raw) as { type?: unknown; protocol?: unknown } | null;
      if (hello?.type === "hello" && hello.protocol !== SYNC_PROTOCOL_VERSION) {
        this.error(
          conn,
          "protocol_mismatch",
          `protocol ${String(hello.protocol)} is not supported`,
        );
      } else {
        this.error(conn, "bad_request", "invalid message");
      }
      return;
    }
    if (msg.type === "hello") {
      const revoked = this.revoked.get(msg.deviceId);
      if (revoked) {
        this.kickRevoked(conn, revoked);
        return;
      }
      const principal = this.opts.authenticate
        ? this.opts.authenticate(msg.auth)
        : {
            userId: "00000000-0000-7000-8000-000000000000",
            canRead: () => true,
            canWrite: () => true,
          };
      if (!principal) {
        this.error(conn, "unauthorized", "invalid credentials");
        conn.close();
        this.connections.delete(conn);
        return;
      }
      conn.principal = principal;
      conn.deviceId = msg.deviceId;
      conn.send({
        type: "welcome",
        userId: principal.userId,
        serverTime: new Date(this.opts.now()).toISOString(),
        protocol: SYNC_PROTOCOL_VERSION,
      });
      return;
    }
    const p = conn.principal;
    if (!p) {
      this.error(conn, "unauthorized", "hello first");
      return;
    }
    switch (msg.type) {
      case "subscribe":
        for (const { docId, since } of msg.docs) {
          if (!p.canRead(docId)) {
            this.error(conn, "forbidden", "no access", docId);
            continue;
          }
          const d = this.doc(conn, docId);
          if (!d) continue;
          conn.subscriptions.add(docId);
          this.catchUp(conn, docId, d, since);
        }
        return;
      case "unsubscribe":
        for (const id of msg.docIds) conn.subscriptions.delete(id);
        return;
      case "push":
      case "snapshot": {
        if (!p.canWrite(msg.docId)) {
          this.error(conn, "forbidden", "read-only access", msg.clientMsgId);
          return;
        }
        const limit = msg.type === "push" ? MAX_UPDATE_BYTES : MAX_SNAPSHOT_BYTES;
        if (base64UrlDecodedLength(msg.payload.length) > limit) {
          this.error(conn, "payload_too_large", "payload too large", msg.clientMsgId);
          return;
        }
        const d = this.doc(conn, msg.docId, msg.clientMsgId);
        if (!d) return;
        if (msg.type === "push") {
          const item = { seq: ++d.seq, payload: msg.payload, deviceId: conn.deviceId! };
          d.items.push(item);
          conn.send({ type: "ack", docId: msg.docId, clientMsgId: msg.clientMsgId, seq: item.seq });
          for (const other of this.connections) {
            if (other !== conn && other.subscriptions.has(msg.docId)) {
              other.send({ type: "update", docId: msg.docId, ...item });
            }
          }
        } else {
          const baseSeq = Math.min(msg.baseSeq, d.seq);
          if (!d.snapshot || baseSeq >= d.snapshot.seq) {
            d.snapshot = { seq: baseSeq, payload: msg.payload };
            // Compaction: updates covered by the snapshot are no longer needed.
            d.items = d.items.filter((i) => i.seq > baseSeq);
          }
          conn.send({
            type: "ack",
            docId: msg.docId,
            clientMsgId: msg.clientMsgId,
            seq: baseSeq,
          });
        }
        return;
      }
      case "awareness":
        if (!conn.subscriptions.has(msg.docId)) return;
        for (const other of this.connections) {
          if (other !== conn && other.subscriptions.has(msg.docId)) {
            other.send({
              type: "awareness",
              docId: msg.docId,
              payload: msg.payload,
              deviceId: conn.deviceId!,
            });
          }
        }
        return;
    }
  }

  private catchUp(conn: Connection, docId: string, d: HubDoc, since: number): void {
    const oldest = d.items[0]?.seq ?? d.seq + 1;
    const useSnapshot =
      d.snapshot !== null &&
      since < d.snapshot.seq &&
      (this.opts.preferSnapshot || since < oldest - 1);
    const from = useSnapshot ? d.snapshot!.seq : since;
    const items = d.items.filter((i) => i.seq > from);
    const chunk = this.opts.catchUpChunk;
    let first = true;
    for (let i = 0; i === 0 || i < items.length; i += chunk) {
      const part = items.slice(i, i + chunk);
      conn.send({
        type: "updates",
        docId,
        snapshot: first && useSnapshot ? { ...d.snapshot! } : null,
        items: part,
        upToDate: i + chunk >= items.length,
      });
      first = false;
    }
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function deliver(fn: () => void): void {
  setTimeout(fn, 0);
}
