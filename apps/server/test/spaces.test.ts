import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { docs, notebooks, spaces } from '../src/db/schema.js';
import { AD, seal } from '../src/lib/sodium.js';
import type { AgentGrant } from '../src/plugins/agents-context.js';
import { createAgentsContext } from '../src/plugins/loader.js';
import {
  SyncClient,
  api,
  b64,
  createNote,
  newId,
  rnd,
  signup,
  sleep,
  startServer,
  type TestServer,
  type TestUser,
} from './helpers.js';

// D-62: shared spaces (api.md «Общие пространства», crypto.md §11, sync-protocol.md §6).
let s: TestServer;
beforeAll(async () => {
  s = await startServer({ PUBLIC_URL: 'https://notes.example.com', APP_URL: 'https://app.example.com' });
});
afterAll(() => s.close());

let accounts = 0;
const address = () => `10.62.${Math.floor(accounts / 200)}.${(accounts++ % 200) + 1}`;
const call = (u: TestUser, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api(s, method, path, { token: u.session.accessToken, ...(body !== undefined ? { body } : {}) });

async function user(email?: string) {
  const u = await signup(s, email, address());
  expect((await call(u, 'PUT', '/me/box-key', { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) })).status).toBe(204);
  return u;
}

/** A shared space of `owner` with its document registered. */
async function space(owner: TestUser) {
  const spaceId = newId();
  const created = await call(owner, 'POST', '/spaces', { spaceId, wrappedKey: b64(rnd(73)) });
  expect(created.status).toBe(200);
  expect(created.body).toMatchObject({ id: spaceId, ownerUserId: owner.userId, keyVersion: 1, keyRotationPending: false });
  expect((await call(owner, 'POST', '/docs', { docId: spaceId, kind: 'space', notebookId: null })).status).toBe(204);
  return spaceId;
}

async function spaceNotebook(
  u: TestUser,
  spaceId: string,
  mode: 'private' | 'agent' = 'private',
  notebookKey = rnd(32),
  spaceKeyVersion?: number,
) {
  const notebookId = newId();
  const version = spaceKeyVersion ?? (await spaceRow(spaceId))!.keyVersion;
  const r = await call(u, 'POST', '/notebooks', {
    notebookId,
    mode,
    wrappedKey: b64(rnd(73)),
    spaceId,
    spaceKeyVersion: version,
    ...(mode === 'agent' ? { notebookKey: b64(notebookKey) } : {}),
  });
  return { notebookId, status: r.status, body: r.body };
}

async function personalNotebook(u: TestUser) {
  const notebookId = newId();
  expect((await call(u, 'POST', '/notebooks', { notebookId, mode: 'private', wrappedKey: b64(rnd(73)) })).status).toBe(200);
  return notebookId;
}

async function join(owner: TestUser, spaceId: string, member: TestUser, role: 'editor' | 'viewer', giveKey = true) {
  const invitationId = newId();
  const inv = await call(owner, 'POST', '/invitations', { invitationId, target: { kind: 'space', id: spaceId }, email: member.email, role });
  expect(inv.status).toBe(204);
  const accepted = await call(member, 'POST', `/invitations/${invitationId}/accept`, {});
  expect(accepted.status).toBe(200);
  if (giveKey) {
    const key = await call(owner, 'PUT', `/members/space/${spaceId}/${member.userId}/key`, {
      version: accepted.body.keyVersion,
      wrappedKey: b64(rnd(73)),
    });
    expect(key.status).toBe(204);
  }
  return accepted.body;
}

async function spaceRow(id: string) {
  const [row] = await s.ctx.database.db.select().from(spaces).where(eq(spaces.id, id));
  return row;
}

describe('a shared space', () => {
  it('is created, listed and keyed; members join it with a role, the owner sees it in shared-by-me', async () => {
    const owner = await user();
    const editor = await user();
    const spaceId = await space(owner);
    expect((await call(owner, 'POST', '/spaces', { spaceId, wrappedKey: b64(rnd(73)) })).status).toBe(409);
    const nb = await spaceNotebook(owner, spaceId);
    expect(nb.body).toMatchObject({ spaceId });
    const noteId = await createNote(s, owner, nb.notebookId);

    const item = await join(owner, spaceId, editor, 'editor');
    expect(item).toMatchObject({ target: { kind: 'space', id: spaceId }, role: 'editor', keyVersion: 1, wrappedKey: null });
    const listed = (await call(editor, 'GET', '/shared-with-me')).body;
    expect(listed).toEqual([
      expect.objectContaining({
        target: { kind: 'space', id: spaceId },
        docIds: [spaceId, nb.notebookId, noteId],
        owner: expect.objectContaining({ userId: owner.userId }),
      }),
    ]);
    expect(listed[0].wrappedKey).not.toBeNull();
    // Space notebooks do not come as separate items.
    expect(listed).toHaveLength(1);

    expect((await call(editor, 'GET', '/spaces')).body.map((x: any) => x.id)).toEqual([spaceId]);
    expect((await call(owner, 'GET', `/spaces/${spaceId}/key`)).body).toMatchObject({
      version: 1,
      keyChain: [],
      keyRotationPending: false,
      pendingSinceVersion: null,
    });
    expect((await call(editor, 'GET', `/spaces/${spaceId}/key`)).status).toBe(403);
    const nbs = (await call(editor, 'GET', `/spaces/${spaceId}/notebooks`)).body;
    expect(nbs).toEqual([{ notebookId: nb.notebookId, version: 1, spaceWrappedKey: expect.any(String), keyChain: [], mode: 'private' }]);
    expect((await call(owner, 'GET', '/shared-by-me')).body).toEqual([
      { target: { kind: 'space', id: spaceId }, keyVersion: 1, keyRotationPending: false, pendingSinceVersion: null, members: 1, awaitingKey: 0 },
    ]);
    // Only the owner registers the space document; a stranger sees nothing.
    const stranger = await user();
    expect((await call(stranger, 'GET', `/spaces/${spaceId}/notebooks`)).status).toBe(404);
    expect((await call(editor, 'POST', '/docs', { docId: spaceId, kind: 'space', notebookId: null })).status).toBe(403);
  });

  it('editor creates notebooks and notes (on the owner) and writes everywhere, viewer only reads; the space document too', async () => {
    const owner = await user();
    const editor = await user();
    const viewer = await user();
    const spaceId = await space(owner);
    await join(owner, spaceId, editor, 'editor');
    await join(owner, spaceId, viewer, 'viewer');

    const nb = await spaceNotebook(editor, spaceId);
    expect(nb.status).toBe(200);
    const [row] = await s.ctx.database.db.select().from(notebooks).where(eq(notebooks.id, nb.notebookId));
    expect(row).toMatchObject({ userId: owner.userId, spaceId });
    expect((await spaceNotebook(viewer, spaceId)).status).toBe(403);
    expect((await spaceNotebook(editor, spaceId, 'agent')).status).toBe(403); // agent mode is the owner's
    const noteId = newId();
    expect((await call(editor, 'POST', '/docs', { docId: noteId, kind: 'note', notebookId: nb.notebookId })).status).toBe(204);
    const [note] = await s.ctx.database.db.select({ userId: docs.userId }).from(docs).where(eq(docs.id, noteId));
    expect(note!.userId).toBe(owner.userId);
    expect((await call(viewer, 'POST', '/docs', { docId: newId(), kind: 'note', notebookId: nb.notebookId })).status).toBe(403);

    const e = await SyncClient.user(s, editor);
    const v = await SyncClient.user(s, viewer);
    for (const doc of [spaceId, nb.notebookId, noteId]) {
      expect((await e.subscribe(doc)).error).toBeNull();
      expect((await v.subscribe(doc)).error).toBeNull();
      expect(await e.push(doc, rnd(10))).toMatchObject({ type: 'ack' });
      expect(await v.push(doc, rnd(10))).toMatchObject({ type: 'error', code: 'forbidden' });
    }
    // A notebook created later reaches open connections without a reconnect.
    const later = await spaceNotebook(owner, spaceId);
    await sleep(50);
    expect((await v.subscribe(later.notebookId)).error).toBeNull();
    // Only the owner deletes a notebook of the space, switches agent mode, or moves notes out.
    expect((await call(editor, 'DELETE', `/notebooks/${nb.notebookId}`)).status).toBe(403);
    expect((await call(editor, 'PATCH', `/notebooks/${nb.notebookId}/mode`, { mode: 'private' })).status).toBe(403);
    expect((await call(editor, 'DELETE', `/docs/${noteId}`)).status).toBe(403);
    // Notes move between notebooks of the space by an editor; out of the space only by the owner.
    expect((await call(editor, 'PATCH', `/docs/${noteId}`, { notebookId: later.notebookId })).status).toBe(204);
    expect((await call(viewer, 'PATCH', `/docs/${noteId}`, { notebookId: nb.notebookId })).status).toBe(403);
    const editorsOwn = await personalNotebook(editor);
    expect((await call(editor, 'PATCH', `/docs/${noteId}`, { notebookId: editorsOwn })).status).toBe(403);
    expect((await call(owner, 'PATCH', `/docs/${noteId}`, { notebookId: nb.notebookId })).status).toBe(204);
    e.close();
    v.close();
  });

  it('a notebook or note of the space is not shared or rotated on its own (409)', async () => {
    const owner = await user();
    const other = await user();
    const spaceId = await space(owner);
    const nb = await spaceNotebook(owner, spaceId);
    const noteId = await createNote(s, owner, nb.notebookId);
    for (const target of [
      { kind: 'notebook', id: nb.notebookId },
      { kind: 'note', id: noteId },
    ]) {
      const r = await call(owner, 'POST', '/invitations', { invitationId: newId(), target, email: other.email, role: 'viewer' });
      expect(r.status).toBe(409);
    }
    const rotate = { version: 2, ownerWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)), memberKeys: [] };
    expect((await call(owner, 'POST', `/members/notebook/${nb.notebookId}/rotate`, rotate)).status).toBe(409);
    expect((await call(owner, 'POST', `/members/space/${spaceId}/rotate`, rotate)).status).toBe(400);
    expect((await call(owner, 'POST', `/members/notebook/${nb.notebookId}/rotate/done`, {})).status).toBe(409);
    expect((await call(owner, 'GET', `/members/notebook/${nb.notebookId}`)).status).toBe(409);
    expect(
      (await call(owner, 'PUT', `/members/notebook/${nb.notebookId}/${other.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) })).status,
    ).toBe(409);
    // Its key comes with the space's notebook list.
    expect((await call(owner, 'GET', `/notebooks/${nb.notebookId}/key`)).status).toBe(409);
  });

  it('moves a personal notebook in (members see its history) and out with a new key (members lose it at once)', async () => {
    const owner = await user();
    const member = await user();
    const outsider = await user();
    const spaceId = await space(owner);
    await join(owner, spaceId, member, 'viewer');
    const nbId = await personalNotebook(owner);
    const noteId = await createNote(s, owner, nbId);

    // Not with members of its own, nor with a stale key version.
    const inv = newId();
    await call(owner, 'POST', '/invitations', { invitationId: inv, target: { kind: 'notebook', id: nbId }, email: outsider.email, role: 'viewer' });
    expect((await call(owner, 'PUT', `/spaces/${spaceId}/notebooks/${nbId}`, { version: 1, spaceWrappedKey: b64(rnd(73)) })).status).toBe(409);
    expect((await call(owner, 'DELETE', `/invitations/${inv}`)).status).toBe(204);
    expect((await call(owner, 'PUT', `/spaces/${spaceId}/notebooks/${nbId}`, { version: 2, spaceWrappedKey: b64(rnd(73)) })).status).toBe(409);
    expect((await call(member, 'PUT', `/spaces/${spaceId}/notebooks/${nbId}`, { version: 1, spaceWrappedKey: b64(rnd(73)) })).status).toBe(403);
    expect((await call(owner, 'PUT', `/spaces/${spaceId}/notebooks/${nbId}`, { version: 1, spaceWrappedKey: b64(rnd(73)) })).status).toBe(204);
    expect((await call(owner, 'GET', '/notebooks')).body.find((n: any) => n.id === nbId)).toMatchObject({ spaceId });

    const c = await SyncClient.user(s, member);
    expect((await c.subscribe(noteId)).error).toBeNull();
    const out = { version: 2, ownerWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)) };
    expect((await call(member, 'POST', `/spaces/${spaceId}/notebooks/${nbId}/move-out`, out)).status).toBe(403);
    expect((await call(owner, 'POST', `/spaces/${spaceId}/notebooks/${nbId}/move-out`, { ...out, version: 3 })).status).toBe(409);
    expect((await call(owner, 'POST', `/spaces/${spaceId}/notebooks/${nbId}/move-out`, out)).status).toBe(204);
    expect(await c.next((m) => m.type === 'error' && m.ref === noteId, 5000, true)).toMatchObject({ code: 'doc_not_found' });
    expect((await call(member, 'GET', `/spaces/${spaceId}/notebooks`)).body).toEqual([]);
    expect((await call(owner, 'GET', `/notebooks/${nbId}/key`)).body).toMatchObject({
      version: 2,
      keyRotationPending: true,
      pendingSinceVersion: 1,
    });
    c.close();
  });
});

describe('leaving, removal and the space rotation', () => {
  it('removal closes access at once and flags the rotation; rotate is atomic and exact; done clears all', async () => {
    const owner = await user();
    const a = await user();
    const b = await user();
    const waiting = await user();
    const spaceId = await space(owner);
    const one = await spaceNotebook(owner, spaceId);
    const two = await spaceNotebook(owner, spaceId, 'agent');
    const noteId = await createNote(s, owner, one.notebookId);
    await join(owner, spaceId, a, 'editor');
    await join(owner, spaceId, b, 'viewer');
    await join(owner, spaceId, waiting, 'viewer', false);

    const c = await SyncClient.user(s, a);
    expect((await c.subscribe(noteId)).error).toBeNull();
    expect((await call(owner, 'DELETE', `/members/space/${spaceId}/${a.userId}`)).status).toBe(204);
    expect(await c.next((m) => m.type === 'error' && m.ref === noteId, 5000, true)).toMatchObject({ code: 'doc_not_found' });
    expect((await call(a, 'GET', '/shared-with-me')).body).toEqual([]);
    c.close();
    expect(await spaceRow(spaceId)).toMatchObject({ keyRotationPending: true, pendingSinceVersion: 1 });

    const nb = (id: string, version = 2) => ({
      notebookId: id,
      version,
      spaceWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
    });
    const body = (over: object = {}) => ({
      version: 2,
      ownerWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
      memberKeys: [{ userId: b.userId, wrappedKey: b64(rnd(73)) }],
      notebooks: [nb(one.notebookId), { ...nb(two.notebookId), notebookKey: b64(rnd(32)) }],
      ...over,
    });
    const rotate = (x: object) => call(owner, 'POST', `/spaces/${spaceId}/rotate`, x);
    expect((await rotate(body({ version: 3 }))).status).toBe(409);
    // The waiting member never gets a key through a rotation.
    expect((await rotate(body({ memberKeys: [{ userId: b.userId, wrappedKey: b64(rnd(73)) }, { userId: waiting.userId, wrappedKey: b64(rnd(73)) }] }))).status).toBe(409);
    expect((await rotate(body({ notebooks: [nb(one.notebookId)] }))).status).toBe(409);
    // One bad notebook version: nothing changes (one transaction).
    expect((await rotate(body({ notebooks: [nb(one.notebookId), { ...nb(two.notebookId, 3), notebookKey: b64(rnd(32)) }] }))).status).toBe(409);
    expect((await rotate(body({ notebooks: [nb(one.notebookId), nb(two.notebookId)] }))).status).toBe(400); // agent mode needs the key
    expect(await spaceRow(spaceId)).toMatchObject({ keyVersion: 1 });
    const [untouched] = await s.ctx.database.db.select().from(notebooks).where(eq(notebooks.id, one.notebookId));
    expect(untouched!.keyVersion).toBe(1);
    expect((await call(b, 'POST', `/spaces/${spaceId}/rotate`, body())).status).toBe(403);

    expect((await rotate(body())).status).toBe(204);
    const key = (await call(owner, 'GET', `/spaces/${spaceId}/key`)).body;
    expect(key).toMatchObject({ version: 2, keyRotationPending: true, pendingSinceVersion: 1 });
    expect(key.keyChain).toHaveLength(1);
    const nbs = (await call(b, 'GET', `/spaces/${spaceId}/notebooks`)).body;
    expect(nbs.map((n: any) => [n.version, n.keyChain.length])).toEqual([
      [2, 1],
      [2, 1],
    ]);
    const item = (await call(b, 'GET', '/shared-with-me')).body[0];
    expect(item).toMatchObject({ keyVersion: 2 });
    expect(item.wrappedKey).not.toBeNull();
    expect((await call(owner, 'GET', '/shared-by-me')).body[0]).toMatchObject({ keyVersion: 2, keyRotationPending: true, awaitingKey: 1 });

    // A notebook made under the old space key is refused; under the new one it is fine.
    expect((await spaceNotebook(owner, spaceId, 'private', rnd(32), 1)).status).toBe(409);
    const fresh = await spaceNotebook(owner, spaceId, 'private', rnd(32), 2);
    expect(fresh.status).toBe(200);
    expect((await call(owner, 'POST', '/notebooks', { notebookId: newId(), mode: 'private', wrappedKey: b64(rnd(73)), spaceId })).status).toBe(400);

    expect((await call(owner, 'POST', `/spaces/${spaceId}/rotate/done`, {})).status).toBe(204);
    expect(await spaceRow(spaceId)).toMatchObject({ keyRotationPending: false, pendingSinceVersion: null });
    const after = await s.ctx.database.db.select().from(notebooks).where(eq(notebooks.spaceId, spaceId));
    expect(after.every((n) => !n.keyRotationPending && n.pendingSinceVersion === null)).toBe(true);
  });

  it('a member leaves; a deleted member account counts as leaving; deleting the space ends everything', async () => {
    const owner = await user();
    const a = await user();
    const b = await user();
    const spaceId = await space(owner);
    const nb = await spaceNotebook(owner, spaceId);
    const noteId = await createNote(s, owner, nb.notebookId);
    await join(owner, spaceId, a, 'viewer');
    await join(owner, spaceId, b, 'editor');
    expect((await call(a, 'DELETE', `/members/space/${spaceId}/${a.userId}`)).status).toBe(204);
    expect(await spaceRow(spaceId)).toMatchObject({ keyRotationPending: true });
    await call(owner, 'POST', `/spaces/${spaceId}/rotate`, {
      version: 2,
      ownerWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
      memberKeys: [{ userId: b.userId, wrappedKey: b64(rnd(73)) }],
      notebooks: [{ notebookId: nb.notebookId, version: 2, spaceWrappedKey: b64(rnd(73)), previousKeyWrap: b64(rnd(73)) }],
    });
    await call(owner, 'POST', `/spaces/${spaceId}/rotate/done`, {});
    expect((await call(b, 'DELETE', '/me', { loginKey: b.loginKey })).status).toBe(204);
    expect(await spaceRow(spaceId)).toMatchObject({ keyRotationPending: true, pendingSinceVersion: 2 });

    const viewer = await user();
    await join(owner, spaceId, viewer, 'viewer');
    const c = await SyncClient.user(s, viewer);
    expect((await c.subscribe(noteId)).error).toBeNull();
    expect((await call(viewer, 'DELETE', `/spaces/${spaceId}`)).status).toBe(403);
    expect((await call(owner, 'DELETE', `/spaces/${spaceId}`)).status).toBe(204);
    expect(await c.next((m) => m.type === 'error' && m.ref === noteId, 5000, true)).toMatchObject({ code: 'doc_not_found' });
    expect(await spaceRow(spaceId)).toBeUndefined();
    expect((await call(viewer, 'GET', '/shared-with-me')).body).toEqual([]);
    expect((await call(owner, 'GET', '/notebooks')).body.find((n: any) => n.id === nb.notebookId)).toBeUndefined();
    c.close();
  });

  it('an account created after the invitation gets nothing until the owner gives the key', async () => {
    const owner = await user();
    const spaceId = await space(owner);
    const nb = await spaceNotebook(owner, spaceId);
    const email = `later-${newId().slice(-8)}@example.com`;
    const invitationId = newId();
    await call(owner, 'POST', '/invitations', { invitationId, target: { kind: 'space', id: spaceId }, email, role: 'editor' });
    await sleep(5);
    const late = await user(email);
    const accepted = await call(late, 'POST', `/invitations/${invitationId}/accept`, {});
    expect(accepted.body).toMatchObject({ docIds: [], wrappedKey: null });
    expect((await call(late, 'GET', `/spaces/${spaceId}/notebooks`)).status).toBe(404);
    expect((await spaceNotebook(late, spaceId)).status).toBe(404);
    const c = await SyncClient.user(s, late);
    expect((await c.subscribe(nb.notebookId)).error).toMatchObject({ code: 'doc_not_found' });
    await call(owner, 'PUT', `/members/space/${spaceId}/${late.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) });
    await sleep(50);
    expect((await c.subscribe(nb.notebookId)).error).toBeNull();
    c.close();
  });
});

describe('agents of space members', () => {
  it('see the space notebooks the owner opened to agents, with the member role', async () => {
    const owner = await user();
    const editor = await user();
    const viewer = await user();
    const spaceId = await space(owner);
    const notebookKey = rnd(32);
    const open = await spaceNotebook(owner, spaceId, 'agent', notebookKey);
    const closed = await spaceNotebook(owner, spaceId);
    await join(owner, spaceId, editor, 'editor');
    await join(owner, spaceId, viewer, 'viewer');
    // The owner's client writes the index with a note key, as in agent mode.
    const noteId = await createNote(s, owner, open.notebookId);
    const noteKey = rnd(32);
    const oc = await SyncClient.user(s, owner);
    const index = new Y.Doc();
    const meta = new Y.Map();
    index.getMap('notes').set(noteId, meta);
    meta.set('wrappedKey', b64(await seal(notebookKey, noteKey, AD.note(noteId))));
    await oc.push(open.notebookId, await seal(notebookKey, Y.encodeStateAsUpdate(index), AD.doc(open.notebookId)));
    oc.close();

    const agents = createAgentsContext(s.ctx);
    const grant = (u: TestUser): AgentGrant => ({
      id: newId(),
      userId: u.userId,
      kind: 'static',
      name: 'agent',
      clientId: null,
      notebookIds: [open.notebookId, closed.notebookId],
      allNotebooks: false,
      permission: 'read_write',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
      secretHash: rnd(32).toString('hex'),
    });
    const ge = grant(editor);
    const gv = grant(viewer);
    await agents.store.insertGrant(ge);
    await agents.store.insertGrant(gv);
    const listed = await agents.data.listAgentNotebooks(editor.userId, ge.id);
    expect(listed.map((n) => n.id)).toEqual([open.notebookId]);
    expect(listed[0]!.shared).toEqual({ ownerUserId: owner.userId, ownerEmail: owner.email, role: 'editor' });
    expect((await agents.data.listAgentNotebooks(viewer.userId, gv.id))[0]!.shared?.role).toBe('viewer');
    const created = newId();
    await agents.data.createNoteDoc(editor.userId, open.notebookId, created, ge.id);
    const [doc] = await s.ctx.database.db.select({ userId: docs.userId }).from(docs).where(eq(docs.id, created));
    expect(doc!.userId).toBe(owner.userId);
    await expect(agents.data.createNoteDoc(viewer.userId, open.notebookId, newId(), gv.id)).rejects.toThrow(/does not allow writing/);
    // Removed from the space: gone for the member's agents too.
    await call(owner, 'DELETE', `/members/space/${spaceId}/${editor.userId}`);
    expect(await agents.data.listAgentNotebooks(editor.userId, ge.id)).toEqual([]);
  });
});
