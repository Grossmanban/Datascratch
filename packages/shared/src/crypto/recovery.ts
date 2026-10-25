// Recovery key text form (crypto.md §4): 32 bytes → Crockford Base32 (52 chars,
// MSB first, the last 4 bits zero) → groups of 4 joined by "-" → "DS1-" prefix.
import {
  KEY_BYTES,
  RECOVERY_KEY_CHARS,
  RECOVERY_KEY_GROUP,
  RECOVERY_KEY_PREFIX,
} from "../contracts/crypto.js";
import { CryptoError } from "./errors.js";
import { sodium } from "./sodium.js";

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function encodeCrockford(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD_ALPHABET[(buffer >> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += CROCKFORD_ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

function crockfordValue(ch: string): number {
  // Crockford decoding is case-insensitive and maps look-alikes: O → 0, I/L → 1.
  const c = ch.toUpperCase();
  const mapped = c === "O" ? "0" : c === "I" || c === "L" ? "1" : c;
  const v = CROCKFORD_ALPHABET.indexOf(mapped);
  if (v < 0) throw new CryptoError("invalid_recovery_key", `invalid character "${ch}"`);
  return v;
}

/** Decode `chars` Crockford symbols into `byteLength` bytes; padding bits must be zero. */
export function decodeCrockford(text: string, byteLength: number): Uint8Array {
  const out = new Uint8Array(byteLength);
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (const ch of text) {
    buffer = (buffer << 5) | crockfordValue(ch);
    bits += 5;
    if (bits >= 8) {
      if (o >= byteLength) throw new CryptoError("invalid_recovery_key", "too many characters");
      out[o++] = (buffer >> (bits - 8)) & 255;
      bits -= 8;
    }
    buffer &= (1 << bits) - 1;
  }
  if (o !== byteLength) throw new CryptoError("invalid_recovery_key", "too few characters");
  if (buffer !== 0) throw new CryptoError("invalid_recovery_key", "non-zero padding bits");
  return out;
}

export function generateRecoveryKey(): Uint8Array {
  return sodium().randombytes_buf(KEY_BYTES);
}

/** `DS1-XXXX-XXXX-…` (13 groups of 4). */
export function formatRecoveryKey(key: Uint8Array): string {
  if (key.length !== KEY_BYTES)
    throw new CryptoError("invalid_key", "recovery key must be 32 bytes");
  const text = encodeCrockford(key);
  const groups: string[] = [];
  for (let i = 0; i < text.length; i += RECOVERY_KEY_GROUP) {
    groups.push(text.slice(i, i + RECOVERY_KEY_GROUP));
  }
  return RECOVERY_KEY_PREFIX + groups.join("-");
}

/**
 * Parse user input leniently: case, spaces, hyphens, the `DS1-` prefix and
 * Crockford look-alikes (O/I/L) are tolerated.
 */
export function parseRecoveryKey(input: string): Uint8Array {
  let text = input
    .trim()
    .toUpperCase()
    .replace(/[\s‐-―-]+/g, "-");
  const prefix = RECOVERY_KEY_PREFIX.slice(0, -1);
  if (text.startsWith(prefix + "-")) text = text.slice(prefix.length + 1);
  else if (
    text.startsWith(prefix) &&
    text.replace(/-/g, "").length === prefix.length + RECOVERY_KEY_CHARS
  ) {
    text = text.slice(prefix.length);
  }
  text = text.replace(/-/g, "");
  if (text.length !== RECOVERY_KEY_CHARS) {
    throw new CryptoError("invalid_recovery_key", `expected ${RECOVERY_KEY_CHARS} characters`);
  }
  return decodeCrockford(text, KEY_BYTES);
}
