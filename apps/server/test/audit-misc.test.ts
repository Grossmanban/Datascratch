import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { chunkKey } from '../src/storage/index.js';
import { SyncClient, api, createNote, createNotebook, newId, rnd, signup, startServer, type TestServer, type TestUser } from './helpers.js';

// Security audit 2026-10-27, items 10 and 11.
let s: TestServer;
let u: TestUser;
beforeAll(async () => {
  s = await startServer();
  u = await signup(s);
});
afterAll(() => s.close());

describe('attachment chunk vs. a concurrent delete', () => {
  it('queues the blob for deletion when the attachment disappears mid-upload', async () => {
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const attachmentId = newId();
    const t = u.session.accessToken;
    const chunk = rnd(100);
    expect(
      (await api(s, 'POST', '/attachments', { token: t, body: { attachmentId, noteId, size: chunk.length, chunkCount: 1, mime: 'image/png' } }))
        .status,
    ).toBe(204);
    // The note (and its attachment) is deleted right after the blob is written.
    const put = s.ctx.storage.put.bind(s.ctx.storage);
    const spy = vi.spyOn(s.ctx.storage, 'put').mockImplementation(async (key, data) => {
      await put(key, data);
      await s.ctx.database.db.execute(sql`DELETE FROM attachments WHERE id = ${attachmentId}`);
    });
    const res = await api(s, 'PUT', `/attachments/${attachmentId}/chunks/0`, { token: t, binary: Buffer.from(chunk) });
    spy.mockRestore();
    expect(res.status).toBe(404);
    // The cleanup job removed the orphaned blob.
    await s.jobs.drain();
    expect(await s.ctx.storage.get(chunkKey(attachmentId, 0))).toBeNull();
    const trash = await s.ctx.database.db.execute<{ key: string }>(sql`SELECT key FROM storage_trash`);
    expect(trash.rows).toEqual([]);
  });
});

describe('share ids', () => {
  it('accepts only UUIDv7 share ids, in REST and in sync', async () => {
    for (const bad of ['1', '00000000-0000-4000-8000-000000000000', 'not-a-uuid', '../../etc']) {
      expect((await api(s, 'POST', `/shares/${encodeURIComponent(bad)}/guest`, { body: {} })).status, bad).toBe(400);
    }
    const c = await SyncClient.connect(s);
    c.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'guest', shareId: '00000000-0000-4000-8000-000000000000', guestToken: 'x' },
      deviceId: 'd',
      client: { platform: 'web', version: '1' },
    });
    expect((await c.waitClose(2000)).code).toBe(4400);
  });
});
