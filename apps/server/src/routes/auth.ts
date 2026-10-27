import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { WEB_COOKIE, WEB_SESSION_TTL_SEC, requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import type { UserPrincipal } from '../services/principal.js';
import { devices, docs, recoveryTokens, refreshTokens, securityEvents, users } from '../db/schema.js';
import { fromB64, randomToken, safeEqual, sha256, toB64, uuidv7 } from '../lib/encoding.js';
import { ApiError, conflict, forbidden, unauthorized } from '../lib/errors.js';
import { fakeSalt, hashSecret, verifyDummy, verifySecret } from '../lib/password.js';
import {
  createSession,
  publishDeviceRevocations,
  refreshSession,
  revokeDevice,
  revokeOtherDevices,
} from '../services/sessions.js';
import { DeviceName, Email, Key32, Kdf, Salt, Session, WrappedKey, errorResponses, id } from './schemas.js';

const DEFAULT_KDF = { alg: 'argon2id13', ops: 3, mem: 67_108_864 } as const;
const RECOVERY_TTL_MS = 15 * 60_000;
const authLimit = { rateLimit: { max: 20, timeWindow: '1 minute' } };
/**
 * Attempts per email address per minute, whatever address they come from (the per-IP
 * limits alone are bypassed by spreading over many addresses).
 */
const PER_EMAIL_PER_MINUTE = 10;

/** One message for every signup conflict: it must not tell whether an email is registered. */
const SIGNUP_CONFLICT = 'signup failed: this account cannot be created';

async function recordEvent(
  tx: DbOrTx,
  p: UserPrincipal,
  kind: 'password_changed' | 'recovery_used' | 'recovery_key_rotated',
) {
  const [d] = await tx.select({ name: devices.name }).from(devices).where(eq(devices.id, p.deviceId));
  await tx.insert(securityEvents).values({ userId: p.userId, kind, deviceId: p.deviceId, deviceName: d?.name ?? null });
}

export function authRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const inviteCodes = ctx.config.DS_INVITE_CODES.split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => sha256(c));
    const inviteOk = (code: string | undefined) =>
      code !== undefined && inviteCodes.some((c) => safeEqual(c, sha256(code.trim())));
    const emailWindows = new Map<string, { start: number; count: number }>();
    /** Fixed one-minute window per route and email address (login, prelogin, signup, recovery). */
    const perEmail = (route: string, email: string) => {
      const key = `${route}|${email}`;
      const now = Date.now();
      let w = emailWindows.get(key);
      if (!w || now - w.start >= 60_000) {
        if (emailWindows.size > 50_000) {
          for (const [k, v] of emailWindows) if (now - v.start >= 60_000) emailWindows.delete(k);
        }
        w = { start: now, count: 0 };
        emailWindows.set(key, w);
      }
      w.count += 1;
      if (w.count > PER_EMAIL_PER_MINUTE) throw new ApiError('rate_limited', 'too many attempts for this account, retry in a minute');
    };
    const { db } = ctx.database;

    app.post(
      '/auth/prelogin',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          body: z.object({ email: Email }),
          response: { 200: z.object({ salt: z.string(), kdf: Kdf }), ...errorResponses },
        },
      },
      async (req) => {
        perEmail('prelogin', req.body.email);
        const [u] = await db.select({ salt: users.salt, kdf: users.kdf }).from(users).where(eq(users.email, req.body.email));
        if (u) return { salt: toB64(u.salt), kdf: u.kdf };
        return { salt: toB64(fakeSalt(ctx.tokens.fakeSaltKey, req.body.email)), kdf: DEFAULT_KDF };
      },
    );

    app.post(
      '/auth/signup',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          body: z.object({
            email: Email,
            salt: Salt,
            kdf: Kdf,
            loginKey: Key32,
            recoveryLoginKey: Key32,
            wrappedMasterKeyPassword: WrappedKey,
            wrappedMasterKeyRecovery: WrappedKey,
            userId: id(),
            accountDocId: id(),
            deviceName: DeviceName.optional(),
            /** Required when DS_SIGNUP=invite. */
            inviteCode: z.string().min(1).max(200).optional(),
          }),
          response: { 200: Session, ...errorResponses },
        },
      },
      async (req) => {
        perEmail('signup', req.body.email);
        const b = req.body;
        const loginKey = fromB64(b.loginKey);
        const wrappedPw = fromB64(b.wrappedMasterKeyPassword);
        const [existing] = await db.select().from(users).where(eq(users.id, b.userId));
        if (existing) {
          // Retried signup (lost response): same account and same secrets → new session.
          const same =
            existing.email === b.email &&
            existing.accountDocId === b.accountDocId &&
            safeEqual(existing.wrappedMasterKeyPassword, wrappedPw) &&
            (await verifySecret(existing.loginHash, loginKey));
          if (!same) throw conflict(SIGNUP_CONFLICT);
          return createSession(ctx, db, existing, b.deviceName ?? 'Unknown device');
        }
        if (ctx.config.DS_SIGNUP === 'closed') throw forbidden('signup is closed on this server');
        if (ctx.config.DS_SIGNUP === 'invite' && !inviteOk(b.inviteCode)) {
          throw forbidden('a valid invite code is required');
        }
        const [loginHash, recoveryHash] = await Promise.all([
          hashSecret(loginKey),
          hashSecret(fromB64(b.recoveryLoginKey)),
        ]);
        return db.transaction(async (tx) => {
          const inserted = await tx
            .insert(users)
            .values({
              id: b.userId,
              email: b.email,
              salt: fromB64(b.salt),
              kdf: b.kdf,
              loginHash,
              recoveryHash,
              wrappedMasterKeyPassword: wrappedPw,
              wrappedMasterKeyRecovery: fromB64(b.wrappedMasterKeyRecovery),
              accountDocId: b.accountDocId,
            })
            .onConflictDoNothing()
            .returning();
          const user = inserted[0];
          if (!user) throw conflict(SIGNUP_CONFLICT);
          const doc = await tx
            .insert(docs)
            .values({ id: b.accountDocId, userId: user.id, kind: 'account', notebookId: null })
            .onConflictDoNothing()
            .returning({ id: docs.id });
          if (doc.length === 0) throw conflict(SIGNUP_CONFLICT);
          return createSession(ctx, tx, user, b.deviceName ?? 'Unknown device');
        });
      },
    );

    app.post(
      '/auth/login',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          body: z.object({ email: Email, loginKey: Key32, deviceName: DeviceName }),
          response: { 200: Session, ...errorResponses },
        },
      },
      async (req) => {
        perEmail('login', req.body.email);
        const loginKey = fromB64(req.body.loginKey);
        const [u] = await db.select().from(users).where(eq(users.email, req.body.email));
        const ok = u ? await verifySecret(u.loginHash, loginKey) : await verifyDummy(loginKey);
        if (!u || !ok) throw unauthorized('invalid email or password');
        return createSession(ctx, db, u, req.body.deviceName);
      },
    );

    app.post(
      '/auth/refresh',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          body: z.object({ refreshToken: z.string().min(1).max(200) }),
          response: { 200: Session, ...errorResponses },
        },
      },
      async (req) => refreshSession(ctx, req.body.refreshToken),
    );

    app.post(
      '/auth/logout',
      {
        schema: {
          tags: ['auth'],
          body: z.object({ refreshToken: z.string().min(1).max(200) }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const [row] = await db
          .select({ deviceId: refreshTokens.deviceId, userId: devices.userId })
          .from(refreshTokens)
          .innerJoin(devices, eq(devices.id, refreshTokens.deviceId))
          .where(eq(refreshTokens.tokenHash, sha256(req.body.refreshToken)));
        if (row) await revokeDevice(ctx, db, row.userId, row.deviceId);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/auth/recovery/start',
      {
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
        schema: {
          tags: ['auth'],
          body: z.object({ email: Email, recoveryLoginKey: Key32 }),
          response: {
            200: z.object({ recoveryToken: z.string(), wrappedMasterKeyRecovery: z.string(), userId: id() }),
            ...errorResponses,
          },
        },
      },
      async (req) => {
        perEmail('recovery', req.body.email);
        const key = fromB64(req.body.recoveryLoginKey);
        const [u] = await db.select().from(users).where(eq(users.email, req.body.email));
        const ok = u ? await verifySecret(u.recoveryHash, key) : await verifyDummy(key);
        if (!u || !ok) throw unauthorized('invalid email or recovery key');
        const token = randomToken(32);
        await db.insert(recoveryTokens).values({
          id: uuidv7(),
          userId: u.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + RECOVERY_TTL_MS),
        });
        return { recoveryToken: token, wrappedMasterKeyRecovery: toB64(u.wrappedMasterKeyRecovery), userId: u.id };
      },
    );

    app.post(
      '/auth/recovery/finish',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          body: z.object({
            recoveryToken: z.string().min(1).max(200),
            salt: Salt,
            kdf: Kdf,
            loginKey: Key32,
            wrappedMasterKeyPassword: WrappedKey,
            deviceName: DeviceName.optional(),
          }),
          response: { 200: Session, ...errorResponses },
        },
      },
      async (req) => {
        const b = req.body;
        const loginHash = await hashSecret(fromB64(b.loginKey));
        let revoked: string[] = [];
        const session = await db.transaction(async (tx) => {
          const [rt] = await tx
            .update(recoveryTokens)
            .set({ usedAt: sql`now()` })
            .where(
              and(
                eq(recoveryTokens.tokenHash, sha256(b.recoveryToken)),
                isNull(recoveryTokens.usedAt),
                sql`${recoveryTokens.expiresAt} > now()`,
              ),
            )
            .returning({ userId: recoveryTokens.userId });
          if (!rt) throw unauthorized('invalid or expired recovery token');
          const [user] = await tx
            .update(users)
            .set({
              salt: fromB64(b.salt),
              kdf: b.kdf,
              loginHash,
              wrappedMasterKeyPassword: fromB64(b.wrappedMasterKeyPassword),
              updatedAt: sql`now()`,
            })
            .where(eq(users.id, rt.userId))
            .returning();
          // A forgotten (or stolen) password: sign out everywhere.
          revoked = await revokeOtherDevices(ctx, tx, rt.userId, null, 'recovery');
          const session = await createSession(ctx, tx, user!, b.deviceName ?? 'Recovered device');
          await tx.insert(securityEvents).values({
            userId: rt.userId,
            kind: 'recovery_used',
            deviceId: session.deviceId,
            deviceName: b.deviceName ?? 'Recovered device',
          });
          return session;
        });
        publishDeviceRevocations(ctx, revoked, 'recovery');
        return session;
      },
    );

    app.post(
      '/auth/password',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          security: [{ bearer: [] }],
          body: z.object({
            currentLoginKey: Key32,
            salt: Salt,
            kdf: Kdf,
            loginKey: Key32,
            wrappedMasterKeyPassword: WrappedKey,
          }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        const [u] = await db.select().from(users).where(eq(users.id, p.userId));
        if (!u || !(await verifySecret(u.loginHash, fromB64(b.currentLoginKey)))) {
          throw unauthorized('current password is wrong');
        }
        const loginHash = await hashSecret(fromB64(b.loginKey));
        const revoked = await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({
              salt: fromB64(b.salt),
              kdf: b.kdf,
              loginHash,
              wrappedMasterKeyPassword: fromB64(b.wrappedMasterKeyPassword),
              updatedAt: sql`now()`,
            })
            .where(eq(users.id, p.userId));
          await recordEvent(tx, p, 'password_changed');
          return revokeOtherDevices(ctx, tx, p.userId, p.deviceId, 'password_change');
        });
        publishDeviceRevocations(ctx, revoked, 'password_change');
        return reply.code(204).send(null);
      },
    );

    // Replace the recovery key (crypto.md §4): new Argon2id(recoveryLoginKey) and a new
    // wrapping of masterKey, atomically. The old recovery key stops working at once.
    app.post(
      '/auth/recovery-key',
      {
        config: authLimit,
        schema: {
          tags: ['auth'],
          security: [{ bearer: [] }],
          body: z.object({
            currentLoginKey: Key32,
            recoveryLoginKey: Key32,
            wrappedMasterKeyRecovery: WrappedKey,
          }),
          response: { 204: z.null(), ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const b = req.body;
        const [u] = await db.select().from(users).where(eq(users.id, p.userId));
        if (!u || !(await verifySecret(u.loginHash, fromB64(b.currentLoginKey)))) {
          throw unauthorized('current password is wrong');
        }
        const recoveryHash = await hashSecret(fromB64(b.recoveryLoginKey));
        await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({
              recoveryHash,
              wrappedMasterKeyRecovery: fromB64(b.wrappedMasterKeyRecovery),
              updatedAt: sql`now()`,
            })
            .where(eq(users.id, p.userId));
          // Recovery flows started with the old key must not finish.
          await tx.delete(recoveryTokens).where(eq(recoveryTokens.userId, p.userId));
          await recordEvent(tx, p, 'recovery_key_rotated');
        });
        return reply.code(204).send(null);
      },
    );

    // Browser session for server-rendered pages (OAuth consent of agents): the web app
    // calls this with its access token (credentials: "include"), then navigates there.
    const secure = ctx.config.PUBLIC_URL.startsWith('https:') ? '; Secure' : '';
    app.post(
      '/auth/web-session',
      { schema: { tags: ['auth'], security: [{ bearer: [] }], response: { 204: z.null(), ...errorResponses } } },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const token = await ctx.tokens.signWeb(p, WEB_SESSION_TTL_SEC);
        reply.header(
          'set-cookie',
          `${WEB_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${WEB_SESSION_TTL_SEC}${secure}`,
        );
        return reply.code(204).send(null);
      },
    );

    app.delete(
      '/auth/web-session',
      { schema: { tags: ['auth'], response: { 204: z.null() } } },
      async (_req, reply) => {
        reply.header('set-cookie', `${WEB_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
        return reply.code(204).send(null);
      },
    );
  };
}
