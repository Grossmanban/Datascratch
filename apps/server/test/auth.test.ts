import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KDF, SyncClient, api, b64, newId, rnd, signup, startServer, type TestServer } from './helpers.js';

let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

describe('prelogin', () => {
  it('returns a stable fake salt for unknown emails and the real one for known', async () => {
    const a = await api(s, 'POST', '/auth/prelogin', { body: { email: 'nobody@example.com' } });
    const b = await api(s, 'POST', '/auth/prelogin', { body: { email: 'NOBODY@example.com ' } });
    const c = await api(s, 'POST', '/auth/prelogin', { body: { email: 'other@example.com' } });
    expect(a.status).toBe(200);
    expect(a.body.salt).toBe(b.body.salt);
    expect(a.body.salt).not.toBe(c.body.salt);
    expect(Buffer.from(a.body.salt, 'base64url')).toHaveLength(16);
    expect(a.body.kdf).toEqual(KDF);

    const salt = b64(rnd(16));
    const email = 'known@example.com';
    const r = await api(s, 'POST', '/auth/signup', {
      body: {
        email,
        salt,
        kdf: KDF,
        loginKey: b64(rnd(32)),
        recoveryLoginKey: b64(rnd(32)),
        wrappedMasterKeyPassword: b64(rnd(73)),
        wrappedMasterKeyRecovery: b64(rnd(73)),
        userId: newId(),
        accountDocId: newId(),
      },
    });
    expect(r.status).toBe(200);
    const k = await api(s, 'POST', '/auth/prelogin', { body: { email } });
    expect(k.body.salt).toBe(salt);
  });
});

describe('signup and login', () => {
  it('signs up, rejects duplicates, is idempotent on retry', async () => {
    const body = {
      email: 'dup@example.com',
      salt: b64(rnd(16)),
      kdf: KDF,
      loginKey: b64(rnd(32)),
      recoveryLoginKey: b64(rnd(32)),
      wrappedMasterKeyPassword: b64(rnd(73)),
      wrappedMasterKeyRecovery: b64(rnd(73)),
      userId: newId(),
      accountDocId: newId(),
    };
    const first = await api(s, 'POST', '/auth/signup', { body });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ userId: body.userId, accountDocId: body.accountDocId });
    expect(first.body.wrappedMasterKeyPassword).toBe(body.wrappedMasterKeyPassword);
    const retry = await api(s, 'POST', '/auth/signup', { body });
    expect(retry.status).toBe(200);
    const other = await api(s, 'POST', '/auth/signup', { body: { ...body, userId: newId(), accountDocId: newId() } });
    expect(other.status).toBe(409);
    expect(other.body.error.code).toBe('conflict');
  });

  it('validates input with contract error format', async () => {
    const r = await api(s, 'POST', '/auth/signup', { body: { email: 'x' } });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('bad_request');
  });

  it('logs in with the right loginKey only', async () => {
    const u = await signup(s);
    const ok = await api(s, 'POST', '/auth/login', {
      body: { email: u.email, loginKey: u.loginKey, deviceName: 'iPad' },
    });
    expect(ok.status).toBe(200);
    expect(ok.body.userId).toBe(u.userId);
    const bad = await api(s, 'POST', '/auth/login', {
      body: { email: u.email, loginKey: b64(rnd(32)), deviceName: 'iPad' },
    });
    expect(bad.status).toBe(401);
    const unknown = await api(s, 'POST', '/auth/login', {
      body: { email: 'ghost@example.com', loginKey: b64(rnd(32)), deviceName: 'iPad' },
    });
    expect(unknown.status).toBe(401);
    const me = await api(s, 'GET', '/me', { token: ok.body.accessToken });
    expect(me.body).toMatchObject({ userId: u.userId, email: u.email, accountDocId: u.accountDocId });
  });
});

describe('refresh tokens', () => {
  const refresh = (refreshToken: string) => api(s, 'POST', '/auth/refresh', { body: { refreshToken } });
  const ageUsed = (seconds: number) =>
    s.ctx.database.db.execute(
      sql`UPDATE refresh_tokens SET used_at = used_at - make_interval(secs => ${seconds}) WHERE used_at IS NOT NULL`,
    );

  it('rotates and detects reuse', async () => {
    const u = await signup(s);
    const r1 = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: u.session.refreshToken } });
    expect(r1.status).toBe(200);
    expect(r1.body.refreshToken).not.toBe(u.session.refreshToken);
    expect(r1.body.deviceId).toBe(u.session.deviceId);
    // Reusing the old token after the grace window revokes the session entirely.
    await ageUsed(61);
    const reuse = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: u.session.refreshToken } });
    expect(reuse.status).toBe(401);
    const after = await api(s, 'POST', '/auth/refresh', { body: { refreshToken: r1.body.refreshToken } });
    expect(after.status).toBe(401);
    const me = await api(s, 'GET', '/me', { token: r1.body.accessToken });
    expect(me.status).toBe(401);
  });

  it('returns the same new refresh token for a retry within the grace window', async () => {
    const u = await signup(s);
    const r1 = await refresh(u.session.refreshToken);
    expect(r1.status).toBe(200);
    // The response was lost: the client retries with the same token.
    const r2 = await refresh(u.session.refreshToken);
    expect(r2.status).toBe(200);
    expect(r2.body.refreshToken).toBe(r1.body.refreshToken);
    expect(r2.body.deviceId).toBe(u.session.deviceId);
    expect((await api(s, 'GET', '/me', { token: r2.body.accessToken })).status).toBe(200);
    // Concurrent retries all get the same token.
    const many = await Promise.all([1, 2, 3].map(() => refresh(u.session.refreshToken)));
    expect(many.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(new Set(many.map((r) => r.body.refreshToken))).toEqual(new Set([r1.body.refreshToken]));
    // The chain goes on from the new token; the retried one does not fork it.
    const r3 = await refresh(r1.body.refreshToken);
    expect(r3.status).toBe(200);
    expect(r3.body.refreshToken).not.toBe(r1.body.refreshToken);
    expect((await api(s, 'GET', '/me', { token: r3.body.accessToken })).status).toBe(200);
  });

  it('treats a retry as reuse once the new token was used, or after the window', async () => {
    // The new token was already used: the old one presented again (even quickly) is theft.
    const u = await signup(s);
    const r1 = await refresh(u.session.refreshToken);
    const r2 = await refresh(r1.body.refreshToken);
    expect(r2.status).toBe(200);
    expect((await refresh(u.session.refreshToken)).status).toBe(401);
    expect((await refresh(r2.body.refreshToken)).status).toBe(401);
    expect((await api(s, 'GET', '/me', { token: r2.body.accessToken })).status).toBe(401);

    // Outside the window.
    const v = await signup(s);
    const v1 = await refresh(v.session.refreshToken);
    await ageUsed(61);
    expect((await refresh(v.session.refreshToken)).status).toBe(401);
    expect((await refresh(v1.body.refreshToken)).status).toBe(401);
  });

  it('logout revokes the device', async () => {
    const u = await signup(s);
    const out = await api(s, 'POST', '/auth/logout', { body: { refreshToken: u.session.refreshToken } });
    expect(out.status).toBe(204);
    expect((await api(s, 'GET', '/me', { token: u.session.accessToken })).status).toBe(401);
  });
});

describe('devices', () => {
  it('lists and revokes devices and kicks their sync connections', async () => {
    const u = await signup(s);
    const second = await api(s, 'POST', '/auth/login', {
      body: { email: u.email, loginKey: u.loginKey, deviceName: 'iPhone' },
    });
    const list = await api(s, 'GET', '/devices', { token: u.session.accessToken });
    expect(list.body).toHaveLength(2);
    expect(list.body.find((d: any) => d.current).id).toBe(u.session.deviceId);

    const ws = await SyncClient.user(s, { ...u, session: second.body });
    const del = await api(s, 'DELETE', `/devices/${second.body.deviceId}`, { token: u.session.accessToken });
    expect(del.status).toBe(204);
    const err = await ws.next((m) => m.type === 'error');
    expect(err.code).toBe('unauthorized');
    expect((await ws.waitClose()).code).toBe(4401);
    expect((await api(s, 'GET', '/me', { token: second.body.accessToken })).status).toBe(401);
    expect((await api(s, 'DELETE', `/devices/${second.body.deviceId}`, { token: u.session.accessToken })).status).toBe(404);
  });
});

describe('password change and recovery', () => {
  it('changes the password and signs out other devices', async () => {
    const u = await signup(s);
    const other = await api(s, 'POST', '/auth/login', {
      body: { email: u.email, loginKey: u.loginKey, deviceName: 'Mac' },
    });
    const newKey = b64(rnd(32));
    const wrong = await api(s, 'POST', '/auth/password', {
      token: u.session.accessToken,
      body: { currentLoginKey: b64(rnd(32)), salt: b64(rnd(16)), kdf: KDF, loginKey: newKey, wrappedMasterKeyPassword: b64(rnd(73)) },
    });
    expect(wrong.status).toBe(401);
    const salt = b64(rnd(16));
    const ok = await api(s, 'POST', '/auth/password', {
      token: u.session.accessToken,
      body: { currentLoginKey: u.loginKey, salt, kdf: KDF, loginKey: newKey, wrappedMasterKeyPassword: b64(rnd(73)) },
    });
    expect(ok.status).toBe(204);
    expect((await api(s, 'GET', '/me', { token: u.session.accessToken })).status).toBe(200);
    expect((await api(s, 'GET', '/me', { token: other.body.accessToken })).status).toBe(401);
    expect((await api(s, 'POST', '/auth/prelogin', { body: { email: u.email } })).body.salt).toBe(salt);
    const login = await api(s, 'POST', '/auth/login', { body: { email: u.email, loginKey: newKey, deviceName: 'x' } });
    expect(login.status).toBe(200);
  });

  it('recovers access with the recovery key', async () => {
    const u = await signup(s);
    const bad = await api(s, 'POST', '/auth/recovery/start', {
      body: { email: u.email, recoveryLoginKey: b64(rnd(32)) },
    });
    expect(bad.status).toBe(401);
    const start = await api(s, 'POST', '/auth/recovery/start', {
      body: { email: u.email, recoveryLoginKey: u.recoveryLoginKey },
    });
    expect(start.status).toBe(200);
    expect(start.body.userId).toBe(u.userId);
    const newKey = b64(rnd(32));
    const wrapped = b64(rnd(73));
    const fin = await api(s, 'POST', '/auth/recovery/finish', {
      body: { recoveryToken: start.body.recoveryToken, salt: b64(rnd(16)), kdf: KDF, loginKey: newKey, wrappedMasterKeyPassword: wrapped },
    });
    expect(fin.status).toBe(200);
    expect(fin.body.wrappedMasterKeyPassword).toBe(wrapped);
    // Token is single-use; old sessions are gone.
    const again = await api(s, 'POST', '/auth/recovery/finish', {
      body: { recoveryToken: start.body.recoveryToken, salt: b64(rnd(16)), kdf: KDF, loginKey: newKey, wrappedMasterKeyPassword: wrapped },
    });
    expect(again.status).toBe(401);
    expect((await api(s, 'GET', '/me', { token: u.session.accessToken })).status).toBe(401);
    expect((await api(s, 'GET', '/me', { token: fin.body.accessToken })).status).toBe(200);
  });
});

describe('account deletion', () => {
  it('requires the login key and removes everything', async () => {
    const u = await signup(s);
    const bad = await api(s, 'DELETE', '/me', { token: u.session.accessToken, body: { loginKey: b64(rnd(32)) } });
    expect(bad.status).toBe(401);
    const ok = await api(s, 'DELETE', '/me', { token: u.session.accessToken, body: { loginKey: u.loginKey } });
    expect(ok.status).toBe(204);
    expect((await api(s, 'GET', '/me', { token: u.session.accessToken })).status).toBe(401);
    const pre = await api(s, 'POST', '/auth/login', { body: { email: u.email, loginKey: u.loginKey, deviceName: 'x' } });
    expect(pre.status).toBe(401);
  });
});

describe('service', () => {
  it('health and openapi', async () => {
    const h = await api(s, 'GET', '/health');
    expect(h.body).toMatchObject({ ok: true });
    const o = await api(s, 'GET', '/openapi.json');
    expect(o.status).toBe(200);
    expect(o.body.openapi).toBe('3.1.0');
    expect(Object.keys(o.body.paths)).toEqual(expect.arrayContaining(['/auth/signup', '/notebooks', '/shares']));
    const nf = await api(s, 'GET', '/nope');
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('not_found');
  });
});

describe('recovery key rotation', () => {
  it('replaces the recovery key atomically; the old one stops working; journal records it', async () => {
    const u = await signup(s);
    const t = u.session.accessToken;
    const newRecovery = b64(rnd(32));
    const wrapped = b64(rnd(73));
    // A recovery flow started with the old key...
    const pending = await api(s, 'POST', '/auth/recovery/start', {
      body: { email: u.email, recoveryLoginKey: u.recoveryLoginKey },
    });
    expect(pending.status).toBe(200);

    const wrong = await api(s, 'POST', '/auth/recovery-key', {
      token: t,
      body: { currentLoginKey: b64(rnd(32)), recoveryLoginKey: newRecovery, wrappedMasterKeyRecovery: wrapped },
    });
    expect(wrong.status).toBe(401);
    const ok = await api(s, 'POST', '/auth/recovery-key', {
      token: t,
      body: { currentLoginKey: u.loginKey, recoveryLoginKey: newRecovery, wrappedMasterKeyRecovery: wrapped },
    });
    expect(ok.status).toBe(204);

    // ...cannot be finished, and the old key no longer starts one.
    const fin = await api(s, 'POST', '/auth/recovery/finish', {
      body: { recoveryToken: pending.body.recoveryToken, salt: b64(rnd(16)), kdf: KDF, loginKey: b64(rnd(32)), wrappedMasterKeyPassword: b64(rnd(73)) },
    });
    expect(fin.status).toBe(401);
    expect(
      (await api(s, 'POST', '/auth/recovery/start', { body: { email: u.email, recoveryLoginKey: u.recoveryLoginKey } })).status,
    ).toBe(401);
    const start = await api(s, 'POST', '/auth/recovery/start', { body: { email: u.email, recoveryLoginKey: newRecovery } });
    expect(start.status).toBe(200);
    expect(start.body.wrappedMasterKeyRecovery).toBe(wrapped);
    // Other sessions stay signed in.
    expect((await api(s, 'GET', '/me', { token: t })).status).toBe(200);

    const events = await api(s, 'GET', '/me/security-events', { token: t });
    expect(events.body[0]).toMatchObject({ kind: 'recovery_key_rotated', deviceId: u.session.deviceId, deviceName: 'Test device' });
  });
});
