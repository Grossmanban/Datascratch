// Password → keys (crypto.md §2).
import {
  DEFAULT_KDF,
  KDF_ALG,
  KDF_BOUNDS,
  isSafeKdf,
  KDF_OUTPUT_BYTES,
  KEY_BYTES,
  LOGIN_KEY_CONTEXT,
  RECOVERY_LOGIN_KEY_CONTEXT,
  SALT_BYTES,
  type KdfParams,
} from "../contracts/crypto.js";
import { utf8 } from "./base64url.js";
import { CryptoError } from "./errors.js";
import { sodium } from "./sodium.js";

export interface PasswordKeys {
  /** Bytes 0..31 of the Argon2id output; only used to derive loginKey. */
  authSeed: Uint8Array;
  /** Sent to the server (which stores Argon2id(loginKey)). */
  loginKey: Uint8Array;
  /** Never leaves the device; wraps the masterKey. */
  passwordKey: Uint8Array;
}

export function generateSalt(): Uint8Array {
  return sodium().randombytes_buf(SALT_BYTES);
}

/** NFKC-normalized UTF-8 bytes of a password. */
export function normalizePassword(password: string): Uint8Array {
  return utf8(password.normalize("NFKC"));
}

/**
 * Argon2id13(NFKC(password), salt) → 64 bytes → authSeed | passwordKey;
 * loginKey = BLAKE2b-256(key = authSeed, message = "ds1|login").
 * CPU- and memory-heavy (64 MiB): call off the UI thread where possible.
 */
export function derivePasswordKeys(
  password: string,
  salt: Uint8Array,
  kdf: KdfParams = DEFAULT_KDF,
): PasswordKeys {
  if (kdf.alg !== KDF_ALG)
    throw new CryptoError("unsafe_kdf", `unsupported KDF ${String(kdf.alg)}`);
  // Never run with params a (possibly hostile) server chose outside the bounds.
  if (!isSafeKdf(kdf)) {
    throw new CryptoError(
      "unsafe_kdf",
      `KDF params out of bounds (ops ${KDF_BOUNDS.minOps}..${KDF_BOUNDS.maxOps}, mem ${KDF_BOUNDS.minMem}..${KDF_BOUNDS.maxMem} bytes)`,
    );
  }
  if (salt.length !== SALT_BYTES) throw new CryptoError("malformed", "salt must be 16 bytes");
  const s = sodium();
  const out = s.crypto_pwhash(
    KDF_OUTPUT_BYTES,
    normalizePassword(password),
    salt,
    kdf.ops,
    kdf.mem,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
  const authSeed = out.slice(0, KEY_BYTES);
  const passwordKey = out.slice(KEY_BYTES, 2 * KEY_BYTES);
  const loginKey = s.crypto_generichash(KEY_BYTES, utf8(LOGIN_KEY_CONTEXT), authSeed);
  return { authSeed, loginKey, passwordKey };
}

/** recoveryLoginKey = BLAKE2b-256(key = recoveryKey, message = "ds1|recovery-login"). */
export function deriveRecoveryLoginKey(recoveryKey: Uint8Array): Uint8Array {
  if (recoveryKey.length !== KEY_BYTES)
    throw new CryptoError("invalid_key", "recovery key must be 32 bytes");
  return sodium().crypto_generichash(KEY_BYTES, utf8(RECOVERY_LOGIN_KEY_CONTEXT), recoveryKey);
}
