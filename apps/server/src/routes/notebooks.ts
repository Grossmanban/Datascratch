import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { agentGrants, docSnapshots, docUpdates, docs, members, notebooks, shares, spaces, users } from '../db/schema.js';
import { fromB64, safeEqual, toB64 } from '../lib/encoding.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { docAccess } from '../services/access.js';
import type { UserPrincipal } from '../services/principal.js';
import { accountChanged } from '../services/account-events.js';
import { memberOf } from '../services/sharing.js';
import { sharedNotebookIds } from './sharing.js';
import { authorSchema, notebookKeyResponseSchema, type AccountChangedWhat } from '@datascratch/shared/contracts';
import { AD, open } from '../lib/sodium.js';
import { noteKeyCache } from '../plugins/agent-key-cache.js';
import { topics } from '../sync/hub.js';
import { publicAuthor } from '../lib/author.js';
import { CLEANUP_JOB } from '../jobs/index.js';
import { Key32, WrappedKey, errorResponses, id } from './schemas.js';

const Mode = z.enum(['private', 'agent']);
const Notebook = z
  .object({
    id: id(),
    mode: Mode,
    createdAt: z.string(),
    wrappedKey: z.string(),
    shared: z.boolean().optional(),
    /** The shared space it is in (D-62); null in the personal space. */
    spaceId: id().nullable(),
  })
  .meta({ id: 'Notebook' });
const DocKind = z.enum(['account', 'notebook', 'note', 'space']);

type NotebookRow = typeof notebooks.$inferSelect;
const dto = (n: NotebookRow) => ({
  id: n.id,
  mode: n.mode,
  createdAt: n.createdAt.toISOString(),
  wrappedKey: toB64(n.wrappedKey),
  spaceId: n.spaceId,
});

/** Revoke shares pointing at the given targets and disconnect their guests. */
async function revokeSharesFor(ctx: AppContext, db: DbOrTx, userId: string, targetIds: string[]) {
  if (targetIds.length === 0) return;
  const gone = await db
    .delete(shares)
    .where(and(eq(shares.userId, userId), inArray(shares.targetId, targetIds)))
    .returning({ id: shares.id });
  for (const s of gone) ctx.hub.publish(topics.share(s.id), { type: 'revoked', reason: 'shared item deleted' });
}

export function notebookRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];

    async function ownNotebook(userId: string, notebookId: string) {
      const [nb] = await db
        .select()
        .from(notebooks)
        .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)));
      if (!nb) {
        // Members of a shared notebook or space see it, but only its owner manages it (D-54, D-62).
        if (await notebookMember(userId, notebookId)) throw forbidden('only the owner can do this');
        throw notFound('notebook not found');
      }
      return nb;
    }

    /**
     * Open sync connections of a space's members re-check access (a notebook came or went, D-62);
     * the owner's and members' devices hear what to re-read.
     */
    async function notifySpaceMembers(spaceId: string, what: AccountChangedWhat[] = ['notebooks']) {
      const ms = await db.select({ userId: members.userId }).from(members).where(eq(members.spaceId, spaceId));
      for (const m of ms) ctx.hub.publish(topics.user(m.userId), { type: 'access_changed' });
      const [sp] = await db.select({ userId: spaces.userId }).from(spaces).where(eq(spaces.id, spaceId));
      accountChanged(ctx, [sp?.userId, ...ms.map((m) => m.userId)], what);
    }

    /** The membership that opens somebody else's notebook: its own (D-54) or its shared space's (D-62). */
    async function notebookMember(userId: string, notebookId: string) {
      const direct = await memberOf(db, { kind: 'notebook', id: notebookId }, userId);
      if (direct) return direct;
      const [nb] = await db.select({ spaceId: notebooks.spaceId }).from(notebooks).where(eq(notebooks.id, notebookId));
      return nb?.spaceId ? memberOf(db, { kind: 'space', id: nb.spaceId }, userId) : null;
    }

    /** A document the caller may read; `owner` tells owner-only actions apart (D-54). */
    async function visibleDoc(p: UserPrincipal, docId: string) {
      const a = await docAccess(db, p, docId);
      if (!a) throw notFound('document not found');
      return a;
    }

    /**
     * How many of the notebook document's latest stored items (snapshot + up to
     * 50 updates) a candidate notebook key opens. A key that opens none of them
     * is not this notebook's key (e.g. a device holding a different key).
     */
    async function keyFits(notebookId: string, key: Uint8Array): Promise<{ checked: number; readable: number }> {
      const [snap] = await db
        .select({ payload: docSnapshots.payload })
        .from(docSnapshots)
        .where(eq(docSnapshots.docId, notebookId))
        .orderBy(desc(docSnapshots.seq))
        .limit(1);
      const rows = await db
        .select({ payload: docUpdates.payload })
        .from(docUpdates)
        .where(eq(docUpdates.docId, notebookId))
        .orderBy(desc(docUpdates.seq))
        .limit(50);
      const items = [...(snap ? [snap.payload] : []), ...rows.map((r) => r.payload)];
      let readable = 0;
      for (const payload of items) {
        try {
          await open(key, payload, AD.doc(notebookId));
          readable++;
        } catch {
          // not sealed with this key
        }
      }
      return { checked: items.length, readable };
    }

    const fingerprint = (key: Uint8Array) => createHash('sha256').update(key).digest('hex').slice(0, 8);

    app.post(
      '/notebooks',
      {
        schema: {
          tags: ['notebooks'],
          security,
          body: z.object({
            notebookId: id(),
            mode: Mode,
            wrappedKey: WrappedKey,
            notebookKey: Key32.optional(),
            /** A notebook of a shared space (D-62): wrappedKey is then under the space key. */
            spaceId: id().nullable().optional(),
            /** The space key version that wrapped it; required with spaceId (409 when not current). */
            spaceKeyVersion: z.number().int().positive().optional(),
          }),
          response: { 200: Notebook, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        if (b.mode === 'agent' && !b.notebookKey) throw badRequest('notebookKey is required for mode=agent');
        if (b.mode === 'private' && b.notebookKey) throw badRequest('notebookKey must not be sent for mode=private');
        const wrappedKey = fromB64(b.wrappedKey);
        const serverWrappedKey = b.notebookKey
          ? Buffer.from(await ctx.keys.wrapNotebookKey(b.notebookId, fromB64(b.notebookKey)))
          : null;
        const spaceId = b.spaceId ?? null;
        if (spaceId && b.spaceKeyVersion === undefined) throw badRequest('spaceKeyVersion is required with spaceId');
        // In a shared space the owner or an editor creates it; it belongs to the space's owner (quota too).
        let ownerId = p.userId;
        if (spaceId) {
          const [sp] = await db.select({ userId: spaces.userId }).from(spaces).where(eq(spaces.id, spaceId));
          if (!sp) throw notFound('space not found');
          if (sp.userId !== p.userId) {
            const m = await memberOf(db, { kind: 'space', id: spaceId }, p.userId);
            if (!m || (m.accountCreatedAfterInvite && !m.wrappedKey)) throw notFound('space not found');
            if (m.role !== 'editor') throw forbidden('read-only access');
            ownerId = sp.userId;
          }
          // Agent mode is the owner's to switch on (api.md).
          if (b.mode === 'agent' && ownerId !== p.userId) throw forbidden('only the owner turns on agent mode');
        }
        const created = await db.transaction(async (tx) => {
          // Not while the space's key changes (its rotation names every notebook of the space), and
          // only under the current space key: one wrapped by the old key would be lost (api.md).
          if (spaceId) {
            const [sp] = await tx.select({ keyVersion: spaces.keyVersion }).from(spaces).where(eq(spaces.id, spaceId)).for('share');
            if (b.spaceKeyVersion !== sp!.keyVersion) throw conflict('space key version is not current');
          }
          const [row] = await tx
            .insert(notebooks)
            .values({ id: b.notebookId, userId: ownerId, spaceId, mode: b.mode, wrappedKey, serverWrappedKey })
            .onConflictDoNothing()
            .returning();
          if (!row) {
            const [ex] = await tx.select().from(notebooks).where(eq(notebooks.id, b.notebookId));
            const same =
              ex && ex.userId === ownerId && ex.spaceId === spaceId && ex.mode === b.mode && safeEqual(ex.wrappedKey, wrappedKey);
            if (same) return { row: ex, fresh: false };
            throw conflict('notebook exists');
          }
          // The notebook index document shares the notebook id (document-model.md §1).
          await tx
            .insert(docs)
            .values({ id: b.notebookId, userId: ownerId, kind: 'notebook', notebookId: b.notebookId })
            .onConflictDoNothing();
          return { row, fresh: true };
        });
        // Members of the space reach it at once, also on open connections (sync-protocol.md §6).
        if (spaceId && created.fresh) await notifySpaceMembers(spaceId);
        return dto(created.row);
      },
    );

    app.get(
      '/notebooks',
      { schema: { tags: ['notebooks'], security, response: { 200: z.array(Notebook), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(notebooks)
          .where(eq(notebooks.userId, p.userId))
          .orderBy(asc(notebooks.createdAt));
        const shared = await sharedNotebookIds(
          db,
          rows.map((r) => r.id),
        );
        return rows.map((r) => ({ ...dto(r), shared: shared.has(r.id) }));
      },
    );

    app.get(
      '/notebooks/:id/key',
      {
        schema: {
          tags: ['notebooks'],
          security,
          params: z.object({ id: id() }),
          response: { 200: notebookKeyResponseSchema, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const nb = await ownNotebook(p.userId, req.params.id);
        // A shared space's notebook key is under the space key: GET /spaces/:id/notebooks (api.md).
        if (nb.spaceId) throw conflict('the notebook is in a shared space: its key comes with GET /spaces/:id/notebooks');
        return {
          wrappedKey: toB64(nb.wrappedKey),
          version: nb.keyVersion,
          keyChain: nb.keyChain,
          keyRotationPending: nb.keyRotationPending,
          pendingSinceVersion: nb.pendingSinceVersion,
        };
      },
    );

    app.patch(
      '/notebooks/:id/mode',
      {
        schema: {
          tags: ['notebooks'],
          security,
          params: z.object({ id: id() }),
          body: z.object({ mode: Mode, notebookKey: Key32.optional() }),
          response: { 200: Notebook, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const current = await ownNotebook(p.userId, req.params.id);
        const { mode, notebookKey } = req.body;
        if (mode === 'agent' && !notebookKey) throw badRequest('notebookKey is required for mode=agent');
        if (mode === 'private' && notebookKey) throw badRequest('notebookKey must not be sent for mode=private');
        if (notebookKey) {
          // Never replace the server's copy with a key that does not open the notebook's data:
          // agents would lose everything written with the right key (prod incident 2026-10-26).
          const key = fromB64(notebookKey);
          const fit = await keyFits(req.params.id, key);
          if (fit.checked > 0 && fit.readable === 0) {
            req.log.warn(
              { notebookId: req.params.id, checked: fit.checked, newKey: fingerprint(key) },
              'notebook mode: rejected a notebookKey that does not decrypt the notebook document',
            );
            throw conflict('key mismatch: this notebook key does not decrypt the notebook data; reload the notebook key from the server');
          }
          if (fit.readable < fit.checked)
            req.log.warn(
              { notebookId: req.params.id, checked: fit.checked, readable: fit.readable },
              'notebook mode: the notebook document holds items sealed with different keys',
            );
          if (current.serverWrappedKey) {
            const old = await ctx.keys.unwrapNotebookKey(req.params.id, current.serverWrappedKey).catch(() => null);
            if (!old || !safeEqual(old, key))
              req.log.warn(
                { notebookId: req.params.id, oldKey: old ? fingerprint(old) : null, newKey: fingerprint(key) },
                'notebook mode: server copy of the notebook key changes',
              );
          }
        }
        const serverWrappedKey = notebookKey
          ? Buffer.from(await ctx.keys.wrapNotebookKey(req.params.id, fromB64(notebookKey)))
          : null;
        // Back to private: the server has seen the key, so it changes (the owner's device rotates it,
        // as after a member left; spec/07 «клиент перешифровывает»; audit 2026-11-02).
        const leavesAgents = current.mode === 'agent' && mode === 'private';
        const [nb] = await db
          .update(notebooks)
          .set({
            mode,
            serverWrappedKey,
            ...(leavesAgents
              ? {
                  keyRotationPending: true,
                  pendingSinceVersion: sql`CASE WHEN ${notebooks.keyRotationPending} THEN ${notebooks.pendingSinceVersion} ELSE ${notebooks.keyVersion} END`,
                }
              : {}),
          })
          .where(eq(notebooks.id, req.params.id))
          .returning();
        // Keys decrypted for agents must not outlive agent mode (crypto.md §8).
        noteKeyCache.forgetNotebooks([req.params.id]);
        return dto(nb!);
      },
    );

    app.delete(
      '/notebooks/:id',
      {
        schema: {
          tags: ['notebooks'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const { spaceId } = await ownNotebook(p.userId, req.params.id);
        const nbId = req.params.id;
        const gone = await db.transaction(async (tx) => {
          const docRows = await tx
            .select({ id: docs.id })
            .from(docs)
            .where(or(eq(docs.notebookId, nbId), eq(docs.id, nbId)));
          const ids = docRows.map((d) => d.id);
          await revokeSharesFor(ctx, tx, p.userId, [nbId, ...ids]);
          await tx.delete(docs).where(or(eq(docs.notebookId, nbId), eq(docs.id, nbId)));
          await tx.delete(notebooks).where(eq(notebooks.id, nbId));
          await tx
            .update(agentGrants)
            .set({ notebookIds: sql`array_remove(${agentGrants.notebookIds}, ${nbId}::uuid)` })
            .where(sql`${nbId}::uuid = ANY(${agentGrants.notebookIds})`);
          return ids;
        });
        for (const d of gone) ctx.hub.publish(topics.doc(d), { type: 'doc_deleted', docId: d });
        if (spaceId) await notifySpaceMembers(spaceId);
        noteKeyCache.forgetNotebooks([nbId]);
        await ctx.jobs.enqueue(CLEANUP_JOB, {});
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/docs',
      {
        schema: {
          tags: ['docs'],
          security,
          body: z.object({ docId: id(), kind: DocKind, notebookId: id().nullable() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const { docId, kind, notebookId } = req.body;
        if (kind === 'space') {
          // The space document (docId = spaceId) is registered by the space's owner (api.md).
          if (notebookId !== null) throw badRequest('space document has no notebook');
          const [sp] = await db.select({ userId: spaces.userId }).from(spaces).where(eq(spaces.id, docId));
          if (!sp || sp.userId !== p.userId) {
            if (sp && (await memberOf(db, { kind: 'space', id: docId }, p.userId))) throw forbidden('only the owner can do this');
            throw notFound('space not found');
          }
          await db.insert(docs).values({ id: docId, userId: p.userId, kind: 'space', notebookId: null }).onConflictDoNothing();
          const [ex] = await db.select().from(docs).where(eq(docs.id, docId));
          if (!ex || ex.kind !== 'space' || ex.userId !== p.userId) throw conflict('document exists');
          // Members list the space document among the space's documents.
          await notifySpaceMembers(docId, ['spaces']);
          return reply.code(204).send(null);
        }
        if (kind === 'account') {
          if (notebookId !== null) throw badRequest('account document has no notebook');
          const [u] = await db.select({ accountDocId: users.accountDocId }).from(users).where(eq(users.id, p.userId));
          if (u?.accountDocId !== docId) throw conflict('account document is registered at signup');
          return reply.code(204).send(null);
        }
        if (!notebookId) throw badRequest('notebookId is required');
        if (kind === 'notebook' && docId !== notebookId) throw badRequest('notebook docId must equal notebookId');
        // An editor of a shared notebook or space creates notes in it; they belong to the owner (D-54, D-62).
        let ownerId = p.userId;
        const [nb] = await db.select({ userId: notebooks.userId }).from(notebooks).where(eq(notebooks.id, notebookId));
        if (nb && nb.userId !== p.userId) {
          const m = await notebookMember(p.userId, notebookId);
          if (!m) throw notFound('notebook not found');
          if (m.role !== 'editor' || kind !== 'note') throw forbidden('read-only access');
          if (m.accountCreatedAfterInvite && !m.wrappedKey) throw notFound('notebook not found');
          ownerId = nb.userId;
        } else if (!nb) throw notFound('notebook not found');
        const [created] = await db
          .insert(docs)
          .values({ id: docId, userId: ownerId, kind, notebookId })
          .onConflictDoNothing()
          .returning({ id: docs.id });
        if (!created) {
          const [ex] = await db.select().from(docs).where(eq(docs.id, docId));
          if (!ex || ex.userId !== ownerId || ex.kind !== kind || ex.notebookId !== notebookId) {
            throw conflict('document exists');
          }
        }
        return reply.code(204).send(null);
      },
    );

    // Move a note to another notebook of the same user. Only the document's metadata
    // changes; the client re-wraps the note key with the new notebook key and writes
    // NoteMeta into the new notebook index (crypto.md §1). Access of guests and agents
    // follows the new notebook immediately.
    app.patch(
      '/docs/:id',
      {
        schema: {
          tags: ['docs'],
          security,
          params: z.object({ id: id() }),
          body: z.object({ notebookId: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const { doc, owner, write } = await visibleDoc(p, req.params.id);
        if (doc.kind !== 'note') throw badRequest('only note documents can be moved');
        let to: typeof notebooks.$inferSelect;
        if (owner) {
          to = await ownNotebook(p.userId, req.body.notebookId);
        } else {
          // Moving a note out of a shared notebook is the owner's (members would lose it). Inside one
          // shared space an editor moves notes between its notebooks: it holds both keys (D-62).
          const [from] = doc.notebookId
            ? await db.select({ spaceId: notebooks.spaceId }).from(notebooks).where(eq(notebooks.id, doc.notebookId))
            : [];
          const [target] = await db.select().from(notebooks).where(eq(notebooks.id, req.body.notebookId));
          const sameSpace = from?.spaceId != null && target?.spaceId === from.spaceId;
          if (!write || !sameSpace) throw forbidden('only the owner can move this note');
          to = target!;
        }
        if (doc.notebookId === req.body.notebookId) return reply.code(204).send(null);
        const [from] = doc.notebookId
          ? await db.select({ mode: notebooks.mode }).from(notebooks).where(eq(notebooks.id, doc.notebookId))
          : [];
        // Out of a notebook open to agents into a private one: the server has seen the note key, so
        // it changes (the owner's device rotates it; audit 2026-11-02).
        const leavesAgents = from?.mode === 'agent' && to.mode !== 'agent';
        await db
          .update(docs)
          .set({
            notebookId: req.body.notebookId,
            updatedAt: sql`now()`,
            ...(leavesAgents
              ? {
                  keyRotationPending: true,
                  pendingSinceVersion: sql`CASE WHEN ${docs.keyRotationPending} THEN ${docs.pendingSinceVersion} ELSE ${docs.keyVersion} END`,
                }
              : {}),
          })
          .where(eq(docs.id, doc.id));
        ctx.hub.publish(topics.doc(doc.id), { type: 'doc_moved', docId: doc.id });
        return reply.code(204).send(null);
      },
    );

    app.delete(
      '/docs/:id',
      {
        schema: {
          tags: ['docs'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const { doc, owner } = await visibleDoc(p, req.params.id);
        // Members put notes in the trash (an index edit); deleting for good is the owner's.
        if (!owner) throw forbidden('only the owner can delete this note');
        if (doc.kind !== 'note') throw badRequest('only note documents can be deleted; delete the notebook instead');
        await db.transaction(async (tx) => {
          await revokeSharesFor(ctx, tx, p.userId, [doc.id]);
          await tx.delete(docs).where(eq(docs.id, doc.id));
        });
        ctx.hub.publish(topics.doc(doc.id), { type: 'doc_deleted', docId: doc.id });
        await ctx.jobs.enqueue(CLEANUP_JOB, {});
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/docs/:id/versions',
      {
        schema: {
          tags: ['docs'],
          security,
          params: z.object({ id: id() }),
          response: {
            200: z.array(
              z.object({
                seq: z.number().int(),
                createdAt: z.string(),
                deviceId: z.string(),
                authors: z.array(authorSchema),
              }),
            ),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const { doc } = await visibleDoc(p, req.params.id);
        const rows = await ctx.documents.listVersions(db, doc.id);
        return rows.map((r) => ({
          seq: r.seq,
          createdAt: r.createdAt.toISOString(),
          deviceId: r.deviceId,
          authors: (r.authors ?? []).map(publicAuthor),
        }));
      },
    );

    app.get(
      '/docs/:id/versions/:seq',
      {
        schema: {
          tags: ['docs'],
          security,
          params: z.object({ id: id(), seq: z.coerce.number().int().positive() }),
          response: { 200: z.object({ payload: z.string() }), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const { doc } = await visibleDoc(p, req.params.id);
        const v = await ctx.documents.getVersion(db, doc.id, req.params.seq);
        if (!v) throw notFound('version not found');
        return { payload: toB64(v.payload) };
      },
    );
  };
}
