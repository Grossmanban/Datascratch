import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { docUpdates, docs } from '../src/db/schema.js';
import { AD, seal } from '../src/lib/sodium.js';
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
  sleep,
  startServer,
  type TestServer,
  type TestUser,
} from './helpers.js';

// D-54 amendment (owner, 2026-10-28): a member's own agent tokens reach an agent-mode notebook
// shared with the member, with the member's rights.
let s: TestServer;
let agents: AgentsContext;
beforeAll(async () => {
  s = await startServer({ PUBLIC_URL: 'https://notes.example.com', APP_URL: 'https://app.example.com' });
  agents = createAgentsContext(s.ctx);
});
afterAll(() => s.close());

let accounts = 0;
const address = () => `10.55.${Math.floor(accounts / 200)}.${(accounts++ % 200) + 1}`;
const call = (u: TestUser, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api(s, method, path, { token: u.session.accessToken, ...(body !== undefined ? { body } : {}) });

async function user(email?: string) {
  const u = await signup(s, email, address());
  await call(u, 'PUT', '/me/box-key', { publicKey: b64(rnd(32)), wrappedSecretKey: b64(rnd(73)) });
  return u;
}

/** An agent-mode notebook of `owner` with one readable note. */
async function agentNotebook(owner: TestUser, mode: 'agent' | 'private' = 'agent') {
  const notebookKey = rnd(32);
  const { notebookId } = await createNotebook(s, owner, { mode, notebookKey });
  const noteId = await createNote(s, owner, notebookId);
  const noteKey = rnd(32);
  const c = await SyncClient.user(s, owner);
  const nb = new Y.Doc();
  const meta = new Y.Map();
  nb.getMap('notes').set(noteId, meta);
  meta.set('wrappedKey', b64(await seal(notebookKey, noteKey, AD.note(noteId))));
  await c.push(notebookId, await seal(notebookKey, Y.encodeStateAsUpdate(nb), AD.doc(notebookId)));
  const note = new Y.Doc();
  note.getText('t').insert(0, 'owner text');
  await c.push(noteId, await seal(noteKey, Y.encodeStateAsUpdate(note), AD.doc(noteId)));
  c.close();
  return { notebookId, noteId };
}

async function share(owner: TestUser, notebookId: string, member: TestUser, role: 'editor' | 'viewer', giveKey = true) {
  const invitationId = newId();
  await call(owner, 'POST', '/invitations', { invitationId, target: { kind: 'notebook', id: notebookId }, email: member.email, role });
  expect((await call(member, 'POST', `/invitations/${invitationId}/accept`, {})).status).toBe(200);
  if (giveKey) {
    await call(owner, 'PUT', `/members/notebook/${notebookId}/${member.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) });
  }
}

async function grantFor(member: TestUser, notebookIds: string[], permission: 'read' | 'read_write' = 'read_write') {
  const g: AgentGrant = {
    id: newId(),
    userId: member.userId,
    kind: 'static',
    name: 'Member agent',
    clientId: null,
    notebookIds,
    permission,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    secretHash: rnd(32).toString('hex'),
  };
  await agents.store.insertGrant(g);
  return g;
}

const originOf = (member: TestUser, grantId: string) => ({
  kind: 'agent' as const,
  grantId,
  userId: member.userId,
  agentName: 'Member agent',
  action: 'edit_note',
});

async function edit(member: TestUser, noteId: string, grantId: string, text: string) {
  const loaded = (await agents.data.loadDoc(member.userId, noteId, grantId))!;
  const sv = Y.encodeStateVector(loaded.doc);
  loaded.doc.getText('t').insert(loaded.doc.getText('t').length, text);
  return agents.data.applyUpdate(member.userId, noteId, Y.encodeStateAsUpdate(loaded.doc, sv), originOf(member, grantId));
}

describe('agents of a member', () => {
  it('editor: lists, reads and writes the shared notebook; edits are the member agent’s, notes the owner’s', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId, noteId } = await agentNotebook(owner);
    await share(owner, notebookId, member, 'editor');
    // The consent page / token form offers it: the plain list without a grant includes it.
    expect((await agents.data.listAgentNotebooks(member.userId)).map((n) => n.id)).toContain(notebookId);
    const g = await grantFor(member, [notebookId]);
    const listed = await agents.data.listAgentNotebooks(member.userId, g.id);
    expect(listed.map((n) => n.id)).toEqual([notebookId]);
    // Who shares it and with which role (the plugin labels it and answers «read only» early).
    expect(listed[0]!.shared).toEqual({ ownerUserId: owner.userId, ownerEmail: owner.email, role: 'editor' });
    expect((await agents.data.loadDoc(member.userId, noteId, g.id))!.doc.getText('t').toString()).toBe('owner text');

    const { seq } = await edit(member, noteId, g.id, ' + member agent');
    const [row] = await s.ctx.database.db
      .select({ author: docUpdates.author })
      .from(docUpdates)
      .where(sql`${docUpdates.docId} = ${noteId} AND ${docUpdates.seq} = ${seq}`);
    expect(row!.author).toEqual({ kind: 'agent', tokenId: g.id });

    // A new note belongs to the owner (and counts against the owner's quota).
    const created = newId();
    await agents.data.createNoteDoc(member.userId, notebookId, created, g.id);
    const [doc] = await s.ctx.database.db.select({ userId: docs.userId }).from(docs).where(eq(docs.id, created));
    expect(doc!.userId).toBe(owner.userId);

    // Moving a note out into the member's own notebook is the owner's only.
    const own = await agentNotebook(member);
    const both = await grantFor(member, [notebookId, own.notebookId]);
    await expect(
      agents.data.moveNoteDoc!(member.userId, {
        noteId,
        fromNotebookId: notebookId,
        toNotebookId: own.notebookId,
        origin: originOf(member, both.id),
        indexUpdates: () => ({ from: new Uint8Array([0, 0]), to: new Uint8Array([0, 0]) }),
      }),
    ).rejects.toThrow(/only by its owner/);
  });

  it('viewer: reads, every write is refused', async () => {
    const owner = await user();
    const member = await user();
    const { notebookId, noteId } = await agentNotebook(owner);
    await share(owner, notebookId, member, 'viewer');
    const g = await grantFor(member, [notebookId]);
    expect((await agents.data.listAgentNotebooks(member.userId, g.id))[0]!.shared?.role).toBe('viewer');
    // The owner's own list marks nothing as shared.
    expect((await agents.data.listAgentNotebooks(owner.userId)).find((n) => n.id === notebookId)!.shared).toBeNull();
    expect(await agents.data.loadDoc(member.userId, noteId, g.id)).not.toBeNull();
    await expect(edit(member, noteId, g.id, 'x')).rejects.toThrow(/does not allow writing/);
    await expect(agents.data.createNoteDoc(member.userId, notebookId, newId(), g.id)).rejects.toThrow(
      /does not allow writing/,
    );
  });

  it('access ends at once: agents mode off, removal, leaving; nothing before confirmation or for private notebooks', async () => {
    const owner = await user();
    const a = await user();
    const b = await user();
    const one = await agentNotebook(owner);
    const two = await agentNotebook(owner);
    await share(owner, one.notebookId, a, 'editor');
    await share(owner, two.notebookId, a, 'editor');
    await share(owner, two.notebookId, b, 'editor');
    const ga = await grantFor(a, [one.notebookId, two.notebookId]);
    const gb = await grantFor(b, [two.notebookId]);
    expect(await agents.data.loadDoc(a.userId, one.noteId, ga.id)).not.toBeNull();

    // The owner turns agents mode off: gone for the member's agent.
    expect((await call(owner, 'PATCH', `/notebooks/${one.notebookId}/mode`, { mode: 'private' })).status).toBe(200);
    expect(await agents.data.loadDoc(a.userId, one.noteId, ga.id)).toBeNull();
    expect((await agents.data.listAgentNotebooks(a.userId, ga.id)).map((n) => n.id)).toEqual([two.notebookId]);

    // Removed by the owner / left on their own.
    expect(await agents.data.loadDoc(a.userId, two.noteId, ga.id)).not.toBeNull();
    expect((await call(owner, 'DELETE', `/members/notebook/${two.notebookId}/${a.userId}`)).status).toBe(204);
    expect(await agents.data.loadDoc(a.userId, two.noteId, ga.id)).toBeNull();
    await expect(edit(b, two.noteId, gb.id, 'still here')).resolves.toMatchObject({ seq: expect.any(Number) });
    expect((await call(b, 'DELETE', `/members/notebook/${two.notebookId}/${b.userId}`)).status).toBe(204);
    expect(await agents.data.loadDoc(b.userId, two.noteId, gb.id)).toBeNull();

    // An account created after the invitation: nothing until the owner gives the key.
    const three = await agentNotebook(owner);
    const email = `later-${newId().slice(-8)}@example.com`;
    const invitationId = newId();
    await call(owner, 'POST', '/invitations', { invitationId, target: { kind: 'notebook', id: three.notebookId }, email, role: 'editor' });
    await sleep(5);
    const late = await user(email);
    await call(late, 'POST', `/invitations/${invitationId}/accept`, {});
    const gl = await grantFor(late, [three.notebookId]);
    expect(await agents.data.loadDoc(late.userId, three.noteId, gl.id)).toBeNull();
    await call(owner, 'PUT', `/members/notebook/${three.notebookId}/${late.userId}/key`, { version: 1, wrappedKey: b64(rnd(73)) });
    expect(await agents.data.loadDoc(late.userId, three.noteId, gl.id)).not.toBeNull();

    // A private notebook shared with the member is never visible to agents.
    const priv = await agentNotebook(owner, 'private');
    await share(owner, priv.notebookId, a, 'editor');
    expect((await agents.data.listAgentNotebooks(a.userId)).map((n) => n.id)).not.toContain(priv.notebookId);
  });
});
