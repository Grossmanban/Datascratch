import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  SyncClient,
  api,
  b64,
  createNote,
  createNotebook,
  newId,
  rnd,
  signup,
  sleep,
  startServer,
  type TestServer,
  type TestUser,
} from './helpers.js';

// D-54: account sharing (api.md «Совместный доступ», crypto.md §10, sync-protocol.md §6).
let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

const call = (u: TestUser, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api(s, method, path, { token: u.session.accessToken, ...(body !== undefined ? { body } : {}) });

async function withBoxKey(u: TestUser) {
  const r = await call(u, 'PUT', '/me/box-key', { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) });
  expect(r.status).toBe(204);
  return u;
}

/** Many accounts: each from its own address, below the per-address signup limit. */
let accounts = 0;
const address = () => `10.54.${Math.floor(accounts / 200)}.${(accounts++ % 200) + 1}`;

async function user() {
  return withBoxKey(await signup(s, undefined, address()));
}

type Kind = 'notebook' | 'note';

/** Bytes counted against an account's quota. */
async function storage(u: TestUser): Promise<number> {
  const r = await s.ctx.database.db.execute<{ b: string }>(sql`SELECT storage_bytes AS b FROM users WHERE id = ${u.userId}`);
  return Number(r.rows[0]!.b);
}

async function invite(owner: TestUser, target: { kind: Kind; id: string }, email: string, role: 'editor' | 'viewer') {
  const invitationId = newId();
  const r = await call(owner, 'POST', '/invitations', { invitationId, target, email, role });
  expect(r.status).toBe(204);
  return invitationId;
}

/** Invite, accept and give the key: an active member. */
async function share(owner: TestUser, target: { kind: Kind; id: string }, member: TestUser, role: 'editor' | 'viewer') {
  const id = await invite(owner, target, member.email, role);
  const accepted = await call(member, 'POST', `/invitations/${id}/accept`, {});
  expect(accepted.status).toBe(200);
  const key = await call(owner, 'PUT', `/members/${target.kind}/${target.id}/${member.userId}/key`, {
    version: accepted.body.keyVersion,
    wrappedKey: b64(rnd(73)),
  });
  expect(key.status).toBe(204);
  return accepted.body;
}

describe('account key pair', () => {
  it('is set once; the same pair again is fine, another one is refused', async () => {
    const u = await signup(s, undefined, address());
    expect((await call(u, 'GET', '/me/box-key')).status).toBe(404);
    const pair = { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) };
    expect((await call(u, 'PUT', '/me/box-key', pair)).status).toBe(204);
    expect((await call(u, 'PUT', '/me/box-key', pair)).status).toBe(204);
    expect((await call(u, 'PUT', '/me/box-key', { ...pair, publicKey: b64(rnd(32)) })).status).toBe(409);
    expect((await call(u, 'GET', '/me/box-key')).body).toEqual(pair);
  });

  it('public keys only of accounts sharing something, else a 404 like a missing account', async () => {
    const owner = await user();
    const member = await user();
    const stranger = await user();
    const { notebookId } = await createNotebook(s, owner);
    await share(owner, { kind: 'notebook', id: notebookId }, member, 'viewer');
    expect((await call(owner, 'GET', `/users/${member.userId}/public-key`)).status).toBe(200);
    expect((await call(member, 'GET', `/users/${owner.userId}/public-key`)).status).toBe(200);
    const hidden = await call(stranger, 'GET', `/users/${owner.userId}/public-key`);
    const missing = await call(stranger, 'GET', `/users/${newId()}/public-key`);
    expect(hidden.status).toBe(404);
    expect(hidden.body).toEqual(missing.body);
  });
});

describe('invitations', () => {
  it('answer the same whether the email has an account or not; only the owner invites', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId } = await createNotebook(s, owner);
    const target = { kind: 'notebook', id: notebookId };
    const known = await call(owner, 'POST', '/invitations', { invitationId: newId(), target, email: member.email, role: 'editor' });
    const unknown = await call(owner, 'POST', '/invitations', {
      invitationId: newId(),
      target,
      email: `nobody-${newId().slice(-8)}@example.com`,
      role: 'editor',
    });
    expect([known.status, unknown.status]).toEqual([204, 204]);
    expect(known.raw.length).toBe(0);
    expect(unknown.raw.length).toBe(0);
    // Not the owner: invisible; yourself: refused.
    expect((await call(member, 'POST', '/invitations', { invitationId: newId(), target, email: 'x@example.com', role: 'viewer' })).status).toBe(404);
    expect((await call(owner, 'POST', '/invitations', { invitationId: newId(), target, email: owner.email, role: 'viewer' })).status).toBe(400);
    // The owner needs an account key first.
    const keyless = await signup(s, undefined, address());
    const nb = await createNotebook(s, keyless);
    expect(
      (await call(keyless, 'POST', '/invitations', { invitationId: newId(), target: { kind: 'notebook', id: nb.notebookId }, email: member.email, role: 'viewer' })).status,
    ).toBe(409);
  });

  it('a repeat for the same email replaces the role and extends; the list shows statuses', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId } = await createNotebook(s, owner);
    const target = { kind: 'notebook' as const, id: notebookId };
    await invite(owner, target, member.email, 'viewer');
    const second = await invite(owner, target, member.email, 'editor');
    const list = await call(owner, 'GET', `/invitations?target=notebook:${notebookId}`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: second, role: 'editor', status: 'pending', email: member.email });
    const incoming = await call(member, 'GET', '/invitations/incoming');
    expect(incoming.body).toEqual([
      expect.objectContaining({ id: second, target, role: 'editor', from: { userId: owner.userId, email: owner.email } }),
    ]);
    expect((await call(member, 'POST', `/invitations/${second}/decline`, {})).status).toBe(204);
    expect((await call(owner, 'GET', `/invitations?target=notebook:${notebookId}`)).body[0].status).toBe('declined');
    expect((await call(member, 'GET', '/invitations/incoming')).body).toEqual([]);
    // Someone else cannot answer it, nor can the owner take back an answered one.
    expect((await call(member, 'POST', `/invitations/${second}/accept`, {})).status).toBe(404);
    expect((await call(owner, 'DELETE', `/invitations/${second}`)).status).toBe(404);
  });

  it('waits for an account registered later; access then needs the owner to give the key', async () => {
    const owner = await user();
    const email = `later-${newId().slice(-8)}@example.com`;
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    const id = await invite(owner, { kind: 'notebook', id: notebookId }, email, 'editor');
    await sleep(5);
    const late = await withBoxKey(await signup(s, email, address()));
    const accepted = await call(late, 'POST', `/invitations/${id}/accept`, {});
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ role: 'editor', wrappedKey: null, docIds: [] });
    const members = await call(owner, 'GET', `/members/notebook/${notebookId}`);
    expect(members.body).toEqual([
      expect.objectContaining({ userId: late.userId, status: 'awaiting_key', accountCreatedAfterInvite: true }),
    ]);
    // Not confirmed yet: nothing to read or write.
    const c = await SyncClient.user(s, late);
    expect((await c.subscribe(noteId)).error).toMatchObject({ code: 'doc_not_found' });
    // The owner confirms by giving the key; the open connection sees the notes at once.
    expect(
      (await call(owner, 'PUT', `/members/notebook/${notebookId}/${late.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) })).status,
    ).toBe(204);
    await sleep(50);
    expect((await c.subscribe(noteId)).error).toBeNull();
    c.close();
  });

  it('at most 50 a day per inviter (429 with retryAfterMs)', async () => {
    const owner = await user();
    const { notebookId } = await createNotebook(s, owner);
    const second = await createNotebook(s, owner);
    for (let i = 0; i < 50; i++) {
      const nb = i < 49 ? notebookId : second.notebookId;
      await invite(owner, { kind: 'notebook', id: nb }, `r${i}-${newId().slice(-6)}@example.com`, 'viewer');
    }
    const over = await call(owner, 'POST', '/invitations', {
      invitationId: newId(),
      target: { kind: 'notebook', id: second.notebookId },
      email: 'one-more@example.com',
      role: 'viewer',
    });
    expect(over.status).toBe(429);
    expect(over.body.error.retryAfterMs).toBeGreaterThan(0);
  });

  it('50 people per notebook, pending invitations included', async () => {
    const owner = await user();
    const { notebookId } = await createNotebook(s, owner);
    const target = { kind: 'notebook' as const, id: notebookId };
    // Seed 50 pending invitations from two days ago, so the daily limit does not apply.
    await s.ctx.database.db.execute(sql`
      INSERT INTO invitations (id, owner_id, notebook_id, email, role, created_at, expires_at)
      SELECT gen_random_uuid(), ${owner.userId}, ${notebookId}, 'p' || g || '@example.com', 'viewer',
        now() - interval '2 days', now() + interval '1 day'
      FROM generate_series(1, 50) g`);
    const r = await call(owner, 'POST', '/invitations', { invitationId: newId(), target, email: 'p51@example.com', role: 'viewer' });
    expect(r.status).toBe(409);
    expect(r.body.error.message).toBe('member limit');
  });
});

describe('roles', () => {
  it('viewer reads and is refused every write, REST and sync', async () => {
    const owner = await user();
    const viewer = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    const item = await share(owner, { kind: 'notebook', id: notebookId }, viewer, 'viewer');
    expect(item.docIds).toEqual([notebookId, noteId]);

    const o = await SyncClient.user(s, owner);
    await o.push(noteId, rnd(10));
    const v = await SyncClient.user(s, viewer);
    const sub = await v.subscribe(noteId);
    expect(sub.error).toBeNull();
    expect(sub.pages.flatMap((p) => p.items)).toHaveLength(1);
    expect(await v.push(noteId, rnd(10))).toMatchObject({ type: 'error', code: 'forbidden' });
    v.send({ type: 'snapshot', docId: noteId, clientMsgId: 'snap', baseSeq: 1, payload: b64(rnd(20)) });
    expect(await v.next((m) => m.ref === 'snap')).toMatchObject({ code: 'forbidden' });
    // Awareness (cursors) is accepted.
    await o.subscribe(noteId);
    v.send({ type: 'awareness', docId: noteId, payload: b64(rnd(8)) });
    await o.next((m) => m.type === 'awareness' && m.docId === noteId);

    expect((await call(viewer, 'POST', '/docs', { docId: newId(), kind: 'note', notebookId })).status).toBe(403);
    expect((await call(viewer, 'DELETE', `/docs/${noteId}`)).status).toBe(403);
    expect((await call(viewer, 'PATCH', `/docs/${noteId}`, { notebookId })).status).toBe(403);
    expect(
      (await call(viewer, 'POST', '/attachments', { attachmentId: newId(), noteId, size: 100, chunkCount: 1, mime: 'image/png' })).status,
    ).toBe(403);
    expect((await call(viewer, 'GET', `/docs/${noteId}/versions`)).status).toBe(200);
    expect((await call(viewer, 'PATCH', `/notebooks/${notebookId}/mode`, { mode: 'private' })).status).toBe(403);
    expect((await call(viewer, 'DELETE', `/notebooks/${notebookId}`)).status).toBe(403);
    o.close();
    v.close();
  });

  it('editor writes, creates notes and attachments on the owner; only the owner deletes or moves', async () => {
    const owner = await user();
    const editor = await user();
    const { notebookId } = await createNotebook(s, owner);
    await share(owner, { kind: 'notebook', id: notebookId }, editor, 'editor');
    // A note created by the editor belongs to the owner: the owner sees it and pays for it.
    const noteId = newId();
    expect((await call(editor, 'POST', '/docs', { docId: noteId, kind: 'note', notebookId })).status).toBe(204);
    expect((await call(editor, 'POST', '/docs', { docId: notebookId, kind: 'notebook', notebookId })).status).toBe(403);
    const before = await storage(owner);
    const e = await SyncClient.user(s, editor);
    expect(await e.push(noteId, rnd(1000))).toMatchObject({ type: 'ack', seq: 1 });
    expect(await storage(owner)).toBeGreaterThanOrEqual(before + 1000);
    const o = await SyncClient.user(s, owner);
    expect((await o.subscribe(noteId)).pages.flatMap((p) => p.items)).toHaveLength(1);
    // Attachments of any note of the notebook.
    const ownersNote = await createNote(s, owner, notebookId);
    const att = newId();
    expect(
      (await call(editor, 'POST', '/attachments', { attachmentId: att, noteId: ownersNote, size: 100, chunkCount: 1, mime: 'image/png' })).status,
    ).toBe(204);
    expect((await call(editor, 'DELETE', `/attachments/${att}`)).status).toBe(204);
    // Purge, move out, guest links, mode, notebook deletion: owner only.
    expect((await call(editor, 'DELETE', `/docs/${noteId}`)).status).toBe(403);
    const own = await createNotebook(s, editor);
    expect((await call(editor, 'PATCH', `/docs/${noteId}`, { notebookId: own.notebookId })).status).toBe(403);
    expect(
      (await call(editor, 'POST', '/shares', { shareId: newId(), target: { kind: 'note', id: noteId }, permission: 'view', expiresAt: null })).status,
    ).toBe(404);
    expect((await call(owner, 'DELETE', `/docs/${noteId}`)).status).toBe(204);
    e.close();
    o.close();
  });

  it('a role change applies to an open connection', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    await share(owner, { kind: 'notebook', id: notebookId }, member, 'editor');
    const c = await SyncClient.user(s, member);
    await c.subscribe(noteId);
    expect(await c.push(noteId, rnd(10))).toMatchObject({ type: 'ack' });
    expect((await call(owner, 'PATCH', `/members/notebook/${notebookId}/${member.userId}`, { role: 'viewer' })).status).toBe(204);
    await sleep(50);
    expect(await c.push(noteId, rnd(10))).toMatchObject({ type: 'error', code: 'forbidden' });
    c.close();
  });
});

describe('leaving and removal', () => {
  it('closes access at once and flags the key rotation; rotate then rotate/done', async () => {
    const owner = await user();
    const a = await user();
    const b = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    const target = { kind: 'notebook' as const, id: notebookId };
    await share(owner, target, a, 'editor');
    await share(owner, target, b, 'viewer');
    expect((await call(owner, 'GET', '/notebooks')).body.find((n: any) => n.id === notebookId).shared).toBe(true);

    const c = await SyncClient.user(s, a);
    expect((await c.subscribe(noteId)).error).toBeNull();
    expect((await call(owner, 'DELETE', `/members/notebook/${notebookId}/${a.userId}`)).status).toBe(204);
    expect(await c.next((m) => m.type === 'error' && m.ref === noteId)).toMatchObject({ code: 'doc_not_found' });
    expect((await call(a, 'GET', '/shared-with-me')).body).toEqual([]);
    expect(await c.push(noteId, rnd(10))).toMatchObject({ code: 'doc_not_found' });
    c.close();

    let key = await call(owner, 'GET', `/notebooks/${notebookId}/key`);
    expect(key.body).toMatchObject({ version: 1, keyChain: [], keyRotationPending: true, pendingSinceVersion: 1 });

    const rotate = (body: object) => call(owner, 'POST', `/members/notebook/${notebookId}/rotate`, body);
    const base = { ownerWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)) };
    expect((await rotate({ ...base, version: 3, memberKeys: [{ userId: b.userId, wrappedKey: b64(rnd(73)) }] })).status).toBe(409);
    expect((await rotate({ ...base, version: 2, memberKeys: [] })).status).toBe(409); // b not covered
    expect((await rotate({ ...base, version: 2, memberKeys: [{ userId: a.userId, wrappedKey: b64(rnd(73)) }] })).status).toBe(409);
    expect((await call(b, 'POST', `/members/notebook/${notebookId}/rotate`, { ...base, version: 2, memberKeys: [] })).status).toBe(403);
    expect((await rotate({ ...base, version: 2, memberKeys: [{ userId: b.userId, wrappedKey: b64(rnd(73)) }] })).status).toBe(204);
    key = await call(owner, 'GET', `/notebooks/${notebookId}/key`);
    // Step 1 done: the version is past the one the flag was set at (a second device can tell).
    expect(key.body).toMatchObject({
      wrappedKey: base.ownerWrappedKey,
      version: 2,
      keyChain: [base.previousKeyWrap],
      keyRotationPending: true,
      pendingSinceVersion: 1,
    });
    const shared = (await call(b, 'GET', '/shared-with-me')).body[0];
    expect(shared).toMatchObject({ keyVersion: 2, keyChain: [base.previousKeyWrap] });
    expect(shared.wrappedKey).not.toBeNull();
    expect((await call(owner, 'POST', `/members/notebook/${notebookId}/rotate/done`, {})).status).toBe(204);
    expect((await call(owner, 'GET', `/notebooks/${notebookId}/key`)).body).toMatchObject({
      keyRotationPending: false,
      pendingSinceVersion: null,
    });
    // A key for an old version is refused.
    expect(
      (await call(owner, 'PUT', `/members/notebook/${notebookId}/${b.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) })).status,
    ).toBe(409);
  });

  it('a member leaves; a deleted member account also flags the rotation', async () => {
    const owner = await user();
    const a = await user();
    const b = await user();
    const { notebookId } = await createNotebook(s, owner);
    await share(owner, { kind: 'notebook', id: notebookId }, a, 'viewer');
    await share(owner, { kind: 'notebook', id: notebookId }, b, 'viewer');
    // Someone else cannot remove a member; the member can remove itself.
    expect((await call(b, 'DELETE', `/members/notebook/${notebookId}/${a.userId}`)).status).toBe(404);
    expect((await call(a, 'DELETE', `/members/notebook/${notebookId}/${a.userId}`)).status).toBe(204);
    expect((await call(owner, 'GET', `/notebooks/${notebookId}/key`)).body.keyRotationPending).toBe(true);
    await call(owner, 'POST', `/members/notebook/${notebookId}/rotate`, {
      version: 2,
      ownerWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
      memberKeys: [{ userId: b.userId, wrappedKey: b64(rnd(73)) }],
    });
    await call(owner, 'POST', `/members/notebook/${notebookId}/rotate/done`, {});
    expect((await call(b, 'DELETE', '/me', { loginKey: b.loginKey })).status).toBe(204);
    expect((await call(owner, 'GET', `/notebooks/${notebookId}/key`)).body.keyRotationPending).toBe(true);
    expect((await call(owner, 'GET', `/members/notebook/${notebookId}`)).body).toEqual([]);
  });

  it('deleting the shared notebook closes access for members', async () => {
    const owner = await user();
    const m = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    await share(owner, { kind: 'notebook', id: notebookId }, m, 'editor');
    const c = await SyncClient.user(s, m);
    await c.subscribe(noteId);
    expect((await call(owner, 'DELETE', `/notebooks/${notebookId}`)).status).toBe(204);
    expect(await c.next((x) => x.type === 'error' && x.ref === noteId)).toMatchObject({ code: 'doc_not_found' });
    expect((await call(m, 'GET', '/shared-with-me')).body).toEqual([]);
    c.close();
  });
});

describe('a note shared on its own', () => {
  it('rotate clears the flag itself; the owner reads the current key back', async () => {
    const owner = await user();
    const m = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    const other = await createNote(s, owner, notebookId);
    const target = { kind: 'note' as const, id: noteId };
    const item = await share(owner, target, m, 'editor');
    expect(item.docIds).toEqual([noteId]);
    const c = await SyncClient.user(s, m);
    expect((await c.subscribe(noteId)).error).toBeNull();
    expect((await c.subscribe(other)).error).toMatchObject({ code: 'doc_not_found' });
    expect((await c.subscribe(notebookId)).error).toMatchObject({ code: 'doc_not_found' });
    c.close();

    expect((await call(owner, 'GET', `/members/note/${noteId}/key`)).status).toBe(404); // version 1 is in NoteMeta
    expect((await call(m, 'DELETE', `/members/note/${noteId}/${m.userId}`)).status).toBe(204);
    const body = { version: 2, ownerWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)), memberKeys: [] };
    expect((await call(owner, 'POST', `/members/note/${noteId}/rotate`, { ...body, notebookKey: b64(rnd(32)) })).status).toBe(400);
    expect((await call(owner, 'POST', `/members/note/${noteId}/rotate`, body)).status).toBe(204);
    expect((await call(owner, 'GET', `/members/note/${noteId}/key`)).body).toEqual({
      version: 2,
      ownerWrappedKey: body.ownerWrappedKey,
      keyChain: [body.previousKeyWrap],
    });
    expect((await call(m, 'GET', `/members/note/${noteId}/key`)).status).toBe(404);
    expect((await call(owner, 'POST', `/members/note/${noteId}/rotate/done`, {})).status).toBe(400);
  });
});

describe('authors (server-stamped)', () => {
  it('updates carry who sent them; a version lists the authors since the previous one', async () => {
    const owner = await user();
    const editor = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    await share(owner, { kind: 'notebook', id: notebookId }, editor, 'editor');
    const o = await SyncClient.user(s, owner);
    const e = await SyncClient.user(s, editor);
    await o.subscribe(noteId);
    await e.subscribe(noteId);
    await o.push(noteId, rnd(10));
    const live = await o.next((m) => m.type === 'update' && m.docId === noteId, 5000).catch(() => null);
    expect(live).toBeNull(); // own pushes are not echoed
    await e.push(noteId, rnd(10));
    expect(await o.next((m) => m.type === 'update' && m.docId === noteId)).toMatchObject({
      seq: 2,
      author: { kind: 'user', userId: editor.userId },
    });
    await o.push(noteId, rnd(10));
    const fresh = await SyncClient.user(s, owner);
    const items = (await fresh.subscribe(noteId)).pages.flatMap((p) => p.items);
    expect(items.map((i: any) => i.author.userId)).toEqual([owner.userId, editor.userId, owner.userId]);

    o.send({ type: 'snapshot', docId: noteId, clientMsgId: 'v1', baseSeq: 3, payload: b64(rnd(30)) });
    await o.next((m) => m.clientMsgId === 'v1');
    await e.push(noteId, rnd(10));
    o.send({ type: 'snapshot', docId: noteId, clientMsgId: 'v2', baseSeq: 4, payload: b64(rnd(30)) });
    await o.next((m) => m.clientMsgId === 'v2');
    const versions = await call(editor, 'GET', `/docs/${noteId}/versions`);
    expect(versions.body.map((v: any) => [v.seq, v.authors])).toEqual([
      [4, [{ kind: 'user', userId: editor.userId }]],
      [
        3,
        [
          { kind: 'user', userId: owner.userId },
          { kind: 'user', userId: editor.userId },
        ],
      ],
    ]);
    o.close();
    e.close();
    fresh.close();
  }, 20_000);
});

describe('owner overview and rotation scope', () => {
  it('shared-by-me lists what the owner shares; rotate names exactly the active members', async () => {
    const owner = await user();
    const active = await user();
    const waiting = await user();
    expect((await call(owner, 'GET', '/shared-by-me')).body).toEqual([]);
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    const lonely = await createNotebook(s, owner); // nothing shared: not listed
    const nb = { kind: 'notebook' as const, id: notebookId };
    await share(owner, nb, active, 'editor');
    const id = await invite(owner, nb, waiting.email, 'viewer');
    expect((await call(waiting, 'POST', `/invitations/${id}/accept`, {})).status).toBe(200);
    await invite(owner, { kind: 'note', id: noteId }, `pending-${newId().slice(-6)}@example.com`, 'viewer');

    let list = (await call(owner, 'GET', '/shared-by-me')).body;
    expect(list).toEqual([
      { target: { kind: 'note', id: noteId }, keyVersion: 1, keyRotationPending: false, pendingSinceVersion: null, members: 0, awaitingKey: 0 },
      { target: nb, keyVersion: 1, keyRotationPending: false, pendingSinceVersion: null, members: 2, awaitingKey: 1 },
    ]);
    expect(list.some((x: any) => x.target.id === lonely.notebookId)).toBe(false);
    expect((await call(active, 'GET', '/shared-by-me')).body).toEqual([]);

    const body = (keys: TestUser[]) => ({
      version: 2,
      ownerWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
      memberKeys: keys.map((u) => ({ userId: u.userId, wrappedKey: b64(rnd(73)) })),
    });
    const rotate = (keys: TestUser[]) => call(owner, 'POST', `/members/notebook/${notebookId}/rotate`, body(keys));
    // The waiting member never gets a key through a rotation (owner's confirmation).
    expect((await rotate([active, waiting])).status).toBe(409);
    expect((await rotate([])).status).toBe(409);
    expect((await rotate([active])).status).toBe(204);
    list = (await call(owner, 'GET', '/shared-by-me')).body;
    // A voluntary rotation: pending since the previous version, step 1 already done.
    expect(list[1]).toMatchObject({ keyVersion: 2, keyRotationPending: true, pendingSinceVersion: 1, members: 2, awaitingKey: 1 });
    // The waiting member then gets the new version directly.
    expect(
      (await call(owner, 'PUT', `/members/notebook/${notebookId}/${waiting.userId}/key`, { version: 2, wrappedKey: b64(rnd(73)) })).status,
    ).toBe(204);
    expect((await call(owner, 'GET', '/shared-by-me')).body[1]).toMatchObject({ awaitingKey: 0 });
  });
});

describe('the last member leaves', () => {
  it('the resource stays in shared-by-me with the rotation pending until it is done', async () => {
    const owner = await user();
    const m = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    const other = await createNote(s, owner, notebookId);
    await share(owner, { kind: 'notebook', id: notebookId }, m, 'editor');
    await share(owner, { kind: 'note', id: other }, m, 'viewer');
    expect((await call(owner, 'DELETE', `/members/notebook/${notebookId}/${m.userId}`)).status).toBe(204);
    expect((await call(m, 'DELETE', `/members/note/${other}/${m.userId}`)).status).toBe(204);

    const pending = (await call(owner, 'GET', '/shared-by-me')).body;
    expect(pending).toEqual([
      { target: { kind: 'note', id: other }, keyVersion: 1, keyRotationPending: true, pendingSinceVersion: 1, members: 0, awaitingKey: 0 },
      { target: { kind: 'notebook', id: notebookId }, keyVersion: 1, keyRotationPending: true, pendingSinceVersion: 1, members: 0, awaitingKey: 0 },
    ]);

    const rotation = { ownerWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)), memberKeys: [], version: 2 };
    expect((await call(owner, 'POST', `/members/note/${other}/rotate`, rotation)).status).toBe(204);
    expect((await call(owner, 'POST', `/members/notebook/${notebookId}/rotate`, rotation)).status).toBe(204);
    // Step 1 done, notes still to re-key: listed, version past pendingSinceVersion.
    expect((await call(owner, 'GET', '/shared-by-me')).body).toEqual([
      { target: { kind: 'notebook', id: notebookId }, keyVersion: 2, keyRotationPending: true, pendingSinceVersion: 1, members: 0, awaitingKey: 0 },
    ]);
    expect((await call(owner, 'POST', `/members/notebook/${notebookId}/rotate/done`, {})).status).toBe(204);
    expect((await call(owner, 'GET', '/shared-by-me')).body).toEqual([]);
    expect(noteId).toBeTruthy();
  });
});
