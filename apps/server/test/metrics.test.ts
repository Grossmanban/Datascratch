import { afterAll, beforeAll, expect, it } from 'vitest';
import { SyncClient, createNote, createNotebook, rnd, signup, startServer, type TestServer } from './helpers.js';

let s: TestServer;
const TOKEN = 'metrics-secret-0123456789';
beforeAll(async () => {
  s = await startServer({ METRICS_TOKEN: TOKEN });
});
afterAll(() => s.close());

it('exposes Prometheus metrics behind a token', async () => {
  const u = await signup(s);
  const { notebookId } = await createNotebook(s, u);
  const noteId = await createNote(s, u, notebookId);
  const c = await SyncClient.user(s, u);
  await c.push(noteId, rnd(10));

  expect((await s.app.inject({ method: 'GET', url: '/metrics' })).statusCode).toBe(401);
  const res = await s.app.inject({ method: 'GET', url: '/metrics', headers: { authorization: `Bearer ${TOKEN}` } });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('ds_sync_connections 1');
  expect(res.body).toMatch(/ds_sync_updates_total\{source="user"\} 1/);
  expect(res.body).toMatch(/ds_http_requests_total\{method="POST",status="2xx"\} \d+/);
  expect(res.body).toContain('ds_db_pool_total');
  c.close();
});

it('is absent without a token configured', async () => {
  const other = await startServer();
  expect((await other.app.inject({ method: 'GET', url: '/metrics' })).statusCode).toBe(404);
  await other.close();
});
