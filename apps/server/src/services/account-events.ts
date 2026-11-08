import { eq } from 'drizzle-orm';
import type { AccountChangedWhat } from '@datascratch/shared/contracts';
import type { AppContext } from '../context.js';
import type { DbOrTx } from '../db/client.js';
import { members } from '../db/schema.js';
import { topics } from '../sync/hub.js';
import { memberTargetCol, type TargetKind } from './sharing.js';

/**
 * Tell every device of these accounts what to re-read (sync-protocol.md §6, D-62). Only sent
 * after the change is committed: a client that re-reads at once must see it.
 */
export function accountChanged(
  ctx: AppContext,
  userIds: Iterable<string | null | undefined>,
  what: AccountChangedWhat[],
): void {
  for (const u of new Set(userIds)) if (u) ctx.hub.publish(topics.user(u), { type: 'account_changed', what });
}

/** The owner and every member of a shared notebook, note or space. */
export async function audienceOf(db: DbOrTx, t: { kind: TargetKind; id: string; ownerId: string }): Promise<string[]> {
  const ms = await db.select({ userId: members.userId }).from(members).where(eq(memberTargetCol(t.kind), t.id));
  return [t.ownerId, ...ms.map((m) => m.userId)];
}

/** What a membership change of a target is about for its accounts. */
export const membershipWhat = (kind: TargetKind): AccountChangedWhat[] =>
  kind === 'space' ? ['members', 'spaces'] : ['members'];
