import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { devices, refreshTokens, users } from '../db/schema.js';
import { randomToken, sha256, toB64, uuidv7 } from '../lib/encoding.js';
import { unauthorized } from '../lib/errors.js';
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

async function issueRefresh(ctx: AppContext, db: DbOrTx, deviceId: string): Promise<string> {
  const token = randomToken(32);
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
): Promise<SessionDto> {
  const refreshToken = await issueRefresh(ctx, db, deviceId);
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
 * Exchange a refresh token for a new pair (rotation). Presenting an already
 * used token is treated as theft: the whole device session is revoked.
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
    if (rt.usedAt) {
      await tx.update(devices).set({ revokedAt: sql`now()` }).where(eq(devices.id, rt.deviceId));
      await tx.delete(refreshTokens).where(eq(refreshTokens.deviceId, rt.deviceId));
      revokedDevice = rt.deviceId;
      return null;
    }
    if (rt.expiresAt <= new Date()) return null;
    const [row] = await tx
      .select({ device: devices, user: users })
      .from(devices)
      .innerJoin(users, eq(users.id, devices.userId))
      .where(and(eq(devices.id, rt.deviceId), isNull(devices.revokedAt)));
    if (!row) return null;
    await tx.update(refreshTokens).set({ usedAt: sql`now()` }).where(eq(refreshTokens.id, rt.id));
    await tx.update(devices).set({ lastSeenAt: sql`now()` }).where(eq(devices.id, rt.deviceId));
    return sessionFor(ctx, tx, row.user, rt.deviceId);
  });
  if (revokedDevice) ctx.hub.publish(topics.device(revokedDevice), { type: 'revoked', reason: 'refresh token reuse' });
  if (!result) throw unauthorized('invalid refresh token');
  return result;
}

/** Revoke one device: its refresh tokens stop working and live connections are closed. */
export async function revokeDevice(ctx: AppContext, db: DbOrTx, userId: string, deviceId: string): Promise<boolean> {
  const rows = await db
    .update(devices)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(devices.id, deviceId), eq(devices.userId, userId), isNull(devices.revokedAt)))
    .returning({ id: devices.id });
  await db.delete(refreshTokens).where(eq(refreshTokens.deviceId, deviceId));
  if (rows.length > 0) ctx.hub.publish(topics.device(deviceId), { type: 'revoked', reason: 'device revoked' });
  return rows.length > 0;
}

/** Revoke every device of a user except `keep` (password change, recovery). */
export async function revokeOtherDevices(ctx: AppContext, db: DbOrTx, userId: string, keep: string | null) {
  const rows = await db
    .update(devices)
    .set({ revokedAt: sql`now()` })
    .where(
      keep
        ? and(eq(devices.userId, userId), isNull(devices.revokedAt), ne(devices.id, keep))
        : and(eq(devices.userId, userId), isNull(devices.revokedAt)),
    )
    .returning({ id: devices.id });
  for (const r of rows) {
    await db.delete(refreshTokens).where(eq(refreshTokens.deviceId, r.id));
  }
  return rows.map((r) => r.id);
}

export function publishDeviceRevocations(ctx: AppContext, deviceIds: string[], reason: string) {
  for (const id of deviceIds) ctx.hub.publish(topics.device(id), { type: 'revoked', reason });
}
