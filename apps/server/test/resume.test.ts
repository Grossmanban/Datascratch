import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChangeLog } from '../src/services/change-log.js';
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

// Sync protocol 3: `resume` by account cursor (sync-protocol.md §3.1).
let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

let accounts = 0;
const address = () => `10.64.${Math.floor(accounts / 200)}.${(accounts++ % 200) + 1}`;
const call = (u: TestUser, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api(s, method, path, { token: u.session.accessToken, ...(body !== undefined ? { body } : {}) });

async function user() {
  const u = await signup(s, undefined, address());
  expect((await call(u, 'PUT', '/me/box-key', { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) })).status).toBe(204);
  return u;
}

async function share(owner: TestUser, notebookId: string, member: TestUser) {
  const invitationId = newId();
  const target = { kind: 'notebook', id: notebookId };
  expect((await call(owner, 'POST', '/invitations', { invitationId, target, email: member.email, role: 'editor' })).status).toBe(204);
  const accepted = await call(member, 'POST', `/invitations/${invitationId}/accept`, {});
  expect(accepted.status).toBe(200);
  const key = await call(owner, 'PUT', `/members/notebook/${notebookId}/${member.userId}/key`, {
    version: accepted.body.keyVersion,
    wrappedKey: b64(rnd(73)),
  });
  expect(key.status).toBe(204);
}

async function resume(c: SyncClient, cursor: string | null) {
  c.send({ type: 'resume', cursor });
  return c.next((m) => m.type === 'resumed');
}

/** A fresh v3 connection that resumed from `cursor`. */
async function resumed(u: TestUser, cursor: string | null) {
  const c = await SyncClient.user(s, u, 3);
  return { c, r: await resume(c, cursor) };
}

describe('resume (protocol 3)', () => {
  it('welcomes protocol 3; a null cursor is a reset with a cursor; that cursor then resumes with nothing new', async () => {
    const u = await user();
    const c = await SyncClient.user(s, u, 3);
    expect(c.messages.find((m) => m.type === 'welcome').protocol).toBe(3);
    const first = await resume(c, null);
    expect(first).toMatchObject({ type: 'resumed', reset: true, docs: [], removed: [] });
    expect(typeof first.cursor).toBe('string');
    c.close();
    const { c: c2, r } = await resumed(u, first.cursor);
    expect(r).toMatchObject({ reset: false, docs: [], removed: [] });
    c2.close();
  });

  it('lists documents changed after the cursor with their seq, and those created after it', async () => {
    const u = await user();
    const { notebookId } = await createNotebook(s, u);
    const quiet = await createNote(s, u, notebookId);
    const busy = await createNote(s, u, notebookId);
    const writer = await SyncClient.user(s, u);
    await writer.push(quiet, rnd(10));
    const { c, r: start } = await resumed(u, null);
    c.close();
    await writer.push(busy, rnd(10));
    await writer.push(busy, rnd(10));
    const fresh = await createNote(s, u, notebookId);
    const { c: c2, r } = await resumed(u, start.cursor);
    expect(r.reset).toBe(false);
    const byId = new Map(r.docs.map((d: any) => [d.docId, d.seq]));
    expect(byId.get(busy)).toBe(2);
    expect(byId.get(fresh)).toBe(0);
    expect(byId.has(quiet)).toBe(false);
    // The new cursor covers those changes: resuming from it lists nothing.
    c2.close();
    const { c: c3, r: again } = await resumed(u, r.cursor);
    expect(again).toMatchObject({ reset: false, docs: [], removed: [] });
    for (const x of [writer, c3]) x.close();
  });

  it('subscribes the account: live updates of every readable document arrive without subscribe', async () => {
    const u = await user();
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const writer = await SyncClient.user(s, u);
    await writer.push(noteId, rnd(10));
    const { c: first } = await resumed(u, null);
    first.close();
    const { c, r } = await resumed(u, (await resumed(u, null)).r.cursor);
    expect(r.reset).toBe(false);
    const payload = b64(rnd(12));
    writer.send({ type: 'push', docId: noteId, clientMsgId: 'live-1', payload });
    expect(await c.next((m) => m.type === 'update')).toMatchObject({ docId: noteId, seq: 2, payload });
    // An explicit subscribe still works as before.
    const sub = await c.subscribe(noteId, 0);
    expect(sub.pages.flatMap((p: any) => p.items.map((i: any) => i.seq))).toEqual([1, 2]);
    for (const x of [writer, c]) x.close();
  });

  it('a reset subscribes nothing', async () => {
    const u = await user();
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const { c, r } = await resumed(u, null);
    expect(r.reset).toBe(true);
    const writer = await SyncClient.user(s, u);
    await writer.push(noteId, rnd(10));
    await sleep(200);
    expect(c.messages.some((m) => m.type === 'update')).toBe(false);
    for (const x of [writer, c]) x.close();
  });

  it('access: a notebook shared after the cursor lists its notes; a deleted note and lost access go to removed', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId } = await createNotebook(s, owner);
    const a = await createNote(s, owner, notebookId);
    const b = await createNote(s, owner, notebookId);
    const { c, r: start } = await resumed(member, null);
    c.close();
    await share(owner, notebookId, member);
    const { c: c2, r: granted } = await resumed(member, start.cursor);
    expect(granted.reset).toBe(false);
    expect(granted.docs.map((d: any) => d.docId).sort()).toEqual([a, b, notebookId].sort());
    c2.close();

    expect((await call(owner, 'DELETE', `/docs/${a}`)).status).toBe(204);
    const { c: c3, r: afterDelete } = await resumed(member, granted.cursor);
    expect(afterDelete).toMatchObject({ reset: false, docs: [], removed: [a] });
    c3.close();

    expect((await call(owner, 'DELETE', `/members/notebook/${notebookId}/${member.userId}`)).status).toBe(204);
    const { c: c4, r: lost } = await resumed(member, afterDelete.cursor);
    expect(lost.reset).toBe(false);
    expect(lost.removed.sort()).toEqual([b, notebookId].sort());
    // An older cursor (before the share) does not list documents the account never had now.
    c4.close();
    const { c: c5, r: old } = await resumed(member, start.cursor);
    expect(old.docs).toEqual([]);
    for (const x of [c5]) x.close();
  });

  it('a lost access during the connection stops the account subscription with doc_not_found', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId } = await createNotebook(s, owner);
    const noteId = await createNote(s, owner, notebookId);
    await share(owner, notebookId, member);
    const { c: first } = await resumed(member, null);
    first.close();
    const { c, r } = await resumed(member, (await resumed(member, null)).r.cursor);
    expect(r.reset).toBe(false);
    expect((await call(owner, 'DELETE', `/members/notebook/${notebookId}/${member.userId}`)).status).toBe(204);
    expect(await c.next((m) => m.type === 'error' && m.ref === noteId)).toMatchObject({ code: 'doc_not_found' });
    c.close();
  });

  it('unknown, broken, foreign, future and too old cursors are a reset', async () => {
    const u = await user();
    const { r: start } = await resumed(u, null);
    const [epoch, pos, at] = start.cursor.split('.');
    const nowSec = Math.floor(Date.now() / 1000);
    for (const bad of [
      'garbage',
      `other-db.${pos}.${at}`,
      `${epoch}.${Number(pos) + 10 ** 12}.${at}`,
      `${epoch}.${pos}.${nowSec - 31 * 86_400}`,
    ]) {
      const { c, r } = await resumed(u, bad);
      expect(r).toMatchObject({ reset: true, docs: [], removed: [] });
      c.close();
    }
  });

  it('more than 1000 changed documents is a reset', async () => {
    const u = await user();
    const { notebookId } = await createNotebook(s, u);
    const { c, r: start } = await resumed(u, null);
    c.close();
    // 1001 notes created after the cursor (directly in the database: the API would be slow here).
    await s.ctx.database.db.execute(sql`
      INSERT INTO docs (id, user_id, kind, notebook_id)
      SELECT gen_random_uuid(), ${u.userId}, 'note', ${notebookId} FROM generate_series(1, 1001)`);
    const { c: c2, r } = await resumed(u, start.cursor);
    expect(r).toMatchObject({ reset: true, docs: [], removed: [] });
    c2.close();
  });

  it('refuses resume before protocol 3 (bad_request without ref) and a second time', async () => {
    const u = await user();
    const v2 = await SyncClient.user(s, u, 2);
    v2.send({ type: 'resume', cursor: null });
    const e = await v2.next((m) => m.type === 'error');
    expect(e.code).toBe('bad_request');
    expect(e.ref).toBeUndefined();
    const { c } = await resumed(u, null);
    c.send({ type: 'resume', cursor: null });
    expect((await c.next((m) => m.type === 'error')).code).toBe('bad_request');
    for (const x of [v2, c]) x.close();
  });
});

describe('change log positions', () => {
  it('the cursor stays below a position whose transaction has not finished', async () => {
    const log = new ChangeLog(s.ctx.database.db);
    await log.ready();
    let release!: () => void;
    const blocked = new Promise<void>((r) => (release = r));
    let held = 0;
    const slow = log.scope(async () => {
      held = log.allocate();
      await blocked;
    });
    await sleep(10);
    let later = 0;
    await log.scope(async () => {
      later = log.allocate();
    });
    expect(later).toBeGreaterThan(held);
    expect(log.watermark()).toBe(held - 1);
    release();
    await slow;
    expect(log.watermark()).toBe(later);
  });
});
