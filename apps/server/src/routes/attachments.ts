import { and, asc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUserOrGuest } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { attachmentChunks, attachments } from '../db/schema.js';
import { ApiError, badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { docAccess } from '../services/access.js';
import type { GuestPrincipal, UserPrincipal } from '../services/principal.js';
import { chunkKey } from '../storage/index.js';
import { CLEANUP_JOB } from '../jobs/index.js';
import { errorResponses, id } from './schemas.js';

/** crypto.md §6: 1 MiB of plaintext per chunk + envelope overhead (1 + 24 + 16). */
export const CHUNK_PLAINTEXT = 1024 * 1024;
export const ENVELOPE_OVERHEAD = 41;
const CHUNK_MAX = CHUNK_PLAINTEXT + ENVELOPE_OVERHEAD;

export function attachmentRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];

    app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: CHUNK_MAX }, (_req, body, done) =>
      done(null, body),
    );

    async function load(p: UserPrincipal | GuestPrincipal, attachmentId: string, write: boolean) {
      const [a] = await db.select().from(attachments).where(eq(attachments.id, attachmentId));
      if (!a) throw notFound('attachment not found');
      const access = await docAccess(db, p, a.noteId);
      if (!access) throw notFound('attachment not found');
      if (write && !access.write) throw forbidden('read-only access');
      return a;
    }

    app.post(
      '/attachments',
      {
        schema: {
          tags: ['attachments'],
          security,
          body: z.object({
            attachmentId: id(),
            noteId: id(),
            size: z.number().int().positive(),
            chunkCount: z.number().int().positive(),
            mime: z.string().min(1).max(255),
          }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUserOrGuest(ctx, req);
        const b = req.body;
        if (b.size > ctx.config.ATTACHMENT_MAX_BYTES) throw new ApiError('payload_too_large', 'attachment too large');
        if (b.size < b.chunkCount * ENVELOPE_OVERHEAD || b.size > b.chunkCount * CHUNK_MAX) {
          throw badRequest('size does not match chunkCount');
        }
        const access = await docAccess(db, p, b.noteId);
        if (!access || access.doc.kind !== 'note') throw notFound('note not found');
        if (!access.write) throw forbidden('read-only access');
        await ctx.documents.quotaCheck(db, b.noteId, b.size, 'attachment');
        const [created] = await db
          .insert(attachments)
          .values({
            id: b.attachmentId,
            userId: access.doc.userId,
            noteId: b.noteId,
            size: b.size,
            chunkCount: b.chunkCount,
            mime: b.mime,
          })
          .onConflictDoNothing()
          .returning({ id: attachments.id });
        if (!created) {
          const [ex] = await db.select().from(attachments).where(eq(attachments.id, b.attachmentId));
          const same =
            ex && ex.noteId === b.noteId && ex.size === b.size && ex.chunkCount === b.chunkCount && ex.mime === b.mime;
          if (!same) throw conflict('attachment exists');
        }
        return reply.code(204).send(null);
      },
    );

    app.put(
      '/attachments/:id/chunks/:index',
      {
        bodyLimit: CHUNK_MAX,
        schema: {
          tags: ['attachments'],
          security,
          params: z.object({ id: id(), index: z.coerce.number().int().nonnegative() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUserOrGuest(ctx, req);
        const body = req.body;
        if (!Buffer.isBuffer(body)) throw badRequest('expected application/octet-stream');
        const a = await load(p, req.params.id, true);
        const { index } = req.params;
        if (index >= a.chunkCount) throw badRequest('chunk index out of range');
        const last = index === a.chunkCount - 1;
        if (body.length < ENVELOPE_OVERHEAD || (!last && body.length !== CHUNK_MAX)) {
          throw badRequest('invalid chunk size');
        }
        const [others] = await db
          .select({ bytes: sql<number>`coalesce(sum(${attachmentChunks.size}), 0)::bigint` })
          .from(attachmentChunks)
          .where(and(eq(attachmentChunks.attachmentId, a.id), sql`${attachmentChunks.index} <> ${index}`));
        if (Number(others!.bytes) + body.length > a.size) throw badRequest('chunks exceed declared size');
        await ctx.storage.put(chunkKey(a.id, index), body);
        await db.transaction(async (tx) => {
          await tx
            .insert(attachmentChunks)
            .values({ attachmentId: a.id, index, size: body.length })
            .onConflictDoUpdate({
              target: [attachmentChunks.attachmentId, attachmentChunks.index],
              set: { size: body.length },
            });
          const [c] = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(attachmentChunks)
            .where(eq(attachmentChunks.attachmentId, a.id));
          if (c!.n === a.chunkCount) {
            await tx.update(attachments).set({ completedAt: sql`now()` }).where(eq(attachments.id, a.id));
          }
        });
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/attachments/:id',
      {
        schema: {
          tags: ['attachments'],
          security,
          params: z.object({ id: id() }),
          response: {
            200: z.object({
              size: z.number().int(),
              chunkCount: z.number().int(),
              mime: z.string(),
              uploadedChunks: z.array(z.number().int()),
            }),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        const p = await requireUserOrGuest(ctx, req);
        const a = await load(p, req.params.id, false);
        const chunks = await db
          .select({ index: attachmentChunks.index })
          .from(attachmentChunks)
          .where(eq(attachmentChunks.attachmentId, a.id))
          .orderBy(asc(attachmentChunks.index));
        return { size: a.size, chunkCount: a.chunkCount, mime: a.mime, uploadedChunks: chunks.map((c) => c.index) };
      },
    );

    app.get(
      '/attachments/:id/chunks/:index',
      {
        schema: {
          tags: ['attachments'],
          security,
          params: z.object({ id: id(), index: z.coerce.number().int().nonnegative() }),
        },
      },
      async (req, reply) => {
        const p = await requireUserOrGuest(ctx, req);
        const a = await load(p, req.params.id, false);
        const [c] = await db
          .select()
          .from(attachmentChunks)
          .where(and(eq(attachmentChunks.attachmentId, a.id), eq(attachmentChunks.index, req.params.index)));
        if (!c) throw notFound('chunk not uploaded');
        const data = await ctx.storage.get(chunkKey(a.id, c.index));
        if (!data) throw notFound('chunk missing in storage');
        return reply
          .header('content-type', 'application/octet-stream')
          .header('cache-control', 'private, max-age=31536000, immutable')
          .send(Buffer.from(data));
      },
    );

    app.delete(
      '/attachments/:id',
      {
        schema: {
          tags: ['attachments'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUserOrGuest(ctx, req);
        if (p.kind === 'guest') throw forbidden('guests cannot delete attachments');
        const a = await load(p, req.params.id, true);
        await db.delete(attachments).where(eq(attachments.id, a.id));
        await ctx.jobs.enqueue(CLEANUP_JOB, {});
        return reply.code(204).send(null);
      },
    );
  };
}
