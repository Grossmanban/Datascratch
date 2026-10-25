import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function fromBase64url(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, "base64url"));
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function sha256Base64url(text: string): string {
  return createHash("sha256").update(text, "ascii").digest("base64url");
}

export function randomToken(prefix: string, bytes = 32): string {
  return prefix + randomBytes(bytes).toString("base64url");
}

export function hmac(secret: Uint8Array, data: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** UUIDv7 (RFC 9562), lowercase with dashes — the id format of all Datascratch entities. */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  const ts = BigInt(now);
  for (let i = 0; i < 6; i++) bytes[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
