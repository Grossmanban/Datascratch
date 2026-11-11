import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db/client.js';
import { KDF, SyncClient, api, b64, createNote, createNotebook, newId, rnd, signup, sleep, startServer, type TestServer } from './helpers.js';

// Parallel sign-ups (ios-app real-server CI, 2026-11-11): none may hang or fail because of another.
let s: TestServer;
beforeAll(async () => {
  s = await startServer();
});
afterAll(() => s.close());

let n = 0;
const addr = () => `10.71.${Math.floor(n / 200)}.${(n++ % 200) + 1}`;

function body() {
  return {
    email: `r${newId().slice(-8)}@example.com`,
    userId: newId(),
    accountDocId: newId(),
    loginKey: b64(rnd(32)),
    recoveryLoginKey: b64(rnd(32)),
    salt: b64(rnd(16)),
    kdf: KDF,
    wrappedMasterKeyPassword: b64(rnd(73)),
    wrappedMasterKeyRecovery: b64(rnd(73)),
    deviceName: 'Test device',
  };
}

describe('parallel sign-ups', () => {
  it('on an empty database two and then twelve at once all finish quickly', async () => {
    const t0 = Date.now();
    expect(await Promise.all([signup(s, undefined, addr()), signup(s, undefined, addr())])).toHaveLength(2);
    expect(await Promise.all(Array.from({ length: 12 }, () => signup(s, undefined, addr())))).toHaveLength(12);
    expect(Date.now() - t0).toBeLessThan(15_000);
  });

  it('the same sign-up sent three times at once: every copy gets a session of the one account', async () => {
    const b = body();
    const ip = addr();
    const rs = await Promise.all([0, 1, 2].map(() => api(s, 'POST', '/auth/signup', { body: b, remoteAddress: ip })));
    expect(rs.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(new Set(rs.map((r) => r.body.userId))).toEqual(new Set([b.userId]));
    expect(new Set(rs.map((r) => r.body.deviceId)).size).toBe(3);
  });

  it('two different accounts with one email at once: one is created, the other is a conflict', async () => {
    const a = body();
    const c = { ...body(), email: a.email };
    const rs = await Promise.all([a, c].map((x) => api(s, 'POST', '/auth/signup', { body: x, remoteAddress: addr() })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});

describe('database limits', () => {
  it('every connection has a statement, lock and idle-transaction limit; a lock wait ends with an error', async () => {
    const shown = await s.ctx.database.pool.query(
      `SELECT current_setting('statement_timeout') AS st, current_setting('lock_timeout') AS lt,
              current_setting('idle_in_transaction_session_timeout') AS it`,
    );
    expect(shown.rows[0]).toEqual({ st: '2min', lt: '30s', it: '2min' });
    // Waiting for a connection (a new one included) is limited too: pg would wait forever.
    expect((s.ctx.database.pool as unknown as { options: { connectionTimeoutMillis: number } }).options.connectionTimeoutMillis).toBe(15_000);

    const url = (s.ctx.config as { DATABASE_URL: string }).DATABASE_URL;
    const short = createDatabase(url, 2, { statementMs: 5_000, lockMs: 300, idleInTransactionMs: 5_000 });
    const holder = await short.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('LOCK TABLE users IN ACCESS EXCLUSIVE MODE');
      const t0 = Date.now();
      await expect(short.pool.query('SELECT count(*) FROM users')).rejects.toThrow(/lock timeout/);
      expect(Date.now() - t0).toBeLessThan(3_000);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
      await short.close();
    }
  });
});

describe('requests that never finish (diagnostics)', () => {
  it('a body that never fully arrives is logged when the client gives up: stage, bytes, no content', async () => {
    const lines: string[] = [];
    const logged = await startServer({ LOG_LEVEL: 'info' }, [], { write: (l: string) => void lines.push(l) });
    try {
      const { port } = new URL(logged.url);
      const sock = net.connect(Number(port), '127.0.0.1');
      await new Promise<void>((r) => sock.once('connect', () => r()));
      const part = '{"email":"secret-part@example.com"';
      sock.write(
        `POST /v1/auth/signup HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 500\r\n\r\n${part}`,
      );
      await sleep(300);
      sock.destroy();
      let found: any;
      for (let i = 0; i < 50 && !found; i++) {
        await sleep(40);
        found = lines.map((l) => JSON.parse(l)).find((l) => l.msg === 'request aborted');
      }
      expect(found).toMatchObject({ url: '/v1/auth/signup', stage: 'body', contentLength: 500, bodyBytes: part.length, bodyComplete: false });
      // Where waiting could happen: the password hashing queue and the database pool.
      expect(found.hashQueue).toEqual({ running: expect.any(Number), waiting: expect.any(Number) });
      expect(found.dbPool).toEqual({ total: expect.any(Number), idle: expect.any(Number), waiting: expect.any(Number) });
      expect(found.step).toBeNull();
      expect(lines.join('')).not.toContain('secret-part');
    } finally {
      await logged.close();
    }
  });
});

describe('sync connection diagnostics', () => {
  it('a closed sync connection logs one summary: message counts by type each way, nothing else', async () => {
    const lines: string[] = [];
    const logged = await startServer({ LOG_LEVEL: 'info' }, [], { write: (l: string) => void lines.push(l) });
    try {
      const u = await signup(logged, undefined, '10.72.0.1');
      const { notebookId } = await createNotebook(logged, u);
      const noteId = await createNote(logged, u, notebookId);
      const c = await SyncClient.user(logged, u);
      await c.subscribe(noteId);
      await c.push(noteId, rnd(10));
      c.close();
      let found: any;
      for (let i = 0; i < 50 && !found; i++) {
        await sleep(40);
        found = lines.map((l) => JSON.parse(l)).find((l) => l.msg === 'sync connection closed');
      }
      expect(found).toMatchObject({
        kind: 'user',
        protocol: 1,
        in: { hello: 1, subscribe: 1, push: 1 },
        out: { welcome: 1, updates: 1, ack: 1 },
        unanswered: 0,
      });
      expect(JSON.stringify(found)).not.toContain(noteId);
    } finally {
      await logged.close();
    }
  });
});
