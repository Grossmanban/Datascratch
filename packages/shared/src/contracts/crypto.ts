// Constants and associated-data strings of the crypto contract (crypto.md, v1).
// Pure values only: no libsodium here, so the server can import them freely.
import { z } from "zod";

export const ENVELOPE_VERSION = 0x01;
export const NONCE_BYTES = 24;
export const TAG_BYTES = 16;
export const KEY_BYTES = 32;
export const SALT_BYTES = 16;
/** version byte + nonce + tag */
export const ENVELOPE_OVERHEAD = 1 + NONCE_BYTES + TAG_BYTES;

/** Plaintext bytes per attachment chunk (crypto.md §6). */
export const ATTACHMENT_CHUNK_BYTES = 1024 * 1024;

export const KDF_ALG = "argon2id13";
export const KDF_OPS = 3;
export const KDF_MEM = 67_108_864;
export const KDF_OUTPUT_BYTES = 64;

/**
 * Bounds a client accepts for KDF params from `prelogin` (crypto.md §2, audit
 * 2026-10-27): a hostile server must not be able to weaken the KDF (cheap
 * loginKey to brute-force) or exhaust memory.
 */
export const KDF_BOUNDS = Object.freeze({
  minOps: 3,
  maxOps: 10,
  minMem: 64 * 1024 * 1024,
  maxMem: 256 * 1024 * 1024,
});

export const kdfParamsSchema = z.object({
  alg: z.literal(KDF_ALG),
  ops: z.number().int().min(KDF_BOUNDS.minOps).max(KDF_BOUNDS.maxOps),
  mem: z.number().int().min(KDF_BOUNDS.minMem).max(KDF_BOUNDS.maxMem),
});

/** True when `kdf` is within the accepted bounds (crypto.md §2). */
export function isSafeKdf(kdf: unknown): kdf is { alg: typeof KDF_ALG; ops: number; mem: number } {
  return kdfParamsSchema.safeParse(kdf).success;
}
export type KdfParams = z.infer<typeof kdfParamsSchema>;

/** Current default KDF parameters (crypto.md §2). */
export const DEFAULT_KDF: KdfParams = Object.freeze({ alg: KDF_ALG, ops: KDF_OPS, mem: KDF_MEM });

export const LOGIN_KEY_CONTEXT = "ds1|login";
export const RECOVERY_LOGIN_KEY_CONTEXT = "ds1|recovery-login";

/** Prefix of the human-readable recovery key (crypto.md §4). */
export const RECOVERY_KEY_PREFIX = "DS1-";
/** Crockford Base32 characters encoding the 32-byte recovery key. */
export const RECOVERY_KEY_CHARS = 52;
export const RECOVERY_KEY_GROUP = 4;

/** Associated data (`ad`) binding each ciphertext to its place (crypto.md §3). */
export const AD = {
  doc: (docId: string) => `ds1|doc|${docId}`,
  awareness: (docId: string) => `ds1|awareness|${docId}`,
  masterKeyPassword: (userId: string) => `ds1|key|master|password|${userId}`,
  masterKeyRecovery: (userId: string) => `ds1|key|master|recovery|${userId}`,
  notebookKey: (notebookId: string) => `ds1|key|notebook|${notebookId}`,
  notebookKeyServer: (notebookId: string) => `ds1|key|notebook-server|${notebookId}`,
  noteKey: (noteId: string) => `ds1|key|note|${noteId}`,
  attachmentChunk: (attachmentId: string, index: number, last: boolean) =>
    `ds1|att|${attachmentId}|${index}|${last ? 1 : 0}`,
} as const;

/** Environment variable holding the server KMS key, base64url (crypto.md §8). */
export const SERVER_KEY_ENV = "DS_KMS_KEY";

/** Fragment parameter carrying the key in share links (crypto.md §7). */
export const SHARE_LINK_KEY_PARAM = "k";
