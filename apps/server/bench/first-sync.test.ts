// Benchmark (not part of the regular suite): first sync of N notes on a new device.
// Run: BENCH_NOTES=10000 pnpm vitest run --config bench/vitest.config.ts
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { SyncClient, createNotebook, rnd, signup, startServer, type TestServer, type TestUser } from '../test/helpers.js';
import { uuidv7 } from '../src/lib/encoding.js';

const N = Number(process.env.BENCH_NOTES ?? 10_000);
const UPDATES_PER_NOTE = Number(process.env.BENCH_UPDATES ?? 3);
/** Each note has a snapshot (~3 KB) covering all but its last update. */
const WITH_SNAPSHOT = process.env.BENCH_SNAPSHOT !== '0';
let s: TestServer;
let u: TestUser;

beforeAll(async () => {
  s = await startServer();
  u = await signup(s);
});
afterAll(() => s.close());

it(`first sync of ${N} notes`, async () => {
  const { notebookId } = await createNotebook(s, u);
  const ids = Array.from({ length: N }, () => uuidv7());
  const db = s.ctx.database.db;
  const t0 = Date.now();
  for (let i = 0; i < N; i += 1000) {
    const chunk = `{${ids.slice(i, i + 1000).join(',')}}`;
    await db.execute(sql`INSERT INTO docs (id, user_id, kind, notebook_id, last_seq)
      SELECT unnest(${chunk}::uuid[]), ${u.userId}::uuid, 'note', ${notebookId}::uuid, ${UPDATES_PER_NOTE}`);
    for (let k = 1; k <= UPDATES_PER_NOTE; k++) {
      await db.execute(sql`INSERT INTO doc_updates (doc_id, seq, payload, device_id)
        SELECT unnest(${chunk}::uuid[]), ${k}, ${rnd(300)}, 'seed'`);
    }
    if (WITH_SNAPSHOT && UPDATES_PER_NOTE > 1) {
      await db.execute(sql`INSERT INTO doc_snapshots (doc_id, seq, payload, device_id)
        SELECT unnest(${chunk}::uuid[]), ${UPDATES_PER_NOTE - 1}, ${rnd(3000)}, 'seed'`);
      await db.execute(sql`UPDATE docs SET snapshot_seq = ${UPDATES_PER_NOTE - 1} WHERE id = ANY(${chunk}::uuid[])`);
    }
  }
  console.log(`seeded ${N} notes × ${UPDATES_PER_NOTE} updates${WITH_SNAPSHOT ? ' + snapshot' : ''} in ${Date.now() - t0} ms`);

  const c = await SyncClient.user(s, u);
  const start = Date.now();
  const pending = new Set(ids);
  const done = new Promise<void>((resolve) => {
    c.ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'updates' && m.upToDate) {
        pending.delete(m.docId);
        if (pending.size === 0) resolve();
      }
    });
  });
  // One subscribe for every document, like SyncClient.addDocs of @datascratch/shared.
  c.send({ type: 'subscribe', docs: ids.map((docId) => ({ docId, since: 0 })) });
  await done;
  const ms = Date.now() - start;
  console.log(`first sync of ${N} notes: ${ms} ms (${Math.round(N / (ms / 1000))} docs/s)`);
  c.close();
  expect(ms).toBeLessThan(60_000);
}, 300_000);
