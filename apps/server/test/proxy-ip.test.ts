import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { b64, newId, rnd, signup, startServer, type TestServer } from './helpers.js';

// Security audit 2026-10-27, item 6: a client must not pick its own address through
// X-Forwarded-For to dodge the per-IP limits, and one account must not be attacked from
// many addresses.
let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

const login = (email: string, xff: string) =>
  s.app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    // The test client connects from 127.0.0.1, like our Caddy does in production.
    headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
    payload: JSON.stringify({ email, loginKey: b64(rnd(32)), deviceName: 'x' }),
  });

describe('client address behind proxies', () => {
  it('ignores addresses a client prepends to X-Forwarded-For', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      // A different spoofed address and email every time; the real client (added by the proxy) is the same.
      statuses.push((await login(`spoof${i}@example.com`, `198.51.100.${i}, 203.0.113.7`)).statusCode);
    }
    expect(statuses.slice(0, 20).every((c) => c === 401)).toBe(true);
    expect(statuses.slice(20).every((c) => c === 429)).toBe(true);
  });

  it('limits attempts per email address across client addresses', async () => {
    const u = await signup(s);
    const statuses: number[] = [];
    // From one address: 10 a minute. From many: 30 a minute in all, so a stranger hammering the
    // address from one place does not lock its owner out (audit 2026-11-02).
    for (let i = 0; i < 11; i++) statuses.push((await login(u.email, '192.0.2.1')).statusCode);
    expect(statuses.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect((await login(u.email, '192.0.2.99')).statusCode).toBe(401);
    const spread: number[] = [];
    for (let i = 0; i < 22; i++) spread.push((await login(u.email, `198.51.100.${i + 1}`)).statusCode);
    expect(spread.slice(0, 19).every((c) => c === 401)).toBe(true);
    expect(spread.slice(19)).toEqual([429, 429, 429]);
    // Another account is not affected.
    expect((await login(`other-${newId().slice(-6)}@example.com`, '192.0.2.200')).statusCode).toBe(401);
  });
});

describe('rate limit answer', () => {
  it('is a 429 with the contract error body', async () => {
    const t = await startServer();
    try {
      let last;
      for (let i = 0; i < 21; i++) {
        last = await t.app.inject({
          method: 'POST',
          url: '/v1/auth/prelogin',
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ email: `p${i}@example.com` }),
        });
      }
      expect(last!.statusCode).toBe(429);
      const body = JSON.parse(last!.body);
      expect(body).toMatchObject({ error: { code: 'rate_limited' } });
      expect(body.error.retryAfterMs).toBeGreaterThan(0);
      expect(body.error.retryAfterMs).toBeLessThanOrEqual(60_000);
    } finally {
      await t.close();
    }
  });
});
