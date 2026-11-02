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

function wrapFor(target: ShareTarget, key: Uint8Array, version: number, owner: OwnerIdentity, userId: string, publicKey: string) {
  return wrapKeyForMember(key, owner.secretKey, fromBase64Url(publicKey), {
    kind: target.kind,
    targetId: target.id,
    version,
    fromUserId: owner.userId,
    toUserId: userId,
  });
}

/** Why the owner is asked before a member gets a key. */
export type ConfirmReason =
  /** The account was created after the invitation (sign-up does not verify e-mail, D-54). */
  | "late_account"
  /** This account has no record of inviting them (trust.ts): the server named them. */
  | "not_invited"
  /** Their public key is not the one this account gave a key to before. */
  | "key_changed";

/**
 * Checks of the members the server names against this account's own record (trust.ts;
 * security review 2026-11-02). `check` says why the owner must be asked, or null; `given`
 * records a key that went to a member's public key.
 */
export interface MemberVetting {
  check(target: ShareTarget, member: Member, publicKey: string): ConfirmReason | null | Promise<ConfirmReason | null>;
  given(target: ShareTarget, userId: string, publicKey: string): void | Promise<void>;
}

/** A key for `member` was refused (the owner said no, or no one could be asked). */
export class MemberNotConfirmedError extends Error {
  constructor(readonly member: Member, readonly reason: ConfirmReason) {
    super(`key not given to ${member.userId}: ${reason}`);
    this.name = "MemberNotConfirmedError";
  }
}

/**
 * Wrap `key` (of `version`) for each member, fetching their public keys. With `vetting`, a
 * member it does not know needs `confirm`; without a yes the whole call fails (a rotation must
 * name every active member, so it waits until the owner decides or removes them).
 */
export async function wrapForMembers(
  api: Pick<SharingApi, "getPublicKey">,
  target: ShareTarget,
  key: Uint8Array,
  version: number,
  owner: OwnerIdentity,
  members: (string | Member)[],
  vet?: { vetting: MemberVetting; confirm?: (member: Member, reason: ConfirmReason) => boolean | Promise<boolean> },
): Promise<{ userId: string; wrappedKey: string }[]> {
  const out: { userId: string; wrappedKey: string }[] = [];
  for (const m of members) {
    const userId = typeof m === "string" ? m : m.userId;
    const pk = await api.getPublicKey(userId);
    if (!pk) throw new Error(`no public key for member ${userId}`);
    if (vet && typeof m !== "string") {
      const reason = await vet.vetting.check(target, m, pk.publicKey);
      if (reason && !(await vet.confirm?.(m, reason))) throw new MemberNotConfirmedError(m, reason);
    }
    out.push({ userId, wrappedKey: wrapFor(target, key, version, owner, userId, pk.publicKey) });
    if (vet) await vet.vetting.given(target, userId, pk.publicKey);
  }
  return out;
}

/**
 * Give the current key to members that accepted but have no key yet
 * (`awaiting_key`). Sign-up does not verify e-mail addresses, so a member
 * whose account was created after the invitation gets the key only when
 * `confirm` says so (the owner is asked «<почта> приняла приглашение —
 * открыть доступ?», D-54); so does one `vetting` does not know (not invited
 * by this account, or with another public key). Without `confirm` they keep
 * waiting. Returns the members that got the key.
 */
export async function deliverAwaitingKeys(options: {
  api: Pick<SharingApi, "listMembers" | "getPublicKey" | "putMemberKey">;
  target: ShareTarget;
  keys: VersionedKeys;
  owner: OwnerIdentity;
  confirm?: (member: Member, reason: ConfirmReason) => boolean | Promise<boolean>;
  vetting?: MemberVetting;
}): Promise<Member[]> {
  const { api, target, keys, owner } = options;
  const waiting = (await api.listMembers(target)).filter(
    (m) => m.status === "awaiting_key" && m.userId !== owner.userId,
  );
  const delivered: Member[] = [];
  for (const member of waiting) {
    const pk = await api.getPublicKey(member.userId);
    if (!pk) throw new Error(`no public key for member ${member.userId}`);
    const reason: ConfirmReason | null =
      (await options.vetting?.check(target, member, pk.publicKey)) ??
      (member.accountCreatedAfterInvite ? "late_account" : null);
    if (reason && !(await options.confirm?.(member, reason))) continue;
    // Wrapped for the very public key that was checked (not fetched again).
    await api.putMemberKey(target, member.userId, {
      version: keys.version,
      wrappedKey: wrapFor(target, keys.keys[0]!, keys.version, owner, member.userId, pk.publicKey),
    });
    await options.vetting?.given(target, member.userId, pk.publicKey);
    delivered.push(member);
  }
  return delivered;
}
