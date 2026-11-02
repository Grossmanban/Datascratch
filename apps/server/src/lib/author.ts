import { createHash } from 'node:crypto';
import type { AuthorRef } from '../db/schema.js';

/**
 * The author as shown to clients. A guest's share id is the link itself (`POST /shares/:id/guest`
 * hands out a token for it), so it never leaves the server: guests are told apart by an opaque,
 * stable id derived from it, shaped as a UUIDv7 for the clients' validation. The share id has
 * 122 random bits, so the hash cannot be turned back into it.
 */
export function publicAuthor(a: AuthorRef): AuthorRef {
  if (a.kind !== 'guest') return a;
  const h = createHash('sha256').update(`ds-guest-author|${a.shareId}`).digest('hex');
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-7${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
  return { kind: 'guest', shareId: id };
}
