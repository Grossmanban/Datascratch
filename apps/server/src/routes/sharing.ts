import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import {
  INVITATION_TTL_MS,
  MAX_INVITATIONS_PER_DAY,
  MAX_MEMBERS,
  boxKeySchema,
  createInvitationRequestSchema,
  incomingInvitationSchema,
  memberSchema,
  outgoingInvitationSchema,
  patchMemberRequestSchema,
  publicKeyResponseSchema,
  putMemberKeyRequestSchema,
  rotateKeyRequestSchema,
  sharedByMeItemSchema,
  sharedItemSchema,
  sharedNoteKeyResponseSchema,
} from '@datascratch/shared/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { docs, invitations, members, notebooks, users } from '../db/schema.js';
import { fromB64, safeEqual, toB64 } from '../lib/encoding.js';
import { ApiError, badRequest, conflict, notFound } from '../lib/errors.js';
import { noteKeyCache } from '../plugins/agent-key-cache.js';
import {
  invitationTargetCol,
  loadTarget,
  memberOf,
  memberTargetCol,
  requireOwnTarget,
  requireVisibleTarget,
  targetValues,
  type MemberRow,
  type Target,
  type TargetKind,
  type TargetRow,
} from '../services/sharing.js';
import { topics } from '../sync/hub.js';
import { shareDocIds } from './shares.js';
import { errorResponses, id } from './schemas.js';

const Kind = z.enum(['notebook', 'note']);
const targetParams = z.object({ kind: Kind, id: id() });
const DAY_MS = 86_400_000;

type InvitationRow = typeof invitations.$inferSelect;

const targetOf = (r: { notebookId: string | null; noteId: string | null }): Target =>
  r.notebookId ? { kind: 'notebook', id: r.notebookId } : { kind: 'note', id: r.noteId! };

/** Whether a member can use the key it holds: delivered for the target's current version. */
const hasCurrentKey = (m: MemberRow, t: TargetRow) => m.wrappedKey !== null && m.keyVersion === t.keyVersion;

/** Documents of a shared target, for SharedItem.docIds (the notebook index first). */
async function targetDocIds(db: DbOrTx, t: TargetRow): Promise<string[]> {
  return shareDocIds(db, { userId: t.ownerId, targetKind: t.kind, targetId: t.id });
}

export function sharingRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = ctx.database;
    const security = [{ bearer: [] }];

    /** Membership of `userId` changed: their live sync connections re-check access. */
    const accessChanged = (userId: string) => ctx.hub.publish(topics.user(userId), { type: 'access_changed' });

    async function sharedItem(m: MemberRow, t: TargetRow) {
      const [owner] = await db
        .select({ id: users.id, email: users.email, publicKey: users.boxPublicKey })
        .from(users)
        .where(eq(users.id, t.ownerId));
      // A member whose account was created after the invitation sees nothing until the owner
      // confirms it by giving the key (open-questions.md, D-54).
      const gated = m.accountCreatedAfterInvite && m.wrappedKey === null;
      return {
        target: { kind: t.kind, id: t.id },
        owner: { userId: owner!.id, email: owner!.email, publicKey: toB64(owner!.publicKey!) },
        role: m.role,
        keyVersion: t.keyVersion,
        wrappedKey: hasCurrentKey(m, t) ? toB64(m.wrappedKey!) : null,
        keyChain: t.keyChain,
        docIds: gated ? [] : await targetDocIds(db, t),
        addedAt: m.joinedAt.toISOString(),
        // Read-only badge for the member: the owner's agents can read this (D-54, ✨).
        agentsMode: t.mode === 'agent',
      };
    }

    // ----------------------------------------------------------------- account keys

    app.put(
      '/me/box-key',
      {
        schema: { tags: ['sharing'], security, body: boxKeySchema, response: { 204: z.null(), ...errorResponses } },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const publicKey = fromB64(req.body.publicKey);
        const wrappedSecretKey = fromB64(req.body.wrappedSecretKey);
        // Set once: a later different pair would cut members off the keys wrapped for the first.
        const set = await db
          .update(users)
          .set({ boxPublicKey: publicKey, boxWrappedSecretKey: wrappedSecretKey })
          .where(and(eq(users.id, p.userId), sql`${users.boxPublicKey} IS NULL`))
          .returning({ id: users.id });
        if (set.length === 0) {
          const [u] = await db
            .select({ pk: users.boxPublicKey, sk: users.boxWrappedSecretKey })
            .from(users)
            .where(eq(users.id, p.userId));
          if (!u?.pk || !u.sk || !safeEqual(u.pk, publicKey) || !safeEqual(u.sk, wrappedSecretKey)) {
            throw conflict('the account key is already set');
          }
        }
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/me/box-key',
      { schema: { tags: ['sharing'], security, response: { 200: boxKeySchema, ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const [u] = await db
          .select({ pk: users.boxPublicKey, sk: users.boxWrappedSecretKey })
          .from(users)
          .where(eq(users.id, p.userId));
        if (!u?.pk || !u.sk) throw notFound('no account key yet');
        return { publicKey: toB64(u.pk), wrappedSecretKey: toB64(u.sk) };
      },
    );

    app.get(
      '/users/:userId/public-key',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: z.object({ userId: id() }),
          response: { 200: publicKeyResponseSchema, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const other = req.params.userId;
        // Only accounts sharing something with the caller (an accepted invitation makes a member);
        // anything else looks exactly like a missing account.
        const related =
          other === p.userId ||
          (
            await db.execute(sql`
              SELECT 1 FROM members m
              WHERE (m.owner_id = ${p.userId} AND m.user_id = ${other})
                 OR (m.user_id = ${p.userId} AND m.owner_id = ${other})
                 OR (m.user_id = ${p.userId} AND EXISTS (
                      SELECT 1 FROM members o WHERE o.user_id = ${other}
                        AND o.notebook_id IS NOT DISTINCT FROM m.notebook_id
                        AND o.note_id IS NOT DISTINCT FROM m.note_id))
              LIMIT 1`)
          ).rows.length > 0;
        const [u] = related
          ? await db.select({ pk: users.boxPublicKey }).from(users).where(eq(users.id, other))
          : [];
        if (!u?.pk) throw notFound('account not found');
        return { userId: other, publicKey: toB64(u.pk) };
      },
    );

    // ------------------------------------------------------------------ invitations

    app.post(
      '/invitations',
      {
        schema: {
          tags: ['sharing'],
          security,
          body: createInvitationRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        await db.transaction(async (tx) => {
          const t = await requireOwnTarget(tx, p.userId, b.target, true);
          const [me] = await tx
            .select({ email: users.email, pk: users.boxPublicKey })
            .from(users)
            .where(eq(users.id, p.userId));
          if (!me!.pk) throw conflict('set up the account key first (PUT /me/box-key)');
          if (me!.email === b.email) throw badRequest('cannot invite yourself');

          const now = Date.now();
          const [sent] = await tx
            .select({ n: sql<number>`count(*)::int`, oldest: sql<Date | null>`min(${invitations.createdAt})` })
            .from(invitations)
            .where(and(eq(invitations.ownerId, p.userId), gt(invitations.createdAt, new Date(now - DAY_MS))));
          const replay = await tx.select().from(invitations).where(eq(invitations.id, b.invitationId));
          const prior = replay[0];
          if (prior && (prior.ownerId !== p.userId || prior.email !== b.email || targetOf(prior).id !== t.id)) {
            throw conflict('invitation exists');
          }
          const [pending] = await tx
            .select()
            .from(invitations)
            .where(
              and(
                eq(invitationTargetCol(t.kind), t.id),
                eq(invitations.email, b.email),
                eq(invitations.status, 'pending'),
              ),
            );
          const renewal = prior ?? pending;
          if (!renewal && sent!.n >= MAX_INVITATIONS_PER_DAY) {
            const oldest = sent!.oldest ? new Date(sent!.oldest).getTime() : now;
            throw new ApiError('rate_limited', 'too many invitations today', undefined, Math.max(1, oldest + DAY_MS - now));
          }

          // The account is looked up whether or not it exists, and the answer is the same
          // either way (api.md): only a member that already exists can be told apart, which
          // the owner sees in the member list anyway.
          const [invitee] = await tx.select({ id: users.id }).from(users).where(eq(users.email, b.email));
          if (invitee && (await memberOf(tx, t, invitee.id))) throw conflict('already a member');

          // A pending invitation that is still running already counts against the limit.
          const counted = renewal?.status === 'pending' && renewal.expiresAt > new Date(now);
          if (!counted) {
            const [counts] = await tx
              .select({
                n: sql<number>`(SELECT count(*) FROM members WHERE ${memberTargetCol(t.kind)} = ${t.id})
                  + (SELECT count(*) FROM invitations WHERE ${invitationTargetCol(t.kind)} = ${t.id}
                     AND status = 'pending' AND expires_at > now())`,
              })
              .from(sql`(SELECT 1) AS one`);
            if (Number(counts!.n) >= MAX_MEMBERS) throw conflict('member limit');
          }

          const expiresAt = new Date(now + INVITATION_TTL_MS);
          if (renewal) {
            // A repeat replaces the role and extends the term; the newest id is the one the link uses.
            await tx
              .update(invitations)
              .set({ id: b.invitationId, role: b.role, expiresAt, status: 'pending', respondedAt: null })
              .where(eq(invitations.id, renewal.id));
          } else {
            await tx.insert(invitations).values({
              id: b.invitationId,
              ownerId: p.userId,
              ...targetValues(t),
              email: b.email,
              role: b.role,
              expiresAt,
            });
          }
        });
        return reply.code(204).send(null);
      },
    );

    const statusOf = (i: InvitationRow) =>
      i.status === 'pending' && i.expiresAt <= new Date() ? ('expired' as const) : i.status;

    app.get(
      '/invitations',
      {
        schema: {
          tags: ['sharing'],
          security,
          querystring: z.object({ target: z.string().regex(/^(notebook|note):[0-9a-f-]{36}$/) }),
          response: { 200: z.array(outgoingInvitationSchema), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const [kind, targetId] = req.query.target.split(':') as [TargetKind, string];
        const t = await requireOwnTarget(db, p.userId, { kind, id: targetId });
        const rows = await db
          .select()
          .from(invitations)
          .where(eq(invitationTargetCol(t.kind), t.id))
          .orderBy(desc(invitations.createdAt));
        return rows.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          status: statusOf(i),
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt.toISOString(),
        }));
      },
    );

    app.delete(
      '/invitations/:id',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: z.object({ id: id() }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const gone = await db
          .delete(invitations)
          .where(
            and(eq(invitations.id, req.params.id), eq(invitations.ownerId, p.userId), eq(invitations.status, 'pending')),
          )
          .returning({ id: invitations.id });
        if (gone.length === 0) throw notFound('invitation not found');
        return reply.code(204).send(null);
      },
    );

    /** A pending, unexpired invitation addressed to the caller's email. */
    async function incoming(tx: DbOrTx, userId: string, invitationId: string, lock = false) {
      const q = tx
        .select({ inv: invitations, me: { email: users.email, createdAt: users.createdAt, pk: users.boxPublicKey } })
        .from(invitations)
        .innerJoin(users, eq(users.id, userId))
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.email, users.email),
            eq(invitations.status, 'pending'),
            gt(invitations.expiresAt, new Date()),
          ),
        );
      const [row] = lock ? await q.for('update', { of: invitations }) : await q;
      if (!row) throw notFound('invitation not found');
      return row;
    }

    app.get(
      '/invitations/incoming',
      {
        schema: {
          tags: ['sharing'],
          security,
          response: { 200: z.array(incomingInvitationSchema), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const owner = sql`owner`;
        const rows = await db
          .select({
            inv: invitations,
            fromEmail: sql<string>`${owner}.email`,
          })
          .from(invitations)
          .innerJoin(users, eq(users.id, p.userId))
          .innerJoin(sql`users AS owner`, sql`${owner}.id = ${invitations.ownerId}`)
          .where(
            and(
              eq(invitations.email, users.email),
              eq(invitations.status, 'pending'),
              gt(invitations.expiresAt, new Date()),
            ),
          )
          .orderBy(desc(invitations.createdAt));
        return rows.map(({ inv, fromEmail }) => ({
          id: inv.id,
          target: targetOf(inv),
          from: { userId: inv.ownerId, email: fromEmail },
          role: inv.role,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
        }));
      },
    );

    app.post(
      '/invitations/:id/accept',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: z.object({ id: id() }),
          body: z.object({}).optional(),
          response: { 200: sharedItemSchema, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const { member, target } = await db.transaction(async (tx) => {
          const { inv, me } = await incoming(tx, p.userId, req.params.id, true);
          // The owner wraps the key for this account's public key (crypto.md §10.2).
          if (!me.pk) throw conflict('set up the account key first (PUT /me/box-key)');
          const t = await loadTarget(tx, targetOf(inv), true);
          if (!t) throw notFound('invitation not found');
          await tx
            .update(invitations)
            .set({ status: 'accepted', respondedAt: new Date() })
            .where(eq(invitations.id, inv.id));
          const [created] = await tx
            .insert(members)
            .values({
              ownerId: inv.ownerId,
              ...targetValues(t),
              userId: p.userId,
              role: inv.role,
              accountCreatedAfterInvite: me.createdAt > inv.createdAt,
            })
            .onConflictDoNothing()
            .returning();
          return { member: created ?? (await memberOf(tx, t, p.userId))!, target: t };
        });
        accessChanged(p.userId);
        return sharedItem(member, target);
      },
    );

    app.post(
      '/invitations/:id/decline',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: z.object({ id: id() }),
          body: z.object({}).optional(),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        await db.transaction(async (tx) => {
          const { inv } = await incoming(tx, p.userId, req.params.id, true);
          await tx
            .update(invitations)
            .set({ status: 'declined', respondedAt: new Date() })
            .where(eq(invitations.id, inv.id));
        });
        return reply.code(204).send(null);
      },
    );

    // ---------------------------------------------------------------------- members

    app.get(
      '/members/:kind/:id',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: targetParams,
          response: { 200: z.array(memberSchema), ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const t = await requireVisibleTarget(db, p.userId, req.params);
        const rows = await db
          .select({ m: members, email: users.email })
          .from(members)
          .innerJoin(users, eq(users.id, members.userId))
          .where(eq(memberTargetCol(t.kind), t.id))
          .orderBy(asc(members.joinedAt));
        return rows.map(({ m, email }) => ({
          userId: m.userId,
          email,
          role: m.role,
          status: hasCurrentKey(m, t) ? ('active' as const) : ('awaiting_key' as const),
          joinedAt: m.joinedAt.toISOString(),
          accountCreatedAfterInvite: m.accountCreatedAfterInvite,
        }));
      },
    );

    const memberParams = targetParams.extend({ userId: id() });

    app.patch(
      '/members/:kind/:id/:userId',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: memberParams,
          body: patchMemberRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const t = await requireOwnTarget(db, p.userId, req.params);
        const rows = await db
          .update(members)
          .set({ role: req.body.role })
          .where(and(eq(memberTargetCol(t.kind), t.id), eq(members.userId, req.params.userId)))
          .returning({ id: members.id });
        if (rows.length === 0) throw notFound('member not found');
        accessChanged(req.params.userId);
        return reply.code(204).send(null);
      },
    );

    app.delete(
      '/members/:kind/:id/:userId',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: memberParams,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const t = await loadTarget(db, req.params);
        // The owner removes anyone; a member removes only itself («Выйти»).
        const allowed = t && (t.ownerId === p.userId || req.params.userId === p.userId);
        const gone = allowed
          ? await db
              .delete(members)
              .where(and(eq(memberTargetCol(t.kind), t.id), eq(members.userId, req.params.userId)))
              .returning({ id: members.id })
          : [];
        if (gone.length === 0) throw notFound('member not found');
        // Access closes at once; the key rotation is flagged by the members_gone trigger.
        accessChanged(req.params.userId);
        return reply.code(204).send(null);
      },
    );

    app.put(
      '/members/:kind/:id/:userId/key',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: memberParams,
          body: putMemberKeyRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        await db.transaction(async (tx) => {
          const t = await requireOwnTarget(tx, p.userId, req.params, true);
          if (req.body.version !== t.keyVersion) throw conflict('key version is not current');
          const rows = await tx
            .update(members)
            .set({ wrappedKey: fromB64(req.body.wrappedKey), keyVersion: req.body.version })
            .where(and(eq(memberTargetCol(t.kind), t.id), eq(members.userId, req.params.userId)))
            .returning({ id: members.id });
          if (rows.length === 0) throw notFound('member not found');
        });
        // Giving the key is also the owner's confirmation of an account created after the invitation.
        accessChanged(req.params.userId);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/members/:kind/:id/rotate',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: targetParams,
          body: rotateKeyRequestSchema,
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        const t0 = await loadTarget(db, req.params);
        if (t0?.kind === 'notebook' && t0.ownerId === p.userId) {
          if (t0.mode === 'agent' && !b.notebookKey) throw badRequest('notebookKey is required for an agent-mode notebook');
          if (t0.mode !== 'agent' && b.notebookKey) throw badRequest('notebookKey is only sent for an agent-mode notebook');
        }
        if (req.params.kind === 'note' && b.notebookKey) throw badRequest('notebookKey is only sent for a notebook');
        const serverWrappedKey =
          b.notebookKey && req.params.kind === 'notebook'
            ? Buffer.from(await ctx.keys.wrapNotebookKey(req.params.id, fromB64(b.notebookKey)))
            : null;
        await db.transaction(async (tx) => {
          // One transaction under the target's row lock: of two concurrent rotations only one passes.
          const t = await requireOwnTarget(tx, p.userId, req.params, true);
          if (b.version !== t.keyVersion + 1) throw conflict('version must be the current one + 1');
          const current = await tx.select().from(members).where(eq(memberTargetCol(t.kind), t.id));
          // Exactly the active members (api.md): a member awaiting its key gets the new version
          // later through PUT …/key, so a key never goes out without the owner's confirmation.
          const active = new Map(current.filter((m) => hasCurrentKey(m, t)).map((m) => [m.userId, m]));
          const given = new Set(b.memberKeys.map((k) => k.userId));
          if (given.size !== active.size || [...given].some((u) => !active.has(u))) {
            throw conflict('memberKeys must name exactly the active members');
          }
          const byUser = active;
          for (const k of b.memberKeys) {
            await tx
              .update(members)
              .set({ wrappedKey: fromB64(k.wrappedKey), keyVersion: b.version })
              .where(eq(members.id, byUser.get(k.userId)!.id));
          }
          const keyChain = [b.previousKeyWrap, ...t.keyChain];
          if (t.kind === 'notebook') {
            // The notes get their new keys afterwards (crypto.md §10.3, step 2): pending until rotate/done.
            await tx
              .update(notebooks)
              .set({
                wrappedKey: fromB64(b.ownerWrappedKey),
                keyVersion: b.version,
                keyChain,
                keyRotationPending: true,
                // A voluntary rotation starts the flag here; one after a departure keeps its version.
                pendingSinceVersion: t.keyRotationPending ? sql`${notebooks.pendingSinceVersion}` : t.keyVersion,
                ...(serverWrappedKey ? { serverWrappedKey } : {}),
              })
              .where(eq(notebooks.id, t.id));
          } else {
            await tx
              .update(docs)
              .set({
                ownerWrappedKey: fromB64(b.ownerWrappedKey),
                keyVersion: b.version,
                keyChain,
                keyRotationPending: false,
                pendingSinceVersion: null,
              })
              .where(eq(docs.id, t.id));
          }
        });
        // Keys decrypted for agents must not outlive the old key (crypto.md §8).
        if (req.params.kind === 'notebook') noteKeyCache.forgetNotebooks([req.params.id]);
        else noteKeyCache.forgetNotes([req.params.id]);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/members/:kind/:id/rotate/done',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: targetParams,
          body: z.object({}).optional(),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        if (req.params.kind !== 'notebook') throw badRequest('a note rotation needs no done: rotate clears the flag');
        const t = await requireOwnTarget(db, p.userId, req.params);
        await db
          .update(notebooks)
          .set({ keyRotationPending: false, pendingSinceVersion: null })
          .where(eq(notebooks.id, t.id));
        // The notes now have new keys in the index: agents re-read them.
        noteKeyCache.forgetNotebooks([t.id]);
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/members/note/:id/key',
      {
        schema: {
          tags: ['sharing'],
          security,
          params: z.object({ id: id() }),
          response: { 200: sharedNoteKeyResponseSchema, ...errorResponses },
        },
      },
      async (req) => {
        const p = await requireUser(ctx, req);
        const t = await requireOwnTarget(db, p.userId, { kind: 'note', id: req.params.id });
        const [d] = await db.select({ key: docs.ownerWrappedKey }).from(docs).where(eq(docs.id, t.id));
        // Version 1 is only in NoteMeta: the server has a copy from the first rotation on.
        if (!d?.key) throw notFound('the note key was never rotated (version 1 is in NoteMeta)');
        return { version: t.keyVersion, ownerWrappedKey: toB64(d.key), keyChain: t.keyChain };
      },
    );

    app.get(
      '/shared-by-me',
      { schema: { tags: ['sharing'], security, response: { 200: z.array(sharedByMeItemSchema), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        // Everything the caller owns that has a member, a running invitation or a pending key
        // rotation: on start the owner's client gives keys, rotates and repairs NoteMeta from it.
        const res = await db.execute<{
          kind: TargetKind;
          id: string;
          key_version: number;
          key_rotation_pending: boolean;
          pending_since_version: number | null;
          members: number;
          awaiting_key: number;
        }>(sql`
          WITH targets AS (
            SELECT notebook_id, note_id FROM members WHERE owner_id = ${p.userId}
            UNION
            SELECT notebook_id, note_id FROM invitations
            WHERE owner_id = ${p.userId} AND status = 'pending' AND expires_at > now()
            -- After the last member left the key must still change (and guest links be
            -- re-created): a pending rotation keeps the resource listed until it is done.
            UNION
            SELECT id, NULL FROM notebooks WHERE user_id = ${p.userId} AND key_rotation_pending
            UNION
            SELECT NULL, id FROM docs WHERE user_id = ${p.userId} AND kind = 'note' AND key_rotation_pending
          )
          SELECT 'notebook' AS kind, n.id, n.key_version, n.key_rotation_pending, n.pending_since_version,
            (SELECT count(*)::int FROM members m WHERE m.notebook_id = n.id) AS members,
            (SELECT count(*)::int FROM members m WHERE m.notebook_id = n.id
               AND (m.wrapped_key IS NULL OR m.key_version IS DISTINCT FROM n.key_version)) AS awaiting_key
          FROM notebooks n WHERE n.user_id = ${p.userId} AND n.id IN (SELECT notebook_id FROM targets)
          UNION ALL
          SELECT 'note', d.id, d.key_version, d.key_rotation_pending, d.pending_since_version,
            (SELECT count(*)::int FROM members m WHERE m.note_id = d.id),
            (SELECT count(*)::int FROM members m WHERE m.note_id = d.id
               AND (m.wrapped_key IS NULL OR m.key_version IS DISTINCT FROM d.key_version))
          FROM docs d WHERE d.user_id = ${p.userId} AND d.kind = 'note' AND d.id IN (SELECT note_id FROM targets)
          ORDER BY 1, 2`);
        return res.rows.map((r) => ({
          target: { kind: r.kind, id: r.id },
          keyVersion: Number(r.key_version),
          keyRotationPending: r.key_rotation_pending,
          pendingSinceVersion: r.pending_since_version === null ? null : Number(r.pending_since_version),
          members: Number(r.members),
          awaitingKey: Number(r.awaiting_key),
        }));
      },
    );

    app.get(
      '/shared-with-me',
      { schema: { tags: ['sharing'], security, response: { 200: z.array(sharedItemSchema), ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const rows = await db
          .select()
          .from(members)
          .where(eq(members.userId, p.userId))
          .orderBy(asc(members.joinedAt));
        const out = [];
        for (const m of rows) {
          const t = await loadTarget(db, targetOf(m));
          if (t) out.push(await sharedItem(m, t));
        }
        return out;
      },
    );
  };
}

/** Notebook ids of the caller that have members (Notebook.shared). */
export async function sharedNotebookIds(db: DbOrTx, notebookIds: string[]): Promise<Set<string>> {
  if (notebookIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ id: members.notebookId })
    .from(members)
    .where(and(isNotNull(members.notebookId), inArray(members.notebookId, notebookIds)));
  return new Set(rows.map((r) => r.id!));
}

