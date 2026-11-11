import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  SyncClient,
  api,
  b64,
  createNotebook,
  createNote,
  newId,
  rnd,
  signup,
  sleep,
  startServer,
  type TestServer,
  type TestUser,
} from './helpers.js';

// D-62: `account_changed` on the sync socket (sync-protocol.md §6, api.md «Уведомления об изменениях аккаунта»).
let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

let accounts = 0;
const address = () => `10.63.${Math.floor(accounts / 200)}.${(accounts++ % 200) + 1}`;
const call = (u: TestUser, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api(s, method, path, { token: u.session.accessToken, ...(body !== undefined ? { body } : {}) });

async function user() {
  const u = await signup(s, undefined, address());
  expect((await call(u, 'PUT', '/me/box-key', { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) })).status).toBe(204);
  return u;
}

async function space(owner: TestUser) {
  const spaceId = newId();
  expect((await call(owner, 'POST', '/spaces', { spaceId, wrappedKey: b64(rnd(73)) })).status).toBe(200);
  expect((await call(owner, 'POST', '/docs', { docId: spaceId, kind: 'space', notebookId: null })).status).toBe(204);
  return spaceId;
}

async function spaceNotebook(u: TestUser, spaceId: string) {
  const notebookId = newId();
  const r = await call(u, 'POST', '/notebooks', {
    notebookId,
    mode: 'private',
    wrappedKey: b64(rnd(73)),
    spaceId,
    spaceKeyVersion: 1,
  });
  expect(r.status).toBe(200);
  return notebookId;
}

async function invite(owner: TestUser, target: { kind: string; id: string }, member: TestUser, role = 'editor') {
  const invitationId = newId();
  expect((await call(owner, 'POST', '/invitations', { invitationId, target, email: member.email, role })).status).toBe(204);
  return invitationId;
}

async function join(owner: TestUser, target: { kind: string; id: string }, member: TestUser, role = 'editor') {
  const invitationId = await invite(owner, target, member, role);
  const accepted = await call(member, 'POST', `/invitations/${invitationId}/accept`, {});
  expect(accepted.status).toBe(200);
  const key = await call(owner, 'PUT', `/members/${target.kind}/${target.id}/${member.userId}/key`, {
    version: accepted.body.keyVersion,
    wrappedKey: b64(rnd(73)),
  });
  expect(key.status).toBe(204);
}

const changes = (c: SyncClient) => c.messages.filter((m) => m.type === 'account_changed');
/** The next `account_changed` that names every one of `what`. */
const changed = (c: SyncClient, ...what: string[]) =>
  // `past`: the frame may come before the wait starts (the window starts at the publish).
  c.next((m) => m.type === 'account_changed' && what.every((w) => m.what.includes(w)), 5000, true);
/** Let the coalescing window pass and forget what came so far. */
async function settle(...cs: SyncClient[]) {
  await sleep(400);
  for (const c of cs) c.messages.length = 0;
}

describe('account_changed', () => {
  it('needs protocol 2: v1 clients get welcome 1 and nothing new, other versions are refused', async () => {
    const owner = await user();
    const member = await user();
    const v1 = await SyncClient.user(s, member, 1);
    const v2 = await SyncClient.user(s, member, 2);
    expect(v1.messages.find((m) => m.type === 'welcome')).toMatchObject({ protocol: 1 });
    expect(v2.messages.find((m) => m.type === 'welcome')).toMatchObject({ protocol: 2 });

    const { notebookId } = await createNotebook(s, owner);
    await invite(owner, { kind: 'notebook', id: notebookId }, member);
    expect(await changed(v2, 'invitations')).toEqual({ type: 'account_changed', what: ['invitations'] });
    await sleep(400);
    expect(changes(v1)).toEqual([]);

    const v3 = await SyncClient.connect(s);
    v3.send({
      type: 'hello',
      protocol: 4,
      auth: { kind: 'user', accessToken: member.session.accessToken },
      deviceId: member.session.deviceId,
      client: { platform: 'web', version: 'test' },
    });
    expect(await v3.next((m) => m.type === 'error')).toMatchObject({ code: 'protocol_mismatch' });
    for (const c of [v1, v2, v3]) c.close();
  });

  it('invitations: created, accepted, declined and revoked reach the invitee and the inviter', async () => {
    const owner = await user();
    const member = await user();
    const o = await SyncClient.user(s, owner, 2);
    const m = await SyncClient.user(s, member, 2);
    const { notebookId } = await createNotebook(s, owner);
    const target = { kind: 'notebook', id: notebookId };

    const first = await invite(owner, target, member);
    await Promise.all([changed(m, 'invitations'), changed(o, 'invitations')]);
    await settle(o, m);
    expect((await call(member, 'POST', `/invitations/${first}/decline`, {})).status).toBe(204);
    await Promise.all([changed(m, 'invitations'), changed(o, 'invitations')]);
    await settle(o, m);

    const second = await invite(owner, target, member);
    await settle(o, m);
    expect((await call(owner, 'DELETE', `/invitations/${second}`)).status).toBe(204);
    await Promise.all([changed(m, 'invitations'), changed(o, 'invitations')]);
    await settle(o, m);

    const third = await invite(owner, target, member);
    await settle(o, m);
    expect((await call(member, 'POST', `/invitations/${third}/accept`, {})).status).toBe(200);
    await Promise.all([changed(m, 'invitations', 'members'), changed(o, 'invitations', 'members')]);
    o.close();
    m.close();
  });

  it('coalesces changes within the window into one message per connection', async () => {
    const owner = await user();
    const member = await user();
    const spaceId = await space(owner);
    const invitationId = await invite(owner, { kind: 'space', id: spaceId }, member);
    const m = await SyncClient.user(s, member, 2);
    // Accepting changes the invitations and the memberships at once: one message names both.
    expect((await call(member, 'POST', `/invitations/${invitationId}/accept`, {})).status).toBe(200);
    await sleep(500);
    expect(changes(m)).toEqual([{ type: 'account_changed', what: ['invitations', 'spaces', 'members'] }]);
    m.close();
  });

  it('space members: added, role changed, removed; every device of the owner and the members hears it', async () => {
    const owner = await user();
    const member = await user();
    const other = await user();
    const spaceId = await space(owner);
    await join(owner, { kind: 'space', id: spaceId }, other);
    const o = await SyncClient.user(s, owner, 2);
    const m = await SyncClient.user(s, member, 2);
    const x = await SyncClient.user(s, other, 2);

    await join(owner, { kind: 'space', id: spaceId }, member);
    await Promise.all([changed(m, 'spaces', 'members', 'keys'), changed(o, 'members'), changed(x, 'members')]);
    await settle(o, m, x);

    expect((await call(owner, 'PATCH', `/members/space/${spaceId}/${member.userId}`, { role: 'viewer' })).status).toBe(204);
    await Promise.all([changed(m, 'spaces', 'members'), changed(o, 'members'), changed(x, 'members')]);
    await settle(o, m, x);

    expect((await call(owner, 'DELETE', `/members/space/${spaceId}/${member.userId}`)).status).toBe(204);
    await Promise.all([changed(m, 'spaces', 'members'), changed(o, 'members'), changed(x, 'members')]);
    for (const c of [o, m, x]) c.close();
  });

  it('key wraps: the member is told when its key for a notebook or a note arrives, and on rotations', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteNb = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, noteNb.notebookId);
    const m = await SyncClient.user(s, member, 2);
    for (const target of [
      { kind: 'notebook', id: notebookId },
      { kind: 'note', id: noteId },
    ]) {
      const invitationId = await invite(owner, target, member);
      const accepted = await call(member, 'POST', `/invitations/${invitationId}/accept`, {});
      await settle(m);
      const key = await call(owner, 'PUT', `/members/${target.kind}/${target.id}/${member.userId}/key`, {
        version: accepted.body.keyVersion,
        wrappedKey: b64(rnd(73)),
      });
      expect(key.status).toBe(204);
      expect(await changed(m, 'keys')).toBeTruthy();
      await settle(m);
    }
    // A notebook rotation and its done.
    const rotated = await call(owner, 'POST', `/members/notebook/${notebookId}/rotate`, {
      version: 2,
      ownerWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
      memberKeys: [{ userId: member.userId, wrappedKey: b64(rnd(73)) }],
    });
    expect(rotated.status).toBe(204);
    expect(await changed(m, 'keys')).toBeTruthy();
    await settle(m);
    expect((await call(owner, 'POST', `/members/notebook/${notebookId}/rotate/done`, {})).status).toBe(204);
    expect(await changed(m, 'keys')).toBeTruthy();
    m.close();
  });

  it('notebooks of a space: created, moved in and out, deleted reach all members; the space rotation too', async () => {
    const owner = await user();
    const member = await user();
    const spaceId = await space(owner);
    await join(owner, { kind: 'space', id: spaceId }, member);
    const o = await SyncClient.user(s, owner, 2);
    const m = await SyncClient.user(s, member, 2);

    // Created by an editor: the owner's devices hear it as well.
    const nb = await spaceNotebook(member, spaceId);
    await Promise.all([changed(m, 'notebooks'), changed(o, 'notebooks')]);
    await settle(o, m);

    const { notebookId: personal } = await createNotebook(s, owner);
    expect((await call(owner, 'PUT', `/spaces/${spaceId}/notebooks/${personal}`, { version: 1, spaceWrappedKey: b64(rnd(73)) })).status).toBe(204);
    await changed(m, 'notebooks', 'keys');
    await settle(o, m);

    const out = await call(owner, 'POST', `/spaces/${spaceId}/notebooks/${personal}/move-out`, {
      version: 2,
      ownerWrappedKey: b64(rnd(73)),
      previousKeyWrap: b64(rnd(73)),
    });
    expect(out.status).toBe(204);
    await changed(m, 'notebooks');
    await settle(o, m);

    expect((await call(owner, 'DELETE', `/notebooks/${nb}`)).status).toBe(204);
    await changed(m, 'notebooks');
    await settle(o, m);

    expect((await call(owner, 'POST', `/spaces/${spaceId}/rotate/done`, {})).status).toBe(204);
    await Promise.all([changed(m, 'spaces', 'keys'), changed(o, 'spaces', 'keys')]);
    await settle(o, m);

    expect((await call(owner, 'DELETE', `/spaces/${spaceId}`)).status).toBe(204);
    await changed(m, 'spaces');
    o.close();
    m.close();
  });

  it('a document that becomes available can be subscribed again on the same connection', async () => {
    const owner = await user();
    const member = await user();
    const spaceId = await space(owner);
    const nb = await spaceNotebook(owner, spaceId);
    const m = await SyncClient.user(s, member, 2);
    const before = await m.subscribe(nb);
    expect(before.error).toMatchObject({ code: 'doc_not_found', ref: nb });

    await join(owner, { kind: 'space', id: spaceId }, member);
    await changed(m, 'spaces', 'keys');
    const after = await m.subscribe(nb);
    expect(after.error).toBeNull();
    expect(after.pages.at(-1)).toMatchObject({ type: 'updates', docId: nb, upToDate: true });
    m.close();
  });
});
