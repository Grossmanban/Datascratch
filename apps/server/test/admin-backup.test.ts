import { execFile } from 'node:child_process';
import { chmod, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BACKUP_STALE_HOURS, backupStatus } from '../src/ops/backup-status.js';
import { api, signup, startServer, type TestServer, type TestUser } from './helpers.js';

const run = promisify(execFile);
const backupScript = join(import.meta.dirname, '../../../infra/backup.sh');

// The admin screen's backup card (spec/06 «Эксплуатация», api.md «Администрирование»).
let s: TestServer;
let dir: string;
let admin: TestUser;
let other: TestUser;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ds-backup-status-'));
  s = await startServer({ DS_ADMIN_EMAILS: 'boss@example.com', BACKUP_STATUS_DIR: dir });
  admin = await signup(s, 'boss@example.com', '10.73.0.1');
  other = await signup(s, undefined, '10.73.0.2');
});
afterAll(async () => {
  await s.close();
  await rm(dir, { recursive: true, force: true });
});

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString().replace(/\.\d+Z$/, 'Z');
const get = (u: TestUser) => api(s, 'GET', '/admin/backup', { token: u.session.accessToken });

describe('GET /admin/backup', () => {
  it('only server admins; without a status yet: not available, stale', async () => {
    expect((await get(other)).status).toBe(403);
    expect((await api(s, 'GET', '/admin/backup')).status).toBe(401);
    const r = await get(admin);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ available: false, lastRun: null, lastSuccess: null, ageHours: null, stale: true });
  });

  it('a good backup 5 hours ago: sizes, count, age, not stale', async () => {
    const at = hoursAgo(5);
    await writeFile(join(dir, 'last-run.json'), JSON.stringify({ finishedAt: at, ok: true, error: null }));
    await writeFile(join(dir, 'last-success.json'), JSON.stringify({ finishedAt: at, dbBytes: 12_000_000, filesBytes: 345, count: 14 }));
    const r = await get(admin);
    expect(r.body).toMatchObject({
      available: true,
      lastRun: { ok: true, error: null },
      lastSuccess: { dbBytes: 12_000_000, filesBytes: 345, count: 14 },
      stale: false,
    });
    expect(r.body.ageHours).toBeCloseTo(5, 0);
  });

  it('stale when the last run failed or the last good one is older than 36 hours', async () => {
    await writeFile(join(dir, 'last-run.json'), JSON.stringify({ finishedAt: hoursAgo(1), ok: false, error: 'db' }));
    expect((await get(admin)).body).toMatchObject({ lastRun: { ok: false, error: 'db' }, stale: true });
    const now = Date.now();
    await writeFile(join(dir, 'last-run.json'), JSON.stringify({ finishedAt: hoursAgo(40), ok: true, error: null }));
    await writeFile(join(dir, 'last-success.json'), JSON.stringify({ finishedAt: hoursAgo(40), dbBytes: 1, filesBytes: null, count: 1 }));
    const st = await backupStatus(dir, now);
    expect(st.ageHours! > BACKUP_STALE_HOURS).toBe(true);
    expect(st.stale).toBe(true);
  });

  it('a broken status file is ignored, not an error', async () => {
    await writeFile(join(dir, 'last-run.json'), '{not json');
    await writeFile(join(dir, 'last-success.json'), JSON.stringify({ finishedAt: hoursAgo(2), dbBytes: -1 }));
    const r = await get(admin);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ available: false, lastRun: null, lastSuccess: null, stale: true });
  });
});

describe('infra/backup.sh writes the status', () => {
  /** backup.sh in a scratch directory, with a fake `docker` that "dumps" a few bytes (or fails). */
  async function runBackup(failAt?: 'pg_dump', statusBlocked = false) {
    const work = await mkdtemp(join(tmpdir(), 'ds-backup-sh-'));
    const bin = join(work, 'bin');
    await run('mkdir', ['-p', bin]);
    await copyFile(backupScript, join(work, 'backup.sh'));
    await writeFile(join(work, '.env'), 'POSTGRES_USER=ds\nDS_ADMIN_EMAILS=a@example.com, b@example.com\n');
    await writeFile(
      join(bin, 'docker'),
      `#!/usr/bin/env bash
case "$*" in
  *pg_dump*) ${failAt === 'pg_dump' ? 'exit 3' : 'printf "PGDMP-fake-dump"'} ;;
  *tar*) printf "fake-tar" ;;
  *pg_restore*) cat > /dev/null ;;
esac
`,
    );
    await chmod(join(bin, 'docker'), 0o755);
    // Unwritable status (e.g. created by Docker as root for the bind mount): a file where the
    // directory should be blocks even root.
    if (statusBlocked) await writeFile(join(work, 'backup-status'), 'not a directory');
    const res = await run('bash', [join(work, 'backup.sh')], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } }).then(
      (r) => ({ code: 0, ...r }),
      (e: { code: number; stdout: string; stderr: string }) => e,
    );
    const read = (f: string) => readFile(join(work, 'backup-status', f), 'utf8').then(JSON.parse, () => null);
    const out = { res, run: await read('last-run.json'), success: await read('last-success.json') };
    await rm(work, { recursive: true, force: true });
    return out;
  }

  it('a good run: last-run ok and last-success with sizes and count; nothing else in them', async () => {
    const { res, run: last, success } = await runBackup();
    expect(res.code).toBe(0);
    expect(res.stderr).not.toContain('command not found');
    expect(last).toEqual({ finishedAt: expect.stringMatching(/Z$/), ok: true, error: null });
    expect(success).toEqual({ finishedAt: last.finishedAt, dbBytes: 15, filesBytes: 8, count: 1 });
  });

  it('an unwritable status never fails the backup itself', async () => {
    const { res } = await runBackup(undefined, true);
    expect(res.code).toBe(0);
    expect(res.stderr).toContain('backup status not written');
    expect(res.stdout).toContain('done');
  });

  it('a failed dump: last-run says which step, no last-success', async () => {
    const { res, run: last, success } = await runBackup('pg_dump');
    expect(res.code).not.toBe(0);
    expect(last).toEqual({ finishedAt: expect.any(String), ok: false, error: 'db' });
    expect(success).toBeNull();
  });
});
