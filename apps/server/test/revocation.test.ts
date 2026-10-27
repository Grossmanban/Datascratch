import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KDF, SyncClient, api, b64, rnd, signup, sleep, startServer, type TestServer, type TestUser } from './helpers.js';

// A revoked device gets an unambiguous signal so that it wipes its local data:
// HTTP 401 `device_revoked` with a reason, sync close 4410 (api.md, sync-protocol.md).
// An expired or invalid token stays a plain 401 `unauthorized`.
let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

const login = async (u: TestUser, name = 'second') =>
  (await api(s, 'POST', '/auth/login', { body: { email: u.email, loginKey: u.loginKey, deviceName: name } })).body;

/** What the revoked session sees on every channel. */
async function expectRevoked(session: { accessToken: string; refreshToken: string }, reason: string) {
  const me = await api(s, 'GET', '/me', { token: session.accessToken });
  expect([me.status, me.body.error.code, me.body.error.reason]).toEqual([401, 'device_revoked', reason]);
  const refresh = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: session.refreshToken } });
  expect([refresh.status, refresh.body.error.code, refresh.body.error.reason]).toEqual([401, 'device_revoked', reason]);
  // A new sync connection with the old access token.
  const c = await SyncClient.connect(s);
  c.send({
    type: 'hello',
    protocol: 1,
    auth: { kind: 'user', accessToken: session.accessToken },
    deviceId: 'x',
    client: { platform: 'web', version: 'test' },
  });
  expect(await c.next((m) => m.type === 'error')).toMatchObject({ code: 'device_revoked', reason });
  expect(await c.waitClose()).toEqual({ code: 4410, reason });
}

/** A live sync connection of `user` with `session`. */
const live = (user: TestUser, session: TestUser['session']) => SyncClient.user(s, { ...user, session });

async function expectKicked(c: SyncClient, reason: string) {
  expect(await c.next((m) => m.type === 'error')).toMatchObject({ code: 'device_revoked', reason });
  expect(await c.waitClose()).toEqual({ code: 4410, reason });
}

describe('device revocation signal', () => {
  it('user: the device was removed from the device list', async () => {
    const u = await signup(s);
    const second = await login(u);
    const ws = await live(u, second);
    expect((await api(s, 'DELETE', `/devices/${second.deviceId}`, { token: u.session.accessToken })).status).toBe(204);
    await expectKicked(ws, 'user');
    await expectRevoked(second, 'user');
    // The other device is not affected.
    expect((await api(s, 'GET', '/me', { token: u.session.accessToken })).status).toBe(200);
  });

  it('user: signing out (logout) revokes that device', async () => {
    const u = await signup(s);
    const second = await login(u);
    expect((await api(s, 'POST', '/auth/logout', { body: { refreshToken: second.refreshToken } })).status).toBe(204);
    await expectRevoked(second, 'user');
  });

  it('password_change: the password was changed on another device', async () => {
    const u = await signup(s);
    const second = await login(u);
    const ws = await live(u, second);
    const r = await api(s, 'POST', '/auth/password', {
      token: u.session.accessToken,
      body: { currentLoginKey: u.loginKey, salt: b64(rnd(16)), kdf: KDF, loginKey: b64(rnd(32)), wrappedMasterKeyPassword: b64(rnd(73)) },
    });
    expect(r.status).toBe(204);
    await expectKicked(ws, 'password_change');
    await expectRevoked(second, 'password_change');
    expect((await api(s, 'GET', '/me', { token: u.session.accessToken })).status).toBe(200);
  });

  it('recovery: the account was recovered with the recovery key', async () => {
    const u = await signup(s);
    const ws = await live(u, u.session);
    const start = await api(s, 'POST', '/auth/recovery/start', { body: { email: u.email, recoveryLoginKey: u.recoveryLoginKey } });
    const fin = await api(s, 'POST', '/auth/recovery/finish', {
      body: { recoveryToken: start.body.recoveryToken, salt: b64(rnd(16)), kdf: KDF, loginKey: b64(rnd(32)), wrappedMasterKeyPassword: b64(rnd(73)) },
    });
    expect(fin.status).toBe(200);
    await expectKicked(ws, 'recovery');
    await expectRevoked(u.session, 'recovery');
  });

  it('token_reuse: a used refresh token came back after the grace window', async () => {
    const u = await signup(s);
    const ws = await live(u, u.session);
    const r1 = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: u.session.refreshToken } });
    expect(r1.status).toBe(200);
    await s.ctx.database.db.execute(sql`UPDATE refresh_tokens SET used_at = now() - interval '61 seconds' WHERE used_at IS NOT NULL`);
    const reuse = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: u.session.refreshToken } });
    expect([reuse.status, reuse.body.error.code, reuse.body.error.reason]).toEqual([401, 'device_revoked', 'token_reuse']);
    await expectKicked(ws, 'token_reuse');
    await expectRevoked(r1.body, 'token_reuse');
  });

  it('account_deleted: live connections learn it before the account disappears', async () => {
    const u = await signup(s);
    const ws = await live(u, u.session);
    expect((await api(s, 'DELETE', '/me', { token: u.session.accessToken, body: { loginKey: u.loginKey } })).status).toBe(204);
    await expectKicked(ws, 'account_deleted');
    // While its access token is still valid, HTTP says the same; the refresh token is gone
    // with the account (a plain 401).
    const me = await api(s, 'GET', '/me', { token: u.session.accessToken });
    expect([me.status, me.body.error.code, me.body.error.reason]).toEqual([401, 'device_revoked', 'account_deleted']);
    const r = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: u.session.refreshToken } });
    expect([r.status, r.body.error.code]).toEqual([401, 'unauthorized']);
  });
});

describe('not a revocation', () => {
  it('an expired access token is a plain 401 (refresh and retry, never wipe)', async () => {
    const t = await startServer({ ACCESS_TOKEN_TTL_SEC: '1' });
    try {
      const u = await signup(t);
      await sleep(2100);
      const me = await api(t, 'GET', '/me', { token: u.session.accessToken });
      expect([me.status, me.body.error.code, me.body.error.reason]).toEqual([401, 'unauthorized', undefined]);
      // The refresh works and the device keeps going.
      const r = await api(t, 'POST', '/auth/refresh', { body: { refreshToken: u.session.refreshToken } });
      expect(r.status).toBe(200);
      expect((await api(t, 'GET', '/me', { token: r.body.accessToken })).status).toBe(200);
    } finally {
      await t.close();
    }
  });

  it('an unknown token is a plain 401', async () => {
    const me = await api(s, 'GET', '/me', { token: 'not-a-token' });
    expect([me.status, me.body.error.code]).toEqual([401, 'unauthorized']);
    const r = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: 'x'.repeat(43) } });
    expect([r.status, r.body.error.code]).toEqual([401, 'unauthorized']);
  });
});
