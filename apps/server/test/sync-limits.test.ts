import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PRE_AUTH_MAX_PAYLOAD } from '../src/sync/connection.js';
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

// Security audit 2026-10-27, item 2: unauthenticated frames, connection caps, flooding.
let s: TestServer;
let u: TestUser;
beforeAll(async () => {
  s = await startServer({ SYNC_MAX_CONN_PER_IP: '6', SYNC_MAX_CONN_PER_USER: '3' });
  u = await signup(s);
});
afterAll(() => s.close());

/** Close and wait until the server has released the connections (they count against the caps). */
async function closeAll(cs: SyncClient[]) {
  for (const c of cs) c.close();
  await Promise.all(cs.map((c) => c.waitClose()));
  await sleep(100);
}

const hello = (c: SyncClient, user: TestUser) =>
  c.send({
    type: 'hello',
    protocol: 1,
    auth: { kind: 'user', accessToken: user.session.accessToken },
    deviceId: user.session.deviceId,
    client: { platform: 'web', version: 'test' },
  });

describe('frames before hello', () => {
  it('closes a connection that sends a large frame before authenticating', async () => {
    const c = await SyncClient.connect(s);
    c.ws.send('x'.repeat(PRE_AUTH_MAX_PAYLOAD + 1));
    expect((await c.waitClose()).code).toBe(1009);
  });

  it('accepts large frames once authenticated', async () => {
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const c = await SyncClient.user(s, u);
    await c.push(noteId, rnd(10));
    // A 1 MB snapshot: 16 times the pre-auth limit.
    c.send({ type: 'snapshot', docId: noteId, clientMsgId: 'big', baseSeq: 1, payload: b64(rnd(1024 * 1024)) });
    expect(await c.next((m) => m.clientMsgId === 'big' || m.ref === 'big')).toMatchObject({ type: 'ack', seq: 1 });
    await closeAll([c]);
  });
});

describe('connection caps', () => {
  it('limits connections per account', async () => {
    const v = await signup(s);
    const open = [await SyncClient.user(s, v), await SyncClient.user(s, v), await SyncClient.user(s, v)];
    const extra = await SyncClient.connect(s);
    hello(extra, v);
    expect(await extra.next((m) => m.type === 'error')).toMatchObject({ code: 'rate_limited' });
    expect((await extra.waitClose()).code).toBe(1013);
    // Another account is not affected; closing one frees a slot.
    const w = await SyncClient.user(s, await signup(s));
    open[0]!.close();
    await open[0]!.waitClose();
    await sleep(100);
    const again = await SyncClient.user(s, v);
    await closeAll([...open.slice(1), extra, w, again]);
  });

  it('limits connections per client address', async () => {
    const socks: SyncClient[] = [];
    for (let i = 0; i < 6; i++) socks.push(await SyncClient.connect(s));
    const extra = await SyncClient.connect(s);
    expect((await extra.waitClose()).code).toBe(1013);
    await closeAll(socks);
  });
});

describe('flooding', () => {
  it('rate-limits before parsing', async () => {
    const c = await SyncClient.user(s, u);
    // 600 large non-JSON messages, faster than the bucket (100/s, burst 500) refills.
    const junk = 'y'.repeat(32 * 1024);
    for (let i = 0; i < 600; i++) c.ws.send(junk);
    await c.next((m) => m.type === 'error' && m.code === 'rate_limited', 10_000);
    await sleep(500);
    const invalid = c.messages.filter((m) => m.type === 'error' && m.code === 'bad_request').length;
    const limited = c.messages.filter((m) => m.type === 'error' && m.code === 'rate_limited').length;
    expect(invalid + limited).toBe(600);
    expect(invalid).toBeLessThanOrEqual(520);
    expect(limited).toBeGreaterThanOrEqual(80);
    await closeAll([c]);
  }, 30_000);
});

// Item 3: an expired share must cut off guests that are already connected.
describe('share expiry on live guest connections', () => {
  it('closes a guest connection when its share expires', async () => {
    const { notebookId } = await createNotebook(s, u);
    const noteId = await createNote(s, u, notebookId);
    const shareId = newId();
    const expiresAt = new Date(Date.now() + 2000).toISOString();
    const share = await api(s, 'POST', '/shares', {
      token: u.session.accessToken,
      body: { shareId, target: { kind: 'note', id: noteId }, permission: 'edit', expiresAt },
    });
    expect(share.status).toBe(200);
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
    expect((await guest.subscribe(noteId)).error).toBeNull();
    const err = await guest.next((m) => m.type === 'error', 5000);
    expect(err).toMatchObject({ code: 'unauthorized', message: 'share expired' });
    expect((await guest.waitClose()).code).toBe(4401);
    // And a new connection with the same token is refused.
    const again = await SyncClient.connect(s);
    again.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'guest', shareId, guestToken: g.body.guestToken },
      deviceId: 'browser-1',
      client: { platform: 'web', version: '1' },
    });
    expect((await again.waitClose()).code).toBe(4401);
  }, 15_000);
});
