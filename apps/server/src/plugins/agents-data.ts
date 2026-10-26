import { and, asc, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import * as Y from 'yjs';
import type { AppContext } from '../context.js';
import { withAgentScope, type Tx } from '../db/client.js';
import { attachmentChunks, attachments, docSnapshots, docUpdates, docs, notebooks } from '../db/schema.js';
import { COMPACT_JOB } from '../jobs/index.js';
import { fromB64, toB64 } from '../lib/encoding.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import { AD, getSodium, open, seal } from '../lib/sodium.js';
import { chunkKey } from '../storage/index.js';
import { topics } from '../sync/hub.js';
import type { AgentDataSource, AgentEditOrigin, AgentNotebook } from './agents-context.js';

/** Server-side snapshot of agent-mode documents (the server holds the key there). */
const SNAPSHOT_AFTER_UPDATES = 500;
const SNAPSHOT_AFTER_BYTES = 1024 * 1024;
const KEY_CACHE_MAX = 10_000;

function readWrappedKey(meta: unknown): string | null {
  const v = meta instanceof Y.Map ? meta.get('wrappedKey') : (meta as { wrappedKey?: unknown } | null)?.wrappedKey;
  return typeof v === 'string' ? v : null;
}

/** A small bounded map: oldest entries are evicted first. */
class BoundedMap<K, V> extends Map<K, V> {
  override set(k: K, v: V) {
    if (!this.has(k) && this.size >= KEY_CACHE_MAX) this.delete(this.keys().next().value as K);
    return super.set(k, v);
  }
}

/**
 * Decrypted access to agent-mode notebooks for @datascratch/agents.
 * Every call runs inside a Row-Level-Security scope (D-30): the user's
 * agent-mode notebooks, narrowed to the grant's notebooks when `grantId` is given.
 * Keys: notebookKey = open(DS_KMS_KEY), noteKey = open(notebookKey, NoteMeta.wrappedKey) (crypto.md §1, §8).
 */
export class PgAgentDataSource implements AgentDataSource {
  /** noteId → noteKey; keys never change for a document. Access is re-checked by RLS on every call. */
  readonly #noteKeys = new BoundedMap<string, Uint8Array>();

  constructor(private readonly ctx: AppContext) {}

  #scope<T>(userId: string, grantId: string | undefined, fn: (tx: Tx, after: (() => unknown)[]) => Promise<T>) {
    const after: (() => unknown)[] = [];
    return withAgentScope(this.ctx.database.db, { userId, grantId }, (tx) => fn(tx, after)).then(async (r) => {
      for (const cb of after) {
        try {
          await cb();
        } catch (err) {
          this.ctx.log.error({ err }, 'agent after-commit hook failed');
        }
      }
      return r;
    });
  }

  async #notebookKey(tx: Tx, notebookId: string): Promise<Uint8Array> {
    const key = await this.ctx.keys.notebookKey(tx, notebookId);
    if (!key) throw notFound('notebook not found');
    return key;
  }

  /**
   * Decrypted state of a document. Every stored item is opened and applied on
   * its own: an update that cannot be decrypted or applied (wrong key, wrong
   * AD, corrupt or foreign encoding) is skipped and logged with docId, seq and
   * deviceId, and the rest of the document still loads — one bad write must
   * never hide a whole notebook or note from agents.
   */
  async #state(
    tx: Tx,
    docId: string,
    key: Uint8Array,
  ): Promise<{ doc: Y.Doc; seq: number; skipped: { seq: number; deviceId: string | null; reason: string }[] }> {
    const [snap] = await tx
      .select({ seq: docSnapshots.seq, payload: docSnapshots.payload, deviceId: docSnapshots.deviceId })
      .from(docSnapshots)
      .where(eq(docSnapshots.docId, docId))
      .orderBy(desc(docSnapshots.seq))
      .limit(1);
    const from = snap?.seq ?? 0;
    const rows = await tx
      .select({ seq: docUpdates.seq, payload: docUpdates.payload, deviceId: docUpdates.deviceId })
      .from(docUpdates)
      .where(and(eq(docUpdates.docId, docId), gt(docUpdates.seq, from)))
      .orderBy(asc(docUpdates.seq));
    const doc = new Y.Doc({ gc: false });
    const ad = AD.doc(docId);
    const skipped: { seq: number; deviceId: string | null; reason: string }[] = [];
    const applyOne = async (item: { seq: number; payload: Uint8Array; deviceId: string }, kind: 'snapshot' | 'update') => {
      let plain: Uint8Array;
      try {
        plain = await open(key, item.payload, ad);
      } catch (err) {
        skipped.push({ seq: item.seq, deviceId: item.deviceId, reason: 'decrypt' });
        this.ctx.log.warn(
          { err, docId, seq: item.seq, deviceId: item.deviceId, kind },
          'agent: skipped a document item that could not be decrypted (wrong key or AD?)',
        );
        return;
      }
      try {
        Y.applyUpdate(doc, plain);
      } catch (err) {
        skipped.push({ seq: item.seq, deviceId: item.deviceId, reason: 'apply' });
        this.ctx.log.warn(
          { err, docId, seq: item.seq, deviceId: item.deviceId, kind, bytes: plain.byteLength },
          'agent: skipped a document item that is not a valid Yjs v1 update',
        );
      }
    };
    if (snap) await applyOne(snap, 'snapshot');
    for (const r of rows) await applyOne(r, 'update');
    return { doc, seq: rows.length ? rows[rows.length - 1]!.seq : from, skipped };
  }

  /** The doc row (visible under RLS) and the key that encrypts it. */
  async #docAndKey(tx: Tx, docId: string) {
    const [d] = await tx.select().from(docs).where(eq(docs.id, docId));
    if (!d || !d.notebookId || d.kind === 'account') return null;
    const nbKey = await this.#notebookKey(tx, d.notebookId);
    if (d.kind === 'notebook') return { doc: d, key: nbKey };
    let key = this.#noteKeys.get(docId);
    if (!key) {
      const { doc: index } = await this.#state(tx, d.notebookId, nbKey);
      const wrapped = readWrappedKey(index.getMap('notes').get(docId));
      index.destroy();
      if (!wrapped) return null;
      key = await this.ctx.keys.noteKey(nbKey, docId, fromB64(wrapped));
      this.#noteKeys.set(docId, key);
    }
    return { doc: d, key };
  }

  /** Explicit write check (clear error); RLS would reject the write anyway. */
  async #requireWritable(tx: Tx, docId: string) {
    const r = await tx.execute<{ ok: boolean }>(sql`SELECT ds_agent_doc_allowed(${docId}::uuid, true) AS ok`);
    if (!r.rows[0]?.ok) throw forbidden('the grant does not allow writing to this notebook');
  }

  async listAgentNotebooks(userId: string, grantId?: string): Promise<AgentNotebook[]> {
    return this.#scope(userId, grantId, async (tx) => {
      const rows = await tx
        .select({ id: notebooks.id, createdAt: notebooks.createdAt })
        .from(notebooks)
        .orderBy(asc(notebooks.createdAt));
      // Names live in the account document (masterKey) — the server cannot read them.
      return rows.map((r) => ({ id: r.id, name: null, icon: null, space: null, createdAt: r.createdAt.toISOString() }));
    });
  }

  async loadDoc(userId: string, docId: string, grantId?: string) {
    return this.#scope(userId, grantId, async (tx) => {
      const dk = await this.#docAndKey(tx, docId);
      if (!dk) return null;
      try {
        const state = await this.#state(tx, docId, dk.key);
        return state.skipped.length ? state : { doc: state.doc, seq: state.seq };
      } catch (err) {
        this.ctx.log.warn({ err, docId }, 'agent: document could not be loaded');
        return null;
      }
    });
  }

  async docSeqs(userId: string, docIds: string[], grantId?: string) {
    if (docIds.length === 0) return {};
    return this.#scope(userId, grantId, async (tx) => {
      const rows = await tx
        .select({ id: docs.id, seq: docs.lastSeq })
        .from(docs)
        .where(inArray(docs.id, docIds));
      return Object.fromEntries(rows.map((r) => [r.id, r.seq]));
    });
  }

  async applyUpdate(userId: string, docId: string, update: Uint8Array, origin: AgentEditOrigin) {
    if (origin.userId !== userId) throw forbidden('origin does not match user');
    return this.#scope(userId, origin.grantId, async (tx, after) => {
      const dk = await this.#docAndKey(tx, docId);
      if (!dk) throw notFound('document not found');
      await this.#requireWritable(tx, docId);
      return this.#append(tx, after, docId, dk.key, update, origin);
    });
  }

  /** Encrypts and stores one update, broadcasts it after commit, snapshots when due. */
  async #append(tx: Tx, after: (() => unknown)[], docId: string, key: Uint8Array, update: Uint8Array, origin: AgentEditOrigin) {
    const deviceId = `agent:${origin.grantId}`;
    const payload = await seal(key, update, AD.doc(docId));
    // RLS rejects the insert when the grant is read-only.
    const r = await this.ctx.documents.append(tx, { docId, payload, deviceId });
    after.push(() => this.ctx.documents.publishUpdate(docId, r.seq, payload, deviceId, null));
    this.ctx.metrics.syncUpdates.inc({ source: 'agent' });
    if (r.updatesSinceSnapshot >= SNAPSHOT_AFTER_UPDATES || r.bytesSinceSnapshot >= SNAPSHOT_AFTER_BYTES) {
      const { doc, seq, skipped } = await this.#state(tx, docId, key);
      if (skipped.length > 0) {
        // A snapshot would let compaction delete the unreadable updates for good: leave them for a client to fix.
        doc.destroy();
        this.ctx.log.warn({ docId, skipped }, 'agent: no server snapshot while the document has unreadable updates');
        return { seq: r.seq };
      }
      const state = Y.encodeStateAsUpdate(doc);
      doc.destroy();
      await this.ctx.documents.storeSnapshot(tx, {
        docId,
        baseSeq: seq,
        payload: await seal(key, state, AD.doc(docId)),
        deviceId,
      });
      after.push(() => this.ctx.jobs.enqueue(COMPACT_JOB, { docId }, { singletonKey: docId, startAfterSec: 30 }));
    }
    return { seq: r.seq };
  }

  /**
   * Moves a note to another agent-mode notebook in one transaction: the note
   * key is re-wrapped with the target notebook key (key, history and
   * attachments stay), both index updates are stored and the document's
   * notebook changes — as `PATCH /v1/docs/:id` plus the client-side index
   * edits do for the apps (shared `moveNoteToNotebook`).
   */
  async moveNoteDoc(userId: string, move: Parameters<NonNullable<AgentDataSource['moveNoteDoc']>>[1]) {
    const { noteId, fromNotebookId, toNotebookId, origin } = move;
    if (origin.userId !== userId) throw forbidden('origin does not match user');
    return this.#scope(userId, origin.grantId, async (tx, after) => {
      const note = await this.#docAndKey(tx, noteId);
      if (!note || note.doc.kind !== 'note' || note.doc.notebookId !== fromNotebookId) throw notFound('note not found');
      const from = await this.#docAndKey(tx, fromNotebookId);
      const to = await this.#docAndKey(tx, toNotebookId);
      if (!from || !to || to.doc.kind !== 'notebook') throw notFound('notebook not found');
      for (const id of [noteId, fromNotebookId, toNotebookId]) await this.#requireWritable(tx, id);
      const wrapped = await seal(to.key, note.key, AD.note(noteId));
      const updates = move.indexUpdates(toB64(wrapped));
      // Target first: if anything below fails the transaction rolls back and nothing moved.
      const toSeq = (await this.#append(tx, after, toNotebookId, to.key, updates.to, origin)).seq;
      // RLS (agent_update on docs) allows this only between notebooks the grant may write.
      await tx.update(docs).set({ notebookId: toNotebookId, updatedAt: sql`now()` }).where(eq(docs.id, noteId));
      const fromSeq = (await this.#append(tx, after, fromNotebookId, from.key, updates.from, origin)).seq;
      after.push(() => this.ctx.hub.publish(topics.doc(noteId), { type: 'doc_moved', docId: noteId }));
      return { fromSeq, toSeq };
    });
  }

  async createNoteDoc(userId: string, notebookId: string, noteId: string, grantId?: string) {
    return this.#scope(userId, grantId, async (tx) => {
      const nbKey = await this.#notebookKey(tx, notebookId);
      const [existing] = await tx.select({ id: docs.id }).from(docs).where(eq(docs.id, noteId));
      if (existing) throw new ApiError('conflict', 'document exists');
      const w = await tx.execute<{ ok: boolean }>(
        sql`SELECT ${notebookId}::uuid IN (SELECT ds_agent_notebooks(true)) AS ok`,
      );
      if (!w.rows[0]?.ok) throw forbidden('the grant does not allow writing to this notebook');
      // RLS enforces the same on the insert itself.
      await tx.insert(docs).values({ id: noteId, userId, kind: 'note', notebookId });
      const noteKey = (await getSodium()).randombytes_buf(32);
      const wrapped = await seal(nbKey, noteKey, AD.note(noteId));
      this.#noteKeys.set(noteId, noteKey);
      return { wrappedKey: toB64(wrapped) };
    });
  }

  async loadAttachmentImage(userId: string, attachmentId: string, grantId?: string) {
    return this.#scope(userId, grantId, async (tx) => {
      const [a] = await tx.select().from(attachments).where(eq(attachments.id, attachmentId));
      if (!a || !a.mime.startsWith('image/')) return null;
      const dk = await this.#docAndKey(tx, a.noteId);
      if (!dk) return null;
      const chunks = await tx
        .select()
        .from(attachmentChunks)
        .where(eq(attachmentChunks.attachmentId, a.id))
        .orderBy(asc(attachmentChunks.index));
      if (chunks.length !== a.chunkCount) return null;
      const parts: Uint8Array[] = [];
      for (const c of chunks) {
        const blob = await this.ctx.storage.get(chunkKey(a.id, c.index));
        if (!blob) return null;
        parts.push(await open(dk.key, blob, AD.attachment(a.id, c.index, c.index === a.chunkCount - 1)));
      }
      return Buffer.concat(parts);
    });
  }
}
