import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { agentGrants, docs, invitations, members, notebooks, shares, spaces } from '../db/schema.js';
import { CLEANUP_JOB } from '../jobs/index.js';
import { fromB64, toB64 } from '../lib/encoding.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { noteKeyCache } from '../plugins/agent-key-cache.js';
import { memberOf, requireOwnTarget, requireVisibleTarget } from '../services/sharing.js';
import { topics } from '../sync/hub.js';
import { errorResponses, id } from './schemas.js';
import {
  createSpaceRequestSchema,
  moveOutNotebookRequestSchema as moveOutRequestSchema,
  putSpaceNotebookRequestSchema as moveInRequestSchema,
  rotateSpaceRequestSchema as spaceRotateRequestSchema,
  sharedSpaceSchema as spaceSchema,
  spaceKeyResponseSchema,
  spaceNotebookSchema,
} from '@datascratch/shared/contracts';

type SpaceRow = typeof spaces.$inferSelect;

const dto = (s: SpaceRow) => ({
  id: s.id,
  ownerUserId: s.userId,
  keyVersion: s.keyVersion,
  keyRotationPending: s.keyRotationPending,
  pendingSinceVersion: s.pendingSinceVersion,
  createdAt: s.createdAt.toISOString(),
});

/**
 * Shared spaces (D-62, api.md «Общие пространства», crypto.md §11). The space key wraps the keys
 * of its notebooks; members, invitations and key delivery are the D-54 ones with `kind = space`
 * (routes/sharing.ts). Everything here that changes keys runs in one transaction under the space's
 * row lock.
 */
export function spaceRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];
    const spaceParams = z.object({ id: id() });
    const spaceNotebookParams = z.object({ id: id(), notebookId: id() });

    /** Open sync connections of the space's members re-check access. */
    async function notifyMembers(db0: DbOrTx, spaceId: string) {
      const ms = await db0.select({ userId: members.userId }).from(members).where(eq(members.spaceId, spaceId));
      for (const m of ms) ctx.hub.publish(topics.user(m.userId), { type: 'access_changed' });
    }

    const ownSpace = (tx: DbOrTx, userId: string, spaceId: string, lock = false) =>
      requireOwnTarget(tx, userId, { kind: 'space', id: spaceId }, lock);

    async function spaceNotebooks(tx: DbOrTx, spaceId: string) {
      return tx.select().from(notebooks).where(eq(notebooks.spaceId, spaceId)).orderBy(asc(notebooks.createdAt));
    }

    app.post(
      '/spaces',
      {
        schema: { tags: ['spaces'], security, body: createSpaceRequestSchema, response: { 200: spaceSchema, ...errorResponses } },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        // Personal spaces live only in the account document: any new id becomes a shared space of
        // the caller; an id already known is a 409 (api.md), also for a retry.
        const [created] = await db
          .insert(spaces)
          .values({ id: req.body.spaceId, userId: p.userId, wrappedKey: fromB64(req.body.wrappedKey) })
          .onConflictDoNothing()
          .returning();
        if (!created) throw conflict('space exists');
        return dto(created);
      },
    );

    app.get(
      '/spaces',
      { schema: { tags: ['spaces'], security, response: { 200: z.array(spaceSchema), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(spaces)
          .where(
            or(
              eq(spaces.userId, p.userId),
              inArray(
                spaces.id,
                db
                  .select({ id: members.spaceId })
                  .from(members)
                  .where(and(eq(members.userId, p.userId), sql`${members.spaceId} IS NOT NULL`)),
              ),
            ),
          )
          .orderBy(asc(spaces.createdAt));
        return rows.map(dto);
      },
    );

    app.get(
      '/spaces/:id/key',
      {
        schema: { tags: ['spaces'], security, params: spaceParams, response: { 200: spaceKeyResponseSchema, ...errorResponses } },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        await ownSpace(db, p.userId, req.params.id);
        const [sp] = await db.select().from(spaces).where(eq(spaces.id, req.params.id));
        return {
          version: sp!.keyVersion,
          wrappedKey: toB64(sp!.wrappedKey),
          keyChain: sp!.keyChain,
          keyRotationPending: sp!.keyRotationPending,
          pendingSinceVersion: sp!.pendingSinceVersion,
        };
      },
    );

    app.get(
      '/spaces/:id/notebooks',
      {
        schema: {
          tags: ['spaces'],
          security,
          params: spaceParams,
          response: { 200: z.array(spaceNotebookSchema), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const t = await requireVisibleTarget(db, p.userId, { kind: 'space', id: req.params.id });
        if (t.ownerId !== p.userId) {
          // Any member who accepted, whatever the version of its key (the wrappers open nothing
          // without the space key; during a rotation the member keeps the list) — but not before
          // the owner lets a late account in (D-54, api.md «Уточнения»).
          const m = await memberOf(db, t, p.userId);
          if (!m || (m.accountCreatedAfterInvite && !m.wrappedKey)) throw notFound('space not found');
        }

        const rows = await spaceNotebooks(db, t.id);
        return rows.map((n) => ({
          notebookId: n.id,
          version: n.keyVersion,
          spaceWrappedKey: toB64(n.wrappedKey),
          keyChain: n.keyChain,
          mode: n.mode,
        }));
      },
    );

    app.put(
      '/spaces/:id/notebooks/:notebookId',
      {
        schema: {
          tags: ['spaces'],
          security,
          params: spaceNotebookParams,
          body: moveInRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const { id: spaceId, notebookId } = req.params;
        await db.transaction(async (tx) => {
          await ownSpace(tx, p.userId, spaceId, true);
          const [nb] = await tx
            .select()
            .from(notebooks)
            .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, p.userId)))
            .for('update');
          if (!nb) throw notFound('notebook not found');
          if (nb.spaceId === spaceId) return; // already there (a retry)
          if (nb.spaceId) throw conflict('the notebook is in another shared space');
          if (req.body.version !== nb.keyVersion) throw conflict('key version is not current');
          // Its own D-54 members, or of a note of it, would keep their own keys and access: refuse.
          const [own] = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(members)
            .where(
              or(
                eq(members.notebookId, notebookId),
                inArray(members.noteId, tx.select({ id: docs.id }).from(docs).where(eq(docs.notebookId, notebookId))),
              ),
            );
          const [pending] = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(invitations)
            .where(
              and(
                eq(invitations.status, 'pending'),
                or(
                  eq(invitations.notebookId, notebookId),
                  inArray(invitations.noteId, tx.select({ id: docs.id }).from(docs).where(eq(docs.notebookId, notebookId))),
                ),
              ),
            );
          if (own!.n > 0 || pending!.n > 0) throw conflict('the notebook has members of its own: remove them first');
          await tx
            .update(notebooks)
            .set({ spaceId, wrappedKey: fromB64(req.body.spaceWrappedKey) })
            .where(eq(notebooks.id, notebookId));
        });
        await notifyMembers(db, spaceId);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/spaces/:id/notebooks/:notebookId/move-out',
      {
        schema: {
          tags: ['spaces'],
          security,
          params: spaceNotebookParams,
          body: moveOutRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const { id: spaceId, notebookId } = req.params;
        const b = req.body;
        const serverWrappedKey = b.notebookKey
          ? Buffer.from(await ctx.keys.wrapNotebookKey(notebookId, fromB64(b.notebookKey)))
          : null;
        await db.transaction(async (tx) => {
          await ownSpace(tx, p.userId, spaceId, true);
          const [nb] = await tx
            .select()
            .from(notebooks)
            .where(and(eq(notebooks.id, notebookId), eq(notebooks.spaceId, spaceId)))
            .for('update');
          if (!nb) throw notFound('notebook not found');
          if (b.version !== nb.keyVersion + 1) throw conflict('version must be the current one + 1');
          if (nb.mode === 'agent' && !b.notebookKey) throw badRequest('notebookKey is required for an agent-mode notebook');
          if (nb.mode !== 'agent' && b.notebookKey) throw badRequest('notebookKey is only sent for an agent-mode notebook');
          // A new key under the owner's master key (crypto.md §11.3); the notes follow as steps 2–3
          // of a notebook rotation, finished with POST /members/notebook/:id/rotate/done.
          await tx
            .update(notebooks)
            .set({
              spaceId: null,
              wrappedKey: fromB64(b.ownerWrappedKey),
              keyVersion: b.version,
              keyChain: [b.previousKeyWrap, ...nb.keyChain],
              keyRotationPending: true,
              pendingSinceVersion: nb.keyRotationPending ? nb.pendingSinceVersion : nb.keyVersion,
              ...(serverWrappedKey ? { serverWrappedKey } : {}),
            })
            .where(eq(notebooks.id, notebookId));
        });
        // The space's members lose it at once (open connections too); agents re-read its keys.
        await notifyMembers(db, spaceId);
        noteKeyCache.forgetNotebooks([notebookId]);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/spaces/:id/rotate',
      {
        schema: {
          tags: ['spaces'],
          security,
          params: spaceParams,
          body: spaceRotateRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const spaceId = req.params.id;
        const b = req.body;
        // Server copies for agent-mode notebooks are made before the transaction (KMS work).
        const serverKeys = new Map<string, Buffer>();
        for (const n of b.notebooks) {
          if (n.notebookKey) serverKeys.set(n.notebookId, Buffer.from(await ctx.keys.wrapNotebookKey(n.notebookId, fromB64(n.notebookKey))));
        }
        const notebookIds = await db.transaction(async (tx) => {
          // One transaction under the space's row lock (crypto.md §11.4): of two rotations one passes.
          const t = await ownSpace(tx, p.userId, spaceId, true);
          if (b.version !== t.keyVersion + 1) throw conflict('version must be the current one + 1');
          const current = await tx.select().from(members).where(eq(members.spaceId, spaceId));
          // Exactly the active members: one awaiting its key gets the new version later (PUT …/key).
          const active = new Map(
            current.filter((m) => m.wrappedKey !== null && m.keyVersion === t.keyVersion).map((m) => [m.userId, m]),
          );
          const given = new Set(b.memberKeys.map((k) => k.userId));
          if (given.size !== active.size || [...given].some((u) => !active.has(u))) {
            throw conflict('memberKeys must name exactly the active members');
          }
          // Exactly all notebooks of the space, each to its next version (locked: none can be added meanwhile).
          const nbs = await tx.select().from(notebooks).where(eq(notebooks.spaceId, spaceId)).for('update');
          const byId = new Map(nbs.map((n) => [n.id, n]));
          if (b.notebooks.length !== nbs.length || b.notebooks.some((n) => !byId.has(n.notebookId))) {
            throw conflict('notebooks must name exactly the notebooks of the space');
          }
          for (const n of b.notebooks) {
            const nb = byId.get(n.notebookId)!;
            if (n.version !== nb.keyVersion + 1) throw conflict(`notebook ${nb.id}: version must be the current one + 1`);
            if (nb.mode === 'agent' && !n.notebookKey) throw badRequest(`notebook ${nb.id}: notebookKey is required in agent mode`);
            if (nb.mode !== 'agent' && n.notebookKey) throw badRequest(`notebook ${nb.id}: notebookKey is only sent in agent mode`);
          }
          for (const k of b.memberKeys) {
            await tx
              .update(members)
              .set({ wrappedKey: fromB64(k.wrappedKey), keyVersion: b.version })
              .where(eq(members.id, active.get(k.userId)!.id));
          }
          const since = (row: { keyRotationPending: boolean; pendingSinceVersion: number | null; keyVersion: number }) =>
            row.keyRotationPending ? row.pendingSinceVersion : row.keyVersion;
          const [sp] = await tx.select().from(spaces).where(eq(spaces.id, spaceId));
          await tx
            .update(spaces)
            .set({
              wrappedKey: fromB64(b.ownerWrappedKey),
              keyVersion: b.version,
              keyChain: [b.previousKeyWrap, ...t.keyChain],
              // Step 2 (new note keys) follows: pending until rotate/done, for the space and each notebook.
              keyRotationPending: true,
              pendingSinceVersion: since(sp!),
            })
            .where(eq(spaces.id, spaceId));
          for (const n of b.notebooks) {
            const nb = byId.get(n.notebookId)!;
            await tx
              .update(notebooks)
              .set({
                wrappedKey: fromB64(n.spaceWrappedKey),
                keyVersion: n.version,
                keyChain: [n.previousKeyWrap, ...nb.keyChain],
                keyRotationPending: true,
                pendingSinceVersion: since(nb),
                ...(serverKeys.has(nb.id) ? { serverWrappedKey: serverKeys.get(nb.id)! } : {}),
              })
              .where(eq(notebooks.id, nb.id));
          }
          return nbs.map((n) => n.id);
        });
        // Keys decrypted for agents must not outlive the old keys (crypto.md §8).
        noteKeyCache.forgetNotebooks(notebookIds);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/spaces/:id/rotate/done',
      {
        schema: {
          tags: ['spaces'],
          security,
          params: spaceParams,
          body: z.object({}).optional(),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const spaceId = req.params.id;
        const ids = await db.transaction(async (tx) => {
          await ownSpace(tx, p.userId, spaceId, true);
          await tx.update(spaces).set({ keyRotationPending: false, pendingSinceVersion: null }).where(eq(spaces.id, spaceId));
          const rows = await tx
            .update(notebooks)
            .set({ keyRotationPending: false, pendingSinceVersion: null })
            .where(eq(notebooks.spaceId, spaceId))
            .returning({ id: notebooks.id });
          return rows.map((r) => r.id);
        });
        noteKeyCache.forgetNotebooks(ids);
        return reply.code(204).send(null);
      },
    );

    app.delete(
      '/spaces/:id',
      {
        schema: { tags: ['spaces'], security, params: spaceParams, response: { 204: z.null(), ...errorResponses } },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const spaceId = req.params.id;
        const { gone, memberIds, notebookIds } = await db.transaction(async (tx) => {
          await ownSpace(tx, p.userId, spaceId, true);
          const nbs = await spaceNotebooks(tx, spaceId);
          const nbIds = nbs.map((n) => n.id);
          const docRows = nbIds.length
            ? await tx.select({ id: docs.id }).from(docs).where(inArray(docs.notebookId, nbIds))
            : [];
          const ids = [spaceId, ...docRows.map((d) => d.id)];
          const ms = await tx.select({ userId: members.userId }).from(members).where(eq(members.spaceId, spaceId));
          // Guest links to its notes and notebooks go with them.
          const revoked = await tx
            .delete(shares)
            .where(and(eq(shares.userId, p.userId), inArray(shares.targetId, [...nbIds, ...ids])))
            .returning({ id: shares.id });
          for (const s of revoked) ctx.hub.publish(topics.share(s.id), { type: 'revoked', reason: 'shared item deleted' });
          if (nbIds.length) await tx.delete(docs).where(inArray(docs.notebookId, nbIds));
          await tx.delete(docs).where(and(eq(docs.id, spaceId), eq(docs.kind, 'space')));
          // Notebooks, members and invitations go by cascade with the space.
          await tx.delete(spaces).where(eq(spaces.id, spaceId));
          for (const nb of nbIds) {
            await tx
              .update(agentGrants)
              .set({ notebookIds: sql`array_remove(${agentGrants.notebookIds}, ${nb}::uuid)` })
              .where(sql`${nb}::uuid = ANY(${agentGrants.notebookIds})`);
          }
          return { gone: ids, memberIds: ms.map((m) => m.userId), notebookIds: nbIds };
        });
        for (const d of gone) ctx.hub.publish(topics.doc(d), { type: 'doc_deleted', docId: d });
        for (const u of memberIds) ctx.hub.publish(topics.user(u), { type: 'access_changed' });
        noteKeyCache.forgetNotebooks(notebookIds);
        await ctx.jobs.enqueue(CLEANUP_JOB, {});
        return reply.code(204).send(null);
      },
    );
  };
}
