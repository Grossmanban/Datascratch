import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { docs } from '../src/db/schema.js';
import { AD, open, seal } from '../src/lib/sodium.js';
import type { AgentHost, PluginHost } from '../src/plugins/api.js';
import { createPluginHost } from '../src/plugins/host.js';
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

let s: TestServer;
let u: TestUser;
let host: PluginHost;
let agents: AgentHost;

beforeAll(async () => {
  s = await startServer();
  u = await signup(s);
  host = createPluginHost(s.ctx);
  agents = host.agents;
});
afterAll(() => s.close());

/** Client-side setup of an agent-mode notebook with one note, like a real client would do. */
async function setupNotebook(mode: 'agent' | 'private' = 'agent') {
  const notebookKey = rnd(32);
  const { notebookId } = await createNotebook(s, u, { mode, notebookKey });
  const noteId = await createNote(s, u, notebookId);
  const noteKey = rnd(32);
  const client = await SyncClient.user(s, u);

  const nbDoc = new Y.Doc();
  const meta = new Y.Map();
  nbDoc.getMap('notes').set(noteId, meta);
  meta.set('id', noteId);
  meta.set('title', 'Hello');
  meta.set('wrappedKey', b64(await seal(notebookKey, noteKey, AD.note(noteId))));
  await client.push(notebookId, await seal(notebookKey, Y.encodeStateAsUpdate(nbDoc), AD.doc(notebookId)));

  const note = new Y.Doc();
  note.getText('t').insert(0, 'from user');
  await client.push(noteId, await seal(noteKey, Y.encodeStateAsUpdate(note), AD.doc(noteId)));
  return { notebookId, noteId, noteKey, notebookKey, client, note };
}

async function token(notebookIds: string[], permission: 'read' | 'read_write') {
  const r = await api(s, 'POST', '/agent-tokens', {
    token: u.session.accessToken,
    body: { name: 'Claude', notebookIds, permission },
  });
  expect(r.status).toBe(200);
  return r.body as { id: string; token: string };
}

describe('agent tokens API', () => {
  it('creates, lists, rejects private notebooks, revokes', async () => {
    const { notebookId, client } = await setupNotebook();
    const priv = await createNotebook(s, u);
    const bad = await api(s, 'POST', '/agent-tokens', {
      token: u.session.accessToken,
      body: { name: 'x', notebookIds: [priv.notebookId], permission: 'read' },
    });
    expect(bad.status).toBe(400);
    const t = await token([notebookId], 'read');
    expect(t.token.startsWith('dsa_')).toBe(true);
    const list = await api(s, 'GET', '/agent-tokens', { token: u.session.accessToken });
    const item = list.body.find((x: any) => x.id === t.id);
    expect(item).toMatchObject({ name: 'Claude', notebookIds: [notebookId], permission: 'read' });
    expect(JSON.stringify(list.body)).not.toContain(t.token);
    expect(await agents.authenticate(t.token)).toMatchObject({ tokenId: t.id, notebookIds: [notebookId] });
    expect((await api(s, 'DELETE', `/agent-tokens/${t.id}`, { token: u.session.accessToken })).status).toBe(204);
    expect(await agents.authenticate(t.token)).toBeNull();
    expect(await agents.authenticate('dsa_nope')).toBeNull();
    client.close();
  });
});

describe('agent host', () => {
  it('reads and edits an agent-mode note; clients receive the edit; audit is recorded', async () => {
    const { notebookId, noteId, noteKey, client } = await setupNotebook();
    await client.subscribe(noteId, 1);
    const t = await token([notebookId], 'read_write');
    const p = (await agents.authenticate(t.token))!;

    const seq = await agents.withScope(p, async (scope) => {
      expect((await scope.listNotebooks()).map((n) => n.id)).toEqual([notebookId]);
      expect((await scope.listDocs(notebookId)).map((d) => d.id).sort()).toEqual([notebookId, noteId].sort());
      const { state } = await scope.readDoc(noteId);
      const doc = new Y.Doc();
      Y.applyUpdate(doc, state);
      expect(doc.getText('t').toString()).toBe('from user');
      const sv = Y.encodeStateVector(doc);
      doc.getText('t').insert(doc.getText('t').length, ' + agent');
      const r = await scope.applyUpdate(noteId, Y.encodeStateAsUpdate(doc, sv));
      await scope.audit('edit_note', { notebookId, docId: noteId, details: { blocks: 1 } });
      return r.seq;
    });
    expect(seq).toBe(2);

    const live = await client.next((m) => m.type === 'update' && m.docId === noteId);
    expect(live.deviceId).toBe(`agent:${t.id}`);
    const update = await open(noteKey, Buffer.from(live.payload, 'base64url'), AD.doc(noteId));
    const mirror = new Y.Doc();
    mirror.getText('t').insert(0, 'from user');
    // Applying onto a fresh doc with the original update + agent update reproduces the text.
    const userDoc = new Y.Doc();
    const items = (await (await SyncClient.user(s, u)).subscribe(noteId, 0)).pages.flatMap((pg: any) => pg.items);
    for (const it of items) Y.applyUpdate(userDoc, await open(noteKey, Buffer.from(it.payload, 'base64url'), AD.doc(noteId)));
    expect(userDoc.getText('t').toString()).toBe('from user + agent');
    expect(update.length).toBeGreaterThan(0);

    const audit = await api(s, 'GET', `/agent-tokens/${t.id}/audit`, { token: u.session.accessToken });
    expect(audit.body[0]).toMatchObject({ action: 'edit_note', docId: noteId, ok: true, details: { blocks: 1 } });
    client.close();
  });

  it('creates notes and attachments', async () => {
    const { notebookId, client } = await setupNotebook();
    const t = await token([notebookId], 'read_write');
    const p = (await agents.authenticate(t.token))!;
    const noteId = newId();
    const attachmentId = newId();
    const data = rnd(1024 * 1024 + 5000);
    await agents.withScope(p, async (scope) => {
      await scope.createNoteDoc(notebookId, noteId);
      // A real agent would also add NoteMeta (with the wrapped noteKey) to the notebook index.
      const nbKey = await scope.notebookKey(notebookId);
      const noteKey = await host.crypto.randomKey();
      const { state } = await scope.readDoc(notebookId);
      const nb = new Y.Doc();
      Y.applyUpdate(nb, state);
      const sv = Y.encodeStateVector(nb);
      const meta = new Y.Map();
      nb.getMap('notes').set(noteId, meta);
      meta.set('wrappedKey', b64(await host.crypto.seal(nbKey, noteKey, host.crypto.ad.note(noteId))));
      await scope.applyUpdate(notebookId, Y.encodeStateAsUpdate(nb, sv));
      expect(Buffer.from(await scope.docKey(noteId))).toEqual(Buffer.from(noteKey));
      await scope.writeAttachment({ attachmentId, noteId, mime: 'image/png', data });
    });
    const back = await agents.withScope(p, (scope) => scope.readAttachment(attachmentId));
    expect(Buffer.from(back.data).equals(data)).toBe(true);
    const st = await api(s, 'GET', `/attachments/${attachmentId}`, { token: u.session.accessToken });
    expect(st.body.uploadedChunks).toEqual([0, 1]);
    client.close();
  });

  it('read-only tokens cannot write', async () => {
    const { notebookId, noteId, client } = await setupNotebook();
    const t = await token([notebookId], 'read');
    const p = (await agents.authenticate(t.token))!;
    await expect(agents.withScope(p, (scope) => scope.applyUpdate(noteId, new Uint8Array([0, 0])))).rejects.toThrow(
      /read-only/,
    );
    client.close();
  });

  it('Row-Level Security confines even raw queries to granted notebooks', async () => {
    const a = await setupNotebook();
    const b = await setupNotebook();
    const priv = await createNotebook(s, u);
    await createNote(s, u, priv.notebookId);
    const t = await token([a.notebookId], 'read_write');
    const p = (await agents.authenticate(t.token))!;
    // Pretend the code forgot its own checks: a raw SELECT over all docs.
    const visible = await agents.withScope(p, async (scope) => {
      const tx = scope.tx as typeof s.ctx.database.db;
      const rows = await tx.select({ id: docs.id, notebookId: docs.notebookId }).from(docs);
      const upd = await tx.execute(sql`SELECT DISTINCT doc_id FROM doc_updates`);
      const users = await tx.execute(sql`SELECT count(*) FROM users`).catch((e: Error) => e);
      return { rows, upd: upd.rows, users };
    });
    expect(new Set(visible.rows.map((r) => r.notebookId))).toEqual(new Set([a.notebookId]));
    expect(visible.upd.map((r: any) => r.doc_id).sort()).toEqual([a.notebookId, a.noteId].sort());
    expect(visible.users).toBeInstanceOf(Error); // no grant on users at all

    // Writes into a notebook outside the grant are rejected by the database.
    const forged = await agents
      .withScope({ ...p, notebookIds: [a.notebookId, b.notebookId] }, async (scope) => {
        const tx = scope.tx as typeof s.ctx.database.db;
        await tx.execute(
          sql`INSERT INTO doc_updates (doc_id, seq, payload, device_id) VALUES (${b.noteId}, 999, '\\x00', 'x')`,
        );
      })
      .catch((e: Error) => e);
    expect(forged).toBeInstanceOf(Error);
    expect(String((forged as any).cause ?? forged)).toMatch(/row-level security/);

    // Switching the notebook to private hides it from the agent immediately.
    await api(s, 'PATCH', `/notebooks/${a.notebookId}/mode`, { token: u.session.accessToken, body: { mode: 'private' } });
    const after = await agents.withScope(p, async (scope) => {
      const tx = scope.tx as typeof s.ctx.database.db;
      return tx.select().from(docs);
    });
    expect(after).toHaveLength(0);
    expect((await agents.authenticate(t.token))!.notebookIds).toEqual([]);
    for (const x of [a, b]) x.client.close();
  });
});
