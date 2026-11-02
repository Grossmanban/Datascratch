// What this account itself did in sharing, kept in its end-to-end encrypted account document
// (document-model.md §2, `trust`; security review 2026-11-02). The server lists members, their
// public keys and key versions — none of which it can be trusted with: a compromised server could
// name a member that was never invited (to be handed the notebook key), swap a member's public
// key, or hand back an old key after a rotation. Clients check its answers against this record.
//
// Flat keys in one Y.Map, so concurrent writes of two devices never overwrite each other:
//   invite|<kind>|<id>|<email>    → ISO time   this account invited <email> to the resource
//   member|<kind>|<id>|<userId>   → publicKey  this account gave the resource's key to <userId>
//   key|<kind>|<id>|<version>     → true       this account has seen key <version> of the resource
//   migrated                      → ISO time   members that had keys before the record existed
//                                              were taken over once (trust on first use)
import type * as Y from "yjs";
import { accountRoots } from "../document/factories.js";
import type { ShareTarget } from "../contracts/api.js";
import type { SharingApi } from "./api.js";
import type { MemberVetting } from "./members.js";

const norm = (email: string) => email.trim().toLowerCase();
const res = (t: ShareTarget) => `${t.kind}|${t.id}`;

/** Why a member may not get a key without the owner saying so. */
export type MemberTrust = "known" | "not_invited" | "key_changed";

export function recordInvite(account: Y.Doc, target: ShareTarget, email: string, at = new Date()): void {
  accountRoots(account).trust.set(`invite|${res(target)}|${norm(email)}`, at.toISOString());
}

export function recordMemberKey(account: Y.Doc, target: ShareTarget, userId: string, publicKey: string): void {
  const trust = accountRoots(account).trust;
  const key = `member|${res(target)}|${userId}`;
  if (trust.get(key) !== publicKey) trust.set(key, publicKey);
}

export function isTrustMigrated(account: Y.Doc): boolean {
  return typeof accountRoots(account).trust.get("migrated") === "string";
}

export function markTrustMigrated(account: Y.Doc, at = new Date()): void {
  const trust = accountRoots(account).trust;
  if (!trust.has("migrated")) trust.set("migrated", at.toISOString());
}

/**
 * May `member` get the key of `target` (wrapped for `publicKey`) without asking the owner?
 * Known: this account gave them a key for this public key before, or invited their address.
 * Before the record existed (not migrated yet) everyone the server names is taken over once.
 */
export function memberTrust(
  account: Y.Doc,
  target: ShareTarget,
  member: { userId: string; email?: string | null },
  publicKey: string,
): MemberTrust {
  const trust = accountRoots(account).trust;
  const pinned = trust.get(`member|${res(target)}|${member.userId}`);
  if (typeof pinned === "string") return pinned === publicKey ? "known" : "key_changed";
  if (member.email && trust.has(`invite|${res(target)}|${norm(member.email)}`)) return "known";
  return isTrustMigrated(account) ? "not_invited" : "known";
}

export function recordKeyVersion(account: Y.Doc, target: ShareTarget, version: number): void {
  // Version 1 is the floor: there is nothing older to roll back to, and opening a document on a
  // new device must not write to the account document.
  if (version <= 1) return;
  const trust = accountRoots(account).trust;
  const key = `key|${res(target)}|${version}`;
  if (!trust.has(key)) trust.set(key, true);
}

/** The newest key version of `target` this account has seen (0: none recorded). */
export function knownKeyVersion(account: Y.Doc, target: ShareTarget): number {
  const prefix = `key|${res(target)}|`;
  let max = 0;
  for (const k of accountRoots(account).trust.keys()) {
    if (!k.startsWith(prefix)) continue;
    const v = Number(k.slice(prefix.length));
    if (Number.isInteger(v) && v > max) max = v;
  }
  return max;
}

/**
 * Once per account, before the first check: take over the members and invitations that existed
 * before this record (trust on first use) — every member that holds a key, with the public key it
 * has now, and every running invitation. Then `memberTrust` stops taking over unknown members.
 */
export async function migrateMemberTrust(
  api: Pick<SharingApi, "sharedByMe" | "listMembers" | "listInvitations" | "getPublicKey">,
  account: Y.Doc,
  ownerId: string,
): Promise<void> {
  if (isTrustMigrated(account)) return;
  for (const item of await api.sharedByMe()) {
    for (const m of await api.listMembers(item.target)) {
      if (m.userId === ownerId) continue;
      if (m.status === "awaiting_key") {
        // Accepted an invitation of this account before the record existed.
        if (m.email) recordInvite(account, item.target, m.email);
        continue;
      }
      const pk = await api.getPublicKey(m.userId);
      if (pk) recordMemberKey(account, item.target, m.userId, pk.publicKey);
    }
    for (const inv of await api.listInvitations(item.target)) {
      if (inv.status !== "declined") recordInvite(account, item.target, inv.email);
    }
  }
  markTrustMigrated(account);
}

/** `MemberVetting` (members.ts) over this record. */
export function accountVetting(account: () => Y.Doc): MemberVetting {
  return {
    check: (target, member, publicKey) => {
      const t = memberTrust(account(), target, member, publicKey);
      return t === "known" ? null : t;
    },
    given: (target, userId, publicKey) => recordMemberKey(account(), target, userId, publicKey),
  };
}
