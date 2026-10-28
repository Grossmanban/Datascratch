// Integration of the agents plugin (AgentService) with the server's shared-notebook RLS (D-54 amendment).
import { AgentService } from '@datascratch/agents';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { docs } from '../src/db/schema.js';
import { AD, seal } from '../src/lib/sodium.js';
import type { AgentGrant, AgentsContext } from '../src/plugins/agents-context.js';
import { createAgentsContext } from '../src/plugins/loader.js';
import { SyncClient, api, b64, createNote, createNotebook, newId, rnd, signup, startServer, type TestServer, type TestUser } from './helpers.js';

let s: TestServer;
let agents: AgentsContext;
beforeAll(async () => {
  s = await startServer({ PUBLIC_URL: 'https://notes.example.com', APP_URL: 'https://app.example.com' });
  agents = createAgentsContext(s.ctx);
});
afterAll(() => s.close());

let n = 0;
const call = (u: TestUser, method: 'POST' | 'PUT', path: string, body: unknown) => api(s, method, path, { token: u.session.accessToken, body });
async function user() {
  const u = await signup(s, undefined, `10.66.0.${++n}`);
  await call(u, 'PUT', '/me/box-key', { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) });
  return u;
}

async function teamNotebook(owner: TestUser) {
  const notebookKey = rnd(32);
  const { notebookId } = await createNotebook(s, owner, { mode: 'agent', notebookKey });
  const noteId = await createNote(s, owner, notebookId);
  const noteKey = rnd(32);
  const c = await SyncClient.user(s, owner);
  const nb = new Y.Doc();
  nb.getMap('meta').set('name', 'Команда');
  const meta = new Y.Map();
  nb.getMap('notes').set(noteId, meta);
  for (const [k, v] of Object.entries({ id: noteId, title: 'План', kind: 'note', folderId: null, tags: [], wrappedKey: b64(await seal(notebookKey, noteKey, AD.note(noteId))) })) meta.set(k, v);
  await c.push(notebookId, await seal(notebookKey, Y.encodeStateAsUpdate(nb), AD.doc(notebookId)));
  c.close();
  return { notebookId, noteId };
}

async function member(owner: TestUser, notebookId: string, role: 'editor' | 'viewer') {
  const m = await user();
  const invitationId = newId();
  await call(owner, 'POST', '/invitations', { invitationId, target: { kind: 'notebook', id: notebookId }, email: m.email, role });
  await call(m, 'POST', `/invitations/${invitationId}/accept`, {});
  await call(owner, 'PUT', `/members/notebook/${notebookId}/${m.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) });
  const g: AgentGrant = {
    id: newId(), userId: m.userId, kind: 'static', name: 'Member agent', clientId: null, notebookIds: [notebookId], permission: 'read_write',
    createdAt: new Date().toISOString(), expiresAt: null, revokedAt: null, lastUsedAt: null, secretHash: rnd(32).toString('hex'),
  };
  await agents.store.insertGrant(g);
  return { m, p: { grant: g, agentName: g.name, via: 'rest' as const } };
}

describe('member agents through the plugin (D-54 amendment)', () => {
  it('viewer: listed as shared read-only, writes refused with «только чтение»; editor: creates notes owned by the owner', async () => {
    const owner = await user();
    const { notebookId } = await teamNotebook(owner);
    const svc = new AgentService(agents);
    const viewer = await member(owner, notebookId, 'viewer');
    const list = await svc.listNotebooks(viewer.p);
    expect(list.notebooks[0]).toMatchObject({ id: notebookId, name: 'Команда', permission: 'read', shared: { ownerEmail: owner.email, role: 'viewer' } });
    await expect(svc.createNote(viewer.p, { notebookId, title: 'x', markdown: 'y' })).rejects.toMatchObject({ code: 'forbidden', message: expect.stringContaining('только чтение') });
    const editor = await member(owner, notebookId, 'editor');
    const { note } = await svc.createNote(editor.p, { notebookId, title: 'Итоги', markdown: 'Готово.' });
    const [row] = await s.ctx.database.db.select().from(docs).where(eq(docs.id, note.id));
    expect(row!.userId).toBe(owner.userId);
    const read = await svc.readNote(viewer.p, { noteId: note.id, includeImages: false });
    expect(read.markdown).toContain('Готово.');
  });
});
