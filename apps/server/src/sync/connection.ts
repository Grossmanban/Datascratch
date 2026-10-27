import type { WebSocket } from 'ws';
import { verifyGuestToken, verifyUserToken } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { COMPACT_JOB } from '../jobs/index.js';
import { fromB64, sha256, toB64, uuidv7 } from '../lib/encoding.js';
import { ApiError } from '../lib/errors.js';
import type { AuthorRef } from '../db/schema.js';
import { accessFor, docAccess, loadDocs, loadMemberships } from '../services/access.js';
import type { CatchUpItem } from '../services/documents.js';
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

export type SyncPrincipal = UserPrincipal | GuestPrincipal;

/** Something to send for a given seq: another device's update, or the ack of our own push. */
/** An update as sent to clients; `author` only when known (sync-protocol.md §4). */
const item = (x: CatchUpItem) => ({
  seq: x.seq,
  payload: toB64(x.payload),
  deviceId: x.deviceId,
  ...(x.author ? { author: x.author } : {}),
});

type Pending =
  | { kind: 'update'; seq: number; payload: string; deviceId: string; author: AuthorRef | null }
  | { kind: 'ack'; seq: number; clientMsgId: string };

interface Subscription {
  unsubscribe: () => void;
  /** While catching up, live events and acks are buffered and flushed afterwards. */
  live: boolean;
  buffer: Pending[];
  /** Highest seq delivered (as update or ack) to the client; delivery is gap-free up to here. */
  sent: number;
  /** Entries that arrived ahead of `sent + 1`, keyed by seq. */
  pending: Map<number, Pending>;
  filling: boolean;
}

const HELLO_TIMEOUT_MS = 10_000;
/** Largest frame accepted before `hello` succeeds (a hello is well under 4 KB). */
export const PRE_AUTH_MAX_PAYLOAD = 64 * 1024;
/** Messages waiting to be handled before the socket stops reading (and when it reads again). */
const QUEUE_PAUSE_AT = 32;
/** Suggested wait before reconnecting when the account already has too many connections. */
const TOO_MANY_RETRY_MS = 30_000;
const QUEUE_RESUME_AT = 8;
/** Subscribe fast path: documents per batched query, and max updates per document in it. */
const FAST_PATH_BATCH = 200;
const FAST_PATH_MAX_UPDATES = 100;
/** Fast path by size: a document above this goes the paged way; a batch stays under the total. */
const FAST_PATH_DOC_BYTES = 1024 * 1024;
const FAST_PATH_BATCH_BYTES = 8 * 1024 * 1024;
const MAX_BUFFERED_BYTES = 64 * 1024 * 1024;
/** Catch-up pauses while this much is still queued on the socket (backpressure). */
const CATCHUP_HIGH_WATER = 4 * 1024 * 1024;
const CATCHUP_STALL_MS = 120_000;

class SyncError extends Error {
  constructor(
    readonly code: SyncErrorCode,
    message: string,
    readonly ref?: string,
  ) {
    super(message);
  }
}

/**
 * Change the frame size limit of one connection. `ws` has no public per-socket option;
 * its receiver checks `_maxPayload` against each frame header before buffering it
 * (verified by the pre-auth frame test).
 */
function setMaxPayload(socket: WebSocket, bytes: number) {
  const receiver = (socket as unknown as { _receiver?: { _maxPayload?: number } })._receiver;
  if (receiver && typeof receiver._maxPayload === 'number') receiver._maxPayload = bytes;
}

/** One WebSocket client of /v1/sync (sync-protocol.md). */
export class SyncConnection {
  readonly id = uuidv7();
  #principal: SyncPrincipal | null = null;
  readonly #subs = new Map<string, Subscription>();
  readonly #access = new Map<string, boolean>();
  readonly #control: (() => void)[] = [];
  #queue: Promise<void> = Promise.resolve();
  #queued = 0;
  #paused = false;
  #closed = false;
  #tokens: number;
  #lastRefill = Date.now();
  readonly #helloTimer: NodeJS.Timeout;
  #expiryTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly ctx: AppContext,
    private readonly socket: WebSocket,
    private readonly onClose: (c: SyncConnection) => void,
    /** Whether this principal may hold one more connection (per-user cap). */
    private readonly admit: (p: SyncPrincipal) => boolean = () => true,
    /** Largest frame once authenticated. */
    private readonly maxPayload = 0,
  ) {
    this.#tokens = this.#capacity;
    setMaxPayload(socket, PRE_AUTH_MAX_PAYLOAD);
    this.#helloTimer = setTimeout(() => this.#fail('unauthorized', 'hello timeout', CloseCode.unauthorized), HELLO_TIMEOUT_MS);
    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        this.#send({ type: 'error', code: 'bad_request', message: 'binary frames are not supported' });
        return;
      }
      const text = Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.concat(data as Buffer[]).toString('utf8');
      // Messages are handled strictly in order, one at a time; a deep queue stops reading the socket.
      this.#queued += 1;
      if (this.#queued >= QUEUE_PAUSE_AT && !this.#paused) {
        this.#paused = true;
        socket.pause();
      }
      this.#queue = this.#queue
        .then(() => this.#handle(text))
        .catch((err) => this.#internal(err))
        .finally(() => {
          this.#queued -= 1;
          if (this.#paused && this.#queued <= QUEUE_RESUME_AT && !this.#closed) {
            this.#paused = false;
            socket.resume();
          }
        });
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
    if (this.#expiryTimer) clearTimeout(this.#expiryTimer);
    for (const s of this.#subs.values()) s.unsubscribe();
    this.#subs.clear();
    for (const off of this.#control) off();
    this.onClose(this);
  }

  #send(msg: ServerMessage) {
    if (msg.type === 'error') this.ctx.metrics.syncErrors.inc({ code: msg.code });
    if (this.#closed || this.socket.readyState !== this.socket.OPEN) return;
    if (this.socket.bufferedAmount > MAX_BUFFERED_BYTES) {
      // The client cannot keep up; it will catch up from lastSeq after reconnecting.
      this.close(CloseCode.goingAway, 'client too slow');
      return;
    }
    this.socket.send(JSON.stringify(msg));
  }

  /** Wait until the client has read most of what was sent (catch-up backpressure). */
  async #drained() {
    const start = Date.now();
    while (!this.#closed && this.socket.bufferedAmount > CATCHUP_HIGH_WATER) {
      if (Date.now() - start > CATCHUP_STALL_MS) {
        this.close(CloseCode.goingAway, 'client too slow');
        return;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
  }

  /** The device was revoked: tell why, then close with 4410 (sync-protocol: the client wipes its data). */
  #revoked(reason: string) {
    this.#send({ type: 'error', code: 'device_revoked', message: 'this device was signed out', reason });
    this.close(CloseCode.deviceRevoked, reason);
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
    // Rate limit before parsing: a flood of large messages costs no JSON work.
    if (this.#principal && !this.#takeToken()) {
      let ref: string | undefined;
      if (text.length <= PRE_AUTH_MAX_PAYLOAD) {
        try {
          const m = JSON.parse(text) as { clientMsgId?: unknown; docId?: unknown };
          const r = m.clientMsgId ?? m.docId;
          if (typeof r === 'string') ref = r;
        } catch {
          // no ref
        }
      }
      // When the bucket holds a whole token again (sync-protocol: the client waits at least this long).
      const retryAfterMs = Math.ceil(((1 - this.#tokens) / this.ctx.config.SYNC_RATE_PER_SEC) * 1000);
      this.#send({ type: 'error', code: 'rate_limited', message: 'too many messages', retryAfterMs, ...(ref ? { ref } : {}) });
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      this.#send({ type: 'error', code: 'bad_request', message: 'invalid JSON' });
      return;
    }
    const r = raw as { type?: unknown; protocol?: unknown } | null;
    if (r && typeof r === 'object' && r.type === 'hello' && r.protocol !== PROTOCOL_VERSION) {
      clearTimeout(this.#helloTimer);
      return this.#fail('protocol_mismatch', `protocol ${PROTOCOL_VERSION} required`, CloseCode.protocol);
    }
    const parsed = ClientMessage.safeParse(raw);
    if (!parsed.success && !this.#principal) {
      // Before authentication only a valid hello is acceptable: no second chances.
      clearTimeout(this.#helloTimer);
      return this.#fail('bad_request', 'hello expected', CloseCode.protocol);
    }
    if (!parsed.success) {
      const ref = typeof raw === 'object' && raw ? ((raw as { clientMsgId?: unknown }).clientMsgId as string) : undefined;
      this.#send({
        type: 'error',
        code: 'bad_request',
        message: `invalid message: ${parsed.error.issues[0]?.path.join('.') ?? ''} ${parsed.error.issues[0]?.message ?? ''}`.trim(),
        ...(typeof ref === 'string' ? { ref } : {}),
      });
      return;
    }
    const msg = parsed.data;
    this.ctx.metrics.syncMessages.inc({ type: msg.type });
    if (!this.#principal) {
      if (msg.type !== 'hello') return this.#fail('unauthorized', 'hello expected', CloseCode.unauthorized);
      return this.#hello(msg);
    }
    if (msg.type === 'hello') {
      this.#send({ type: 'error', code: 'bad_request', message: 'already authenticated' });
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
      if (err instanceof ApiError && (err.code === 'bad_request' || err.code === 'payload_too_large')) {
        const ref = 'clientMsgId' in msg ? msg.clientMsgId : undefined;
        this.#send({ type: 'error', code: err.code, message: err.message, ...(ref ? { ref } : {}) });
        return;
      }
      throw err;
    }
  }

  async #hello(msg: Extract<ClientMessage, { type: 'hello' }>) {
    clearTimeout(this.#helloTimer);
    let p: SyncPrincipal | null;
    if (msg.auth.kind === 'user') {
      try {
        p = await verifyUserToken(this.ctx, msg.auth.accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'device_revoked') return this.#revoked(err.reason ?? 'user');
        throw err;
      }
    } else {
      // Guest device ids are namespaced so they can never collide with a user's devices
      // (and stay within the 64 characters of the contract's deviceId).
      const tag = sha256(`${msg.auth.shareId}|${msg.deviceId}`).subarray(0, 16).toString('base64url');
      p = await verifyGuestToken(this.ctx, msg.auth.guestToken, `guest:${tag}`);
      if (p && p.shareId !== msg.auth.shareId) p = null;
    }
    if (!p) return this.#fail('unauthorized', 'invalid credentials', CloseCode.unauthorized);
    if (this.#closed) return;
    if (!this.admit(p)) {
      this.#send({ type: 'error', code: 'rate_limited', message: 'too many connections', retryAfterMs: TOO_MANY_RETRY_MS });
      return this.close(CloseCode.tryAgainLater, 'too many connections');
    }
    this.#principal = p;
    setMaxPayload(this.socket, this.maxPayload);
    const kick = (m: HubMessage) => {
      if (m.type !== 'revoked') return;
      // A revoked device (its reason travels in the hub message); a guest's share was revoked.
      if (p.kind === 'user') this.#revoked(m.reason);
      else this.#fail('unauthorized', m.reason, CloseCode.unauthorized);
    };
    if (p.kind === 'user') {
      this.#control.push(this.ctx.hub.subscribe(topics.device(p.deviceId), kick));
      // A membership was added, changed or removed (D-54): access is checked again.
      this.#control.push(
        this.ctx.hub.subscribe(topics.user(p.userId), (m) => {
          if (m.type === 'access_changed') this.#recheckAccess();
        }),
      );
    } else {
      this.#control.push(this.ctx.hub.subscribe(topics.share(p.shareId), kick));
      if (p.expiresAt) this.#closeAt(p.expiresAt);
    }
    this.#send({
      type: 'welcome',
      userId: p.kind === 'user' ? p.userId : null,
      serverTime: new Date().toISOString(),
      protocol: PROTOCOL_VERSION,
    });
  }

  /**
   * Re-check every cached and subscribed document after a membership change: lost documents
   * get `doc_not_found` (sync-protocol.md §6), a changed role takes effect for the next write.
   */
  #recheckAccess() {
    this.#queue = this.#queue
      .then(async () => {
        const ids = new Set([...this.#access.keys(), ...this.#subs.keys()]);
        this.#access.clear();
        if (ids.size === 0 || this.#closed) return;
        const db = this.ctx.database.db;
        const p = this.#principal!;
        const rows = await loadDocs(db, [...ids]);
        const memberships = p.kind === 'user' ? await loadMemberships(db, p.userId) : undefined;
        for (const docId of ids) {
          const row = rows.get(docId);
          const a = row ? accessFor(p, row, memberships) : null;
          if (a) {
            this.#access.set(docId, a.write);
            continue;
          }
          if (!this.#subs.has(docId)) continue;
          this.#unsubscribe(docId);
          this.#send({ type: 'error', code: 'doc_not_found', message: 'document is no longer shared', ref: docId });
        }
      })
      .catch((err) => this.#internal(err));
  }

  /** Close the connection when a guest's share expires (timers longer than ~24 days re-arm). */
  #closeAt(at: Date) {
    const ms = at.getTime() - Date.now();
    if (ms <= 0) return this.#fail('unauthorized', 'share expired', CloseCode.unauthorized);
    this.#expiryTimer = setTimeout(() => this.#closeAt(at), Math.min(ms, 2 ** 31 - 1));
    this.#expiryTimer.unref();
  }

  /** Read access → `false` (read-only) / `true` (write); throws doc_not_found. */
  async #canWrite(docId: string): Promise<boolean> {
    const cached = this.#access.get(docId);
    // A guest's access can change when a note moves; only subscriptions hear about it,
    // so for unsubscribed documents a guest's access is checked every time.
    if (cached !== undefined && (this.#principal!.kind === 'user' || this.#subs.has(docId))) return cached;
    const a = await docAccess(this.ctx.database.db, this.#principal!, docId);
    if (!a) throw new SyncError('doc_not_found', 'document not found', docId);
    this.#access.set(docId, a.write);
    return a.write;
  }

  #deviceId(): string {
    return this.#principal!.deviceId;
  }

  /** The author stamped on this connection's updates (D-54): who is authenticated, not what the client says. */
  #author(): AuthorRef {
    const p = this.#principal!;
    return p.kind === 'user' ? { kind: 'user', userId: p.userId } : { kind: 'guest', shareId: p.shareId };
  }

  #newSub(docId: string, since: number): Subscription {
    this.#unsubscribe(docId);
    const sub: Subscription = {
      unsubscribe: () => {},
      live: false,
      buffer: [],
      sent: since,
      pending: new Map(),
      filling: false,
    };
    // Registered before reading the history: live events meanwhile are buffered.
    sub.unsubscribe = this.ctx.hub.subscribe(topics.doc(docId), (m) => this.#onDocEvent(docId, sub, m));
    this.#subs.set(docId, sub);
    return sub;
  }

  #goLive(docId: string, sub: Subscription) {
    sub.live = true;
    for (const e of sub.buffer) this.#enqueue(docId, sub, e);
    sub.buffer = [];
  }

  async #subscribe(requested: { docId: string; since: number }[]) {
    const db = this.ctx.database.db;
    // The contract schema already refuses duplicates and more than MAX_SUBSCRIBE_DOCS
    // documents; one entry per document is kept here too, as duplicates would multiply
    // subscriptions and rows.
    const unique = new Map(requested.map((d) => [d.docId, d.since]));
    const list = [...unique].map(([docId, since]) => ({ docId, since }));
    const rows = await loadDocs(db, [...unique.keys()]);
    type Item = {
      docId: string;
      since: number;
      sub: Subscription;
      lastSeq: number;
      snapshotSeq: number;
      /** Upper bound of the bytes the fast path loads for this document. */
      bytes: number;
    };
    const fast: Item[] = [];
    const slow: Item[] = [];
    const p = this.#principal!;
    // Documents of other accounts are visible through memberships (D-54).
    const memberships =
      p.kind === 'user' && [...rows.values()].some((r) => r.userId !== p.userId)
        ? await loadMemberships(db, p.userId)
        : undefined;
    for (const { docId, since } of list) {
      const row = rows.get(docId);
      const a = row ? accessFor(p, row, memberships) : null;
      if (!row || !a) {
        this.#access.delete(docId);
        this.#send({ type: 'error', code: 'doc_not_found', message: 'document not found', ref: docId });
        continue;
      }
      this.#access.set(docId, a.write);
      // A client ahead of the server (e.g. restored from another backup) starts over.
      const from = since > row.lastSeq ? 0 : since;
      const item = {
        docId,
        since: from,
        sub: this.#newSub(docId, from),
        lastSeq: row.lastSeq,
        snapshotSeq: 0,
        // Updates after the newest snapshot (or after `from` when that is later) weigh at most this.
        bytes: row.bytesSinceSnapshot,
      };
      // Fast path: either every update after `from` is still stored (no newer snapshot) and
      // there are few, or the newest snapshot plus a short tail after it. Big ones go paged.
      if (row.bytesSinceSnapshot > FAST_PATH_DOC_BYTES) slow.push(item);
      else if (from >= row.snapshotSeq && row.lastSeq - from <= FAST_PATH_MAX_UPDATES) fast.push(item);
      else if (from < row.snapshotSeq && row.lastSeq - row.snapshotSeq <= FAST_PATH_MAX_UPDATES) {
        fast.push({ ...item, snapshotSeq: row.snapshotSeq });
      } else slow.push(item);
    }

    // Snapshot sizes (metadata only) so that no batch loads more than FAST_PATH_BATCH_BYTES.
    const withSnapshot = fast.filter((b) => b.snapshotSeq > 0);
    for (let i = 0; i < withSnapshot.length; i += 1000) {
      const part = withSnapshot.slice(i, i + 1000);
      const sizes = await this.ctx.documents.snapshotSizes(
        db,
        part.map((b) => b.docId),
      );
      for (const b of part) b.bytes += sizes.get(b.docId) ?? 0;
    }
    const batches: Item[][] = [];
    let current: Item[] = [];
    let currentBytes = 0;
    for (const b of fast) {
      if (b.bytes > FAST_PATH_DOC_BYTES) {
        slow.push(b);
        continue;
      }
      if (current.length >= FAST_PATH_BATCH || currentBytes + b.bytes > FAST_PATH_BATCH_BYTES) {
        batches.push(current);
        current = [];
        currentBytes = 0;
      }
      current.push(b);
      currentBytes += b.bytes;
    }
    if (current.length > 0) batches.push(current);

    for (const batch of batches) {
      if (this.#closed) return;
      const withSnap = batch.filter((b) => b.snapshotSeq > 0);
      const snaps = await this.ctx.documents.latestSnapshots(
        db,
        withSnap.map((b) => b.docId),
      );
      // Updates are read after the snapshot (if any) or after `since`.
      const base = (b: Item) => (b.snapshotSeq > 0 ? (snaps.get(b.docId)?.seq ?? b.since) : b.since);
      const toFetch = batch.filter((b) => b.lastSeq > base(b)).map((b) => ({ docId: b.docId, since: base(b) }));
      const found = await this.ctx.documents.updatesForMany(db, toFetch);
      for (const b of batch) {
        if (this.#closed) return;
        if (this.#subs.get(b.docId) !== b.sub) continue;
        const snap = b.snapshotSeq > 0 ? (snaps.get(b.docId) ?? null) : null;
        const from = base(b);
        const items = found.get(b.docId) ?? [];
        // Snapshot missing or updates compacted in the meantime: fall back to the general path.
        if ((b.snapshotSeq > 0 && !snap) || (b.lastSeq > from && items[0]?.seq !== from + 1)) {
          slow.push(b);
          continue;
        }
        if (snap) b.sub.sent = snap.seq;
        const last = items[items.length - 1];
        if (last) b.sub.sent = last.seq;
        this.#send({
          type: 'updates',
          docId: b.docId,
          snapshot: snap ? { seq: snap.seq, payload: toB64(snap.payload) } : null,
          items: items.map(item),
          upToDate: true,
        });
        this.#goLive(b.docId, b.sub);
      }
      await this.#drained();
    }

    for (const { docId, since, sub } of slow) {
      if (this.#closed) return;
      if (this.#subs.get(docId) !== sub) continue;
      try {
        for await (const page of this.ctx.documents.catchUp(db, docId, since)) {
          if (this.#closed || this.#subs.get(docId) !== sub) return;
          if (page.snapshot) sub.sent = page.snapshot.seq;
          const last = page.items[page.items.length - 1];
          if (last) sub.sent = last.seq;
          this.#send({
            type: 'updates',
            docId,
            snapshot: page.snapshot ? { seq: page.snapshot.seq, payload: toB64(page.snapshot.payload) } : null,
            items: page.items.map(item),
            upToDate: page.upToDate,
          });
          await this.#drained();
        }
      } catch (err) {
        this.#unsubscribe(docId);
        if (err instanceof ApiError && err.code === 'not_found') {
          this.#send({ type: 'error', code: 'doc_not_found', message: 'document not found', ref: docId });
          continue;
        }
        throw err;
      }
      this.#goLive(docId, sub);
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
    if (m.type === 'doc_moved') {
      // Moved to another notebook: a guest of the old notebook's share may lose access.
      this.#access.delete(docId);
      this.#queue = this.#queue
        .then(async () => {
          if (this.#subs.get(docId) !== sub) return;
          const a = await docAccess(this.ctx.database.db, this.#principal!, docId);
          if (a) {
            this.#access.set(docId, a.write);
            return;
          }
          this.#unsubscribe(docId);
          this.#send({ type: 'error', code: 'doc_not_found', message: 'document is no longer shared', ref: docId });
        })
        .catch((err) => this.#internal(err));
      return;
    }
    if (m.type === 'awareness') {
      if (sub.live && m.origin !== this.id) {
        this.#send({ type: 'awareness', docId, payload: m.payload, deviceId: m.deviceId });
      }
      return;
    }
    // Our own pushes are represented by their ack entry (see #push), never echoed.
    if (m.type !== 'update' || m.origin === this.id) return;
    this.#enqueue(docId, sub, { kind: 'update', seq: m.seq, payload: m.payload, deviceId: m.deviceId, author: m.author });
  }

  #enqueue(docId: string, sub: Subscription, e: Pending) {
    if (!sub.live) {
      sub.buffer.push(e);
      return;
    }
    if (e.seq <= sub.sent) {
      // Already delivered (e.g. in a catch-up page); a late ack still has to reach the sender.
      if (e.kind === 'ack') this.#send({ type: 'ack', docId, clientMsgId: e.clientMsgId, seq: e.seq });
      return;
    }
    if (!sub.pending.has(e.seq) || e.kind === 'ack') sub.pending.set(e.seq, e);
    this.#drain(docId, sub);
  }

  #emit(docId: string, e: Pending) {
    if (e.kind === 'ack') this.#send({ type: 'ack', docId, clientMsgId: e.clientMsgId, seq: e.seq });
    else
      this.#send({
        type: 'update',
        docId,
        seq: e.seq,
        payload: e.payload,
        deviceId: e.deviceId,
        ...(e.author ? { author: e.author } : {}),
      });
  }

  /**
   * Deliver updates and acks strictly in seq order (sync-protocol.md §4, "Порядок"):
   * the client keeps lastSeq = max(seq), so nothing may overtake an earlier seq.
   * Concurrent writers may publish out of order (6 before 5); a missing seq is
   * always committed already (the doc row lock orders commits), so the gap is
   * filled from the database.
   */
  #drain(docId: string, sub: Subscription) {
    for (;;) {
      const next = sub.pending.get(sub.sent + 1);
      if (!next) break;
      sub.pending.delete(next.seq);
      sub.sent = next.seq;
      this.#emit(docId, next);
    }
    if (sub.pending.size === 0 || sub.filling) return;
    sub.filling = true;
    const upTo = Math.min(...sub.pending.keys());
    this.ctx.documents
      .range(this.ctx.database.db, docId, sub.sent, upTo)
      .then((rows) => {
        for (const r of rows) {
          if (r.seq !== sub.sent + 1 || sub.pending.has(r.seq)) break;
          sub.sent = r.seq;
          this.#send({ type: 'update', docId, ...item(r) });
        }
        // Gaps that are not in the database are allowed ("дыры" in seq): skip them.
        if (sub.pending.size > 0 && rows.length === 0) sub.sent = Math.min(...sub.pending.keys()) - 1;
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
    const author = this.#author();
    const r = await this.ctx.documents.append(this.ctx.database.db, { docId, payload: bytes, deviceId, clientMsgId, author });
    const sub = this.#subs.get(docId);
    // On a subscribed document the ack takes its place in seq order.
    if (sub) this.#enqueue(docId, sub, { kind: 'ack', seq: r.seq, clientMsgId });
    else this.#send({ type: 'ack', docId, clientMsgId, seq: r.seq });
    if (!r.duplicate) this.ctx.metrics.syncUpdates.inc({ source: this.#principal!.kind });
    if (!r.duplicate) this.ctx.documents.publishUpdate(docId, r.seq, payload, deviceId, author, this.id);
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
    if (baseSeq === 0) {
      // A snapshot of an empty history covers nothing: acknowledge, keep nothing.
      this.#send({ type: 'ack', docId, clientMsgId, seq: 0 });
      return;
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
        throw new SyncError('bad_request', err.message, clientMsgId);
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
