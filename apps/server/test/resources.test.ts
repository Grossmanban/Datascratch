import { readdir } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notebooks } from '../src/db/schema.js';
import { CLEANUP_JOB } from '../src/jobs/index.js';
import { eq } from 'drizzle-orm';
import {
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

let s: TestServer;
let u: TestUser;
beforeAll(async () => {
  s = await startServer();
  u = await signup(s);
});
afterAll(() => s.close());

const MiB = 1024 * 1024;

describe('notebooks', () => {
  it('creates private and agent notebooks; the server wraps the agent key', async () => {
    const t = u.session.accessToken;
    const id = newId();
    const wrappedKey = b64(rnd(73));
    const created = await api(s, 'POST', '/notebooks', { token: t, body: { notebookId: id, mode: 'private', wrappedKey } });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ id, mode: 'private', wrappedKey });
    const again = await api(s, 'POST', '/notebooks', { token: t, body: { notebookId: id, mode: 'private', wrappedKey } });
    expect(again.status).toBe(200);
    const clash = await api(s, 'POST', '/notebooks', {
      token: t,
      body: { notebookId: id, mode: 'private', wrappedKey: b64(rnd(73)) },
    });
    expect(clash.status).toBe(409);
    const noKey = await api(s, 'POST', '/notebooks', { token: t, body: { notebookId: newId(), mode: 'agent', wrappedKey } });
    expect(noKey.status).toBe(400);
    expect((await api(s, 'GET', `/notebooks/${id}/key`, { token: t })).body.wrappedKey).toBe(wrappedKey);

    const key = rnd(32);
    const { notebookId } = await createNotebook(s, u, { mode: 'agent', notebookKey: key });
    const [row] = await s.ctx.database.db.select().from(notebooks).where(eq(notebooks.id, notebookId));
    expect(row!.serverWrappedKey).not.toBeNull();
    expect(Buffer.from(await s.ctx.keys.unwrapNotebookKey(notebookId, row!.serverWrappedKey!))).toEqual(key);

    const off = await api(s, 'PATCH', `/notebooks/${notebookId}/mode`, { token: t, body: { mode: 'private' } });
    expect(off.body.mode).toBe('private');
    const [row2] = await s.ctx.database.db.select().from(notebooks).where(eq(notebooks.id, notebookId));
    expect(row2!.serverWrappedKey).toBeNull();
    const list = await api(s, 'GET', '/notebooks', { token: t });
    expect(list.body.map((n: any) => n.id)).toEqual(expect.arrayContaining([id, notebookId]));

    const other = await signup(s);
    expect((await api(s, 'GET', `/notebooks/${id}/key`, { token: other.session.accessToken })).status).toBe(404);
  });

  it('registers documents with ownership checks', async () => {
    const t = u.session.accessToken;
    const { notebookId } = await createNotebook(s, u);
    const noteId = newId();
    const reg = { docId: noteId, kind: 'note', notebookId };
    expect((await api(s, 'POST', '/docs', { token: t, body: reg })).status).toBe(204);
    expect((await api(s, 'POST', '/docs', { token: t, body: reg })).status).toBe(204);
    expect((await api(s, 'POST', '/docs', { token: t, body: { ...reg, kind: 'notebook' } })).status).toBe(400);
    expect(
      (await api(s, 'POST', '/docs', { token: t, body: { docId: u.accountDocId, kind: 'account', notebookId: null } }))
        .status,
    ).toBe(204);
    expect(
      (await api(s, 'POST', '/docs', { token: t, body: { docId: newId(), kind: 'account', notebookId: null } })).status,
    ).toBe(409);
    const other = await signup(s);
    expect(
      (await api(s, 'POST', '/docs', { token: other.session.accessToken, body: { docId: newId(), kind: 'note', notebookId } }))
        .status,
    ).toBe(404);
    // The account doc can be synced right after signup.
    const c = await SyncClient.user(s, u);
    expect((await c.push(u.accountDocId, rnd(10))).type).toBe('ack');
    expect((await c.push(notebookId, rnd(10))).type).toBe('ack');
    c.close();
  });

  it('deletes a notebook with all its documents', async () => {
    const t = u.session.accessToken;
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const c = await SyncClient.user(s, u);
    await c.push(noteId, rnd(10));
    expect((await api(s, 'DELETE', `/notebooks/${notebookId}`, { token: t })).status).toBe(204);
    expect((await c.push(noteId, rnd(10))).code).toBe('doc_not_found');
    expect((await api(s, 'GET', `/notebooks/${notebookId}/key`, { token: t })).status).toBe(404);
    c.close();
  });
});

describe('attachments', () => {
  it('uploads in chunks, resumes, downloads and deletes blobs', async () => {
    const t = u.session.accessToken;
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const attachmentId = newId();
    const c0 = rnd(MiB + 41);
    const c1 = rnd(1000);
    const size = c0.length + c1.length;
    const meta = { attachmentId, noteId, size, chunkCount: 2, mime: 'image/png' };
    expect((await api(s, 'POST', '/attachments', { token: t, body: meta })).status).toBe(204);
    expect((await api(s, 'POST', '/attachments', { token: t, body: meta })).status).toBe(204);
    expect((await api(s, 'POST', '/attachments', { token: t, body: { ...meta, size: 10 } })).status).toBe(400);
    const tooBig = await api(s, 'POST', '/attachments', {
      token: t,
      body: { ...meta, attachmentId: newId(), size: 300 * MiB, chunkCount: 300 },
    });
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.error.code).toBe('payload_too_large');

    expect((await api(s, 'PUT', `/attachments/${attachmentId}/chunks/1`, { token: t, binary: c1 })).status).toBe(204);
    const status = await api(s, 'GET', `/attachments/${attachmentId}`, { token: t });
    expect(status.body).toEqual({ size, chunkCount: 2, mime: 'image/png', uploadedChunks: [1] });
    expect((await api(s, 'PUT', `/attachments/${attachmentId}/chunks/0`, { token: t, binary: rnd(100) })).status).toBe(400);
    expect((await api(s, 'PUT', `/attachments/${attachmentId}/chunks/2`, { token: t, binary: c1 })).status).toBe(400);
    expect((await api(s, 'PUT', `/attachments/${attachmentId}/chunks/0`, { token: t, binary: c0 })).status).toBe(204);
    const done = await api(s, 'GET', `/attachments/${attachmentId}`, { token: t });
    expect(done.body.uploadedChunks).toEqual([0, 1]);
    const got = await api(s, 'GET', `/attachments/${attachmentId}/chunks/0`, { token: t });
    expect(got.status).toBe(200);
    expect(got.raw.equals(c0)).toBe(true);

    const other = await signup(s);
    expect((await api(s, 'GET', `/attachments/${attachmentId}`, { token: other.session.accessToken })).status).toBe(404);

    const dir = s.ctx.config.STORAGE_DIR;
    expect(await readdir(`${dir}/att/${attachmentId}`)).toHaveLength(2);
    expect((await api(s, 'DELETE', `/attachments/${attachmentId}`, { token: t })).status).toBe(204);
    await s.jobs.run(CLEANUP_JOB, {});
    expect(await readdir(`${dir}/att/${attachmentId}`)).toHaveLength(0);
    expect((await api(s, 'GET', `/attachments/${attachmentId}`, { token: t })).status).toBe(404);
  });
});

describe('shares and guests', () => {
  it('lets guests read and write shared documents only, and revocation disconnects them', async () => {
    const t = u.session.accessToken;
    const { notebookId } = await createNotebook(s, u);
    const shared = await createNote(s, u, notebookId);
    const notShared = await createNote(s, u, notebookId);
    const owner = await SyncClient.user(s, u);
    await owner.push(shared, rnd(10));

    const shareId = newId();
    const share = await api(s, 'POST', '/shares', {
      token: t,
      body: { shareId, target: { kind: 'note', id: shared }, permission: 'edit' },
    });
    expect(share.status).toBe(200);
    expect(share.body).toMatchObject({ id: shareId, permission: 'edit', expiresAt: null });
    expect((await api(s, 'GET', '/shares', { token: t })).body.map((x: any) => x.id)).toContain(shareId);

    const g = await api(s, 'POST', `/shares/${shareId}/guest`, { body: {} });
    expect(g.status).toBe(200);
    expect(g.body).toMatchObject({ target: { kind: 'note', id: shared }, permission: 'edit', docIds: [shared] });

    const guest = await SyncClient.connect(s);
    guest.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'guest', shareId, guestToken: g.body.guestToken },
      deviceId: 'browser-1',
      client: { platform: 'web', version: '1' },
    });
    expect((await guest.next((m) => m.type === 'welcome')).userId).toBeNull();
    const sub = await guest.subscribe(shared);
    expect(sub.pages[0].items).toHaveLength(1);
    expect((await guest.subscribe(notShared)).error.code).toBe('doc_not_found');
    await owner.subscribe(shared, 1);
    expect((await guest.push(shared, rnd(5))).type).toBe('ack');
    const upd = await owner.next((m) => m.type === "update");
    expect(upd.deviceId).toMatch(/^guest:[A-Za-z0-9_-]{22}$/);
    // The share id is the link: it is never shown, only an opaque stable id (audit 2026-11-02).
    expect(upd.author.kind).toBe('guest');
    expect(upd.author.shareId).not.toBe(shareId);
    expect(upd.author.shareId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(JSON.stringify((await owner.subscribe(shared)).pages)).not.toContain(shareId);

    // Guests can upload attachments to the shared note with their token.
    const att = newId();
    expect(
      (
        await api(s, 'POST', '/attachments', {
          token: g.body.guestToken,
          body: { attachmentId: att, noteId: shared, size: 100, chunkCount: 1, mime: 'image/png' },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await api(s, 'POST', '/attachments', {
          token: g.body.guestToken,
          body: { attachmentId: newId(), noteId: notShared, size: 100, chunkCount: 1, mime: 'image/png' },
        })
      ).status,
    ).toBe(404);

    expect((await api(s, 'DELETE', `/shares/${shareId}`, { token: t })).status).toBe(204);
    expect((await guest.next((m) => m.type === 'error')).code).toBe('unauthorized');
    expect((await guest.waitClose()).code).toBe(4401);
    expect((await api(s, 'POST', `/shares/${shareId}/guest`, { body: {} })).status).toBe(404);
    owner.close();
  });

  it('revoking a link flags a key rotation; a guest gets the key chain (audit 2026-11-02)', async () => {
    const t = u.session.accessToken;
    const { notebookId } = await createNotebook(s, u);
    const shareId = newId();
    await api(s, 'POST', '/shares', { token: t, body: { shareId, target: { kind: 'notebook', id: notebookId }, permission: 'view' } });
    const g = await api(s, 'POST', `/shares/${shareId}/guest`, { body: {} });
    expect(g.body).toMatchObject({ keyVersion: 1, keyChain: [] });
    expect((await api(s, 'DELETE', `/shares/${shareId}`, { token: t })).status).toBe(204);
    const mine = (await api(s, 'GET', '/shared-by-me', { token: t })).body.find((x: any) => x.target.id === notebookId);
    expect(mine).toMatchObject({ keyRotationPending: true, pendingSinceVersion: 1 });
    // After the rotation a new link's guest gets the chain of older keys.
    await api(s, 'POST', `/members/notebook/${notebookId}/rotate`, {
      token: t,
      body: { version: 2, ownerWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)), memberKeys: [] },
    });
    const again = newId();
    await api(s, 'POST', '/shares', { token: t, body: { shareId: again, target: { kind: 'notebook', id: notebookId }, permission: 'view' } });
    const g2 = await api(s, 'POST', `/shares/${again}/guest`, { body: {} });
    expect(g2.body.keyVersion).toBe(2);
    expect(g2.body.keyChain).toHaveLength(1);
  });

  it('leaving agent mode, or a note leaving an agent notebook, flags a key rotation (audit 2026-11-02)', async () => {
    const t = u.session.accessToken;
    const { notebookId: agentNb } = await createNotebook(s, u, { mode: 'agent' });
    const { notebookId: privateNb } = await createNotebook(s, u);
    const noteId = await createNote(s, u, agentNb);
    expect((await api(s, 'PATCH', `/docs/${noteId}`, { token: t, body: { notebookId: privateNb } })).status).toBe(204);
    const byMe = async () => (await api(s, 'GET', '/shared-by-me', { token: t })).body as any[];
    expect((await byMe()).find((x) => x.target.id === noteId)).toMatchObject({ keyRotationPending: true, pendingSinceVersion: 1 });
    expect((await api(s, 'PATCH', `/notebooks/${agentNb}/mode`, { token: t, body: { mode: 'private' } })).status).toBe(200);
    expect((await byMe()).find((x) => x.target.id === agentNb)).toMatchObject({ keyRotationPending: true });
    // Private to private moves change nothing.
    const other = await createNote(s, u, privateNb);
    const { notebookId: second } = await createNotebook(s, u);
    await api(s, 'PATCH', `/docs/${other}`, { token: t, body: { notebookId: second } });
    expect((await byMe()).find((x) => x.target.id === other)).toBeUndefined();
  });

  it('view-only guests cannot push; notebook shares include every note', async () => {
    const t = u.session.accessToken;
    const { notebookId } = await createNotebook(s, u);
    const n1 = await createNote(s, u, notebookId);
    const shareId = newId();
    await api(s, 'POST', '/shares', {
      token: t,
      body: { shareId, target: { kind: 'notebook', id: notebookId }, permission: 'view' },
    });
    const n2 = await createNote(s, u, notebookId);
    const g = await api(s, 'POST', `/shares/${shareId}/guest`, { body: {} });
    expect(g.body.docIds).toEqual([notebookId, n1, n2]);
    const guest = await SyncClient.connect(s);
    guest.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'guest', shareId, guestToken: g.body.guestToken },
      deviceId: 'b',
      client: { platform: 'web', version: '1' },
    });
    await guest.next((m) => m.type === 'welcome');
    expect((await guest.subscribe(n2)).error).toBeNull();
    expect((await guest.push(n2, rnd(5))).code).toBe('forbidden');
    guest.close();
  });

  it('rejects past expiry and foreign targets', async () => {
    const t = u.session.accessToken;
    const past = await api(s, 'POST', '/shares', {
      token: t,
      body: { shareId: newId(), target: { kind: 'note', id: newId() }, permission: 'view', expiresAt: '2020-01-01T00:00:00Z' },
    });
    expect(past.status).toBe(400);
    const missing = await api(s, 'POST', '/shares', {
      token: t,
      body: { shareId: newId(), target: { kind: 'note', id: newId() }, permission: 'view' },
    });
    expect(missing.status).toBe(404);
  });
});
