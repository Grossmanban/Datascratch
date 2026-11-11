import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * Status of the nightly backup (spec/06 «Эксплуатация»), written by infra/backup.sh into a
 * directory the server container sees read-only: `last-run.json` after every run, and
 * `last-success.json` after a good one. Sizes and times only — no paths, no host.
 */
const lastRun = z.object({
  finishedAt: z.string(),
  ok: z.boolean(),
  /** The step that failed (db, files, check, prune) or null. */
  error: z.string().max(40).nullable(),
});
const lastSuccess = z.object({
  finishedAt: z.string(),
  dbBytes: z.number().int().nonnegative(),
  filesBytes: z.number().int().nonnegative().nullable(),
  count: z.number().int().nonnegative(),
});

/** Older than this, or a failed last run: the admin sees it in red. */
export const BACKUP_STALE_HOURS = 36;

export const BackupStatus = z.object({
  /** false: the server has no status directory (not deployed with infra/deploy, or no backup yet). */
  available: z.boolean(),
  lastRun: lastRun.nullable(),
  lastSuccess: lastSuccess.nullable(),
  /** Hours since the last good backup (one decimal), null without one. */
  ageHours: z.number().nullable(),
  /** No good backup within BACKUP_STALE_HOURS, or the last run failed. */
  stale: z.boolean(),
});
export type BackupStatus = z.infer<typeof BackupStatus>;

async function readJson<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const parsed = schema.safeParse(JSON.parse(await readFile(path, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function backupStatus(dir: string, now = Date.now()): Promise<BackupStatus> {
  if (!dir) return { available: false, lastRun: null, lastSuccess: null, ageHours: null, stale: true };
  const [run, success] = await Promise.all([
    readJson(join(dir, 'last-run.json'), lastRun),
    readJson(join(dir, 'last-success.json'), lastSuccess),
  ]);
  const at = success ? Date.parse(success.finishedAt) : NaN;
  const ageHours = Number.isFinite(at) ? Math.max(0, Math.round((now - at) / 360_000) / 10) : null;
  const stale = ageHours === null || ageHours > BACKUP_STALE_HOURS || run?.ok === false;
  return { available: run !== null || success !== null, lastRun: run, lastSuccess: success, ageHours, stale };
}
