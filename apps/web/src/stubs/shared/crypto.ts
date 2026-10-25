// crypto.md (v1) on libsodium. Temporary until @datascratch/shared/crypto lands;
// must stay byte-compatible with packages/test-vectors/crypto.
import _sodium from "libsodium-wrappers-sumo";
import { fromBase64Url, toBase64Url } from "./base64url";
import type { KdfParams } from "./contracts";

export type Sodium = typeof _sodium;

let readyPromise: Promise<Sodium> | null = null;
export function sodiumReady(): Promise<Sodium> {
  if (!readyPromise) readyPromise = _sodium.ready.then(() => _sodium);
  return readyPromise;
}

export const DEFAULT_KDF: KdfParams = { alg: "argon2id13", ops: 3, mem: 67108864 };
export const ENVELOPE_VERSION = 0x01;
const enc = new TextEncoder();
// Copy into this realm's Uint8Array: libsodium checks `instanceof Uint8Array`, which fails
// across realms (e.g. Node TextEncoder output under jsdom).
const u8 = (x: Uint8Array) => (x instanceof Uint8Array && x.constructor === Uint8Array ? x : new Uint8Array(x));
const utf8 = (s: string) => u8(enc.encode(s));

export const ad = {
  doc: (docId: string) => `ds1|doc|${docId}`,
  awareness: (docId: string) => `ds1|awareness|${docId}`,
  masterPassword: (userId: string) => `ds1|key|master|password|${userId}`,
  masterRecovery: (userId: string) => `ds1|key|master|recovery|${userId}`,
  notebookKey: (notebookId: string) => `ds1|key|notebook|${notebookId}`,
  notebookServerKey: (notebookId: string) => `ds1|key|notebook-server|${notebookId}`,
  noteKey: (noteId: string) => `ds1|key|note|${noteId}`,
  attachmentChunk: (attachmentId: string, index: number, last: boolean) =>
    `ds1|att|${attachmentId}|${index}|${last ? 1 : 0}`,
};

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export const randomKey = () => randomBytes(32);
export const randomSalt = () => randomBytes(16);

export type PasswordKeys = { loginKey: Uint8Array; passwordKey: Uint8Array };

/** §2: Argon2id(NFKC(password), salt) → authSeed ‖ passwordKey; loginKey = BLAKE2b_key(authSeed, "ds1|login"). */
export async function derivePasswordKeys(
  password: string,
  salt: Uint8Array,
  kdf: KdfParams = DEFAULT_KDF,
): Promise<PasswordKeys> {
  const sodium = await sodiumReady();
  if (kdf.alg !== "argon2id13") throw new Error(`Unsupported KDF ${kdf.alg}`);
  const out = sodium.crypto_pwhash(
    64,
    utf8(password.normalize("NFKC")),
    u8(salt),
    kdf.ops,
    kdf.mem,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  const authSeed = out.slice(0, 32);
  const passwordKey = out.slice(32, 64);
  const loginKey = sodium.crypto_generichash(32, utf8("ds1|login"), authSeed);
  return { loginKey, passwordKey };
}

export async function recoveryLoginKey(recoveryKey: Uint8Array): Promise<Uint8Array> {
  const sodium = await sodiumReady();
  return sodium.crypto_generichash(32, utf8("ds1|recovery-login"), u8(recoveryKey));
}

/** §3 envelope: 0x01 ‖ nonce(24) ‖ XChaCha20-Poly1305(plaintext, ad). */
export async function seal(key: Uint8Array, plaintext: Uint8Array, adText: string): Promise<Uint8Array> {
  const sodium = await sodiumReady();
  const nonce = randomBytes(24);
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(u8(plaintext), utf8(adText), null, nonce, u8(key));
  const out = new Uint8Array(1 + 24 + ct.length);
  out[0] = ENVELOPE_VERSION;
  out.set(nonce, 1);
  out.set(ct, 25);
  return out;
}

export async function open(key: Uint8Array, envelope: Uint8Array, adText: string): Promise<Uint8Array> {
  const sodium = await sodiumReady();
  if (envelope[0] !== ENVELOPE_VERSION) throw new Error(`Unknown envelope version ${envelope[0]}`);
  const nonce = u8(envelope.slice(1, 25));
  const ct = u8(envelope.slice(25));
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, utf8(adText), nonce, u8(key));
}

export async function wrapKey(wrappingKey: Uint8Array, key: Uint8Array, adText: string): Promise<string> {
  return toBase64Url(await seal(wrappingKey, key, adText));
}

export async function unwrapKey(wrappingKey: Uint8Array, wrapped: string, adText: string): Promise<Uint8Array> {
  return open(wrappingKey, fromBase64Url(wrapped), adText);
}

// ---------- §4 recovery key: Crockford Base32, "DS1-" + groups of 4 ----------
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function encodeRecoveryKey(key: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of key) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  const groups = out.match(/.{1,4}/g) ?? [];
  return `DS1-${groups.join("-")}`;
}

export function decodeRecoveryKey(text: string): Uint8Array {
  let s = text.trim().toUpperCase().replace(/[\s-]/g, "");
  if (s.startsWith("DS1")) s = s.slice(3);
  s = s.replace(/[IL]/g, "1").replace(/O/g, "0");
  if (s.length !== 52) throw new Error("Recovery key must have 52 characters");
  const out = new Uint8Array(32);
  let bits = 0;
  let value = 0;
  let idx = 0;
  for (const ch of s) {
    const v = CROCKFORD.indexOf(ch);
    if (v < 0) throw new Error(`Invalid character ${ch}`);
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      if (idx < 32) out[idx++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
    value &= (1 << bits) - 1;
  }
  return out;
}
