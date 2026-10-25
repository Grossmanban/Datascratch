// The ciphertext envelope (crypto.md §3):
//   byte 0      version = 0x01
//   bytes 1..24 nonce
//   rest        XChaCha20-Poly1305-IETF(plaintext, ad, nonce, key) incl. 16-byte tag
import {
  ENVELOPE_OVERHEAD,
  ENVELOPE_VERSION,
  KEY_BYTES,
  NONCE_BYTES,
} from "../contracts/crypto.js";
import { fromBase64Url, toBase64Url, utf8 } from "./base64url.js";
import { CryptoError } from "./errors.js";
import { sodium } from "./sodium.js";

export interface EncryptOptions {
  /** Fixed nonce, for test vectors only. Never reuse a nonce with the same key. */
  nonce?: Uint8Array;
}

function checkKey(key: Uint8Array): void {
  if (key.length !== KEY_BYTES)
    throw new CryptoError("invalid_key", `key must be ${KEY_BYTES} bytes`);
}

export function randomBytes(n: number): Uint8Array {
  return sodium().randombytes_buf(n);
}

export function encryptEnvelope(
  key: Uint8Array,
  plaintext: Uint8Array,
  ad: string,
  options: EncryptOptions = {},
): Uint8Array {
  checkKey(key);
  const s = sodium();
  const nonce = options.nonce ?? s.randombytes_buf(NONCE_BYTES);
  if (nonce.length !== NONCE_BYTES) throw new CryptoError("malformed", "nonce must be 24 bytes");
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, utf8(ad), null, nonce, key);
  const out = new Uint8Array(1 + NONCE_BYTES + ct.length);
  out[0] = ENVELOPE_VERSION;
  out.set(nonce, 1);
  out.set(ct, 1 + NONCE_BYTES);
  return out;
}

export function decryptEnvelope(key: Uint8Array, envelope: Uint8Array, ad: string): Uint8Array {
  checkKey(key);
  if (envelope.length < ENVELOPE_OVERHEAD) throw new CryptoError("malformed", "envelope too short");
  if (envelope[0] !== ENVELOPE_VERSION) {
    throw new CryptoError("unsupported_version", `unsupported envelope version ${envelope[0]}`);
  }
  const nonce = envelope.subarray(1, 1 + NONCE_BYTES);
  const ct = envelope.subarray(1 + NONCE_BYTES);
  try {
    return sodium().crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, utf8(ad), nonce, key);
  } catch {
    throw new CryptoError("decrypt_failed", "decryption failed: wrong key, ad or corrupted data");
  }
}

/** Envelope in base64url (JSON and URL form). */
export function encryptToBase64Url(
  key: Uint8Array,
  plaintext: Uint8Array,
  ad: string,
  options?: EncryptOptions,
): string {
  return toBase64Url(encryptEnvelope(key, plaintext, ad, options));
}

export function decryptFromBase64Url(key: Uint8Array, envelope: string, ad: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(envelope);
  } catch {
    throw new CryptoError("malformed", "envelope is not valid base64url");
  }
  return decryptEnvelope(key, bytes, ad);
}
