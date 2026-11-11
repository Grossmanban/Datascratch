// In-memory implementation of the server side of the sync protocol. It is
// the executable reference for sync-protocol.md and the fake server for tests
// of every client (shared, web). Not for production.
import {
  MAX_RESUME_DOCS,
  MAX_SNAPSHOT_BYTES,
  MAX_UPDATE_BYTES,
  SYNC_CLOSE_DEVICE_REVOKED,
  SYNC_PROTOCOL_LATEST,
  SYNC_PROTOCOL_MIN,
  SYNC_PROTOCOL_RESUME,
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
  /** Newest protocol version this hub speaks (default SYNC_PROTOCOL_LATEST; 1 = an older server). */
  maxProtocol?: number;
  /** false: a broken server that says 3 but never answers `resume` (client fallback tests). */
  answerResume?: boolean;
}

interface HubDoc {
  seq: number;
  /** Account change position of the last stored update (or grant), for `resume`. */
  changedAt: number;
  items: UpdateItem[];
  snapshot: { seq: number; payload: string } | null;
}

interface Connection {
  send: (msg: ServerMessage) => void;
  sendText: (raw: string) => void;
  close: (code?: number, reason?: string) => void;
  principal: HubPrincipal | null;
  deviceId: string | null;
  subscriptions: Set<string>;
  /** Protocol 3: after a `resume` that was not a reset, every readable document is subscribed. */
  account: boolean;
  /** Version agreed in `welcome`. */
  protocol: number;
}

export class MemorySyncHub {
  readonly docs = new Map<string, HubDoc>();
  private readonly connections = new Set<Connection>();
  private readonly revoked = new Map<string, DeviceRevokedReason>();
  /** Cursors of another hub (a server with another database) are unknown here. */
  private readonly epoch = Math.random().toString(36).slice(2, 10);
  /** Account change log position (one log for the whole hub; every change takes the next). */
  private changePos = 0;
  /** Deleted documents, for `resumed.removed`. */
  private readonly tombstones: { docId: string; at: number }[] = [];
  private readonly opts: Required<
    Omit<MemorySyncHubOptions, "authenticate" | "maxProtocol" | "answerResume">
  > &
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
    if (!this.docs.has(docId))
      this.docs.set(docId, { seq: 0, changedAt: 0, items: [], snapshot: null });
  }

  /**
   * A document became readable for an account (a share, a space membership): a later `resume`
   * lists it even if its content is older than the cursor (sync-protocol.md §3.1).
   */
  grantDoc(docId: string): void {
    this.registerDoc(docId);
    this.docs.get(docId)!.changedAt = ++this.changePos;
  }

  /** Delete a document: subscribers get `doc_not_found`, a later `resume` lists it in `removed`. */
  deleteDoc(docId: string): void {
    if (!this.docs.delete(docId)) return;
    this.tombstones.push({ docId, at: ++this.changePos });
    for (const c of this.connections) {
      if (this.subscribed(c, docId) || c.account) {
        c.subscriptions.delete(docId);
        this.error(c, "doc_not_found", `document ${docId} was deleted`, docId);
      }
    }
  }

  /** The next cursor: everything up to here is in the log (single-threaded, so always safe). */
  private cursor(): string {
    return `${this.epoch}.${this.changePos}`;
  }

  /** Position of a cursor of this hub; null when unknown (another hub, garbage, future). */
  private cursorPos(cursor: string | null): number | null {
    const m = cursor ? /^([a-z0-9]+)\.(\d+)$/.exec(cursor) : null;
    if (!m || m[1] !== this.epoch) return null;
    const pos = Number(m[2]);
    return pos <= this.changePos ? pos : null;
  }

  private subscribed(conn: Connection, docId: string): boolean {
    if (conn.subscriptions.has(docId)) return true;
    return conn.account && this.docs.has(docId) && (conn.principal?.canRead(docId) ?? false);
  }

  /** Attach a transport. `send` delivers a text frame to the client. */
  connect(
    send: (raw: string) => void,
    close: (code?: number, reason?: string) => void,
  ): { receive(raw: string): void; disconnect(): void } {
    const conn: Connection = {
      send: (msg) => send(JSON.stringify(msg)),
      sendText: send,
      close,
      principal: null,
      deviceId: null,
      subscriptions: new Set(),
      account: false,
      protocol: SYNC_PROTOCOL_MIN,
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

  /**
   * Tell connected clients that shared state of an account changed (protocol 2,
   * `account_changed`); clients on protocol 1 get nothing. `userId` null = every user.
   */
  notifyAccountChanged(what: string[], userId: string | null = null): void {
    for (const c of this.connections) {
      if (!c.principal || c.protocol < 2) continue;
      if (userId !== null && c.principal.userId !== userId) continue;
      c.send({ type: "account_changed", what } as ServerMessage);
    }
  }

  /** Send any frame (tests of forward compatibility). */
  sendRaw(raw: string): void {
    for (const c of this.connections) c.sendText(raw);
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
    const max = this.opts.maxProtocol ?? SYNC_PROTOCOL_LATEST;
    const peek = safeJson(raw) as { type?: unknown; protocol?: unknown } | null;
    const tooNew =
      peek?.type === "hello" && typeof peek.protocol === "number" && peek.protocol > max;
    const msg = tooNew ? null : parseClientMessage(raw);
    if (!msg) {
      const hello = peek;
      if (
        hello?.type === "hello" &&
        (typeof hello.protocol !== "number" ||
          hello.protocol < SYNC_PROTOCOL_MIN ||
          hello.protocol > max)
      ) {
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
      conn.protocol = Math.min(msg.protocol, max);
      conn.send({
        type: "welcome",
        userId: principal.userId,
        serverTime: new Date(this.opts.now()).toISOString(),
        protocol: conn.protocol,
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
      case "resume": {
        if (this.opts.answerResume === false) return;
        if (conn.protocol < SYNC_PROTOCOL_RESUME || p.userId === null || conn.account) {
          this.error(conn, "bad_request", "resume needs protocol 3, a user and is sent once");
          return;
        }
        const pos = this.cursorPos(msg.cursor);
        const cursor = this.cursor();
        const reset: ServerMessage = {
          type: "resumed",
          reset: true,
          cursor,
          docs: [],
          removed: [],
        };
        if (pos === null) {
          conn.send(reset);
          return;
        }
        const docs: { docId: string; seq: number }[] = [];
        for (const [docId, d] of this.docs) {
          if (d.changedAt > pos && p.canRead(docId)) docs.push({ docId, seq: d.seq });
        }
        const removed = [
          ...new Set(this.tombstones.filter((t) => t.at > pos).map((t) => t.docId)),
        ].filter((id) => !this.docs.has(id));
        if (docs.length > MAX_RESUME_DOCS || removed.length > MAX_RESUME_DOCS) {
          conn.send(reset);
          return;
        }
        // Live updates of every readable document from here on (before listing: no gap).
        conn.account = true;
        conn.send({ type: "resumed", reset: false, cursor, docs, removed });
        return;
      }
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
          const userId = conn.principal?.userId;
          // The server stamps the author (sync-protocol §4, D-54).
          const item: UpdateItem = {
            seq: ++d.seq,
            payload: msg.payload,
            deviceId: conn.deviceId!,
            ...(userId ? { author: { kind: "user" as const, userId } } : {}),
          };
          d.items.push(item);
          d.changedAt = ++this.changePos;
          conn.send({ type: "ack", docId: msg.docId, clientMsgId: msg.clientMsgId, seq: item.seq });
          for (const other of this.connections) {
            if (other !== conn && this.subscribed(other, msg.docId)) {
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
        if (!this.subscribed(conn, msg.docId)) return;
        for (const other of this.connections) {
          if (other !== conn && this.subscribed(other, msg.docId)) {
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
