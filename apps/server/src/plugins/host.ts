import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import * as Y from 'yjs';
import type { AppContext } from '../context.js';
import { withAgentScope, type Tx } from '../db/client.js';
import {
  agentTokenNotebooks,
  agentTokens,
  attachmentChunks,
  attachments,
  docSnapshots,
  docUpdates,
  docs,
  notebooks,
} from '../db/schema.js';
import { COMPACT_JOB } from '../jobs/index.js';
import { fromB64, sha256 } from '../lib/encoding.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import { AD, getSodium, open, seal } from '../lib/sodium.js';
import { CHUNK_PLAINTEXT } from '../routes/attachments.js';
import { AGENT_TOKEN_PREFIX } from '../routes/agent-tokens.js';
import { chunkKey } from '../storage/index.js';
import type { AgentDoc, AgentHost, AgentPrincipal, AgentScope, PluginHost } from './api.js';

/** Server-side snapshot of agent-mode documents (the server holds the key there). */
const SNAPSHOT_AFTER_UPDATES = 500;
const SNAPSHOT_AFTER_BYTES = 1024 * 1024;
const LAST_USED_RESOLUTION_MS = 60_000;

const docDto = (d: typeof docs.$inferSelect): AgentDoc => ({
  id: d.id,
  kind: d.kind as 'notebook' | 'note',
  notebookId: d.notebookId!,
  lastSeq: d.lastSeq,
  updatedAt: d.updatedAt.toISOString(),
});

function readWrappedKey(meta: unknown): string | null {
  if (meta instanceof Y.Map) {
    const v = meta.get('wrappedKey');
    return typeof v === 'string' ? v : null;
  }
  if (meta && typeof meta === 'object' && typeof (meta as { wrappedKey?: unknown }).wrappedKey === 'string') {
    return (meta as { wrappedKey: string }).wrappedKey;
  }
  return null;
}

export function createAgentHost(ctx: AppContext): AgentHost {
  const { db } = ctx.database;

  async function authenticate(token: string): Promise<AgentPrincipal | null> {
    if (!token.startsWith(AGENT_TOKEN_PREFIX) || token.length > 200) return null;
    const [t] = await db
      .select()
      .from(agentTokens)
      .where(
        and(
          eq(agentTokens.tokenHash, sha256(token)),
          isNull(agentTokens.revokedAt),
          or(isNull(agentTokens.expiresAt), gt(agentTokens.expiresAt, sql`now()`)),
        ),
      );
    if (!t) return null;
    const nbs = await db
      .select({ id: notebooks.id })
      .from(agentTokenNotebooks)
      .innerJoin(notebooks, eq(notebooks.id, agentTokenNotebooks.notebookId))
      .where(and(eq(agentTokenNotebooks.tokenId, t.id), eq(notebooks.mode, 'agent'), eq(notebooks.userId, t.userId)));
    if (!t.lastUsedAt || Date.now() - t.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
      await db.update(agentTokens).set({ lastUsedAt: sql`now()` }).where(eq(agentTokens.id, t.id));
    }
    return {
      kind: 'agent',
      tokenId: t.id,
      userId: t.userId,
      permission: t.permission,
      notebookIds: nbs.map((n) => n.id),
    };
  }

  function makeScope(tx: Tx, principal: AgentPrincipal, afterCommit: (() => Promise<void> | void)[]): AgentScope {
    const nbKeys = new Map<string, Uint8Array>();
    const docKeys = new Map<string, Uint8Array>();
    const deviceId = `agent:${principal.tokenId}`;

    const requireWrite = () => {
      if (principal.permission !== 'read_write') throw forbidden('token is read-only');
    };
    const requireNotebook = (id: string) => {
      if (!principal.notebookIds.includes(id)) throw notFound('notebook not found');
    };

    async function getDoc(docId: string): Promise<AgentDoc | null> {
      const [d] = await tx.select().from(docs).where(eq(docs.id, docId));
      if (!d || !d.notebookId || d.kind === 'account' || !principal.notebookIds.includes(d.notebookId)) return null;
      return docDto(d);
    }

    async function mustDoc(docId: string) {
      const d = await getDoc(docId);
      if (!d) throw notFound('document not found');
      return d;
    }

    async function notebookKey(notebookId: string): Promise<Uint8Array> {
      requireNotebook(notebookId);
      const cached = nbKeys.get(notebookId);
      if (cached) return cached;
      const key = await ctx.keys.notebookKey(tx, notebookId);
      if (!key) throw notFound('notebook not found');
      nbKeys.set(notebookId, key);
      return key;
    }

    async function decryptState(docId: string, key: Uint8Array): Promise<{ state: Uint8Array; seq: number }> {
      const [snap] = await tx
        .select({ seq: docSnapshots.seq, payload: docSnapshots.payload })
        .from(docSnapshots)
        .where(eq(docSnapshots.docId, docId))
        .orderBy(desc(docSnapshots.seq))
        .limit(1);
      const from = snap?.seq ?? 0;
      const rows = await tx
        .select({ seq: docUpdates.seq, payload: docUpdates.payload })
        .from(docUpdates)
        .where(and(eq(docUpdates.docId, docId), gt(docUpdates.seq, from)))
        .orderBy(asc(docUpdates.seq));
      const ydoc = new Y.Doc();
      const ad = AD.doc(docId);
      if (snap) Y.applyUpdate(ydoc, await open(key, snap.payload, ad));
      for (const r of rows) Y.applyUpdate(ydoc, await open(key, r.payload, ad));
      const state = Y.encodeStateAsUpdate(ydoc);
      ydoc.destroy();
      return { state, seq: rows.length ? rows[rows.length - 1]!.seq : from };
    }

    async function docKey(docId: string): Promise<Uint8Array> {
      const cached = docKeys.get(docId);
      if (cached) return cached;
      const d = await mustDoc(docId);
      const nbKey = await notebookKey(d.notebookId);
      let key: Uint8Array;
      if (d.kind === 'notebook') {
        key = nbKey;
      } else {
        const { state } = await decryptState(d.notebookId, nbKey);
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, state);
        const wrapped = readWrappedKey(ydoc.getMap('notes').get(docId));
        ydoc.destroy();
        if (!wrapped) throw notFound('note key not found in notebook index');
        key = await ctx.keys.noteKey(nbKey, docId, fromB64(wrapped));
      }
      docKeys.set(docId, key);
      return key;
    }

    const scope: AgentScope = {
      principal,
      tx,
      async listNotebooks() {
        const rows = await tx
          .select({ id: notebooks.id, createdAt: notebooks.createdAt })
          .from(notebooks)
          .where(principal.notebookIds.length ? inArray(notebooks.id, principal.notebookIds) : sql`false`)
          .orderBy(asc(notebooks.createdAt));
        return rows.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString() }));
      },
      async listDocs(notebookId) {
        requireNotebook(notebookId);
        const rows = await tx.select().from(docs).where(eq(docs.notebookId, notebookId)).orderBy(asc(docs.createdAt));
        return rows.map(docDto);
      },
      getDoc,
      notebookKey,
      docKey,
      async readDoc(docId, key) {
        await mustDoc(docId);
        return decryptState(docId, key ?? (await docKey(docId)));
      },
      async applyUpdate(docId, update, key) {
        requireWrite();
        await mustDoc(docId);
        const k = key ?? (await docKey(docId));
        const payload = await seal(k, update, AD.doc(docId));
        const r = await ctx.documents.append(tx, { docId, payload, deviceId });
        afterCommit.push(() => ctx.documents.publishUpdate(docId, r.seq, payload, deviceId, null));
        if (r.updatesSinceSnapshot >= SNAPSHOT_AFTER_UPDATES || r.bytesSinceSnapshot >= SNAPSHOT_AFTER_BYTES) {
          const { state, seq } = await decryptState(docId, k);
          await ctx.documents.storeSnapshot(tx, {
            docId,
            baseSeq: seq,
            payload: await seal(k, state, AD.doc(docId)),
            deviceId,
          });
          afterCommit.push(() => ctx.jobs.enqueue(COMPACT_JOB, { docId }, { singletonKey: docId, startAfterSec: 30 }));
        }
        return { seq: r.seq };
      },
      async createNoteDoc(notebookId, noteId) {
        requireWrite();
        requireNotebook(notebookId);
        const [ex] = await tx.select().from(docs).where(eq(docs.id, noteId));
        if (ex) {
          if (ex.kind === 'note' && ex.notebookId === notebookId) return;
          throw new ApiError('conflict', 'document exists');
        }
        await tx.insert(docs).values({ id: noteId, userId: principal.userId, kind: 'note', notebookId });
      },
      async readAttachment(attachmentId) {
        const [a] = await tx.select().from(attachments).where(eq(attachments.id, attachmentId));
        if (!a || !(await getDoc(a.noteId))) throw notFound('attachment not found');
        const chunks = await tx
          .select()
          .from(attachmentChunks)
          .where(eq(attachmentChunks.attachmentId, a.id))
          .orderBy(asc(attachmentChunks.index));
        if (chunks.length !== a.chunkCount) throw notFound('attachment upload is incomplete');
        const key = await docKey(a.noteId);
        const parts: Uint8Array[] = [];
        for (const c of chunks) {
          const blob = await ctx.storage.get(chunkKey(a.id, c.index));
          if (!blob) throw notFound('attachment chunk missing');
          parts.push(await open(key, blob, AD.attachment(a.id, c.index, c.index === a.chunkCount - 1)));
        }
        return { noteId: a.noteId, mime: a.mime, data: Buffer.concat(parts) };
      },
      async writeAttachment({ attachmentId, noteId, mime, data }) {
        requireWrite();
        await mustDoc(noteId);
        const key = await docKey(noteId);
        const count = Math.max(1, Math.ceil(data.length / CHUNK_PLAINTEXT));
        const sealed: Uint8Array[] = [];
        for (let i = 0; i < count; i++) {
          const part = data.subarray(i * CHUNK_PLAINTEXT, (i + 1) * CHUNK_PLAINTEXT);
          sealed.push(await seal(key, part, AD.attachment(attachmentId, i, i === count - 1)));
        }
        const size = sealed.reduce((n, s) => n + s.length, 0);
        if (size > ctx.config.ATTACHMENT_MAX_BYTES) throw new ApiError('payload_too_large', 'attachment too large');
        for (let i = 0; i < count; i++) await ctx.storage.put(chunkKey(attachmentId, i), sealed[i]!);
        await tx.insert(attachments).values({
          id: attachmentId,
          userId: principal.userId,
          noteId,
          size,
          chunkCount: count,
          mime,
          completedAt: new Date(),
        });
        await tx
          .insert(attachmentChunks)
          .values(sealed.map((s, index) => ({ attachmentId, index, size: s.length })));
      },
      async audit(action, entry = {}) {
        await ctx.audit.record(tx, {
          tokenId: principal.tokenId,
          userId: principal.userId,
          action,
          notebookId: entry.notebookId ?? null,
          docId: entry.docId ?? null,
          ok: entry.ok ?? true,
          details: entry.details ?? null,
        });
      },
    };
    return scope;
  }

  return {
    authenticate,
    async withScope(principal, fn) {
      const afterCommit: (() => Promise<void> | void)[] = [];
      const result = await withAgentScope(db, principal.tokenId, (tx) => fn(makeScope(tx, principal, afterCommit)));
      for (const cb of afterCommit) {
        try {
          await cb();
        } catch (err) {
          ctx.log.error({ err }, 'agent after-commit hook failed');
        }
      }
      return result;
    },
  };
}

export function createPluginHost(ctx: AppContext): PluginHost {
  return {
    apiVersion: 1,
    log: ctx.log,
    config: { publicUrl: ctx.config.PUBLIC_URL, nodeEnv: ctx.config.NODE_ENV },
    db: ctx.database.db,
    pool: ctx.database.pool,
    jobs: ctx.jobs,
    agents: createAgentHost(ctx),
    crypto: {
      seal,
      open,
      async randomKey() {
        return (await getSodium()).randombytes_buf(32);
      },
      ad: { doc: AD.doc, note: AD.note, attachment: AD.attachment },
    },
  };
}
