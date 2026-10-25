// UUIDv7 (RFC 9562) — the id format of every entity (document-model.md §1).
// Monotonic within a process: ids created in the same millisecond keep sorting
// in creation order (12-bit counter in rand_a, RFC 9562 §6.2 method 1).
import { UUID_V7_REGEX } from "./contracts/common.js";
import { toBase64Url } from "./crypto/base64url.js";

let lastMs = -1;
let counter = 0;

function random(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/**
 * Build a UUIDv7 from its parts. `rand` supplies 10 bytes: the low 12 bits of
 * bytes 0..1 become rand_a, the low 62 bits of bytes 2..9 become rand_b.
 */
export function uuidv7FromParts(unixMs: number, rand: Uint8Array): string {
  if (!Number.isInteger(unixMs) || unixMs < 0 || unixMs > 0xffff_ffff_ffff) {
    throw new RangeError("timestamp out of range");
  }
  if (rand.length < 10) throw new RangeError("need 10 random bytes");
  const b = new Uint8Array(16);
  let ms = unixMs;
  for (let i = 5; i >= 0; i--) {
    b[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  b[6] = 0x70 | (rand[0]! & 0x0f);
  b[7] = rand[1]!;
  b[8] = 0x80 | (rand[2]! & 0x3f);
  b.set(rand.subarray(3, 10), 9);
  let hex = "";
  for (const x of b) hex += x.toString(16).padStart(2, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** New lowercase UUIDv7. */
export function uuidv7(now: number = Date.now()): string {
  const rand = random(10);
  let ms = now;
  if (ms <= lastMs) {
    ms = lastMs;
    counter++;
    if (counter > 0xfff) {
      // Counter exhausted within one millisecond: borrow the next one.
      ms = ++lastMs;
      counter = 0;
    }
  } else {
    lastMs = ms;
    // Random start in the lower half leaves room to increment.
    counter = ((rand[0]! << 8) | rand[1]!) & 0x7ff;
  }
  rand[0] = (counter >> 8) & 0x0f;
  rand[1] = counter & 0xff;
  return uuidv7FromParts(ms, rand);
}

export function isUuidV7(value: unknown): value is string {
  return typeof value === "string" && UUID_V7_REGEX.test(value);
}

/** Unix ms encoded in a UUIDv7. */
export function uuidv7Timestamp(id: string): number {
  if (!isUuidV7(id)) throw new TypeError("not a UUIDv7");
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

/**
 * Sync `deviceId` of a guest session: `guest:` + 22 base64url characters
 * (16 random bytes), sync-protocol.md.
 */
export function guestDeviceId(): string {
  return `guest:${toBase64Url(random(16))}`;
}
