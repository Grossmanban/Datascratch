import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { withAgentScope } from '../src/db/client.js';
import { docs } from '../src/db/schema.js';
import { AD, open, seal } from '../src/lib/sodium.js';
import type { AgentGrant, AgentsContext } from '../src/plugins/agents-context.js';
import { createAgentsContext } from '../src/plugins/loader.js';
import {
  SyncClient,
  api,
  b64,
  createNote,
  createNotebook,
  newId,
  rnd,
  signup,
  startServer,
  type TestServer,
  type TestUser,
} from './helpers.js';

const execFileAsync = promisify(execFile);

let s: TestServer;
let u: TestUser;
let agents: AgentsContext;

beforeAll(async () => {
  s = await startServer({ PUBLIC_URL: 'https://notes.example.com', APP_URL: 'https://app.example.com' });
  u = await signup(s);
  agents = createAgentsContext(s.ctx);
});
afterAll(() => s.close());

/** Client-side setup of a notebook with one note, as a real client would do it. */
async function setupNotebook(mode: 'agent' | 'private' = 'agent') {
  const notebookKey = rnd(32);
  const { notebookId } = await createNotebook(s, u, { mode, notebookKey });
  const noteId = await createNote(s, u, notebookId);
  const noteKey = rnd(32);
  const client = await SyncClient.user(s, u);
  const nb = new Y.Doc();
  const meta = new Y.Map();
  nb.getMap('notes').set(noteId, meta);
  meta.set('title', 'Hello');
  meta.set('wrappedKey', b64(await seal(notebookKey, noteKey, AD.note(noteId))));
  await client.push(notebookId, await seal(notebookKey, Y.encodeStateAsUpdate(nb), AD.doc(notebookId)));
  const note = new Y.Doc();
  note.getText('t').insert(0, 'from user');
  await client.push(noteId, await seal(noteKey, Y.encodeStateAsUpdate(note), AD.doc(noteId)));
  return { notebookId, noteId, noteKey, notebookKey, client };
}

function grant(notebookIds: string[], permission: 'read' | 'read_write', extra: Partial<AgentGrant> = {}): AgentGrant {
  return {
    id: newId(),
    userId: u.userId,
    kind: 'static',
    name: 'Claude',
    clientId: null,
    notebookIds,
    permission,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    secretHash: rnd(32).toString('hex'),
    ...extra,
  };
}

const origin = (grantId: string) => ({ kind: 'agent' as const, grantId, userId: u.userId, agentName: 'Claude', action: 'edit_note' });

describe('store', () => {
  it('persists grants, OAuth clients, codes, tokens and audit', async () => {
    const { notebookId, client } = await setupNotebook();
    const g = grant([notebookId], 'read');
    await agents.store.insertGrant(g);
    expect(await agents.store.getGrant(g.id)).toEqual(g);
    expect(await agents.store.findGrantBySecretHash(g.secretHash!)).toEqual(g);
    expect((await agents.store.listGrants(u.userId)).map((x) => x.id)).toContain(g.id);
    const revokedAt = new Date().toISOString();
    await agents.store.updateGrant(g.id, { revokedAt, permission: 'read_write' });
    expect(await agents.store.getGrant(g.id)).toMatchObject({ revokedAt, permission: 'read_write' });

    const c = {
      clientId: 'https://client.example/meta.json',
      clientSecretHash: null,
      clientName: 'Client',
      clientUri: null,
      logoUri: null,
      redirectUris: ['https://client.example/cb'],
      tokenEndpointAuthMethod: 'none' as const,
      registration: 'cimd' as const,
      createdAt: new Date().toISOString(),
    };
    await agents.store.upsertClient(c);
    await agents.store.upsertClient({ ...c, clientName: 'Renamed' });
    expect((await agents.store.getClient(c.clientId))?.clientName).toBe('Renamed');

    const code = {
      codeHash: 'h1',
      clientId: c.clientId,
      userId: u.userId,
      redirectUri: c.redirectUris[0]!,
      codeChallenge: 'x',
      resource: 'https://notes.example.com/mcp',
      scope: 'notes:read',
      notebookIds: [notebookId],
      permission: 'read' as const,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    await agents.store.insertCode(code);
    const [a, b] = await Promise.all([agents.store.takeCode('h1'), agents.store.takeCode('h1')]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(a ?? b).toEqual(code);

    const tok = { tokenHash: 't1', kind: 'access' as const, grantId: g.id, clientId: c.clientId, scope: 's', resource: 'r', expiresAt: new Date(Date.now() + 1000).toISOString() };
    await agents.store.insertToken(tok);
    expect(await agents.store.getToken('t1')).toEqual(tok);
    await agents.store.deleteTokensOfGrant(g.id);
    expect(await agents.store.getToken('t1')).toBeNull();

    for (let i = 0; i < 3; i++) {
      await agents.store.appendAudit({
        id: newId(),
        grantId: g.id,
        userId: u.userId,
        at: new Date(Date.now() + i * 1000).toISOString(),
        via: 'mcp',
        action: `a${i}`,
        notebookId,
        noteId: null,
        ok: true,
        errorCode: null,
        durationMs: 5,
      });
    }
    const page1 = await agents.store.listAudit(g.id, { limit: 2 });
    expect(page1.map((e) => e.action)).toEqual(['a2', 'a1']);
    const page2 = await agents.store.listAudit(g.id, { limit: 2, before: page1[1]!.at });
    expect(page2.map((e) => e.action)).toEqual(['a0']);
    client.close();
  });
});

describe('data source', () => {
  it('reads and edits agent-mode notes; clients receive the edit', async () => {
    const { notebookId, noteId, noteKey, client } = await setupNotebook();
    const priv = await setupNotebook('private');
    await client.subscribe(noteId, 1);
    const g = grant([notebookId], 'read_write');
    await agents.store.insertGrant(g);

    const nbs = await agents.data.listAgentNotebooks(u.userId, g.id);
    expect(nbs.map((n) => n.id)).toEqual([notebookId]);
    expect(await agents.data.loadDoc(u.userId, priv.noteId)).toBeNull();

    const loaded = (await agents.data.loadDoc(u.userId, noteId, g.id))!;
    expect(loaded.doc.getText('t').toString()).toBe('from user');
    expect(loaded.seq).toBe(1);
    expect(await agents.data.docSeqs!(u.userId, [noteId, notebookId, priv.noteId], g.id)).toEqual({
      [noteId]: 1,
      [notebookId]: 1,
    });

    const sv = Y.encodeStateVector(loaded.doc);
    loaded.doc.getText('t').insert(9, ' + agent');
    const { seq } = await agents.data.applyUpdate(u.userId, noteId, Y.encodeStateAsUpdate(loaded.doc, sv), origin(g.id));
    expect(seq).toBe(2);
    const live = await client.next((m) => m.type === 'update' && m.docId === noteId);
    expect(live.deviceId).toBe(`agent:${g.id}`);
    const mirror = new Y.Doc();
    mirror.getText('t').insert(0, 'from user');
    const fresh = (await agents.data.loadDoc(u.userId, noteId, g.id))!;
    expect(fresh.doc.getText('t').toString()).toBe('from user + agent');
    expect((await open(noteKey, Buffer.from(live.payload, 'base64url'), AD.doc(noteId))).length).toBeGreaterThan(0);
    client.close();
    priv.client.close();
  });

  it('skips an undecryptable update instead of hiding the whole document', async () => {
    const { notebookId, noteId, client } = await setupNotebook();
    const g = grant([notebookId], 'read_write');
    await agents.store.insertGrant(g);
    // A client seals an update of the notebook index with a wrong key.
    await client.push(notebookId, await seal(rnd(32), new Uint8Array([1, 2, 3]), AD.doc(notebookId)));
    const nb = (await agents.data.loadDoc(u.userId, notebookId, g.id))!;
    expect(nb).not.toBeNull();
    expect(nb.skipped).toEqual([{ seq: 2, deviceId: expect.any(String), reason: 'decrypt' }]);
    expect((nb.doc.getMap('notes').get(noteId) as Y.Map<unknown>).get('title')).toBe('Hello');
    // The note still loads: its key comes from the partly readable notebook index.
    const note = (await agents.data.loadDoc(u.userId, noteId, g.id))!;
    expect(note.doc.getText('t').toString()).toBe('from user');
    expect(note.skipped).toBeUndefined();
    client.close();
  });

  it('diag CLI names the unreadable items of a document', async () => {
    const { notebookId, client } = await setupNotebook();
    await client.push(notebookId, await seal(rnd(32), new Uint8Array([1, 2, 3]), AD.doc(notebookId)));
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: s.ctx.config.DATABASE_URL,
      DS_JWT_SECRET: s.ctx.config.DS_JWT_SECRET,
      DS_KMS_KEY: s.ctx.config.DS_KMS_KEY,
      STORAGE_DIR: s.ctx.config.STORAGE_DIR,
    };
    const { stdout } = await execFileAsync('npx', ['tsx', 'src/diag-agent-doc-cli.ts', notebookId], { env, cwd: process.cwd() });
    expect(stdout).toContain(`kind=notebook`);
    expect(stdout).toMatch(/update\s+seq=1 .*decrypt=ok\s+apply=ok/);
    expect(stdout).toMatch(/update\s+seq=2 .*decrypt=FAIL/);
    expect(stdout).toContain('UNREADABLE items: seq 2');
    client.close();
  });

  it('creates notes whose wrapped key the notebook key opens', async () => {
    const { notebookId, notebookKey, client } = await setupNotebook();
    const g = grant([notebookId], 'read_write');
    await agents.store.insertGrant(g);
    const noteId = newId();
    const { wrappedKey } = await agents.data.createNoteDoc(u.userId, notebookId, noteId, g.id);
    const noteKey = await open(notebookKey, Buffer.from(wrappedKey, 'base64url'), AD.note(noteId));
    expect(noteKey).toHaveLength(32);
    const d = new Y.Doc();
    d.getText('t').insert(0, 'agent note');
    await agents.data.applyUpdate(u.userId, noteId, Y.encodeStateAsUpdate(d), origin(g.id));
    // The owner's device can read it with the key from the wrapped key.
    const sub = await client.subscribe(noteId, 0);
    const back = new Y.Doc();
    for (const it of sub.pages.flatMap((p: any) => p.items)) {
      Y.applyUpdate(back, await open(noteKey, Buffer.from(it.payload, 'base64url'), AD.doc(noteId)));
    }
    expect(back.getText('t').toString()).toBe('agent note');
    await expect(agents.data.createNoteDoc(u.userId, notebookId, noteId, g.id)).rejects.toThrow(/exists/);
    client.close();
  });

  it('decrypts image attachments', async () => {
    const { notebookId, noteId, noteKey, client } = await setupNotebook();
    const img = rnd(5000);
    const attachmentId = newId();
    const chunk = await seal(noteKey, img, AD.attachment(attachmentId, 0, true));
    const t = u.session.accessToken;
    await api(s, 'POST', '/attachments', {
      token: t,
      body: { attachmentId, noteId, size: chunk.length, chunkCount: 1, mime: 'image/png' },
    });
    await api(s, 'PUT', `/attachments/${attachmentId}/chunks/0`, { token: t, binary: Buffer.from(chunk) });
    const out = await agents.data.loadAttachmentImage!(u.userId, attachmentId);
    expect(Buffer.from(out!).equals(img)).toBe(true);
    void notebookId;
    client.close();
  });

  it('read-only, revoked and expired grants cannot write; RLS confines raw queries', async () => {
    const a = await setupNotebook();
    const b = await setupNotebook();
    const ro = grant([a.notebookId], 'read');
    await agents.store.insertGrant(ro);
    await expect(
      agents.data.applyUpdate(u.userId, a.noteId, new Uint8Array([0, 0]), origin(ro.id)),
    ).rejects.toThrow(/does not allow writing/);
    await expect(agents.data.createNoteDoc(u.userId, a.notebookId, newId(), ro.id)).rejects.toThrow(
      /does not allow writing/,
    );
    // Even bypassing the code checks, the database refuses the write.
    const raw = await withAgentScope(s.ctx.database.db, { userId: u.userId, grantId: ro.id }, (tx) =>
      tx.execute(sql`INSERT INTO doc_updates (doc_id, seq, payload, device_id) VALUES (${a.noteId}, 999, '\\x00', 'x')`),
    ).catch((e: Error) => e);
    expect(String((raw as any).cause ?? raw)).toMatch(/row-level security/);
    expect(await agents.data.loadDoc(u.userId, b.noteId, ro.id)).toBeNull();

    const revoked = grant([a.notebookId], 'read_write', { revokedAt: new Date().toISOString() });
    const expired = grant([a.notebookId], 'read_write', { expiresAt: new Date(Date.now() - 1000).toISOString() });
    await agents.store.insertGrant(revoked);
    await agents.store.insertGrant(expired);
    expect(await agents.data.loadDoc(u.userId, a.noteId, revoked.id)).toBeNull();
    expect(await agents.data.listAgentNotebooks(u.userId, expired.id)).toEqual([]);

    // Pretend the code forgot its own checks: raw queries still see only the grant's notebook.
    const visible = await withAgentScope(s.ctx.database.db, { userId: u.userId, grantId: ro.id }, async (tx) => {
      const rows = await tx.select({ notebookId: docs.notebookId }).from(docs);
      const usersTable = await tx.execute(sql`SELECT count(*) FROM users`).catch((e: Error) => e);
      return { rows, usersTable };
    });
    expect(new Set(visible.rows.map((r) => r.notebookId))).toEqual(new Set([a.notebookId]));
    expect(visible.usersTable).toBeInstanceOf(Error);

    // Another user's grant id does not open this user's notebooks.
    const other = await signup(s);
    expect(await agents.data.loadDoc(other.userId, a.noteId, ro.id)).toBeNull();
    expect(await agents.data.loadDoc(other.userId, a.noteId)).toBeNull();

    // Switching the notebook to private hides it immediately.
    await api(s, 'PATCH', `/notebooks/${a.notebookId}/mode`, { token: u.session.accessToken, body: { mode: 'private' } });
    expect(await agents.data.loadDoc(u.userId, a.noteId, ro.id)).toBeNull();
    a.client.close();
    b.client.close();
  });

  it('notebook deletion removes it from grants', async () => {
    const { notebookId, client } = await setupNotebook();
    const g = grant([notebookId], 'read');
    await agents.store.insertGrant(g);
    await api(s, 'DELETE', `/notebooks/${notebookId}`, { token: u.session.accessToken });
    expect((await agents.store.getGrant(g.id))!.notebookIds).toEqual([]);
    client.close();
  });
});

describe('user auth', () => {
  it('accepts a Bearer token and the web-session cookie', async () => {
    const req = (headers: Record<string, string>) => ({ headers }) as never;
    expect(await agents.users.authenticate(req({ authorization: `Bearer ${u.session.accessToken}` }))).toEqual({
      userId: u.userId,
      email: u.email,
    });
    expect(await agents.users.authenticate(req({}))).toBeNull();
    const res = await s.app.inject({
      method: 'POST',
      url: '/v1/auth/web-session',
      headers: { authorization: `Bearer ${u.session.accessToken}` },
    });
    expect(res.statusCode).toBe(204);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    const value = cookie.split(';')[0]!;
    expect((await agents.users.authenticate(req({ cookie: `x=1; ${value}` })))?.userId).toBe(u.userId);
    expect(agents.users.loginUrl!('https://notes.example.com/oauth/authorize?x=1')).toBe(
      'https://app.example.com/connect?returnTo=https%3A%2F%2Fnotes.example.com%2Foauth%2Fauthorize%3Fx%3D1',
    );
  });
});
