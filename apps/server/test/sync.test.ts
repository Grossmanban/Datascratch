import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { docUpdates } from '../src/db/schema.js';
import { COMPACT_JOB } from '../src/jobs/index.js';
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
import { sql } from 'drizzle-orm';

let s: TestServer;
let u: TestUser;
let notebookId: string;

beforeAll(async () => {
  s = await startServer({ SYNC_UPDATE_MAX_BYTES: '1000' });
  u = await signup(s);
  ({ notebookId } = await createNotebook(s, u));
});
afterAll(() => s.close());

async function secondDevice(user: TestUser): Promise<TestUser> {
  const r = await api(s, 'POST', '/auth/login', {
    body: { email: user.email, loginKey: user.loginKey, deviceName: 'Second' },
  });
  return { ...user, session: r.body };
}

describe('handshake', () => {
  it('requires hello first and a valid token', async () => {
    const c = await SyncClient.connect(s);
    c.send({ type: 'subscribe', docs: [{ docId: newId(), since: 0 }] });
    expect((await c.next((m) => m.type === 'error')).code).toBe('unauthorized');
    expect((await c.waitClose()).code).toBe(4401);

    const bad = await SyncClient.connect(s);
    bad.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'user', accessToken: 'nope' },
      deviceId: 'x',
      client: { platform: 'web', version: '1' },
    });
    expect((await bad.next((m) => m.type === 'error')).code).toBe('unauthorized');
  });

  it('rejects other protocol versions', async () => {
    const c = await SyncClient.connect(s);
    c.send({
      type: 'hello',
      protocol: 2,
      auth: { kind: 'user', accessToken: u.session.accessToken },
      deviceId: 'x',
      client: { platform: 'ios', version: '1' },
    });
    expect((await c.next((m) => m.type === 'error')).code).toBe('protocol_mismatch');
    expect((await c.waitClose()).code).toBe(4400);
  });

  it('welcomes a user', async () => {
    const c = await SyncClient.user(s, u);
    const w = c.messages.find((m) => m.type === 'welcome');
    expect(w).toMatchObject({ userId: u.userId, protocol: 1 });
    c.close();
  });
});

describe('push and live updates between two devices', () => {
  it('assigns seq, acks, relays to the other device but not back to the sender', async () => {
    const noteId = await createNote(s, u, notebookId);
    const a = await SyncClient.user(s, u);
    const b = await SyncClient.user(s, await secondDevice(u));
    expect((await a.subscribe(noteId)).pages[0]).toMatchObject({ snapshot: null, items: [], upToDate: true });
    await b.subscribe(noteId);

    const p1 = rnd(50);
    const ack1 = await a.push(noteId, p1);
    expect(ack1).toMatchObject({ type: 'ack', docId: noteId, seq: 1 });
    const live = await b.next((m) => m.type === 'update');
    expect(live).toMatchObject({ docId: noteId, seq: 1, payload: b64(p1), deviceId: u.session.deviceId });

    const ack2 = await b.push(noteId, rnd(10));
    expect(ack2.seq).toBe(2);
    expect((await a.next((m) => m.type === 'update')).seq).toBe(2);
    await sleep(100);
    expect(a.messages.filter((m) => m.type === 'update').map((m) => m.seq)).toEqual([2]);
    expect(b.messages.filter((m) => m.type === 'update').map((m) => m.seq)).toEqual([1]);
    a.close();
    b.close();
  });

  it('catches up from since and treats a repeated clientMsgId as the same update', async () => {
    const noteId = await createNote(s, u, notebookId);
    const a = await SyncClient.user(s, u);
    const msgId = newId();
    const first = await a.push(noteId, rnd(20), msgId);
    const dup = await a.push(noteId, rnd(20), msgId);
    expect(dup.seq).toBe(first.seq);
    await a.push(noteId, rnd(20));
    await a.push(noteId, rnd(20));

    const b = await SyncClient.user(s, u);
    const all = await b.subscribe(noteId, 0);
    expect(all.pages.flatMap((p: any) => p.items.map((i: any) => i.seq))).toEqual([1, 2, 3]);
    const c = await SyncClient.user(s, u);
    const tail = await c.subscribe(noteId, 2);
    expect(tail.pages.flatMap((p: any) => p.items.map((i: any) => i.seq))).toEqual([3]);
    a.close();
    b.close();
    c.close();
  });

  it('delivers concurrent pushes in seq order to a third client', async () => {
    const noteId = await createNote(s, u, notebookId);
    const writers = await Promise.all([1, 2, 3].map(() => SyncClient.user(s, u)));
    const reader = await SyncClient.user(s, u);
    await reader.subscribe(noteId);
    const N = 15;
    await Promise.all(
      writers.map(async (w) => {
        for (let i = 0; i < N; i++) w.send({ type: 'push', docId: noteId, clientMsgId: newId(), payload: b64(rnd(8)) });
        for (let i = 0; i < N; i++) await w.next((m) => m.type === 'ack');
      }),
    );
    for (let i = 0; i < 100 && reader.messages.filter((m) => m.type === 'update').length < 3 * N; i++) await sleep(20);
    const seqs = reader.messages.filter((m) => m.type === 'update').map((m) => m.seq);
    expect(seqs).toEqual(Array.from({ length: 3 * N }, (_, i) => i + 1));
    for (const c of [...writers, reader]) c.close();
  });

  it('never lets an ack overtake an earlier seq on a subscribed writer', async () => {
    const noteId = await createNote(s, u, notebookId);
    const writers = await Promise.all([1, 2, 3].map(() => SyncClient.user(s, u)));
    for (const w of writers) await w.subscribe(noteId);
    const N = 15;
    await Promise.all(
      writers.map(async (w) => {
        for (let i = 0; i < N; i++) w.send({ type: 'push', docId: noteId, clientMsgId: newId(), payload: b64(rnd(8)) });
        for (let i = 0; i < N; i++) await w.next((m) => m.type === 'ack');
      }),
    );
    for (const w of writers) {
      for (let i = 0; i < 100 && w.messages.filter((m) => m.type === 'ack' || m.type === 'update').length < 3 * N; i++) {
        await sleep(20);
      }
      const seqs = w.messages.filter((m) => m.type === 'ack' || m.type === 'update').map((m) => m.seq);
      expect(seqs).toEqual(Array.from({ length: 3 * N }, (_, i) => i + 1));
    }
    for (const w of writers) w.close();
  });

  it('enforces limits and access', async () => {
    const noteId = await createNote(s, u, notebookId);
    const a = await SyncClient.user(s, u);
    const big = await a.push(noteId, rnd(2000));
    expect(big).toMatchObject({ type: 'error', code: 'payload_too_large' });
    const unknown = await a.push(newId(), rnd(10));
    expect(unknown).toMatchObject({ type: 'error', code: 'doc_not_found' });
    const other = await signup(s);
    const otherNb = await createNotebook(s, other);
    const foreign = await createNote(s, other, otherNb.notebookId);
    const sub = await a.subscribe(foreign);
    expect(sub.error.code).toBe('doc_not_found');
    const push = await a.push(foreign, rnd(10));
    expect(push.code).toBe('doc_not_found');
    a.send({ type: 'push', docId: noteId, clientMsgId: 'm', payload: '***' });
    expect((await a.next((m) => m.type === 'error' && m.ref === 'm')).code).toBe('protocol_mismatch');
    a.close();
  });

  it('relays awareness only to subscribers', async () => {
    const noteId = await createNote(s, u, notebookId);
    const a = await SyncClient.user(s, u);
    const b = await SyncClient.user(s, u);
    a.send({ type: 'awareness', docId: noteId, payload: b64(rnd(5)) });
    expect((await a.next((m) => m.type === 'error')).code).toBe('forbidden');
    await a.subscribe(noteId);
    await b.subscribe(noteId);
    const payload = b64(rnd(5));
    a.send({ type: 'awareness', docId: noteId, payload });
    expect(await b.next((m) => m.type === 'awareness')).toMatchObject({ docId: noteId, payload });
    a.close();
    b.close();
  });
});

describe('snapshots, compaction and history', () => {
  it('stores snapshots, serves them to new devices and lists versions', async () => {
    const noteId = await createNote(s, u, notebookId);
    const a = await SyncClient.user(s, u);
    for (let i = 0; i < 5; i++) await a.push(noteId, rnd(10));
    const snap = b64(rnd(100));
    a.send({ type: 'snapshot', docId: noteId, clientMsgId: 'snap-1', baseSeq: 4, payload: snap });
    expect(await a.next((m) => m.clientMsgId === 'snap-1')).toMatchObject({ type: 'ack', seq: 4 });
    a.send({ type: 'snapshot', docId: noteId, clientMsgId: 'snap-bad', baseSeq: 99, payload: snap });
    expect((await a.next((m) => m.ref === 'snap-bad')).code).toBe('protocol_mismatch');
    await s.jobs.drain();

    const versions = await api(s, 'GET', `/docs/${noteId}/versions`, { token: u.session.accessToken });
    expect(versions.body.map((v: any) => v.seq)).toEqual([4]);
    const v = await api(s, 'GET', `/docs/${noteId}/versions/4`, { token: u.session.accessToken });
    expect(v.body.payload).toBe(snap);

    // Covered updates are kept for a while; age them and compact.
    await s.ctx.database.db.execute(sql`UPDATE doc_updates SET created_at = now() - interval '30 days' WHERE doc_id = ${noteId}`);
    await s.jobs.run(COMPACT_JOB, { docId: noteId });
    const left = await s.ctx.database.db.select({ seq: docUpdates.seq }).from(docUpdates).where(sql`doc_id = ${noteId}`);
    expect(left.map((r) => r.seq).sort()).toEqual([5]);

    const b = await SyncClient.user(s, u);
    const sub = await b.subscribe(noteId, 0);
    expect(sub.pages[0].snapshot).toEqual({ seq: 4, payload: snap });
    expect(sub.pages.flatMap((p: any) => p.items.map((i: any) => i.seq))).toEqual([5]);
    // A device that already had seq 2 also needs the snapshot now.
    const c = await SyncClient.user(s, u);
    const sub2 = await c.subscribe(noteId, 2);
    expect(sub2.pages[0].snapshot.seq).toBe(4);
    // One that is up to date gets nothing.
    const sub3 = await c.subscribe(noteId, 5);
    expect(sub3.pages).toEqual([{ type: 'updates', docId: noteId, snapshot: null, items: [], upToDate: true }]);
    for (const x of [a, b, c]) x.close();
  });
});

describe('deletion', () => {
  it('notifies subscribers when a note is deleted', async () => {
    const noteId = await createNote(s, u, notebookId);
    const a = await SyncClient.user(s, u);
    await a.subscribe(noteId);
    const del = await api(s, 'DELETE', `/docs/${noteId}`, { token: u.session.accessToken });
    expect(del.status).toBe(204);
    expect(await a.next((m) => m.type === 'error' && m.ref === noteId)).toMatchObject({ code: 'doc_not_found' });
    a.close();
  });
});
