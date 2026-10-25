import { z } from 'zod';
import { b64, id } from '../lib/encoding.js';

/** Client → server messages (sync-protocol.md §3). */
export const Hello = z.object({
  type: z.literal('hello'),
  protocol: z.number().int(),
  auth: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('user'), accessToken: z.string().min(1).max(4096) }),
    z.object({ kind: z.literal('guest'), shareId: id(), guestToken: z.string().min(1).max(4096) }),
  ]),
  deviceId: z.string().min(1).max(100),
  client: z.object({ platform: z.enum(['ios', 'web']), version: z.string().max(50) }),
});

export const ClientMessage = z.discriminatedUnion('type', [
  Hello,
  z.object({
    type: z.literal('subscribe'),
    docs: z
      .array(z.object({ docId: id(), since: z.number().int().nonnegative() }))
      .min(1)
      .max(10_000),
  }),
  z.object({ type: z.literal('unsubscribe'), docIds: z.array(id()).max(10_000) }),
  z.object({ type: z.literal('push'), docId: id(), clientMsgId: z.string().min(1).max(100), payload: b64() }),
  z.object({
    type: z.literal('snapshot'),
    docId: id(),
    clientMsgId: z.string().min(1).max(100),
    baseSeq: z.number().int().positive(),
    payload: b64(),
  }),
  z.object({ type: z.literal('awareness'), docId: id(), payload: b64() }),
]);

export type ClientMessage = z.infer<typeof ClientMessage>;

export type SyncErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'doc_not_found'
  | 'payload_too_large'
  | 'rate_limited'
  | 'protocol_mismatch'
  | 'internal';

/** Server → client messages (sync-protocol.md §4). */
export type ServerMessage =
  | { type: 'welcome'; userId: string | null; serverTime: string; protocol: 1 }
  | {
      type: 'updates';
      docId: string;
      snapshot: { seq: number; payload: string } | null;
      items: { seq: number; payload: string; deviceId: string }[];
      upToDate: boolean;
    }
  | { type: 'update'; docId: string; seq: number; payload: string; deviceId: string }
  | { type: 'ack'; docId: string; clientMsgId: string; seq: number }
  | { type: 'awareness'; docId: string; payload: string; deviceId: string }
  | { type: 'error'; code: SyncErrorCode; message: string; ref?: string };

export const PROTOCOL_VERSION = 1;

/** WebSocket close codes used by the server. */
export const CloseCode = {
  normal: 1000,
  goingAway: 1001,
  internal: 1011,
  protocol: 4400,
  unauthorized: 4401,
} as const;

/** Decoded size of a base64url string without decoding it. */
export const b64Size = (s: string) => Math.floor((s.length * 3) / 4);
