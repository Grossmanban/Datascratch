import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { devices, securityEvents, users } from '../db/schema.js';
import { fromB64 } from '../lib/encoding.js';
import { notFound, unauthorized } from '../lib/errors.js';
import { verifySecret } from '../lib/password.js';
import { publishDeviceRevocations, revokeDevice } from '../services/sessions.js';
import { CLEANUP_JOB } from '../jobs/index.js';
import { Key32, errorResponses, id } from './schemas.js';

const Device = z
  .object({ id: id(), name: z.string(), createdAt: z.string(), lastSeenAt: z.string(), current: z.boolean() })
  .meta({ id: 'Device' });

export function accountRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];

    app.get(
      '/me',
      {
        schema: {
          tags: ['account'],
          security,
          response: {
            200: z.object({ userId: id(), email: z.string(), accountDocId: id(), createdAt: z.string() }),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const [u] = await db.select().from(users).where(eq(users.id, p.userId));
        if (!u) throw notFound();
        return { userId: u.id, email: u.email, accountDocId: u.accountDocId, createdAt: u.createdAt.toISOString() };
      },
    );

    app.delete(
      '/me',
      {
        schema: {
          tags: ['account'],
          security,
          body: z.object({ loginKey: Key32 }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const [u] = await db.select().from(users).where(eq(users.id, p.userId));
        if (!u || !(await verifySecret(u.loginHash, fromB64(req.body.loginKey)))) {
          throw unauthorized('password confirmation failed');
        }
        const devs = await db.select({ id: devices.id }).from(devices).where(eq(devices.userId, p.userId));
        // Cascades to every table; attachment blobs are queued for deletion by a trigger.
        await db.delete(users).where(eq(users.id, p.userId));
        publishDeviceRevocations(
          ctx,
          devs.map((d) => d.id),
          'account_deleted',
        );
        await ctx.jobs.enqueue(CLEANUP_JOB, {});
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/me/security-events',
      {
        schema: {
          tags: ['account'],
          security,
          response: {
            200: z.array(
              z.object({
                kind: z.enum(['password_changed', 'recovery_used', 'recovery_key_rotated']),
                at: z.string(),
                deviceId: z.string().nullable(),
                deviceName: z.string().nullable(),
              }),
            ),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(securityEvents)
          .where(eq(securityEvents.userId, p.userId))
          .orderBy(desc(securityEvents.id))
          .limit(100);
        return rows.map((r) => ({ kind: r.kind, at: r.at.toISOString(), deviceId: r.deviceId, deviceName: r.deviceName }));
      },
    );

    app.get(
      '/devices',
      { schema: { tags: ['account'], security, response: { 200: z.array(Device), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(devices)
          .where(and(eq(devices.userId, p.userId), isNull(devices.revokedAt)))
          .orderBy(desc(devices.lastSeenAt));
        return rows.map((d) => ({
          id: d.id,
          name: d.name,
          createdAt: d.createdAt.toISOString(),
          lastSeenAt: d.lastSeenAt.toISOString(),
          current: d.id === p.deviceId,
        }));
      },
    );

    app.delete(
      '/devices/:id',
      {
        schema: {
          tags: ['account'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        if (!(await revokeDevice(ctx, db, p.userId, req.params.id))) throw notFound('device not found');
        return reply.code(204).send(null);
      },
    );
  };
}
