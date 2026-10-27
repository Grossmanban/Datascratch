import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { createLogger } from '../src/lib/log.js';
import WebSocket from 'ws';
import { buildApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import { createContext, type AppContext } from '../src/context.js';
import { createDatabase } from '../src/db/client.js';
import { registerJobs } from '../src/jobs/index.js';
import { InlineQueue } from '../src/jobs/queue.js';
import { uuidv7 } from '../src/lib/encoding.js';
import type { LoadedPlugin } from '../src/plugins/loader.js';
import { DiskStorage } from '../src/storage/disk.js';
import { TEMPLATE_DB, adminUrl, withDatabase } from './global-setup.js';

export const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64url');
export const rnd = (n: number) => randomBytes(n);
export const newId = () => uuidv7();

export interface TestServer {
  app: FastifyInstance;
  ctx: AppContext;
  jobs: InlineQueue;
  url: string;
  wsUrl: string;
  close(): Promise<void>;
}

export async function startServer(
  overrides: Partial<Record<keyof Config, string>> = {},
  plugins: LoadedPlugin[] = [],
): Promise<TestServer> {
  const dbName = `ds_t_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const admin = new pg.Client({ connectionString: adminUrl() });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName} TEMPLATE ${TEMPLATE_DB}`);
  await admin.end();
  const dir = await mkdtemp(join(tmpdir(), 'ds-files-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? 'silent',
    DATABASE_URL: withDatabase(adminUrl(), dbName),
    DS_JWT_SECRET: b64(rnd(32)),
    DS_KMS_KEY: b64(rnd(32)),
    STORAGE_DIR: dir,
    JOBS_ENABLED: 'false',
    ...overrides,
  });
  const log = createLogger(config.LOG_LEVEL);
  const database = createDatabase(config.DATABASE_URL, 5);
  const jobs = new InlineQueue(log);
  const ctx = createContext({ config, log, database, storage: new DiskStorage(dir), jobs });
  await registerJobs(ctx);
  const app = await buildApp(ctx, { plugins });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const { port } = app.server.address() as AddressInfo;
  return {
    app,
    ctx,
    jobs,
    url: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}/v1/sync`,
    async close() {
      await app.close();
      await jobs.drain();
      await database.close();
      const a = new pg.Client({ connectionString: adminUrl() });
      await a.connect();
      await a.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
      await a.end();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

export interface ApiResult<T = any> {
  status: number;
  body: T;
  raw: Buffer;
}

export async function api<T = any>(
  s: TestServer,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; token?: string; binary?: Buffer } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let payload: string | Buffer | undefined;
  if (opts.binary) {
    headers['content-type'] = 'application/octet-stream';
    payload = opts.binary;
  } else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(opts.body);
  }
  const res = await s.app.inject({ method, url: `/v1${path}`, headers, ...(payload !== undefined ? { payload } : {}) });
  const raw = res.rawPayload;
  let body: any = null;
  if (res.headers['content-type']?.toString().includes('application/json') && raw.length > 0) body = JSON.parse(raw.toString());
  return { status: res.statusCode, body, raw };
}

export const KDF = { alg: 'argon2id13', ops: 3, mem: 67108864 } as const;

export interface TestUser {
  email: string;
  userId: string;
  accountDocId: string;
  loginKey: string;
  recoveryLoginKey: string;
  session: { accessToken: string; refreshToken: string; deviceId: string; userId: string };
}

export async function signup(s: TestServer, email = `u${newId().slice(-8)}@example.com`): Promise<TestUser> {
  const user = {
    email,
    userId: newId(),
    accountDocId: newId(),
    loginKey: b64(rnd(32)),
    recoveryLoginKey: b64(rnd(32)),
  };
  const res = await api(s, 'POST', '/auth/signup', {
    body: {
      ...user,
      salt: b64(rnd(16)),
      kdf: KDF,
      wrappedMasterKeyPassword: b64(rnd(73)),
      wrappedMasterKeyRecovery: b64(rnd(73)),
      deviceName: 'Test device',
    },
  });
  if (res.status !== 200) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...user, session: res.body };
}

export async function createNotebook(
  s: TestServer,
  u: TestUser,
  opts: { mode?: 'private' | 'agent'; notebookKey?: Uint8Array } = {},
) {
  const notebookId = newId();
  const mode = opts.mode ?? 'private';
  const notebookKey = opts.notebookKey ?? rnd(32);
  const res = await api(s, 'POST', '/notebooks', {
    token: u.session.accessToken,
    body: {
      notebookId,
      mode,
      wrappedKey: b64(rnd(73)),
      ...(mode === 'agent' ? { notebookKey: b64(notebookKey) } : {}),
    },
  });
  if (res.status !== 200) throw new Error(`notebook failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { notebookId, notebookKey };
}

export async function createNote(s: TestServer, u: TestUser, notebookId: string, noteId = newId()) {
  const res = await api(s, 'POST', '/docs', {
    token: u.session.accessToken,
    body: { docId: noteId, kind: 'note', notebookId },
  });
  if (res.status !== 204) throw new Error(`doc failed: ${res.status} ${JSON.stringify(res.body)}`);
  return noteId;
}

/** A minimal sync client for tests. */
export class SyncClient {
  readonly messages: any[] = [];
  #waiters: { pred: (m: any) => boolean; resolve: (m: any) => void; reject: (e: Error) => void }[] = [];
  closed: { code: number; reason: string } | null = null;
  #closeWaiters: ((c: { code: number; reason: string }) => void)[] = [];

  private constructor(readonly ws: WebSocket) {
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      this.messages.push(m);
      const i = this.#waiters.findIndex((w) => w.pred(m));
      if (i >= 0) this.#waiters.splice(i, 1)[0]!.resolve(m);
    });
    ws.on('close', (code, reason) => {
      this.closed = { code, reason: reason.toString() };
      for (const w of this.#closeWaiters) w(this.closed);
    });
  }

  static async connect(s: TestServer): Promise<SyncClient> {
    const ws = new WebSocket(s.wsUrl);
    await new Promise<void>((res, rej) => {
      ws.once('open', () => res());
      ws.once('error', rej);
    });
    return new SyncClient(ws);
  }

  static async user(s: TestServer, u: TestUser): Promise<SyncClient> {
    const c = await SyncClient.connect(s);
    c.send({
      type: 'hello',
      protocol: 1,
      auth: { kind: 'user', accessToken: u.session.accessToken },
      deviceId: u.session.deviceId,
      client: { platform: 'web', version: 'test' },
    });
    await c.next((m) => m.type === 'welcome');
    return c;
  }

  send(m: unknown) {
    this.ws.send(JSON.stringify(m));
  }

  /** Wait for the next message matching `pred` (including ones already received if `past`). */
  next(pred: (m: any) => boolean = () => true, timeoutMs = 5000, past = false): Promise<any> {
    if (past) {
      const found = this.messages.find(pred);
      if (found) return Promise.resolve(found);
    }
    return new Promise((resolve, reject) => {
      const w = { pred, resolve, reject };
      this.#waiters.push(w);
      setTimeout(() => {
        const i = this.#waiters.indexOf(w);
        if (i >= 0) {
          this.#waiters.splice(i, 1);
          reject(new Error(`timeout waiting for message; got ${JSON.stringify(this.messages.slice(-5))}`));
        }
      }, timeoutMs);
    });
  }

  waitClose(timeoutMs = 5000): Promise<{ code: number; reason: string }> {
    if (this.closed) return Promise.resolve(this.closed);
    return new Promise((resolve, reject) => {
      this.#closeWaiters.push(resolve);
      setTimeout(() => reject(new Error('timeout waiting for close')), timeoutMs);
    });
  }

  /** Subscribe and collect `updates` pages until upToDate. */
  async subscribe(docId: string, since = 0) {
    this.send({ type: 'subscribe', docs: [{ docId, since }] });
    const pages: any[] = [];
    for (;;) {
      const m = await this.next((x) => (x.type === 'updates' && x.docId === docId) || (x.type === 'error' && x.ref === docId));
      if (m.type === 'error') return { error: m, pages };
      pages.push(m);
      if (m.upToDate) return { error: null, pages };
    }
  }

  async push(docId: string, payload: Uint8Array, clientMsgId = newId()) {
    this.send({ type: 'push', docId, clientMsgId, payload: b64(payload) });
    return this.next((m) => m.clientMsgId === clientMsgId || m.ref === clientMsgId);
  }

  close() {
    this.ws.close();
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
