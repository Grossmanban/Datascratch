import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { docs, notebooks, shares } from '../db/schema.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { loadActiveShare, type ShareRow } from '../services/access.js';
import { topics } from '../sync/hub.js';
import { IsoDate, errorResponses, id } from './schemas.js';

const Target = z.object({ kind: z.enum(['note', 'notebook']), id: id() });
const Permission = z.enum(['view', 'edit']);
const Share = z
  .object({
    id: id(),
    target: Target,
    permission: Permission,
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .meta({ id: 'Share' });

const dto = (s: ShareRow) => ({
  id: s.id,
  target: { kind: s.targetKind, id: s.targetId },
  permission: s.permission,
  expiresAt: s.expiresAt?.toISOString() ?? null,
  createdAt: s.createdAt.toISOString(),
});

/** Documents a share gives access to (evaluated at use time, so new notes in a shared notebook appear). */
export async function shareDocIds(db: DbOrTx, s: Pick<ShareRow, 'userId' | 'targetKind' | 'targetId'>) {
  if (s.targetKind === 'note') return [s.targetId];
  const rows = await db
    .select({ id: docs.id })
    .from(docs)
    .where(and(eq(docs.userId, s.userId), eq(docs.notebookId, s.targetId)))
    .orderBy(asc(docs.createdAt));
  // The notebook index first, then its notes.
  const ids = rows.map((r) => r.id).filter((x) => x !== s.targetId);
  return [s.targetId, ...ids];
}

export function shareRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];

    app.post(
      '/shares',
      {
        schema: {
          tags: ['shares'],
          security,
          body: z.object({
            shareId: id(),
            target: Target,
            permission: Permission,
            expiresAt: IsoDate.nullable().default(null),
          }),
          response: { 200: Share, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
        if (expiresAt && expiresAt <= new Date()) throw badRequest('expiresAt must be in the future');
        if (b.target.kind === 'note') {
          const [d] = await db
            .select({ id: docs.id })
            .from(docs)
            .where(and(eq(docs.id, b.target.id), eq(docs.userId, p.userId), eq(docs.kind, 'note')));
          if (!d) throw notFound('note not found');
        } else {
          const [nb] = await db
            .select({ id: notebooks.id })
            .from(notebooks)
            .where(and(eq(notebooks.id, b.target.id), eq(notebooks.userId, p.userId)));
          if (!nb) throw notFound('notebook not found');
        }
        const [created] = await db
          .insert(shares)
          .values({
            id: b.shareId,
            userId: p.userId,
            targetKind: b.target.kind,
            targetId: b.target.id,
            permission: b.permission,
            expiresAt,
          })
          .onConflictDoNothing()
          .returning();
        if (created) return dto(created);
        const [ex] = await db.select().from(shares).where(eq(shares.id, b.shareId));
        const same =
          ex &&
          ex.userId === p.userId &&
          !ex.revokedAt &&
          ex.targetKind === b.target.kind &&
          ex.targetId === b.target.id &&
          ex.permission === b.permission &&
          (ex.expiresAt?.getTime() ?? null) === (expiresAt?.getTime() ?? null);
        if (!same) throw conflict('share exists');
        return dto(ex);
      },
    );

    app.get(
      '/shares',
      { schema: { tags: ['shares'], security, response: { 200: z.array(Share), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(shares)
          .where(and(eq(shares.userId, p.userId), isNull(shares.revokedAt)))
          .orderBy(desc(shares.createdAt));
        return rows.map(dto);
      },
    );

    app.delete(
      '/shares/:id',
      {
        schema: {
          tags: ['shares'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .update(shares)
          .set({ revokedAt: new Date() })
          .where(and(eq(shares.id, req.params.id), eq(shares.userId, p.userId), isNull(shares.revokedAt)))
          .returning({ id: shares.id });
        if (rows.length === 0) throw notFound('share not found');
        // Revocation immediately disconnects guests (api.md).
        ctx.hub.publish(topics.share(req.params.id), { type: 'revoked', reason: 'share revoked' });
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/shares/:id/guest',
      {
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
        schema: {
          tags: ['shares'],
          params: z.object({ id: id() }),
          body: z.object({}).optional(),
          response: {
            200: z.object({
              guestToken: z.string(),
              target: Target,
              permission: Permission,
              docIds: z.array(id()),
            }),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        const s = await loadActiveShare(db, req.params.id);
        if (!s) throw notFound('share not found');
        const guestToken = await ctx.tokens.signGuest({ shareId: s.id }, s.expiresAt);
        return {
          guestToken,
          target: { kind: s.targetKind, id: s.targetId },
          permission: s.permission,
          docIds: await shareDocIds(db, s),
        };
      },
    );
  };
}
