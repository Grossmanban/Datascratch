import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { AppContext } from '../context.js';
import { devices } from '../db/schema.js';
import { deviceRevoked, unauthorized } from '../lib/errors.js';
import { revokeReason } from '../services/sessions.js';
import { loadActiveShare } from '../services/access.js';
import type { GuestPrincipal, UserPrincipal } from '../services/principal.js';

const LAST_SEEN_RESOLUTION_MS = 5 * 60_000;

export function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

export const WEB_COOKIE = 'ds_web';
export const WEB_SESSION_TTL_SEC = 60 * 60;

export function readCookie(req: FastifyRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function deviceActive(ctx: AppContext, userId: string, deviceId: string) {
  const [dev] = await ctx.database.db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId), isNull(devices.revokedAt)));
  return !!dev;
}

/** The browser session cookie (set by POST /v1/auth/web-session); the device must still be active. */
export async function verifyWebCookie(ctx: AppContext, req: FastifyRequest): Promise<UserPrincipal | null> {
  const token = readCookie(req, WEB_COOKIE);
  const claims = token ? await ctx.tokens.verifyWeb(token) : null;
  if (!claims || !(await deviceActive(ctx, claims.userId, claims.deviceId))) return null;
  return { kind: 'user', userId: claims.userId, deviceId: claims.deviceId };
}

/**
 * Verify an access token and that its device (session) has not been revoked. A valid token
 * of a revoked device throws device_revoked (with the reason): the client must wipe its
 * local data. An expired or invalid token is just null (a plain 401: refresh and retry).
 */
export async function verifyUserToken(ctx: AppContext, token: string): Promise<UserPrincipal | null> {
  const claims = await ctx.tokens.verifyAccess(token);
  if (!claims) return null;
  const { db } = ctx.database;
  const [dev] = await db
    .select({ id: devices.id, lastSeenAt: devices.lastSeenAt, revokedAt: devices.revokedAt, reason: devices.revokedReason })
    .from(devices)
    .where(and(eq(devices.id, claims.deviceId), eq(devices.userId, claims.userId)));
  // Device rows are only ever removed with their account (revoking marks them): a valid,
  // server-signed token whose device is gone belongs to a deleted account.
  if (!dev) throw deviceRevoked('account_deleted');
  if (dev.revokedAt) throw deviceRevoked(revokeReason(dev.reason));
  if (Date.now() - dev.lastSeenAt.getTime() > LAST_SEEN_RESOLUTION_MS) {
    await db
      .update(devices)
      .set({ lastSeenAt: sql`now()` })
      .where(and(eq(devices.id, dev.id), lt(devices.lastSeenAt, sql`now() - interval '1 minute'`)));
  }
  return { kind: 'user', userId: claims.userId, deviceId: claims.deviceId };
}

export async function requireUser(ctx: AppContext, req: FastifyRequest): Promise<UserPrincipal> {
  const token = bearer(req);
  const p = token ? await verifyUserToken(ctx, token) : null;
  if (!p) throw unauthorized('missing or invalid access token');
  return p;
}

/** Verify a guest token and that its share is still active. */
export async function verifyGuestToken(
  ctx: AppContext,
  token: string,
  deviceId = 'guest',
): Promise<GuestPrincipal | null> {
  const claims = await ctx.tokens.verifyGuest(token);
  if (!claims) return null;
  const share = await loadActiveShare(ctx.database.db, claims.shareId);
  if (!share) return null;
  return {
    kind: 'guest',
    shareId: share.id,
    ownerId: share.userId,
    permission: share.permission,
    target: { kind: share.targetKind, id: share.targetId },
    deviceId,
    expiresAt: share.expiresAt,
  };
}

/** A user access token or a guest token (guests may use the attachment endpoints). */
export async function requireUserOrGuest(ctx: AppContext, req: FastifyRequest): Promise<UserPrincipal | GuestPrincipal> {
  const token = bearer(req);
  if (token) {
    const p = (await verifyUserToken(ctx, token)) ?? (await verifyGuestToken(ctx, token));
    if (p) return p;
  }
  throw unauthorized('missing or invalid token');
}
