import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { agentGrants, docs, notebooks, shares, users } from '../db/schema.js';
import { fromB64, safeEqual, toB64 } from '../lib/encoding.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { topics } from '../sync/hub.js';
import { CLEANUP_JOB } from '../jobs/index.js';
import { Key32, WrappedKey, errorResponses, id } from './schemas.js';

const Mode = z.enum(['private', 'agent']);
const Notebook = z
  .object({ id: id(), mode: Mode, createdAt: z.string(), wrappedKey: z.string() })
  .meta({ id: 'Notebook' });
const DocKind = z.enum(['account', 'notebook', 'note']);

type NotebookRow = typeof notebooks.$inferSelect;
const dto = (n: NotebookRow) => ({
  id: n.id,
  mode: n.mode,
  createdAt: n.createdAt.toISOString(),
  wrappedKey: toB64(n.wrappedKey),
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
      if (!nb) throw notFound('notebook not found');
      return nb;
    }

    app.post(
      '/notebooks',
      {
        schema: {
          tags: ['notebooks'],
          security,
          body: z.object({ notebookId: id(), mode: Mode, wrappedKey: WrappedKey, notebookKey: Key32.optional() }),
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
        return db.transaction(async (tx) => {
          const [created] = await tx
            .insert(notebooks)
            .values({ id: b.notebookId, userId: p.userId, mode: b.mode, wrappedKey, serverWrappedKey })
            .onConflictDoNothing()
            .returning();
          if (!created) {
            const [ex] = await tx.select().from(notebooks).where(eq(notebooks.id, b.notebookId));
            if (ex && ex.userId === p.userId && ex.mode === b.mode && safeEqual(ex.wrappedKey, wrappedKey)) return dto(ex);
            throw conflict('notebook exists');
          }
          // The notebook index document shares the notebook id (document-model.md §1).
          await tx
            .insert(docs)
            .values({ id: b.notebookId, userId: p.userId, kind: 'notebook', notebookId: b.notebookId })
            .onConflictDoNothing();
          return dto(created);
        });
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
        return rows.map(dto);
      },
    );

    app.get(
      '/notebooks/:id/key',
      {
        schema: {
          tags: ['notebooks'],
          security,
          params: z.object({ id: id() }),
          response: { 200: z.object({ wrappedKey: z.string() }), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const nb = await ownNotebook(p.userId, req.params.id);
        return { wrappedKey: toB64(nb.wrappedKey) };
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
        await ownNotebook(p.userId, req.params.id);
        const { mode, notebookKey } = req.body;
        if (mode === 'agent' && !notebookKey) throw badRequest('notebookKey is required for mode=agent');
        if (mode === 'private' && notebookKey) throw badRequest('notebookKey must not be sent for mode=private');
        const serverWrappedKey = notebookKey
          ? Buffer.from(await ctx.keys.wrapNotebookKey(req.params.id, fromB64(notebookKey)))
          : null;
        const [nb] = await db
          .update(notebooks)
          .set({ mode, serverWrappedKey })
          .where(eq(notebooks.id, req.params.id))
          .returning();
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
        await ownNotebook(p.userId, req.params.id);
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
        if (kind === 'account') {
          if (notebookId !== null) throw badRequest('account document has no notebook');
          const [u] = await db.select({ accountDocId: users.accountDocId }).from(users).where(eq(users.id, p.userId));
          if (u?.accountDocId !== docId) throw conflict('account document is registered at signup');
          return reply.code(204).send(null);
        }
        if (!notebookId) throw badRequest('notebookId is required');
        if (kind === 'notebook' && docId !== notebookId) throw badRequest('notebook docId must equal notebookId');
        await ownNotebook(p.userId, notebookId);
        const [created] = await db
          .insert(docs)
          .values({ id: docId, userId: p.userId, kind, notebookId })
          .onConflictDoNothing()
          .returning({ id: docs.id });
        if (!created) {
          const [ex] = await db.select().from(docs).where(eq(docs.id, docId));
          if (!ex || ex.userId !== p.userId || ex.kind !== kind || ex.notebookId !== notebookId) {
            throw conflict('document exists');
          }
        }
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
        const [doc] = await db
          .select()
          .from(docs)
          .where(and(eq(docs.id, req.params.id), eq(docs.userId, p.userId)));
        if (!doc) throw notFound('document not found');
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
            200: z.array(z.object({ seq: z.number().int(), createdAt: z.string(), deviceId: z.string() })),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const [doc] = await db
          .select({ id: docs.id })
          .from(docs)
          .where(and(eq(docs.id, req.params.id), eq(docs.userId, p.userId)));
        if (!doc) throw notFound('document not found');
        const rows = await ctx.documents.listVersions(db, doc.id);
        return rows.map((r) => ({ seq: r.seq, createdAt: r.createdAt.toISOString(), deviceId: r.deviceId }));
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
        const [doc] = await db
          .select({ id: docs.id })
          .from(docs)
          .where(and(eq(docs.id, req.params.id), eq(docs.userId, p.userId)));
        if (!doc) throw notFound('document not found');
        const v = await ctx.documents.getVersion(db, doc.id, req.params.seq);
        if (!v) throw notFound('version not found');
        return { payload: toB64(v.payload) };
      },
    );
  };
}
