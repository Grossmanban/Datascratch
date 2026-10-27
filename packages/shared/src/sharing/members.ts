// Owner-side member key delivery (api.md «Совместный доступ», crypto.md §10.2).
import type { Member, ShareTarget } from "../contracts/api.js";
import { fromBase64Url } from "../crypto/base64url.js";
import { wrapKeyForMember } from "../crypto/sharing.js";
import type { SharingApi } from "./api.js";
import type { VersionedKeys } from "./keys.js";

export interface OwnerIdentity {
  userId: string;
  secretKey: Uint8Array;
}

/** Wrap `key` (of `version`) for each member, fetching their public keys. */
export async function wrapForMembers(
  api: Pick<SharingApi, "getPublicKey">,
  target: ShareTarget,
  key: Uint8Array,
  version: number,
  owner: OwnerIdentity,
  userIds: string[],
): Promise<{ userId: string; wrappedKey: string }[]> {
  const out: { userId: string; wrappedKey: string }[] = [];
  for (const userId of userIds) {
    const pk = await api.getPublicKey(userId);
    if (!pk) throw new Error(`no public key for member ${userId}`);
    out.push({
      userId,
      wrappedKey: wrapKeyForMember(key, owner.secretKey, fromBase64Url(pk.publicKey), {
        kind: target.kind,
        targetId: target.id,
        version,
        fromUserId: owner.userId,
        toUserId: userId,
      }),
    });
  }
  return out;
}

/**
 * Give the current key to members that accepted but have no key yet
 * (`awaiting_key`). Sign-up does not verify e-mail addresses, so a member
 * whose account was created after the invitation gets the key only when
 * `confirm` says so (the owner is asked «<почта> приняла приглашение —
 * открыть доступ?», D-54); without `confirm` they keep waiting. Returns the
 * members that got the key.
 */
export async function deliverAwaitingKeys(options: {
  api: Pick<SharingApi, "listMembers" | "getPublicKey" | "putMemberKey">;
  target: ShareTarget;
  keys: VersionedKeys;
  owner: OwnerIdentity;
  confirm?: (member: Member) => boolean | Promise<boolean>;
}): Promise<Member[]> {
  const { api, target, keys, owner } = options;
  const waiting = (await api.listMembers(target)).filter(
    (m) => m.status === "awaiting_key" && m.userId !== owner.userId,
  );
  const delivered: Member[] = [];
  for (const member of waiting) {
    if (member.accountCreatedAfterInvite && !(await options.confirm?.(member))) continue;
    const [wrap] = await wrapForMembers(api, target, keys.keys[0]!, keys.version, owner, [
      member.userId,
    ]);
    await api.putMemberKey(target, member.userId, {
      version: keys.version,
      wrappedKey: wrap!.wrappedKey,
    });
    delivered.push(member);
  }
  return delivered;
}
