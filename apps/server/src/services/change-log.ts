import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { serverMeta } from '../db/schema.js';

/**
 * Change-log positions of sync protocol 3 (`resume`, sync-protocol.md §3.1).
 *
 * Every change an account's devices must hear about on `resume` gets a position: an accepted
 * update (`docs.changed_pos`) and a document becoming readable or unreadable for an account
 * (`user_docs`). Positions only grow. A cursor handed to a client must be a position up to which
 * **every** change is committed and visible, so positions are allocated here, in process memory,
 * and each one stays "in flight" until the transaction that wrote it has committed or rolled
 * back; the cursor is the position just below the oldest one in flight.
 *
 * One server process per database: positions and the in-flight set live in this process (like
 * the in-memory hub, sync/hub.ts). Several processes would need a watermark held in the database.
 *
 * Positions follow the clock (microseconds since 1970) and are never below the largest stored
 * one, so a restart never hands out a position at or below a cursor issued before it.
 */
export class ChangeLog {
  readonly #db: Db;
  readonly #als = new AsyncLocalStorage<Set<number>>();
  readonly #inFlight = new Map<number, number>();
  #last = 0;
  #epoch = '';
  #ready: Promise<void> | null = null;

  constructor(db: Db) {
    this.#db = db;
  }

  /** Load the database epoch and the largest stored position (once). */
  ready(): Promise<void> {
    this.#ready ??= this.#init().catch((err) => {
      this.#ready = null;
      throw err;
    });
    return this.#ready;
  }

  async #init() {
    const fresh = randomBytes(9).toString('base64url');
    await this.#db.insert(serverMeta).values({ key: 'change_log_epoch', value: fresh }).onConflictDoNothing();
    const res = await this.#db.execute<{ epoch: string; max: string | number | null }>(sql`
      SELECT (SELECT value FROM server_meta WHERE key = 'change_log_epoch') AS epoch,
             greatest(
               (SELECT max(changed_pos) FROM docs),
               (SELECT max(granted_pos) FROM user_docs),
               (SELECT max(removed_pos) FROM user_docs)
             ) AS max`);
    const row = res.rows[0]!;
    this.#epoch = row.epoch;
    this.#last = Math.max(this.#last, Number(row.max ?? 0));
  }

  get epoch(): string {
    return this.#epoch;
  }

  /**
   * Run `fn` (one or more transactions) so that every position allocated inside it stays in
   * flight until `fn` has finished — after its transactions committed or rolled back. Nested
   * calls share the outer scope.
   */
  async scope<T>(fn: () => Promise<T>): Promise<T> {
    if (this.#als.getStore()) return fn();
    await this.ready();
    const held = new Set<number>();
    try {
      return await this.#als.run(held, fn);
    } finally {
      for (const p of held) this.#release(p);
    }
  }

  /** A new position, in flight until the enclosing scope ends. Only inside `scope`. */
  allocate(): number {
    const held = this.#als.getStore();
    if (!held) throw new Error('ChangeLog.allocate outside scope()');
    const pos = Math.max(this.#last + 1, Date.now() * 1000);
    this.#last = pos;
    held.add(pos);
    this.#inFlight.set(pos, (this.#inFlight.get(pos) ?? 0) + 1);
    return pos;
  }

  #release(pos: number) {
    const n = (this.#inFlight.get(pos) ?? 1) - 1;
    if (n <= 0) this.#inFlight.delete(pos);
    else this.#inFlight.set(pos, n);
  }

  /** The newest position up to which every change is committed (the next cursor). */
  watermark(): number {
    if (this.#inFlight.size === 0) return this.#last;
    let min = Infinity;
    for (const p of this.#inFlight.keys()) if (p < min) min = p;
    return min - 1;
  }

  /** Largest position handed out so far (a cursor above it comes from elsewhere). */
  get last(): number {
    return this.#last;
  }
}

/** A resume cursor: `<epoch>.<pos>.<issuedAtSec>` (opaque to clients). */
export interface ResumeCursor {
  epoch: string;
  pos: number;
  issuedAtSec: number;
}

export function formatCursor(c: ResumeCursor): string {
  return `${c.epoch}.${c.pos}.${c.issuedAtSec}`;
}

export function parseCursor(s: string): ResumeCursor | null {
  const m = /^([A-Za-z0-9_-]{1,64})\.(\d{1,16})\.(\d{1,12})$/.exec(s);
  if (!m) return null;
  const pos = Number(m[2]);
  const issuedAtSec = Number(m[3]);
  if (!Number.isSafeInteger(pos) || !Number.isSafeInteger(issuedAtSec)) return null;
  return { epoch: m[1]!, pos, issuedAtSec };
}
