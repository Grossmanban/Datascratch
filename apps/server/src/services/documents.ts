import { and, asc, desc, eq, gt, lte, lt, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client.js';
import { docSnapshots, docUpdates, docs } from '../db/schema.js';
import { badRequest, notFound } from '../lib/errors.js';
import { toB64 } from '../lib/encoding.js';
import { topics, type Broadcaster } from '../sync/hub.js';

export interface AppendInput {
  docId: string;
  payload: Uint8Array;
  deviceId: string;
  clientMsgId?: string | null;
}

export interface AppendResult {
  seq: number;
  /** True if this clientMsgId was already accepted earlier (nothing was stored). */
  duplicate: boolean;
  /** Updates accepted since the newest snapshot (compaction hint). */
  updatesSinceSnapshot: number;
  bytesSinceSnapshot: number;
}

export interface SnapshotInput {
  docId: string;
  baseSeq: number;
  payload: Uint8Array;
  deviceId: string;
}

export interface CatchUpItem {
  seq: number;
  payload: Buffer;
  deviceId: string;
}

export interface CatchUpPage {
  snapshot: { seq: number; payload: Buffer } | null;
  items: CatchUpItem[];
  upToDate: boolean;
}

export interface RetentionPolicy {
  keepAllDays: number;
  dailyDays: number;
  weeklyDays: number;
  coveredUpdatesKeepDays: number;
}

const PAGE_ITEMS = 500;
const PAGE_BYTES = 4 * 1024 * 1024;
const DAY = 86_400_000;

function isUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  while (cur && typeof cur === 'object') {
    if ((cur as { code?: string }).code === '23505') return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Storage of encrypted Yjs updates and snapshots (sync-protocol.md). The server
 * never merges or reads payloads; it only orders them (seq), stores and relays.
 */
export class DocumentService {
  constructor(
    private readonly hub: Broadcaster,
    private readonly retention: RetentionPolicy,
  ) {}

  /** Append an update with the next seq. The doc row lock serializes writers per document. */
  async append(db: DbOrTx, input: AppendInput): Promise<AppendResult> {
    try {
      return await this.#append(db, input);
    } catch (e) {
      // A concurrent retry with the same clientMsgId won the race: report its seq.
      if (input.clientMsgId && isUniqueViolation(e)) return this.#append(db, input);
      throw e;
    }
  }

  async #append(db: DbOrTx, input: AppendInput): Promise<AppendResult> {
    return db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: docs.id })
        .from(docs)
        .where(eq(docs.id, input.docId))
        .for('update');
      if (!locked) throw notFound('document not registered');
      if (input.clientMsgId) {
        const [dup] = await tx
          .select({ seq: docUpdates.seq })
          .from(docUpdates)
          .where(
            and(
              eq(docUpdates.docId, input.docId),
              eq(docUpdates.deviceId, input.deviceId),
              eq(docUpdates.clientMsgId, input.clientMsgId),
            ),
          );
        if (dup) {
          const [d] = await tx.select().from(docs).where(eq(docs.id, input.docId));
          return {
            seq: dup.seq,
            duplicate: true,
            updatesSinceSnapshot: d!.updatesSinceSnapshot,
            bytesSinceSnapshot: d!.bytesSinceSnapshot,
          };
        }
      }
      const [row] = await tx
        .update(docs)
        .set({
          lastSeq: sql`${docs.lastSeq} + 1`,
          updatesSinceSnapshot: sql`${docs.updatesSinceSnapshot} + 1`,
          bytesSinceSnapshot: sql`${docs.bytesSinceSnapshot} + ${input.payload.byteLength}`,
          updatedAt: sql`now()`,
        })
        .where(eq(docs.id, input.docId))
        .returning({
          seq: docs.lastSeq,
          updatesSinceSnapshot: docs.updatesSinceSnapshot,
          bytesSinceSnapshot: docs.bytesSinceSnapshot,
        });
      await tx.insert(docUpdates).values({
        docId: input.docId,
        seq: row!.seq,
        payload: Buffer.from(input.payload),
        deviceId: input.deviceId,
        clientMsgId: input.clientMsgId ?? null,
      });
      return { ...row!, duplicate: false };
    });
  }

  /** Relay an accepted update to live subscribers (call after the transaction committed). */
  publishUpdate(docId: string, seq: number, payload: Uint8Array | string, deviceId: string, origin: string | null) {
    this.hub.publish(topics.doc(docId), {
      type: 'update',
      docId,
      seq,
      payload: typeof payload === 'string' ? payload : toB64(payload),
      deviceId,
      origin,
    });
  }

  /**
   * Store a client-built snapshot covering every update up to baseSeq.
   * Idempotent for the same (docId, baseSeq). Returns whether it became the newest snapshot.
   */
  async storeSnapshot(db: DbOrTx, input: SnapshotInput): Promise<{ newest: boolean }> {
    return db.transaction(async (tx) => {
      const [doc] = await tx.select().from(docs).where(eq(docs.id, input.docId)).for('update');
      if (!doc) throw notFound('document not registered');
      if (input.baseSeq < 1 || input.baseSeq > doc.lastSeq) throw badRequest('baseSeq out of range');
      await tx
        .insert(docSnapshots)
        .values({
          docId: input.docId,
          seq: input.baseSeq,
          payload: Buffer.from(input.payload),
          deviceId: input.deviceId,
        })
        .onConflictDoNothing();
      if (input.baseSeq <= doc.snapshotSeq) return { newest: false };
      const [after] = await tx
        .select({
          n: sql<number>`count(*)::int`,
          bytes: sql<number>`coalesce(sum(length(${docUpdates.payload})), 0)::bigint`,
        })
        .from(docUpdates)
        .where(and(eq(docUpdates.docId, input.docId), gt(docUpdates.seq, input.baseSeq)));
      await tx
        .update(docs)
        .set({
          snapshotSeq: input.baseSeq,
          updatesSinceSnapshot: after!.n,
          bytesSinceSnapshot: Number(after!.bytes),
          updatedAt: sql`now()`,
        })
        .where(eq(docs.id, input.docId));
      return { newest: true };
    });
  }

  /**
   * Catch-up for `subscribe { since }`, yielded in pages. If `since` is older than the
   * newest snapshot, that snapshot comes first and the pages continue after it.
   */
  async *catchUp(db: DbOrTx, docId: string, since: number): AsyncGenerator<CatchUpPage> {
    const [doc] = await db.select().from(docs).where(eq(docs.id, docId));
    if (!doc) throw notFound('document not registered');
    // A client ahead of the server (e.g. restored from another backup) starts over.
    let cursor = since > doc.lastSeq ? 0 : since;
    let snapshot: CatchUpPage['snapshot'] = null;
    // A client behind the newest snapshot always gets it first, then the updates after it
    // (not the updates in between): if some of those updates cannot be decrypted, the client
    // still heals from a later snapshot (sync-protocol §5).
    if (doc.snapshotSeq > cursor) {
      const [snap] = await db
        .select({ seq: docSnapshots.seq, payload: docSnapshots.payload })
        .from(docSnapshots)
        .where(eq(docSnapshots.docId, docId))
        .orderBy(desc(docSnapshots.seq))
        .limit(1);
      if (snap) {
        snapshot = snap;
        cursor = snap.seq;
      }
    }
    for (;;) {
      const rows = await db
        .select({ seq: docUpdates.seq, payload: docUpdates.payload, deviceId: docUpdates.deviceId })
        .from(docUpdates)
        .where(and(eq(docUpdates.docId, docId), gt(docUpdates.seq, cursor)))
        .orderBy(asc(docUpdates.seq))
        .limit(PAGE_ITEMS);
      const items: CatchUpItem[] = [];
      let bytes = snapshot?.payload.length ?? 0;
      for (const r of rows) {
        if (items.length > 0 && bytes + r.payload.length > PAGE_BYTES) break;
        items.push(r);
        bytes += r.payload.length;
      }
      if (items.length > 0) cursor = items[items.length - 1]!.seq;
      const upToDate = items.length === rows.length && rows.length < PAGE_ITEMS;
      yield { snapshot, items, upToDate };
      snapshot = null;
      if (upToDate) return;
    }
  }

  /**
   * Updates after `since` for many documents in one query (fast path of a first
   * sync). Callers must only pass documents whose updates after `since` are all
   * present (no snapshot newer than `since`) and few.
   */
  async updatesForMany(db: DbOrTx, docs: { docId: string; since: number }[]): Promise<Map<string, CatchUpItem[]>> {
    const out = new Map<string, CatchUpItem[]>(docs.map((d) => [d.docId, []]));
    if (docs.length === 0) return out;
    const ids = `{${docs.map((d) => d.docId).join(',')}}`;
    const sinces = `{${docs.map((d) => d.since).join(',')}}`;
    const res = await db.execute<{ doc_id: string; seq: string | number; payload: Buffer; device_id: string }>(sql`
      SELECT u.doc_id, u.seq, u.payload, u.device_id
      FROM unnest(${ids}::uuid[], ${sinces}::bigint[]) AS q(doc_id, since)
      JOIN doc_updates u ON u.doc_id = q.doc_id AND u.seq > q.since
      ORDER BY u.doc_id, u.seq`);
    for (const r of res.rows) {
      out.get(r.doc_id)!.push({ seq: Number(r.seq), payload: r.payload, deviceId: r.device_id });
    }
    return out;
  }

  /** The newest snapshot of each document (fast path of a first sync). */
  async latestSnapshots(db: DbOrTx, docIds: string[]): Promise<Map<string, { seq: number; payload: Buffer }>> {
    const out = new Map<string, { seq: number; payload: Buffer }>();
    if (docIds.length === 0) return out;
    const res = await db.execute<{ doc_id: string; seq: string | number; payload: Buffer }>(sql`
      SELECT DISTINCT ON (doc_id) doc_id, seq, payload
      FROM doc_snapshots
      WHERE doc_id = ANY(${`{${docIds.join(',')}}`}::uuid[])
      ORDER BY doc_id, seq DESC`);
    for (const r of res.rows) out.set(r.doc_id, { seq: Number(r.seq), payload: r.payload });
    return out;
  }

  /** Updates with after < seq < before, in order (gap filling for live delivery). */
  async range(db: DbOrTx, docId: string, after: number, before: number): Promise<CatchUpItem[]> {
    return db
      .select({ seq: docUpdates.seq, payload: docUpdates.payload, deviceId: docUpdates.deviceId })
      .from(docUpdates)
      .where(and(eq(docUpdates.docId, docId), gt(docUpdates.seq, after), lt(docUpdates.seq, before)))
      .orderBy(asc(docUpdates.seq));
  }

  async listVersions(db: DbOrTx, docId: string) {
    return db
      .select({ seq: docSnapshots.seq, createdAt: docSnapshots.createdAt, deviceId: docSnapshots.deviceId })
      .from(docSnapshots)
      .where(eq(docSnapshots.docId, docId))
      .orderBy(desc(docSnapshots.seq));
  }

  async getVersion(db: DbOrTx, docId: string, seq: number) {
    const [row] = await db
      .select({ payload: docSnapshots.payload })
      .from(docSnapshots)
      .where(and(eq(docSnapshots.docId, docId), eq(docSnapshots.seq, seq)));
    return row ?? null;
  }

  /**
   * Compaction and version-history retention (docs/spec/10-sync.md):
   *  - updates covered by the newest snapshot are deleted once older than coveredUpdatesKeepDays;
   *  - snapshots: the newest is always kept; all within keepAllDays; then one per day
   *    up to dailyDays, one per week up to weeklyDays, one per 30 days beyond.
   */
  async compact(db: DbOrTx, docId: string, now = new Date()): Promise<{ updates: number; snapshots: number }> {
    return db.transaction(async (tx) => {
      const [doc] = await tx.select().from(docs).where(eq(docs.id, docId)).for('update');
      if (!doc || doc.snapshotSeq === 0) return { updates: 0, snapshots: 0 };
      const cutoff = new Date(now.getTime() - this.retention.coveredUpdatesKeepDays * DAY);
      // Delete a prefix only, so the remaining updates stay contiguous.
      const [edge] = await tx
        .select({ seq: sql<number | null>`max(${docUpdates.seq})` })
        .from(docUpdates)
        .where(
          and(eq(docUpdates.docId, docId), lte(docUpdates.seq, doc.snapshotSeq), lt(docUpdates.createdAt, cutoff)),
        );
      let updates = 0;
      if (edge?.seq != null) {
        const del = await tx
          .delete(docUpdates)
          .where(and(eq(docUpdates.docId, docId), lte(docUpdates.seq, Number(edge.seq))))
          .returning({ seq: docUpdates.seq });
        updates = del.length;
      }
      const snaps = await tx
        .select({ seq: docSnapshots.seq, createdAt: docSnapshots.createdAt })
        .from(docSnapshots)
        .where(eq(docSnapshots.docId, docId))
        .orderBy(desc(docSnapshots.seq));
      const drop = selectSnapshotsToDrop(snaps, this.retention, now);
      for (const seq of drop) {
        await tx.delete(docSnapshots).where(and(eq(docSnapshots.docId, docId), eq(docSnapshots.seq, seq)));
      }
      return { updates, snapshots: drop.length };
    });
  }
}

/** Pure retention rule; `snaps` must be ordered newest first. */
export function selectSnapshotsToDrop(
  snaps: { seq: number; createdAt: Date }[],
  r: Pick<RetentionPolicy, 'keepAllDays' | 'dailyDays' | 'weeklyDays'>,
  now: Date,
): number[] {
  const drop: number[] = [];
  const seen = new Set<string>();
  snaps.forEach((s, i) => {
    const ageDays = (now.getTime() - s.createdAt.getTime()) / DAY;
    if (ageDays < r.keepAllDays) return;
    const day = Math.floor(s.createdAt.getTime() / DAY);
    const bucket =
      ageDays < r.dailyDays ? `d${day}` : ageDays < r.weeklyDays ? `w${Math.floor(day / 7)}` : `m${Math.floor(day / 30)}`;
    // The newest snapshot is never dropped (catch-up starts from it), but it claims its bucket.
    if (seen.has(bucket) && i > 0) drop.push(s.seq);
    else seen.add(bucket);
  });
  return drop;
}
