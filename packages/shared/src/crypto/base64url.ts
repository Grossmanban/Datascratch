// base64url without padding (RFC 4648 §5), the binary encoding of every contract.
// Platform-neutral: no Buffer / atob, so it runs the same in browsers, Node and workers.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LOOKUP = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

export function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  const n = bytes.length;
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      ALPHABET[v >> 18]! + ALPHABET[(v >> 12) & 63]! + ALPHABET[(v >> 6) & 63]! + ALPHABET[v & 63]!;
  }
  const rest = n - i;
  if (rest === 1) {
    const v = bytes[i]! << 16;
    out += ALPHABET[v >> 18]! + ALPHABET[(v >> 12) & 63]!;
  } else if (rest === 2) {
    const v = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[v >> 18]! + ALPHABET[(v >> 12) & 63]! + ALPHABET[(v >> 6) & 63]!;
  }
  return out;
}

/**
 * Strict decoder: rejects padding, characters outside the alphabet and
 * non-canonical encodings (non-zero trailing bits), so every byte string has
 * exactly one valid text form.
 */
export function fromBase64Url(text: string): Uint8Array {
  const len = text.length;
  if (len % 4 === 1) throw new TypeError("invalid base64url length");
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let o = 0;
  let i = 0;
  const sextet = (k: number): number => {
    const c = text.charCodeAt(k);
    const v = c < 128 ? LOOKUP[c]! : -1;
    if (v < 0) throw new TypeError(`invalid base64url character at ${k}`);
    return v;
  };
  for (; i + 3 < len; i += 4) {
    const v = (sextet(i) << 18) | (sextet(i + 1) << 12) | (sextet(i + 2) << 6) | sextet(i + 3);
    out[o++] = v >> 16;
    out[o++] = (v >> 8) & 255;
    out[o++] = v & 255;
  }
  const rest = len - i;
  if (rest === 2) {
    const v = (sextet(i) << 18) | (sextet(i + 1) << 12);
    if (v & 0xffff) throw new TypeError("non-canonical base64url");
    out[o++] = v >> 16;
  } else if (rest === 3) {
    const v = (sextet(i) << 18) | (sextet(i + 1) << 12) | (sextet(i + 2) << 6);
    if (v & 0xff) throw new TypeError("non-canonical base64url");
    out[o++] = v >> 16;
    out[o++] = (v >> 8) & 255;
  }
  return out;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

export function fromUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function toHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) throw new TypeError("invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
