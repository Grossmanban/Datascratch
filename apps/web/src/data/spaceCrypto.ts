// Keys of shared spaces (D-62, crypto.md §11) on top of core's generic primitives. Core's typed
// helpers for `space` are on their way (claude/core); until they land this file is the only
// place that names the `space` ad strings, so switching to them is one edit.
import {
  AD,
  fromBase64Url,
  unwrapKey,
  unwrapKeyChain,
  unwrapKeyFromOwner,
  wrapKey,
  wrapKeyForMember,
  type ShareTargetKind,
  type VersionedKeys,
} from "@datascratch/shared";

/** `space` as a sharing kind of core's (crypto.md §11.1 reuses §10's ad shapes with it). */
const SPACE = "space" as unknown as ShareTargetKind;

/** spaceKey under the owner's masterKey: `ds1|key|space|<id>` (v1) or `…|<version>` (≥ 2). */
export const spaceKeyAd = (spaceId: string, version: number) =>
  version <= 1 ? `ds1|key|space|${spaceId}` : `ds1|key|space|${spaceId}|${version}`;

/** A notebookKey of a shared space under the spaceKey (always with its version). */
export const spaceNotebookAd = (spaceId: string, notebookId: string, version: number) =>
  `ds1|key|space-notebook|${spaceId}|${notebookId}|${version}`;

export const wrapSpaceKeyForOwner = (masterKey: Uint8Array, spaceKey: Uint8Array, spaceId: string, version: number) =>
  wrapKey(masterKey, spaceKey, spaceKeyAd(spaceId, version));

/** The owner's space keys from `GET /spaces/:id/key` (current first, then the chain). */
export function ownerSpaceKeys(res: { version: number; wrappedKey: string; keyChain: string[] }, masterKey: Uint8Array, spaceId: string): VersionedKeys {
  const current = unwrapKey(masterKey, res.wrappedKey, spaceKeyAd(spaceId, res.version));
  return { version: res.version, keys: unwrapKeyChain(current, res.version, res.keyChain, SPACE, spaceId) };
}

/** A member's space keys from its `SharedItem` (kind `space`); null until delivered. */
export function memberSpaceKeys(
  item: { target: { id: string }; owner: { userId: string; publicKey: string }; keyVersion: number; wrappedKey: string | null; keyChain: string[] },
  me: { userId: string; secretKey: Uint8Array },
): VersionedKeys | null {
  if (!item.wrappedKey) return null;
  const spaceId = item.target.id;
  const current = unwrapKeyFromOwner(item.wrappedKey, me.secretKey, fromBase64Url(item.owner.publicKey), {
    kind: SPACE,
    targetId: spaceId,
    version: item.keyVersion,
    fromUserId: item.owner.userId,
    toUserId: me.userId,
  });
  return { version: item.keyVersion, keys: unwrapKeyChain(current, item.keyVersion, item.keyChain, SPACE, spaceId) };
}

/** Space key wrapped for a member (crypto.md §10.2 with kind `space`). */
export const wrapSpaceKeyForMember = (
  spaceKey: Uint8Array,
  version: number,
  spaceId: string,
  owner: { userId: string; secretKey: Uint8Array },
  member: { userId: string; publicKey: string },
) =>
  wrapKeyForMember(spaceKey, owner.secretKey, fromBase64Url(member.publicKey), {
    kind: SPACE,
    targetId: spaceId,
    version,
    fromUserId: owner.userId,
    toUserId: member.userId,
  });

export const wrapNotebookKeyForSpace = (spaceKey: Uint8Array, notebookKey: Uint8Array, spaceId: string, notebookId: string, version: number) =>
  wrapKey(spaceKey, notebookKey, spaceNotebookAd(spaceId, notebookId, version));

/**
 * A notebook's keys from `GET /spaces/:id/notebooks`: its wrap may be under any version of the
 * space key (during a rotation), its chain under its own versions (§10.3).
 */
export function spaceNotebookKeys(
  entry: { notebookId: string; version: number; spaceWrappedKey: string; keyChain: string[] },
  spaceId: string,
  spaceKeys: Uint8Array[],
): VersionedKeys {
  for (const sk of spaceKeys) {
    let current: Uint8Array;
    try {
      current = unwrapKey(sk, entry.spaceWrappedKey, spaceNotebookAd(spaceId, entry.notebookId, entry.version));
    } catch {
      continue;
    }
    return { version: entry.version, keys: unwrapKeyChain(current, entry.version, entry.keyChain, "notebook", entry.notebookId) };
  }
  throw new Error(`no space key opens notebook ${entry.notebookId}`);
}

/** Moving a notebook out of a space: its next key is the owner's again (§11.3, as §10.3 step 1). */
export const wrapNotebookKeyForOwner = (masterKey: Uint8Array, notebookKey: Uint8Array, notebookId: string, version: number) =>
  wrapKey(masterKey, notebookKey, AD.notebookKeyVersion(notebookId, version));
