// Compatibility with the reference sync client of @datascratch/shared (the one web uses):
// two devices editing the same encrypted note through the real server.
import { initCrypto } from '@datascratch/shared/crypto';
import { MemorySyncStorage, SyncClient } from '@datascratch/shared/sync';
import { afterAll, beforeAll, expect, it } from 'vitest';
import * as Y from 'yjs';
import { api, createNote, createNotebook, rnd, signup, sleep, startServer, type TestServer, type TestUser } from './helpers.js';

let s: TestServer;
let u: TestUser;
beforeAll(async () => {
  await initCrypto();
  s = await startServer();
  u = await signup(s);
});
afterAll(() => s.close());

function device(session: TestUser['session'], key: Uint8Array) {
  const storage = new MemorySyncStorage();
  const client = new SyncClient({
    url: s.wsUrl,
    auth: () => ({ kind: 'user', accessToken: session.accessToken }),
    deviceId: session.deviceId,
    client: { platform: 'web', version: 'test' },
    storage,
    keyFor: () => key,
  });
  return { client, storage };
}

async function until(cond: () => boolean, ms = 5000) {
  for (let t = 0; t < ms / 20 && !cond(); t++) await sleep(20);
  expect(cond()).toBe(true);
}

it('two shared SyncClients converge through the server, including after a reconnect', async () => {
  const { notebookId } = await createNotebook(s, u);
  const noteId = await createNote(s, u, notebookId);
  const key = rnd(32);
  const second = await api(s, 'POST', '/auth/login', {
    body: { email: u.email, loginKey: u.loginKey, deviceName: 'B' },
  });

  const a = device(u.session, key);
  const b = device(second.body, key);
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  a.client.start();
  b.client.start();
  await a.client.addDoc(noteId, docA);
  await b.client.addDoc(noteId, docB);

  docA.getText('t').insert(0, 'hello');
  await until(() => docB.getText('t').toString() === 'hello');
  docB.getText('t').insert(5, ' world');
  await until(() => docA.getText('t').toString() === 'hello world');

  // B goes offline, both edit, B comes back: CRDT merge through the server.
  await b.client.stop();
  docA.getText('t').insert(0, '>');
  docB.getText('t').insert(docB.getText('t').length, '!');
  b.client.start();
  await b.client.addDoc(noteId, docB).catch(() => undefined);
  await until(() => docA.getText('t').toString() === '>hello world!' && docB.getText('t').toString() === '>hello world!');

  // A third device starting from scratch gets the same state.
  const c = device(u.session, key);
  const docC = new Y.Doc();
  c.client.start();
  await c.client.addDoc(noteId, docC);
  await until(() => docC.getText('t').toString() === '>hello world!');
  for (const x of [a, b, c]) await x.client.stop();
});

it('the shared client compacts with snapshots the server accepts and serves', async () => {
  const { notebookId } = await createNotebook(s, u);
  const noteId = await createNote(s, u, notebookId);
  const key = rnd(32);
  const storage = new MemorySyncStorage();
  const client = new SyncClient({
    url: s.wsUrl,
    auth: () => ({ kind: 'user', accessToken: u.session.accessToken }),
    deviceId: u.session.deviceId,
    client: { platform: 'web', version: 'test' },
    storage,
    keyFor: () => key,
    batchMs: 0,
    snapshotThresholds: { updates: 5 },
  });
  const doc = new Y.Doc();
  client.start();
  await client.addDoc(noteId, doc);
  for (let i = 0; i < 12; i++) {
    doc.getText('t').insert(doc.getText('t').length, String(i % 10));
    await client.flush();
    await sleep(30);
  }
  let versions: { seq: number }[] = [];
  for (let t = 0; t < 100 && versions.length === 0; t++) {
    versions = (await api(s, 'GET', `/docs/${noteId}/versions`, { token: u.session.accessToken })).body;
    await sleep(30);
  }
  expect(versions.length).toBeGreaterThan(0);
  await client.stop();

  const fresh = new Y.Doc();
  const c2 = device(u.session, key);
  c2.client.start();
  await c2.client.addDoc(noteId, fresh);
  await until(() => fresh.getText('t').toString() === doc.getText('t').toString());
  await c2.client.stop();
});
