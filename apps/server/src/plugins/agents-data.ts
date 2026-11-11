import { and, asc, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import * as Y from 'yjs';
import type { AppContext } from '../context.js';
import { withAgentScope, type Tx } from '../db/client.js';
import { attachmentChunks, attachments, docSnapshots, docUpdates, docs, members, notebooks, users } from '../db/schema.js';
import { COMPACT_JOB } from '../jobs/index.js';
import { toB64 } from '../lib/encoding.js';
import { ApiError, forbidden, notFound } from '../lib/errors.js';
import { AD, getSodium, open, seal } from '../lib/sodium.js';
import { chunkKey } from '../storage/index.js';
import { topics } from '../sync/hub.js';
import { unwrapKeyChain } from '@datascratch/shared/crypto';
import { noteKeysFromMeta } from '@datascratch/shared/sharing';
import { noteKeyCache, type DocKeys } from './agent-key-cache.js';
import type { AgentDataSource, AgentEditOrigin, AgentNotebook } from './agents-context.js';

/** Server-side snapshot of agent-mode documents (the server holds the key there). */
const SNAPSHOT_AFTER_UPDATES = 500;
const SNAPSHOT_AFTER_BYTES = 1024 * 1024;

/** The key fields of a NoteMeta in the notebook index (crypto.md §10.3: version and older keys). */
function readKeyFields(meta: unknown): { wrappedKey: string; keyVersion?: number; keyChain?: string[] } | null {
  const m = (meta instanceof Y.Map ? meta.toJSON() : meta) as { wrappedKey?: unknown; keyVersion?: unknown; keyChain?: unknown } | null;
  if (!m || typeof m.wrappedKey !== 'string') return null;
  return {
    wrappedKey: m.wrappedKey,
    ...(typeof m.keyVersion === 'number' ? { keyVersion: m.keyVersion } : {}),
    ...(Array.isArray(m.keyChain) && m.keyChain.every((k) => typeof k === 'string') ? { keyChain: m.keyChain as string[] } : {}),
  };
}

/**
 * Decrypted access to agent-mode notebooks for @datascratch/agents.
 * Every call runs inside a Row-Level-Security scope (D-30): the user's agent-mode notebooks
 * and the agent-mode notebooks shared with the user (D-54: an editor writes, a viewer reads),
 * narrowed to the grant's notebooks when `grantId` is given.
 * Keys: notebookKey = open(DS_KMS_KEY), noteKey = open(notebookKey, NoteMeta.wrappedKey) (crypto.md §1, §8).
 * After a key rotation (crypto.md §10.3) older keys come from the key chains: items written
 * before it open with them; everything new is sealed with the newest key.
 */
export class PgAgentDataSource implements AgentDataSource {
  constructor(private readonly ctx: AppContext) {}

  #scope<T>(userId: string, grantId: string | undefined, fn: (tx: Tx, after: (() => unknown)[]) => Promise<T>) {
    const after: (() => unknown)[] = [];
    // Change-log positions of the updates written inside stay in flight until this commits.
    return this.ctx.changes.scope(() => withAgentScope(this.ctx.database.db, { userId, grantId }, (tx) => fn(tx, after))).then(async (r) => {
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

  /** The notebook's keys, newest first (the server holds the current one; the chain gives the older). */
  async #notebookKeys(tx: Tx, notebookId: string): Promise<DocKeys> {
    const key = await this.ctx.keys.notebookKey(tx, notebookId);
    if (!key) throw notFound('notebook not found');
    const [nb] = await tx
      .select({ version: notebooks.keyVersion, chain: notebooks.keyChain })
      .from(notebooks)
      .where(eq(notebooks.id, notebookId));
    const version = nb?.version ?? 1;
    await getSodium();
    try {
      return { version, keys: unwrapKeyChain(key, version, nb?.chain ?? [], 'notebook', notebookId) };
    } catch (err) {
      this.ctx.log.warn({ err, notebookId }, 'agent: the notebook key chain could not be opened; using the current key only');
      return { version, keys: [key] };
    }
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
    keys: Uint8Array[],
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
      let plain: Uint8Array | null = null;
      let failure: unknown;
      // Newest key first; an item from before a rotation opens with an older one.
      for (const key of keys) {
        try {
          plain = await open(key, item.payload, ad);
          break;
        } catch (err) {
          failure = err;
        }
      }
      if (!plain) {
        const err = failure;
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

  /** The doc row (visible under RLS) and the keys that encrypt it, newest first. */
  async #docAndKey(tx: Tx, docId: string): Promise<{ doc: typeof docs.$inferSelect; key: DocKeys } | null> {
    const [d] = await tx.select().from(docs).where(eq(docs.id, docId));
    if (!d || !d.notebookId || d.kind === 'account') return null;
    const nbKeys = await this.#notebookKeys(tx, d.notebookId);
    if (d.kind === 'notebook') return { doc: d, key: nbKeys };
    let key = noteKeyCache.get(docId);
    if (!key) {
      const { doc: index } = await this.#state(tx, d.notebookId, nbKeys.keys);
      const fields = readKeyFields(index.getMap('notes').get(docId));
      index.destroy();
      if (!fields) return null;
      await getSodium();
      try {
        const found = noteKeysFromMeta({ id: docId, ...fields }, nbKeys.keys);
        key = { version: found.version, keys: found.keys };
      } catch (err) {
        this.ctx.log.warn({ err, docId }, 'agent: no notebook key opens the note key');
        return null;
      }
      noteKeyCache.set(docId, d.notebookId, key);
    }
    return { doc: d, key };
  }

  /** Explicit write check (clear error); RLS would reject the write anyway. */
  async #requireWritable(tx: Tx, docId: string) {
    const r = await tx.execute<{ ok: boolean }>(sql`SELECT ds_agent_doc_allowed(${docId}::uuid, true) AS ok`);
    if (!r.rows[0]?.ok) throw forbidden('the grant does not allow writing to this notebook');
  }

  async listAgentNotebooks(userId: string, grantId?: string): Promise<AgentNotebook[]> {
    const rows = await this.#scope(userId, grantId, (tx) =>
      tx
        .select({ id: notebooks.id, ownerId: notebooks.userId, createdAt: notebooks.createdAt })
        .from(notebooks)
        .orderBy(asc(notebooks.createdAt)),
    );
    // Notebooks of another account visible through a membership (D-54): who shares it and the
    // member's role (outside the agent scope: the agent role cannot read members or users).
    const foreign = rows.filter((r) => r.ownerId !== userId).map((r) => r.id);
    const shared = new Map<string, { ownerUserId: string; ownerEmail: string | null; role: 'editor' | 'viewer' }>();
    if (foreign.length > 0) {
      const ms = await this.ctx.database.db
        .select({ notebookId: members.notebookId, ownerUserId: members.ownerId, ownerEmail: users.email, role: members.role })
        .from(members)
        .innerJoin(users, eq(users.id, members.ownerId))
        .where(and(eq(members.userId, userId), inArray(members.notebookId, foreign)));
      for (const m of ms) shared.set(m.notebookId!, { ownerUserId: m.ownerUserId, ownerEmail: m.ownerEmail, role: m.role });
      // Notebooks of a shared space the user is a member of (D-62): the member's role on the space.
      const inSpaces = await this.ctx.database.db
        .select({ notebookId: notebooks.id, ownerUserId: members.ownerId, ownerEmail: users.email, role: members.role })
        .from(notebooks)
        .innerJoin(members, and(eq(members.spaceId, notebooks.spaceId), eq(members.userId, userId)))
        .innerJoin(users, eq(users.id, members.ownerId))
        .where(inArray(notebooks.id, foreign));
      for (const m of inSpaces) {
        if (!shared.has(m.notebookId)) shared.set(m.notebookId, { ownerUserId: m.ownerUserId, ownerEmail: m.ownerEmail, role: m.role });
      }
    }
    // Names live in the account document (masterKey) — the server cannot read them.
    return rows.map((r) => ({
      id: r.id,
      name: null,
      icon: null,
      space: null,
      createdAt: r.createdAt.toISOString(),
      shared: shared.get(r.id) ?? null,
    }));
  }

  async loadDoc(userId: string, docId: string, grantId?: string) {
    return this.#scope(userId, grantId, async (tx) => {
      const dk = await this.#docAndKey(tx, docId);
      if (!dk) return null;
      try {
        const state = await this.#state(tx, docId, dk.key.keys);
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
  async #append(tx: Tx, after: (() => unknown)[], docId: string, keys: DocKeys, update: Uint8Array, origin: AgentEditOrigin) {
    const deviceId = `agent:${origin.grantId}`;
    const key = keys.keys[0]!;
    const payload = await seal(key, update, AD.doc(docId));
    // RLS rejects the insert when the grant is read-only.
    const author = { kind: 'agent', tokenId: origin.grantId } as const;
    const r = await this.ctx.documents.append(tx, { docId, payload, deviceId, author });
    after.push(() => this.ctx.documents.publishUpdate(docId, r.seq, payload, deviceId, author, null));
    this.ctx.metrics.syncUpdates.inc({ source: 'agent' });
    if (r.updatesSinceSnapshot >= SNAPSHOT_AFTER_UPDATES || r.bytesSinceSnapshot >= SNAPSHOT_AFTER_BYTES) {
      const { doc, seq, skipped } = await this.#state(tx, docId, keys.keys);
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
      // Out of a notebook shared with the user (D-54) is the owner's move only; RLS refuses it too.
      if (to.doc.userId !== note.doc.userId) throw forbidden('a note leaves a shared notebook only by its owner');
      for (const id of [noteId, fromNotebookId, toNotebookId]) await this.#requireWritable(tx, id);
      // The note keeps its key version and older keys (NoteMeta keyChain): only its wrap changes.
      const wrapped = await seal(to.key.keys[0]!, note.key.keys[0]!, AD.noteVersion(noteId, note.key.version));
      const updates = move.indexUpdates(toB64(wrapped));
      // Target first: if anything below fails the transaction rolls back and nothing moved.
      const toSeq = (await this.#append(tx, after, toNotebookId, to.key, updates.to, origin)).seq;
      // RLS (agent_update on docs) allows this only between notebooks the grant may write.
      await tx.update(docs).set({ notebookId: toNotebookId, updatedAt: sql`now()` }).where(eq(docs.id, noteId));
      const fromSeq = (await this.#append(tx, after, fromNotebookId, from.key, updates.from, origin)).seq;
      after.push(() => this.ctx.hub.publish(topics.doc(noteId), { type: 'doc_moved', docId: noteId }));
      after.push(() => noteKeyCache.set(noteId, toNotebookId, note.key));
      return { fromSeq, toSeq };
    });
  }

  async createNoteDoc(userId: string, notebookId: string, noteId: string, grantId?: string) {
    return this.#scope(userId, grantId, async (tx) => {
      const nbKey = (await this.#notebookKeys(tx, notebookId)).keys[0]!;
      const [existing] = await tx.select({ id: docs.id }).from(docs).where(eq(docs.id, noteId));
      if (existing) throw new ApiError('conflict', 'document exists');
      const w = await tx.execute<{ ok: boolean }>(
        sql`SELECT ${notebookId}::uuid IN (SELECT ds_agent_notebooks(true)) AS ok`,
      );
      if (!w.rows[0]?.ok) throw forbidden('the grant does not allow writing to this notebook');
      // A note in a notebook shared with the user belongs to the notebook's owner (D-54, quota too).
      const [nb] = await tx.select({ ownerId: notebooks.userId }).from(notebooks).where(eq(notebooks.id, notebookId));
      if (!nb) throw notFound('notebook not found');
      // RLS enforces the same on the insert itself.
      await tx.insert(docs).values({ id: noteId, userId: nb.ownerId, kind: 'note', notebookId });
      const noteKey = (await getSodium()).randombytes_buf(32);
      const wrapped = await seal(nbKey, noteKey, AD.note(noteId));
      noteKeyCache.set(noteId, notebookId, { version: 1, keys: [noteKey] });
      return { wrappedKey: toB64(wrapped) };
    });
  }

  /**
   * An image attachment, decrypted, for rendering to an agent. Access is checked inside the
   * agent's RLS scope; the blobs are read and decrypted after it (not holding a pooled
   * connection), and only up to AGENT_IMAGE_MAX_BYTES.
   */
  async loadAttachmentImage(userId: string, attachmentId: string, grantId?: string) {
    const found = await this.#scope(userId, grantId, async (tx) => {
      const [a] = await tx.select().from(attachments).where(eq(attachments.id, attachmentId));
      if (!a || !a.mime.startsWith('image/')) return null;
      if (a.size > this.ctx.config.AGENT_IMAGE_MAX_BYTES) return null;
      const dk = await this.#docAndKey(tx, a.noteId);
      if (!dk) return null;
      const chunks = await tx
        .select({ index: attachmentChunks.index })
        .from(attachmentChunks)
        .where(eq(attachmentChunks.attachmentId, a.id))
        .orderBy(asc(attachmentChunks.index));
      if (chunks.length !== a.chunkCount) return null;
      return { a, keys: dk.key.keys };
    });
    if (!found) return null;
    const { a, keys } = found;
    const parts: Uint8Array[] = [];
    let total = 0;
    // An attachment is sealed with the note key of its upload: maybe one from before a rotation.
    let key: Uint8Array | null = null;
    for (let index = 0; index < a.chunkCount; index++) {
      const blob = await this.ctx.storage.get(chunkKey(a.id, index));
      if (!blob) return null;
      total += blob.length;
      if (total > this.ctx.config.AGENT_IMAGE_MAX_BYTES + a.chunkCount * 64) return null;
      const ad = AD.attachment(a.id, index, index === a.chunkCount - 1);
      if (!key) {
        for (const k of keys) {
          try {
            parts.push(await open(k, blob, ad));
            key = k;
            break;
          } catch {
            // try an older key
          }
        }
        if (!key) return null;
      } else parts.push(await open(key, blob, ad));
    }
    return Buffer.concat(parts);
  }
}
