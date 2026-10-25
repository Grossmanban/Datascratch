import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const B64URL = /^[A-Za-z0-9_-]*$/;

export function toB64(buf: Uint8Array): string {
  return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString('base64url');
}

export function fromB64(s: string): Buffer {
  if (!B64URL.test(s) || s.length % 4 === 1) throw new Error('invalid base64url');
  return Buffer.from(s, 'base64url');
}

/** base64url without padding, as used for every binary field in the contracts. */
export const b64 = (opts: { min?: number; max?: number } = {}) =>
  z
    .string()
    .regex(B64URL, 'must be base64url without padding')
    .refine((s) => s.length % 4 !== 1, 'invalid base64url length')
    .refine((s) => {
      const n = Math.floor((s.length * 3) / 4);
      return (opts.min === undefined || n >= opts.min) && (opts.max === undefined || n <= opts.max);
    }, 'invalid length');

/** Lower-case hyphenated UUID (client-generated UUIDv7, document-model.md §1). */
export const id = () =>
  z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'must be a lower-case UUID');

export const sha256 = (data: string | Uint8Array): Buffer => createHash('sha256').update(data).digest();

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

export function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** UUIDv7 for server-generated ids (devices, tokens). */
export function uuidv7(): string {
  const b = randomBytes(16);
  const ms = BigInt(Date.now());
  b[0] = Number((ms >> 40n) & 0xffn);
  b[1] = Number((ms >> 32n) & 0xffn);
  b[2] = Number((ms >> 24n) & 0xffn);
  b[3] = Number((ms >> 16n) & 0xffn);
  b[4] = Number((ms >> 8n) & 0xffn);
  b[5] = Number(ms & 0xffn);
  b[6] = (b[6]! & 0x0f) | 0x70;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
