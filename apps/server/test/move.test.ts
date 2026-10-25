import { afterAll, beforeAll, expect, it } from 'vitest';
import * as Y from 'yjs';
import { AD, seal } from '../src/lib/sodium.js';
import { createAgentsContext } from '../src/plugins/loader.js';
import type { AgentGrant } from '../src/plugins/agents-context.js';
import { SyncClient, api, b64, createNote, createNotebook, newId, rnd, signup, startServer, type TestServer, type TestUser } from './helpers.js';

let s: TestServer;
let u: TestUser;
beforeAll(async () => {
  s = await startServer();
  u = await signup(s);
});
afterAll(() => s.close());

const move = (docId: string, notebookId: string, token = u.session.accessToken) =>
  api(s, 'PATCH', `/docs/${docId}`, { token, body: { notebookId } });

async function guest(shareId: string) {
  const g = await api(s, 'POST', `/shares/${shareId}/guest`, { body: {} });
  const c = await SyncClient.connect(s);
  c.send({
    type: 'hello',
    protocol: 1,
    auth: { kind: 'guest', shareId, guestToken: g.body.guestToken },
    deviceId: 'g',
    client: { platform: 'web', version: '1' },
  });
  await c.next((m) => m.type === 'welcome');
  return c;
}

it('moves a note; validates ownership and kind; is idempotent', async () => {
  const a = await createNotebook(s, u);
  const b = await createNotebook(s, u);
  const noteId = await createNote(s, u, a.notebookId);
  expect((await move(noteId, b.notebookId)).status).toBe(204);
  expect((await move(noteId, b.notebookId)).status).toBe(204);
  expect((await move(a.notebookId, b.notebookId)).status).toBe(400);
  expect((await move(newId(), b.notebookId)).status).toBe(404);
  const other = await signup(s);
  const foreign = await createNotebook(s, other);
  expect((await move(noteId, foreign.notebookId)).status).toBe(404);
  expect((await move(noteId, a.notebookId, other.session.accessToken)).status).toBe(404);
  // History stays with the document.
  const c = await SyncClient.user(s, u);
  await c.push(noteId, rnd(10));
  await move(noteId, a.notebookId);
  expect((await c.subscribe(noteId, 0)).pages[0].items).toHaveLength(1);
  c.close();
});

it("guests of the old notebook's share lose the note; a note share keeps it", async () => {
  const a = await createNotebook(s, u);
  const b = await createNotebook(s, u);
  const noteId = await createNote(s, u, a.notebookId);
  const nbShare = newId();
  const noteShare = newId();
  const t = u.session.accessToken;
  await api(s, 'POST', '/shares', { token: t, body: { shareId: nbShare, target: { kind: 'notebook', id: a.notebookId }, permission: 'edit' } });
  await api(s, 'POST', '/shares', { token: t, body: { shareId: noteShare, target: { kind: 'note', id: noteId }, permission: 'edit' } });
  const gNb = await guest(nbShare);
  const gNote = await guest(noteShare);
  const gNb2 = await guest(nbShare);
  await gNb.subscribe(noteId);
  await gNote.subscribe(noteId);
  expect((await gNb2.push(noteId, rnd(5))).type).toBe('ack'); // not subscribed, access cached

  expect((await move(noteId, b.notebookId)).status).toBe(204);
  expect(await gNb.next((m) => m.type === 'error' && m.ref === noteId)).toMatchObject({ code: 'doc_not_found' });
  expect((await gNb.push(noteId, rnd(5))).code).toBe('doc_not_found');
  expect((await gNb2.push(noteId, rnd(5))).code).toBe('doc_not_found');
  expect((await gNote.push(noteId, rnd(5))).type).toBe('ack');
  const g = await api(s, 'POST', `/shares/${nbShare}/guest`, { body: {} });
  expect(g.body.docIds).not.toContain(noteId);
  for (const c of [gNb, gNote, gNb2]) c.close();
});

it('agent access follows the note into and out of agent notebooks', async () => {
  const agents = createAgentsContext(s.ctx);
  const nbKeyA = rnd(32);
  const nbKeyB = rnd(32);
  const a = await createNotebook(s, u, { mode: 'agent', notebookKey: nbKeyA });
  const b = await createNotebook(s, u, { mode: 'agent', notebookKey: nbKeyB });
  const priv = await createNotebook(s, u);
  const noteId = await createNote(s, u, a.notebookId);
  const noteKey = rnd(32);
  const owner = await SyncClient.user(s, u);
  const writeIndex = async (notebookId: string, key: Uint8Array) => {
    const idx = new Y.Doc();
    const meta = new Y.Map();
    idx.getMap('notes').set(noteId, meta);
    meta.set('wrappedKey', b64(await seal(key, noteKey, AD.note(noteId))));
    await owner.push(notebookId, await seal(key, Y.encodeStateAsUpdate(idx), AD.doc(notebookId)));
  };
  await writeIndex(a.notebookId, nbKeyA);
  const note = new Y.Doc();
  note.getText('t').insert(0, 'secret');
  await owner.push(noteId, await seal(noteKey, Y.encodeStateAsUpdate(note), AD.doc(noteId)));
  const grant = (notebookIds: string[]): AgentGrant => ({
    id: newId(),
    userId: u.userId,
    kind: 'static',
    name: 'x',
    clientId: null,
    notebookIds,
    permission: 'read',
    createdAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    secretHash: rnd(16).toString('hex'),
  });
  const gA = grant([a.notebookId]);
  const gB = grant([b.notebookId]);
  await agents.store.insertGrant(gA);
  await agents.store.insertGrant(gB);
  expect((await agents.data.loadDoc(u.userId, noteId, gA.id))?.doc.getText('t').toString()).toBe('secret');

  // Client: re-wrap the note key for B and write NoteMeta there, then move.
  await writeIndex(b.notebookId, nbKeyB);
  await move(noteId, b.notebookId);
  expect(await agents.data.loadDoc(u.userId, noteId, gA.id)).toBeNull();
  expect((await agents.data.loadDoc(u.userId, noteId, gB.id))?.doc.getText('t').toString()).toBe('secret');

  // Into a private notebook: no agent sees it any more.
  await move(noteId, priv.notebookId);
  expect(await agents.data.loadDoc(u.userId, noteId, gB.id)).toBeNull();
  expect(await agents.data.loadDoc(u.userId, noteId)).toBeNull();
  owner.close();
});
