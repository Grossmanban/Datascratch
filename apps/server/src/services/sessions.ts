import { createHmac } from 'node:crypto';
import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { devices, refreshTokens, users } from '../db/schema.js';
import { fromB64, randomToken, sha256, toB64, uuidv7 } from '../lib/encoding.js';
import { deviceRevoked, unauthorized, type RevokeReason } from '../lib/errors.js';
import { topics } from '../sync/hub.js';

export interface SessionDto {
  userId: string;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  wrappedMasterKeyPassword: string;
  accountDocId: string;
}

const DAY_MS = 86_400_000;

async function issueRefresh(ctx: AppContext, db: DbOrTx, deviceId: string, token = randomToken(32)): Promise<string> {
  await db.insert(refreshTokens).values({
    id: uuidv7(),
    deviceId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + ctx.config.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
  });
  return token;
}

async function sessionFor(
  ctx: AppContext,
  db: DbOrTx,
  user: Pick<typeof users.$inferSelect, 'id' | 'wrappedMasterKeyPassword' | 'accountDocId'>,
  deviceId: string,
  refreshToken?: string,
): Promise<SessionDto> {
  refreshToken ??= await issueRefresh(ctx, db, deviceId);
  const access = await ctx.tokens.signAccess({ userId: user.id, deviceId });
  return {
    userId: user.id,
    deviceId,
    accessToken: access.token,
    refreshToken,
    accessExpiresAt: access.expiresAt.toISOString(),
    wrappedMasterKeyPassword: toB64(user.wrappedMasterKeyPassword),
    accountDocId: user.accountDocId,
  };
}

/** Create a new device (session) for a user. */
export async function createSession(
  ctx: AppContext,
  db: DbOrTx,
  user: Pick<typeof users.$inferSelect, 'id' | 'wrappedMasterKeyPassword' | 'accountDocId'>,
  deviceName: string,
): Promise<SessionDto> {
  const deviceId = uuidv7();
  await db.insert(devices).values({ id: deviceId, userId: user.id, name: deviceName });
  return sessionFor(ctx, db, user, deviceId);
}

/**
 * The refresh token that replaces `token` on rotation. Derived (not random) so that a
 * retry of the same exchange gets the same token back without the server storing it.
 */
function successorOf(ctx: AppContext, token: string): string {
  const key = sha256(Buffer.concat([Buffer.from('ds-refresh-successor\0'), fromB64(ctx.config.DS_JWT_SECRET)]));
  return createHmac('sha256', key).update(token).digest('base64url');
}

/**
 * Exchange a refresh token for a new pair (rotation). Presenting an already used token
 * is treated as theft and revokes the whole device session, except for a retry within
 * REFRESH_REUSE_GRACE_SEC (the response was lost on the way) while the token that
 * replaced it is still unused: then the same new refresh token is returned again.
 */
export async function refreshSession(ctx: AppContext, token: string): Promise<SessionDto> {
  const { db } = ctx.database;
  let revokedDevice: string | null = null;
  const result = await db.transaction(async (tx) => {
    const [rt] = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, sha256(token)))
      .for('update');
    if (!rt) return null;
    // A revoked device learns it was revoked (and why) instead of a plain 401: it wipes its data.
    const [dev] = await tx
      .select({ revokedAt: devices.revokedAt, reason: devices.revokedReason })
      .from(devices)
      .where(eq(devices.id, rt.deviceId));
    if (dev?.revokedAt) return { revoked: revokeReason(dev.reason) };
    const user = async () => {
      const [row] = await tx
        .select({ user: users })
        .from(devices)
        .innerJoin(users, eq(users.id, devices.userId))
        .where(and(eq(devices.id, rt.deviceId), isNull(devices.revokedAt)));
      return row?.user ?? null;
    };
    const successor = successorOf(ctx, token);
    if (rt.usedAt) {
      if (Date.now() - rt.usedAt.getTime() <= ctx.config.REFRESH_REUSE_GRACE_SEC * 1000) {
        const [next] = await tx
          .select({ id: refreshTokens.id })
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.tokenHash, sha256(successor)),
              eq(refreshTokens.deviceId, rt.deviceId),
              isNull(refreshTokens.usedAt),
              gt(refreshTokens.expiresAt, sql`now()`),
            ),
          );
        const u = next ? await user() : null;
        if (u) return sessionFor(ctx, tx, u, rt.deviceId, successor);
      }
      await tx
        .update(devices)
        .set({ revokedAt: sql`now()`, revokedReason: 'token_reuse' })
        .where(eq(devices.id, rt.deviceId));
      revokedDevice = rt.deviceId;
      return { revoked: 'token_reuse' as const };
    }
    if (rt.expiresAt <= new Date()) return null;
    const u = await user();
    if (!u) return null;
    await tx.update(refreshTokens).set({ usedAt: sql`now()` }).where(eq(refreshTokens.id, rt.id));
    await tx.update(devices).set({ lastSeenAt: sql`now()` }).where(eq(devices.id, rt.deviceId));
    return sessionFor(ctx, tx, u, rt.deviceId, await issueRefresh(ctx, tx, rt.deviceId, successor));
  });
  if (revokedDevice) ctx.hub.publish(topics.device(revokedDevice), { type: 'revoked', reason: 'token_reuse' });
  if (!result) throw unauthorized('invalid refresh token');
  if ('revoked' in result) throw deviceRevoked(result.revoked);
  return result;
}

const REASONS: readonly RevokeReason[] = ['user', 'password_change', 'recovery', 'token_reuse'];
/** Devices revoked before reasons were recorded count as revoked by the user. */
export const revokeReason = (r: string | null | undefined): RevokeReason =>
  REASONS.includes(r as RevokeReason) ? (r as RevokeReason) : 'user';

/**
 * Revoke one device: its tokens stop working and live connections are closed. The refresh
 * tokens stay (useless now) so that the device is told why on its next refresh.
 */
export async function revokeDevice(
  ctx: AppContext,
  db: DbOrTx,
  userId: string,
  deviceId: string,
  reason: RevokeReason = 'user',
): Promise<boolean> {
  const rows = await db
    .update(devices)
    .set({ revokedAt: sql`now()`, revokedReason: reason })
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId), isNull(devices.revokedAt)))
    .returning({ id: devices.id });
  if (rows.length > 0) ctx.hub.publish(topics.device(deviceId), { type: 'revoked', reason });
  return rows.length > 0;
}

/** Revoke every device of a user except `keep` (password change, recovery). */
export async function revokeOtherDevices(
  ctx: AppContext,
  db: DbOrTx,
  userId: string,
  keep: string | null,
  reason: RevokeReason,
) {
  const rows = await db
    .update(devices)
    .set({ revokedAt: sql`now()`, revokedReason: reason })
    .where(
      keep
        ? and(eq(devices.userId, userId), isNull(devices.revokedAt), ne(devices.id, keep))
        : and(eq(devices.userId, userId), isNull(devices.revokedAt)),
    )
    .returning({ id: devices.id });
  return rows.map((r) => r.id);
}

export function publishDeviceRevocations(ctx: AppContext, deviceIds: string[], reason: RevokeReason | 'account_deleted') {
  for (const id of deviceIds) ctx.hub.publish(topics.device(id), { type: 'revoked', reason });
}
