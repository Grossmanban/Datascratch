// End to end: the real @datascratch/agents plugin inside the real server.
import { makeNoteDoc, makeNotebookDoc } from '@datascratch/agents/testing';
import { afterAll, beforeAll, expect, it } from 'vitest';
import * as Y from 'yjs';
import { AD, open, seal } from '../src/lib/sodium.js';
import { agentsPlugin } from '../src/plugins/loader.js';
import { SyncClient, api, b64, createNote, createNotebook, rnd, signup, startServer, type TestServer, type TestUser } from './helpers.js';

let s: TestServer;
let u: TestUser;
beforeAll(async () => {
  s = await startServer({ PUBLIC_URL: 'http://127.0.0.1' }, [agentsPlugin]);
  u = await signup(s);
});
afterAll(() => s.close());

it('a static agent token reads and creates notes; the owner device sees the result', async () => {
  const notebookKey = rnd(32);
  const { notebookId } = await createNotebook(s, u, { mode: 'agent', notebookKey });
  const noteId = await createNote(s, u, notebookId);
  const noteKey = rnd(32);
  const owner = await SyncClient.user(s, u);

  const index = makeNotebookDoc(notebookId, 'Work', [{ id: noteId, title: 'Plan' }]);
  (index.getMap('notes').get(noteId) as Y.Map<unknown>).set(
    'wrappedKey',
    b64(await seal(notebookKey, noteKey, AD.note(noteId))),
  );
  await owner.push(notebookId, await seal(notebookKey, Y.encodeStateAsUpdate(index), AD.doc(notebookId)));
  const note = makeNoteDoc('Plan', 'Buy **milk** and bread.');
  await owner.push(noteId, await seal(noteKey, Y.encodeStateAsUpdate(note), AD.doc(noteId)));

  // The user creates a token (the plugin owns this route, the server authenticates the user).
  const created = await s.app.inject({
    method: 'POST',
    url: '/v1/agent-tokens',
    headers: { authorization: `Bearer ${u.session.accessToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ name: 'Script', notebookIds: [notebookId], permission: 'read_write' }),
  });
  expect(created.statusCode).toBe(201);
  const token = created.json().token as string;
  const agent = { authorization: `Bearer ${token}` };

  const read = await s.app.inject({ method: 'GET', url: `/v1/agent/notes/${noteId}`, headers: agent });
  expect(read.statusCode).toBe(200);
  expect(read.body).toContain('milk');

  await owner.subscribe(notebookId, 1);
  const make = await s.app.inject({
    method: 'POST',
    url: '/v1/agent/notes',
    headers: { ...agent, 'content-type': 'application/json' },
    payload: JSON.stringify({ notebookId, title: 'From agent', markdown: 'Hello from the agent.' }),
  });
  expect(make.statusCode).toBeLessThan(300);
  // The notebook index changes on the owner's device (new NoteMeta with a wrapped key it can open).
  const upd = await owner.next((m) => m.type === 'update' && m.docId === notebookId, 5000, true);
  expect(upd.deviceId).toMatch(/^agent:/);
  Y.applyUpdate(index, await open(notebookKey, Buffer.from(upd.payload, 'base64url'), AD.doc(notebookId)));
  const added = [...(index.getMap('notes') as Y.Map<Y.Map<unknown>>).entries()].find(([id]) => id !== noteId);
  expect(added).toBeDefined();
  const [newId, meta] = added!;
  const newKey = await open(notebookKey, Buffer.from(meta.get('wrappedKey') as string, 'base64url'), AD.note(newId));
  const sub = await owner.subscribe(newId, 0);
  const newDoc = new Y.Doc();
  for (const it of sub.pages.flatMap((p: any) => p.items)) {
    Y.applyUpdate(newDoc, await open(newKey, Buffer.from(it.payload, 'base64url'), AD.doc(newId)));
  }
  expect(JSON.stringify(newDoc.getXmlFragment('content').toJSON())).toContain('Hello from the agent');

  // The journal and the token list are served by the plugin from the server's tables.
  const list = await api(s, 'GET', '/agent-tokens', { token: u.session.accessToken });
  expect(JSON.stringify(list.body)).toContain('Script');
  owner.close();
});
