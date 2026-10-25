import { and, asc, gt, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import type { AppContext } from '../context.js';
import {
  attachments,
  devices,
  docs,
  oauthCodes,
  oauthTokens,
  recoveryTokens,
  refreshTokens,
  storageTrash,
} from '../db/schema.js';

export const COMPACT_JOB = 'doc-compact';
export const CLEANUP_JOB = 'cleanup';
export const HISTORY_SWEEP_JOB = 'history-sweep';

const DAY_MS = 86_400_000;
const STALE_UPLOAD_DAYS = 7;
const REVOKED_DEVICE_KEEP_DAYS = 30;

/** Delete blobs whose DB rows are gone, and expired auth rows. */
export async function runCleanup(ctx: AppContext): Promise<{ blobs: number }> {
  const { db } = ctx.database;
  const now = Date.now();
  // Incomplete uploads that were abandoned (their chunks go to storage_trash via trigger).
  await db
    .delete(attachments)
    .where(and(isNull(attachments.completedAt), lt(attachments.createdAt, new Date(now - STALE_UPLOAD_DAYS * DAY_MS))));
  await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date(now)));
  await db.delete(oauthCodes).where(lt(oauthCodes.expiresAt, new Date(now)));
  await db.delete(oauthTokens).where(lt(oauthTokens.expiresAt, new Date(now)));
  await db
    .delete(recoveryTokens)
    .where(or(lt(recoveryTokens.expiresAt, new Date(now)), isNotNull(recoveryTokens.usedAt)));
  await db
    .delete(devices)
    .where(and(isNotNull(devices.revokedAt), lt(devices.revokedAt, new Date(now - REVOKED_DEVICE_KEEP_DAYS * DAY_MS))));

  let blobs = 0;
  for (;;) {
    const batch = await db.select().from(storageTrash).orderBy(asc(storageTrash.id)).limit(200);
    if (batch.length === 0) break;
    const done: number[] = [];
    for (const item of batch) {
      try {
        await ctx.storage.delete(item.key);
        done.push(item.id);
      } catch (err) {
        ctx.log.warn({ err, key: item.key }, 'blob delete failed; will retry');
      }
    }
    if (done.length === 0) break;
    await db.delete(storageTrash).where(inArray(storageTrash.id, done));
    blobs += done.length;
  }
  return { blobs };
}

/** Apply the history retention policy to every document that has snapshots. */
export async function runHistorySweep(ctx: AppContext): Promise<void> {
  const { db } = ctx.database;
  let after = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const rows = await db
      .select({ id: docs.id })
      .from(docs)
      .where(and(gt(docs.snapshotSeq, 0), sql`${docs.id} > ${after}::uuid`))
      .orderBy(asc(docs.id))
      .limit(500);
    if (rows.length === 0) return;
    for (const r of rows) await ctx.documents.compact(db, r.id);
    after = rows[rows.length - 1]!.id;
  }
}

export async function registerJobs(ctx: AppContext): Promise<void> {
  await ctx.jobs.register<{ docId: string }>(
    COMPACT_JOB,
    async ({ docId }) => {
      await ctx.documents.compact(ctx.database.db, docId);
    },
    { policy: 'short', concurrency: 2 },
  );
  await ctx.jobs.register(CLEANUP_JOB, async () => {
    await runCleanup(ctx);
  }, { policy: 'short' });
  await ctx.jobs.register(HISTORY_SWEEP_JOB, async () => {
    await runHistorySweep(ctx);
  }, { policy: 'short' });
  await ctx.jobs.schedule(CLEANUP_JOB, '17 * * * *');
  await ctx.jobs.schedule(HISTORY_SWEEP_JOB, '43 3 * * *');
}
