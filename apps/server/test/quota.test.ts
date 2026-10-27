import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COMPACT_JOB } from '../src/jobs/index.js';
import {
  KDF,
  SyncClient,
  api,
  b64,
  createNote,
  createNotebook,
  newId,
  rnd,
  signup,
  startServer,
  type TestServer,
  type TestUser,
} from './helpers.js';

// Security audit 2026-10-27, item 4: per-account storage quotas and the signup switch.
let s: TestServer;
let u: TestUser;
let notebookId: string;
beforeAll(async () => {
  s = await startServer({ USER_STORAGE_QUOTA_BYTES: '5000' });
  u = await signup(s);
  ({ notebookId } = await createNotebook(s, u));
});
afterAll(() => s.close());

const used = async (userId: string) => {
  const r = await s.ctx.database.db.execute<{ b: string }>(sql`SELECT storage_bytes AS b FROM users WHERE id = ${userId}`);
  return Number(r.rows[0]!.b);
};

describe('storage quota', () => {
  it('counts every write and refuses the one that would go over', async () => {
    const noteId = await createNote(s, u, notebookId);
    const base = await used(u.userId);
    const a = await SyncClient.user(s, u);
    for (let i = 0; i < 4; i++) expect((await a.push(noteId, rnd(1000))).type).toBe('ack');
    expect(await used(u.userId)).toBe(base + 4000);
    const over = await a.push(noteId, rnd(1000 + (5000 - base - 4000)));
    expect(over).toMatchObject({ type: 'error', code: 'payload_too_large', message: 'storage quota exceeded' });
    // Attachments count with their declared size.
    const att = await api(s, 'POST', '/attachments', {
      token: u.session.accessToken,
      body: { attachmentId: newId(), noteId, size: 4000, chunkCount: 1, mime: 'image/png' },
    });
    expect(att.status).toBe(413);
    // A snapshot still fits (10 % headroom), so the history can be compacted.
    a.send({ type: 'snapshot', docId: noteId, clientMsgId: 'snap', baseSeq: 4, payload: b64(rnd(300)) });
    expect(await a.next((m) => m.clientMsgId === 'snap' || m.ref === 'snap')).toMatchObject({ type: 'ack' });
    // Compaction and deletion give the space back.
    await s.ctx.database.db.execute(sql`UPDATE doc_updates SET created_at = now() - interval '30 days' WHERE doc_id = ${noteId}`);
    await s.jobs.run(COMPACT_JOB, { docId: noteId });
    expect(await used(u.userId)).toBe(base + 300);
    expect((await api(s, 'DELETE', `/docs/${noteId}`, { token: u.session.accessToken })).status).toBe(204);
    expect(await used(u.userId)).toBe(base);
    a.close();
  });

  it("charges a guest's writes to the owner", async () => {
    const owner = await signup(s);
    const { notebookId: nb } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, nb);
    const shareId = newId();
    await api(s, 'POST', '/shares', {
      token: owner.session.accessToken,
      body: { shareId, target: { kind: 'note', id: noteId }, permission: 'edit' },
    });
    const g = await api(s, 'POST', `/shares/${shareId}/guest`, { body: {} });
    const guest = await SyncClient.connect(s);
    guest.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'guest', shareId, guestToken: g.body.guestToken },
      deviceId: 'browser-1',
      client: { platform: 'web', version: '1' },
    });
    await guest.next((m) => m.type === 'welcome');
    await guest.subscribe(noteId);
    const before = await used(owner.userId);
    expect((await guest.push(noteId, rnd(2000))).type).toBe('ack');
    expect(await used(owner.userId)).toBe(before + 2000);
    expect((await guest.push(noteId, rnd(5000))).code).toBe('payload_too_large');
    guest.close();
  });
});

describe('signup switch and conflicts', () => {
  const body = (over: Record<string, unknown> = {}) => ({
    email: `x${newId().slice(-8)}@example.com`,
    salt: b64(rnd(16)),
    kdf: KDF,
    loginKey: b64(rnd(32)),
    recoveryLoginKey: b64(rnd(32)),
    wrappedMasterKeyPassword: b64(rnd(73)),
    wrappedMasterKeyRecovery: b64(rnd(73)),
    userId: newId(),
    accountDocId: newId(),
    ...over,
  });

  it('gives the same answer for every conflict (no email enumeration by message)', async () => {
    const taken = await api(s, 'POST', '/auth/signup', { body: body({ email: u.email }) });
    const docTaken = await api(s, 'POST', '/auth/signup', { body: body({ accountDocId: u.accountDocId }) });
    expect(taken.status).toBe(409);
    expect(docTaken.status).toBe(409);
    expect(taken.body).toEqual(docTaken.body);
    expect(JSON.stringify(taken.body)).not.toMatch(/email/i);
  });

  it('can be closed or need an invite code', async () => {
    const closed = await startServer({ DS_SIGNUP: 'closed' });
    try {
      const r = await api(closed, 'POST', '/auth/signup', { body: body() });
      expect(r.status).toBe(403);
    } finally {
      await closed.close();
    }
    const invite = await startServer({ DS_SIGNUP: 'invite', DS_INVITE_CODES: 'first-code, second-code' });
    try {
      expect((await api(invite, 'POST', '/auth/signup', { body: body() })).status).toBe(403);
      expect((await api(invite, 'POST', '/auth/signup', { body: body({ inviteCode: 'wrong' }) })).status).toBe(403);
      const ok = body({ inviteCode: 'second-code' });
      expect((await api(invite, 'POST', '/auth/signup', { body: ok })).status).toBe(200);
      // A retried signup of the same account (lost response) still works.
      expect((await api(invite, 'POST', '/auth/signup', { body: { ...ok, inviteCode: undefined } })).status).toBe(200);
    } finally {
      await invite.close();
    }
  });
});
