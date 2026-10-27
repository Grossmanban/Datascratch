// Account key pairs and keys shared between accounts (crypto.md §10, D-54).
import {
  AD,
  BOX_PUBLIC_KEY_BYTES,
  BOX_SECRET_KEY_BYTES,
  KEY_BYTES,
  MEMBER_WRAP_CONTEXT,
  SAFETY_CODE_CONTEXT,
  SAFETY_CODE_GROUPS,
  type ShareTargetKind,
} from "../contracts/crypto.js";
import { utf8 } from "./base64url.js";
import type { EncryptOptions } from "./envelope.js";
import { CryptoError } from "./errors.js";
import { unwrapKey, wrapKey } from "./keys.js";
import { sodium } from "./sodium.js";

export interface BoxKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/** A new X25519 key pair; `seed` (32 bytes) only for test vectors. */
export function generateBoxKeyPair(seed?: Uint8Array): BoxKeyPair {
  const s = sodium();
  const kp = seed ? s.crypto_box_seed_keypair(seed) : s.crypto_box_keypair();
  return { publicKey: kp.publicKey, secretKey: kp.privateKey };
}

export const wrapBoxSecretKey = (
  secretKey: Uint8Array,
  masterKey: Uint8Array,
  userId: string,
  options?: EncryptOptions,
) => wrapKey(masterKey, secretKey, AD.accountBoxKey(userId), options);

/** Unwraps the secret key and checks it matches the published public key. */
export function unwrapBoxSecretKey(
  wrapped: string,
  masterKey: Uint8Array,
  userId: string,
  publicKey: Uint8Array,
): Uint8Array {
  const secretKey = unwrapKey(masterKey, wrapped, AD.accountBoxKey(userId));
  const derived = sodium().crypto_scalarmult_base(secretKey);
  if (!sodium().memcmp(derived, publicKey)) {
    throw new CryptoError("invalid_key", "secret key does not match the public key");
  }
  return secretKey;
}

/**
 * Symmetric key two accounts share: BLAKE2b-256 keyed by crypto_box_beforenm
 * (X25519 + HSalsa20) over a fixed context. Same value from either side.
 */
export function memberWrapKey(mySecretKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array {
  if (mySecretKey.length !== BOX_SECRET_KEY_BYTES || peerPublicKey.length !== BOX_PUBLIC_KEY_BYTES)
    throw new CryptoError("invalid_key", "box keys must be 32 bytes");
  const s = sodium();
  let shared: Uint8Array;
  try {
    shared = s.crypto_box_beforenm(peerPublicKey, mySecretKey);
  } catch {
    // libsodium rejects low-order public keys (all-zero shared secret).
    throw new CryptoError("invalid_key", "invalid peer public key");
  }
  return s.crypto_generichash(KEY_BYTES, utf8(MEMBER_WRAP_CONTEXT), shared);
}

export interface MemberKeyRef {
  kind: ShareTargetKind;
  targetId: string;
  version: number;
  fromUserId: string;
  toUserId: string;
}

/** The owner wraps a notebook/note key for a member (`ad` = member key ad). */
export function wrapKeyForMember(
  key: Uint8Array,
  ownerSecretKey: Uint8Array,
  memberPublicKey: Uint8Array,
  ref: MemberKeyRef,
  options?: EncryptOptions,
): string {
  return wrapKey(memberWrapKey(ownerSecretKey, memberPublicKey), key, memberAd(ref), options);
}

/** The member unwraps it with its own secret key and the owner's public key. */
export function unwrapKeyFromOwner(
  wrapped: string,
  memberSecretKey: Uint8Array,
  ownerPublicKey: Uint8Array,
  ref: MemberKeyRef,
): Uint8Array {
  return unwrapKey(memberWrapKey(memberSecretKey, ownerPublicKey), wrapped, memberAd(ref));
}

const memberAd = (r: MemberKeyRef) =>
  AD.memberKey(r.kind, r.targetId, r.version, r.fromUserId, r.toUserId);

/** Wraps the key of `version - 1` with the key of `version` (rotation chain). */
export const wrapPreviousKey = (
  newKey: Uint8Array,
  previousKey: Uint8Array,
  kind: ShareTargetKind,
  targetId: string,
  version: number,
  options?: EncryptOptions,
) => wrapKey(newKey, previousKey, AD.previousKey(kind, targetId, version), options);

/**
 * Walks the chain from the current key back: `chain[i]` is the key of
 * version `currentVersion - i - 1` wrapped by the key one version newer.
 * Returns keys newest first, the current key included.
 */
export function unwrapKeyChain(
  currentKey: Uint8Array,
  currentVersion: number,
  chain: string[],
  kind: ShareTargetKind,
  targetId: string,
): Uint8Array[] {
  const keys = [currentKey];
  let key = currentKey;
  for (let i = 0; i < chain.length && currentVersion - i > 1; i++) {
    key = unwrapKey(key, chain[i]!, AD.previousKey(kind, targetId, currentVersion - i));
    keys.push(key);
  }
  return keys;
}

/**
 * Safety code of two accounts (crypto.md §10.5): BLAKE2b-240 keyed by the
 * context over both (userId, publicKey) pairs ordered by userId; 6 groups of
 * 5 digits. Equal on both sides; changes when either key changes.
 */
export function safetyCode(
  a: { userId: string; publicKey: Uint8Array },
  b: { userId: string; publicKey: Uint8Array },
): string {
  const [x, y] = a.userId < b.userId ? [a, b] : [b, a];
  const head = utf8(`${x.userId}|${y.userId}|`);
  const msg = new Uint8Array(head.length + 2 * BOX_PUBLIC_KEY_BYTES);
  msg.set(head, 0);
  msg.set(x.publicKey, head.length);
  msg.set(y.publicKey, head.length + BOX_PUBLIC_KEY_BYTES);
  const h = sodium().crypto_generichash(SAFETY_CODE_GROUPS * 5, msg, utf8(SAFETY_CODE_CONTEXT));
  const groups: string[] = [];
  for (let g = 0; g < SAFETY_CODE_GROUPS; g++) {
    let n = 0;
    for (let i = 0; i < 5; i++) n = n * 256 + h[g * 5 + i]!;
    groups.push(String(n % 100_000).padStart(5, "0"));
  }
  return groups.join(" ");
}
