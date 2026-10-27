// Keys of account sharing (crypto.md §10, D-54): the account key pair and the
// notebook/note keys of shared resources, newest first with their old versions.
import { AD } from "../contracts/crypto.js";
import type { NotebookKeyResponse, SharedItem } from "../contracts/api.js";
import type { NoteMeta } from "../contracts/document.js";
import { fromBase64Url, toBase64Url } from "../crypto/base64url.js";
import { CryptoError } from "../crypto/errors.js";
import { unwrapKey } from "../crypto/keys.js";
import {
  generateBoxKeyPair,
  unwrapBoxSecretKey,
  unwrapKeyChain,
  unwrapKeyFromOwner,
  wrapBoxSecretKey,
  type BoxKeyPair,
} from "../crypto/sharing.js";
import type { SharingApi } from "./api.js";
import { ApiRequestError } from "./http.js";

/**
 * The account key pair: created on first use (signup, or the first login of
 * an account made before D-54) and published with `PUT /me/box-key`.
 */
export async function ensureAccountKeyPair(
  api: Pick<SharingApi, "getBoxKey" | "putBoxKey">,
  userId: string,
  masterKey: Uint8Array,
): Promise<BoxKeyPair> {
  const existing = await api.getBoxKey();
  if (existing) return openBoxKey(existing, userId, masterKey);
  const pair = generateBoxKeyPair();
  const body = {
    publicKey: toBase64Url(pair.publicKey),
    wrappedSecretKey: wrapBoxSecretKey(pair.secretKey, masterKey, userId),
  };
  try {
    await api.putBoxKey(body);
    return pair;
  } catch (e) {
    // Another device of this account published its pair first: use that one.
    if (e instanceof ApiRequestError && e.status === 409) {
      const winner = await api.getBoxKey();
      if (winner) return openBoxKey(winner, userId, masterKey);
    }
    throw e;
  }
}

function openBoxKey(
  key: { publicKey: string; wrappedSecretKey: string },
  userId: string,
  masterKey: Uint8Array,
): BoxKeyPair {
  const publicKey = fromBase64Url(key.publicKey);
  return {
    publicKey,
    secretKey: unwrapBoxSecretKey(key.wrappedSecretKey, masterKey, userId, publicKey),
  };
}

/** Keys of one notebook or note, newest first; `version` is that of `keys[0]`. */
export interface VersionedKeys {
  version: number;
  keys: Uint8Array[];
}

/** The owner's notebook keys from `GET /notebooks/:id/key`. */
export function ownerNotebookKeys(
  res: NotebookKeyResponse,
  masterKey: Uint8Array,
  notebookId: string,
): VersionedKeys {
  const version = res.version ?? 1;
  const current = unwrapKey(masterKey, res.wrappedKey, AD.notebookKeyVersion(notebookId, version));
  return {
    version,
    keys: unwrapKeyChain(current, version, res.keyChain ?? [], "notebook", notebookId),
  };
}

/** A member's keys of a shared notebook/note; null until the owner delivered them. */
export function sharedItemKeys(
  item: SharedItem,
  me: { userId: string; secretKey: Uint8Array },
): VersionedKeys | null {
  if (!item.wrappedKey) return null;
  const { kind, id } = item.target;
  const current = unwrapKeyFromOwner(
    item.wrappedKey,
    me.secretKey,
    fromBase64Url(item.owner.publicKey),
    {
      kind,
      targetId: id,
      version: item.keyVersion,
      fromUserId: item.owner.userId,
      toUserId: me.userId,
    },
  );
  return {
    version: item.keyVersion,
    keys: unwrapKeyChain(current, item.keyVersion, item.keyChain, kind, id),
  };
}

/**
 * Keys of a note from its NoteMeta: the wrappedKey may be under any version
 * of the notebook key (notes not re-keyed yet during a rotation). `notebookIndex`
 * says which notebook key opened it (0 = current).
 */
export function noteKeysFromMeta(
  meta: Pick<NoteMeta, "id" | "wrappedKey" | "keyVersion" | "keyChain">,
  notebookKeys: Uint8Array[],
): VersionedKeys & { notebookIndex: number } {
  const version = meta.keyVersion ?? 1;
  const ad = AD.noteKeyVersion(meta.id, version);
  for (let i = 0; i < notebookKeys.length; i++) {
    let current: Uint8Array;
    try {
      current = unwrapKey(notebookKeys[i]!, meta.wrappedKey, ad);
    } catch {
      continue;
    }
    return {
      version,
      keys: unwrapKeyChain(current, version, meta.keyChain ?? [], "note", meta.id),
      notebookIndex: i,
    };
  }
  throw new CryptoError("decrypt_failed", `no notebook key opens the key of note ${meta.id}`);
}
