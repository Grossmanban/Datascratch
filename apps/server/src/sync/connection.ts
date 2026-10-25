import type { WebSocket } from 'ws';
import { verifyGuestToken, verifyUserToken } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { COMPACT_JOB } from '../jobs/index.js';
import { fromB64, toB64, uuidv7 } from '../lib/encoding.js';
import { ApiError } from '../lib/errors.js';
import { docAccess } from '../services/access.js';
import type { GuestPrincipal, UserPrincipal } from '../services/principal.js';
import { topics, type HubMessage } from './hub.js';
import {
  ClientMessage,
  CloseCode,
  PROTOCOL_VERSION,
  b64Size,
  type ServerMessage,
  type SyncErrorCode,
} from './messages.js';

type SyncPrincipal = UserPrincipal | GuestPrincipal;

interface Subscription {
  unsubscribe: () => void;
  /** While catching up, live events are buffered and flushed afterwards. */
  live: boolean;
  buffer: HubMessage[];
  /** Highest seq delivered to the client (or skipped as its own); delivery is gap-free from here. */
  sent: number;
  /** Live updates that arrived ahead of `sent + 1`, keyed by seq. */
  pending: Map<number, Extract<HubMessage, { type: 'update' }>>;
  filling: boolean;
  /** Seqs this connection pushed and that were not yet passed by `sent` (never echoed back). */
  own: Set<number>;
}

const HELLO_TIMEOUT_MS = 10_000;
const MAX_BUFFERED_BYTES = 64 * 1024 * 1024;

class SyncError extends Error {
  constructor(
    readonly code: SyncErrorCode,
    message: string,
    readonly ref?: string,
  ) {
    super(message);
  }
}

/** One WebSocket client of /v1/sync (sync-protocol.md). */
export class SyncConnection {
  readonly id = uuidv7();
  #principal: SyncPrincipal | null = null;
  readonly #subs = new Map<string, Subscription>();
  readonly #access = new Map<string, boolean>();
  readonly #control: (() => void)[] = [];
  #queue: Promise<void> = Promise.resolve();
  #closed = false;
  #tokens: number;
  #lastRefill = Date.now();
  readonly #helloTimer: NodeJS.Timeout;

  constructor(
    private readonly ctx: AppContext,
    private readonly socket: WebSocket,
    private readonly onClose: (c: SyncConnection) => void,
  ) {
    this.#tokens = this.#capacity;
    this.#helloTimer = setTimeout(() => this.#fail('unauthorized', 'hello timeout', CloseCode.unauthorized), HELLO_TIMEOUT_MS);
    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        this.#send({ type: 'error', code: 'protocol_mismatch', message: 'binary frames are not supported' });
        return;
      }
      const text = Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.concat(data as Buffer[]).toString('utf8');
      // Messages are handled strictly in order, one at a time.
      this.#queue = this.#queue.then(() => this.#handle(text)).catch((err) => this.#internal(err));
    });
    socket.on('close', () => this.#cleanup());
    socket.on('error', () => this.#cleanup());
  }

  get principal() {
    return this.#principal;
  }

  get #capacity() {
    return this.ctx.config.SYNC_RATE_PER_SEC * 5;
  }

  close(code: number, reason: string) {
    if (this.#closed) return;
    try {
      this.socket.close(code, reason);
    } catch {
      this.socket.terminate();
    }
    this.#cleanup();
  }

  #cleanup() {
    if (this.#closed) return;
    this.#closed = true;
    clearTimeout(this.#helloTimer);
    for (const s of this.#subs.values()) s.unsubscribe();
    this.#subs.clear();
    for (const off of this.#control) off();
    this.onClose(this);
  }

  #send(msg: ServerMessage) {
    if (this.#closed || this.socket.readyState !== this.socket.OPEN) return;
    if (this.socket.bufferedAmount > MAX_BUFFERED_BYTES) {
      // The client cannot keep up; it will catch up from lastSeq after reconnecting.
      this.close(CloseCode.goingAway, 'client too slow');
      return;
    }
    this.socket.send(JSON.stringify(msg));
  }

  #fail(code: SyncErrorCode, message: string, closeCode: number) {
    this.#send({ type: 'error', code, message });
    this.close(closeCode, message);
  }

  #internal(err: unknown) {
    this.ctx.log.error({ err, conn: this.id }, 'sync connection error');
    this.#send({ type: 'error', code: 'internal', message: 'internal error' });
  }

  #takeToken(): boolean {
    const now = Date.now();
    const rate = this.ctx.config.SYNC_RATE_PER_SEC;
    this.#tokens = Math.min(this.#capacity, this.#tokens + ((now - this.#lastRefill) / 1000) * rate);
    this.#lastRefill = now;
    if (this.#tokens < 1) return false;
    this.#tokens -= 1;
    return true;
  }

  async #handle(text: string) {
    if (this.#closed) return;
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.#send({ type: 'error', code: 'protocol_mismatch', message: 'invalid JSON' });
      return;
    }
    const parsed = ClientMessage.safeParse(raw);
    if (!parsed.success) {
      const ref = typeof raw === 'object' && raw ? ((raw as { clientMsgId?: unknown }).clientMsgId as string) : undefined;
      this.#send({
        type: 'error',
        code: 'protocol_mismatch',
        message: `invalid message: ${parsed.error.issues[0]?.path.join('.') ?? ''} ${parsed.error.issues[0]?.message ?? ''}`.trim(),
        ...(typeof ref === 'string' ? { ref } : {}),
      });
      return;
    }
    const msg = parsed.data;
    if (!this.#principal) {
      if (msg.type !== 'hello') return this.#fail('unauthorized', 'hello expected', CloseCode.unauthorized);
      return this.#hello(msg);
    }
    if (msg.type === 'hello') {
      this.#send({ type: 'error', code: 'protocol_mismatch', message: 'already authenticated' });
      return;
    }
    if (!this.#takeToken()) {
      const ref = 'clientMsgId' in msg ? msg.clientMsgId : 'docId' in msg ? msg.docId : undefined;
      this.#send({ type: 'error', code: 'rate_limited', message: 'too many messages', ...(ref ? { ref } : {}) });
      return;
    }
    try {
      switch (msg.type) {
        case 'subscribe':
          return await this.#subscribe(msg.docs);
        case 'unsubscribe':
          for (const d of msg.docIds) this.#unsubscribe(d);
          return;
        case 'push':
          return await this.#push(msg.docId, msg.clientMsgId, msg.payload);
        case 'snapshot':
          return await this.#snapshot(msg.docId, msg.clientMsgId, msg.baseSeq, msg.payload);
        case 'awareness':
          return await this.#awareness(msg.docId, msg.payload);
      }
    } catch (err) {
      if (err instanceof SyncError) {
        this.#send({ type: 'error', code: err.code, message: err.message, ...(err.ref ? { ref: err.ref } : {}) });
        return;
      }
      if (err instanceof ApiError && err.code === 'not_found') {
        const ref = 'clientMsgId' in msg ? msg.clientMsgId : 'docId' in msg ? msg.docId : undefined;
        if ('docId' in msg) this.#access.delete(msg.docId);
        this.#send({ type: 'error', code: 'doc_not_found', message: err.message, ...(ref ? { ref } : {}) });
        return;
      }
      if (err instanceof ApiError && err.code === 'bad_request') {
        const ref = 'clientMsgId' in msg ? msg.clientMsgId : undefined;
        this.#send({ type: 'error', code: 'protocol_mismatch', message: err.message, ...(ref ? { ref } : {}) });
        return;
      }
      throw err;
    }
  }

  async #hello(msg: Extract<ClientMessage, { type: 'hello' }>) {
    clearTimeout(this.#helloTimer);
    if (msg.protocol !== PROTOCOL_VERSION) {
      return this.#fail('protocol_mismatch', `protocol ${PROTOCOL_VERSION} required`, CloseCode.protocol);
    }
    let p: SyncPrincipal | null;
    if (msg.auth.kind === 'user') {
      p = await verifyUserToken(this.ctx, msg.auth.accessToken);
    } else {
      // Guest device ids are namespaced so they can never collide with a user's devices.
      p = await verifyGuestToken(this.ctx, msg.auth.guestToken, `guest:${msg.auth.shareId}:${msg.deviceId}`);
      if (p && p.shareId !== msg.auth.shareId) p = null;
    }
    if (!p) return this.#fail('unauthorized', 'invalid credentials', CloseCode.unauthorized);
    if (this.#closed) return;
    this.#principal = p;
    const kick = (m: HubMessage) => {
      if (m.type === 'revoked') this.#fail('unauthorized', m.reason, CloseCode.unauthorized);
    };
    if (p.kind === 'user') {
      this.#control.push(this.ctx.hub.subscribe(topics.device(p.deviceId), kick));
    } else {
      this.#control.push(this.ctx.hub.subscribe(topics.share(p.shareId), kick));
    }
    this.#send({
      type: 'welcome',
      userId: p.kind === 'user' ? p.userId : null,
      serverTime: new Date().toISOString(),
      protocol: PROTOCOL_VERSION,
    });
  }

  /** Read access → `false` (read-only) / `true` (write); throws doc_not_found. */
  async #canWrite(docId: string): Promise<boolean> {
    const cached = this.#access.get(docId);
    if (cached !== undefined) return cached;
    const a = await docAccess(this.ctx.database.db, this.#principal!, docId);
    if (!a) throw new SyncError('doc_not_found', 'document not found', docId);
    this.#access.set(docId, a.write);
    return a.write;
  }

  #deviceId(): string {
    return this.#principal!.deviceId;
  }

  async #subscribe(list: { docId: string; since: number }[]) {
    for (const { docId, since } of list) {
      if (this.#closed) return;
      this.#access.delete(docId);
      try {
        await this.#canWrite(docId);
      } catch (err) {
        if (err instanceof SyncError) {
          this.#send({ type: 'error', code: err.code, message: err.message, ref: docId });
          continue;
        }
        throw err;
      }
      this.#unsubscribe(docId);
      const sub: Subscription = {
        unsubscribe: () => {},
        live: false,
        buffer: [],
        sent: since,
        pending: new Map(),
        filling: false,
        own: new Set(),
      };
      sub.unsubscribe = this.ctx.hub.subscribe(topics.doc(docId), (m) => this.#onDocEvent(docId, sub, m));
      this.#subs.set(docId, sub);
      try {
        for await (const page of this.ctx.documents.catchUp(this.ctx.database.db, docId, since)) {
          if (this.#closed || this.#subs.get(docId) !== sub) return;
          if (page.snapshot) sub.sent = page.snapshot.seq;
          const last = page.items[page.items.length - 1];
          if (last) sub.sent = last.seq;
          this.#send({
            type: 'updates',
            docId,
            snapshot: page.snapshot ? { seq: page.snapshot.seq, payload: toB64(page.snapshot.payload) } : null,
            items: page.items.map((i) => ({ seq: i.seq, payload: toB64(i.payload), deviceId: i.deviceId })),
            upToDate: page.upToDate,
          });
        }
      } catch (err) {
        this.#unsubscribe(docId);
        if (err instanceof ApiError && err.code === 'not_found') {
          this.#send({ type: 'error', code: 'doc_not_found', message: 'document not found', ref: docId });
          continue;
        }
        throw err;
      }
      sub.live = true;
      for (const m of sub.buffer) this.#deliver(docId, sub, m);
      sub.buffer = [];
    }
  }

  #unsubscribe(docId: string) {
    const s = this.#subs.get(docId);
    if (!s) return;
    s.unsubscribe();
    this.#subs.delete(docId);
  }

  #onDocEvent(docId: string, sub: Subscription, m: HubMessage) {
    if (m.type === 'doc_deleted') {
      this.#unsubscribe(docId);
      this.#access.delete(docId);
      this.#send({ type: 'error', code: 'doc_not_found', message: 'document deleted', ref: docId });
      return;
    }
    if (!sub.live) {
      if (m.type === 'update') sub.buffer.push(m);
      return;
    }
    this.#deliver(docId, sub, m);
  }

  #deliver(docId: string, sub: Subscription, m: HubMessage) {
    if (m.type === 'awareness') {
      if (m.origin !== this.id) this.#send({ type: 'awareness', docId, payload: m.payload, deviceId: m.deviceId });
      return;
    }
    if (m.type !== 'update' || m.seq <= sub.sent) return;
    sub.pending.set(m.seq, m);
    this.#drain(docId, sub);
  }

  /**
   * Deliver pending updates strictly in seq order. Concurrent writers may publish
   * out of order (seq 6 before 5); a missing seq is always committed already
   * (the doc row lock orders commits), so a gap is filled from the database.
   */
  #drain(docId: string, sub: Subscription) {
    for (;;) {
      const next = sub.pending.get(sub.sent + 1);
      if (!next) break;
      sub.pending.delete(next.seq);
      sub.sent = next.seq;
      sub.own.delete(next.seq);
      if (next.origin !== this.id) {
        this.#send({ type: 'update', docId, seq: next.seq, payload: next.payload, deviceId: next.deviceId });
      }
    }
    if (sub.pending.size === 0 || sub.filling) return;
    sub.filling = true;
    const upTo = Math.min(...sub.pending.keys());
    this.ctx.documents
      .range(this.ctx.database.db, docId, sub.sent, upTo)
      .then((rows) => {
        for (const r of rows) {
          if (r.seq !== sub.sent + 1) break;
          sub.sent = r.seq;
          if (!sub.own.delete(r.seq)) {
            this.#send({ type: 'update', docId, seq: r.seq, payload: toB64(r.payload), deviceId: r.deviceId });
          }
        }
      })
      .catch((err) => this.#internal(err))
      .finally(() => {
        sub.filling = false;
        if (this.#subs.get(docId) === sub) this.#drain(docId, sub);
      });
  }

  async #push(docId: string, clientMsgId: string, payload: string) {
    if (b64Size(payload) > this.ctx.config.SYNC_UPDATE_MAX_BYTES) {
      throw new SyncError('payload_too_large', 'update too large', clientMsgId);
    }
    if (!(await this.#canWriteRef(docId, clientMsgId))) {
      throw new SyncError('forbidden', 'read-only access', clientMsgId);
    }
    const bytes = fromB64(payload);
    const deviceId = this.#deviceId();
    const r = await this.ctx.documents.append(this.ctx.database.db, { docId, payload: bytes, deviceId, clientMsgId });
    const sub = this.#subs.get(docId);
    if (sub && r.seq > sub.sent) sub.own.add(r.seq);
    this.#send({ type: 'ack', docId, clientMsgId, seq: r.seq });
    if (!r.duplicate) this.ctx.documents.publishUpdate(docId, r.seq, payload, deviceId, this.id);
  }

  async #canWriteRef(docId: string, ref: string): Promise<boolean> {
    try {
      return await this.#canWrite(docId);
    } catch (err) {
      if (err instanceof SyncError) throw new SyncError(err.code, err.message, ref);
      throw err;
    }
  }

  async #snapshot(docId: string, clientMsgId: string, baseSeq: number, payload: string) {
    if (b64Size(payload) > this.ctx.config.SYNC_SNAPSHOT_MAX_BYTES) {
      throw new SyncError('payload_too_large', 'snapshot too large', clientMsgId);
    }
    if (!(await this.#canWriteRef(docId, clientMsgId))) {
      throw new SyncError('forbidden', 'read-only access', clientMsgId);
    }
    try {
      const r = await this.ctx.documents.storeSnapshot(this.ctx.database.db, {
        docId,
        baseSeq,
        payload: fromB64(payload),
        deviceId: this.#deviceId(),
      });
      this.#send({ type: 'ack', docId, clientMsgId, seq: baseSeq });
      if (r.newest) await this.ctx.jobs.enqueue(COMPACT_JOB, { docId }, { singletonKey: docId, startAfterSec: 30 });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'bad_request') {
        throw new SyncError('protocol_mismatch', err.message, clientMsgId);
      }
      throw err;
    }
  }

  async #awareness(docId: string, payload: string) {
    if (b64Size(payload) > this.ctx.config.SYNC_AWARENESS_MAX_BYTES) {
      throw new SyncError('payload_too_large', 'awareness too large', docId);
    }
    if (!this.#subs.has(docId)) throw new SyncError('forbidden', 'subscribe before sending awareness', docId);
    this.ctx.hub.publish(topics.doc(docId), {
      type: 'awareness',
      docId,
      payload,
      deviceId: this.#deviceId(),
      origin: this.id,
    });
  }
}
