import pino from 'pino';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PgBossQueue } from '../src/jobs/queue.js';
import { startServer, sleep, type TestServer } from './helpers.js';

let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

it('runs jobs through pg-boss on PostgreSQL', async () => {
  const q = await PgBossQueue.start(s.ctx.config.DATABASE_URL, pino({ level: 'silent' }));
  const seen: string[] = [];
  await q.register<{ v: string }>('test-job', async ({ v }) => {
    seen.push(v);
  });
  await q.enqueue('test-job', { v: 'a' });
  await q.schedule('test-job', '0 0 * * *', { v: 'cron' });
  for (let i = 0; i < 100 && seen.length === 0; i++) await sleep(100);
  await q.stop();
  expect(seen).toEqual(['a']);
});
