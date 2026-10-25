import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { agentTokenNotebooks, agentTokens, notebooks } from '../db/schema.js';
import { randomToken, sha256, uuidv7 } from '../lib/encoding.js';
import { badRequest, notFound } from '../lib/errors.js';
import { IsoDate, errorResponses, id } from './schemas.js';

export const AGENT_TOKEN_PREFIX = 'dsa_';

const AgentToken = z
  .object({
    id: id(),
    name: z.string(),
    notebookIds: z.array(id()),
    permission: z.enum(['read', 'read_write']),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
    lastUsedAt: z.string().nullable(),
  })
  .meta({ id: 'AgentToken' });

const AuditItem = z
  .object({
    id: z.number().int(),
    action: z.string(),
    notebookId: z.string().nullable(),
    docId: z.string().nullable(),
    ok: z.boolean(),
    details: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.string(),
  })
  .meta({ id: 'AgentAuditItem' });

export function agentTokenRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];

    async function ownToken(userId: string, tokenId: string) {
      const [t] = await db
        .select()
        .from(agentTokens)
        .where(and(eq(agentTokens.id, tokenId), eq(agentTokens.userId, userId), isNull(agentTokens.revokedAt)));
      if (!t) throw notFound('agent token not found');
      return t;
    }

    app.post(
      '/agent-tokens',
      {
        schema: {
          tags: ['agent-tokens'],
          security,
          body: z.object({
            name: z.string().trim().min(1).max(100),
            notebookIds: z.array(id()).min(1).max(1000),
            permission: z.enum(['read', 'read_write']),
            expiresAt: IsoDate.nullable().optional(),
          }),
          response: { 200: z.object({ id: id(), token: z.string() }), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        const nbIds = [...new Set(b.notebookIds)];
        const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
        if (expiresAt && expiresAt <= new Date()) throw badRequest('expiresAt must be in the future');
        const owned = await db
          .select({ id: notebooks.id, mode: notebooks.mode })
          .from(notebooks)
          .where(and(eq(notebooks.userId, p.userId), inArray(notebooks.id, nbIds)));
        if (owned.length !== nbIds.length) throw notFound('notebook not found');
        if (owned.some((n) => n.mode !== 'agent')) throw badRequest('agents can only access notebooks in agent mode');
        const tokenId = uuidv7();
        const token = AGENT_TOKEN_PREFIX + randomToken(32);
        await db.transaction(async (tx) => {
          await tx.insert(agentTokens).values({
            id: tokenId,
            userId: p.userId,
            name: b.name,
            tokenHash: sha256(token),
            permission: b.permission,
            expiresAt,
          });
          await tx.insert(agentTokenNotebooks).values(nbIds.map((notebookId) => ({ tokenId, notebookId })));
        });
        return { id: tokenId, token };
      },
    );

    app.get(
      '/agent-tokens',
      { schema: { tags: ['agent-tokens'], security, response: { 200: z.array(AgentToken), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(agentTokens)
          .where(and(eq(agentTokens.userId, p.userId), isNull(agentTokens.revokedAt)))
          .orderBy(desc(agentTokens.createdAt));
        const links = rows.length
          ? await db
              .select()
              .from(agentTokenNotebooks)
              .where(
                inArray(
                  agentTokenNotebooks.tokenId,
                  rows.map((r) => r.id),
                ),
              )
          : [];
        return rows.map((t) => ({
          id: t.id,
          name: t.name,
          notebookIds: links.filter((l) => l.tokenId === t.id).map((l) => l.notebookId),
          permission: t.permission,
          expiresAt: t.expiresAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
          lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
        }));
      },
    );

    app.delete(
      '/agent-tokens/:id',
      {
        schema: {
          tags: ['agent-tokens'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        await ownToken(p.userId, req.params.id);
        await db.update(agentTokens).set({ revokedAt: new Date() }).where(eq(agentTokens.id, req.params.id));
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/agent-tokens/:id/audit',
      {
        schema: {
          tags: ['agent-tokens'],
          security,
          params: z.object({ id: id() }),
          querystring: z.object({
            before: z.coerce.number().int().positive().optional(),
            limit: z.coerce.number().int().min(1).max(500).default(100),
          }),
          response: { 200: z.array(AuditItem), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const [t] = await db
          .select({ id: agentTokens.id })
          .from(agentTokens)
          .where(and(eq(agentTokens.id, req.params.id), eq(agentTokens.userId, p.userId)));
        if (!t) throw notFound('agent token not found');
        const rows = await ctx.audit.list(db, t.id, {
          limit: req.query.limit,
          ...(req.query.before ? { before: req.query.before } : {}),
        });
        return rows.map((r) => ({
          id: r.id,
          action: r.action,
          notebookId: r.notebookId,
          docId: r.docId,
          ok: r.ok,
          details: r.details,
          createdAt: r.createdAt.toISOString(),
        }));
      },
    );
  };
}
