import {
  MAX_RESUME_DOCS as SHARED_MAX_RESUME_DOCS,
  SYNC_PROTOCOL_LATEST,
  SYNC_PROTOCOL_RESUME,
  SYNC_PROTOCOL_MIN,
  SYNC_PROTOCOL_VERSION,
  clientMessageSchema,
  type ClientMessage as SharedClientMessage,
  type ServerMessage as SharedServerMessage,
} from '@datascratch/shared/contracts';

/** Client → server messages (sync-protocol.md §3): the shared zod schemas. */
export const ClientMessage = clientMessageSchema;
export type ClientMessage = SharedClientMessage;

/** Error codes; `bad_request` was added to the contract on 2026-10-25 (may lag in @datascratch/shared). */
export type SyncErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'doc_not_found'
  | 'payload_too_large'
  | 'rate_limited'
  | 'protocol_mismatch'
  | 'bad_request'
  | 'device_revoked'
  | 'internal';

/** Server → client messages (sync-protocol.md §4). */
export type ServerMessage =
  | Exclude<SharedServerMessage, { type: 'error' }>
  | { type: 'error'; code: SyncErrorCode; message: string; ref?: string; retryAfterMs?: number; reason?: string };

export const PROTOCOL_VERSION = SYNC_PROTOCOL_VERSION;
/** Versions accepted in `hello` (sync-protocol.md §2); v2 adds `account_changed`. */
export const PROTOCOL_MIN = SYNC_PROTOCOL_MIN;
/** v3 adds `resume` / `resumed` (sync-protocol.md §3.1). */
export const PROTOCOL_LATEST: number = SYNC_PROTOCOL_LATEST;
/** The first version with `resume`. */
export const RESUME_SINCE = SYNC_PROTOCOL_RESUME;
/** At most this many entries in `resumed.docs` / `resumed.removed`; more → `reset`. */
export const MAX_RESUME_DOCS = SHARED_MAX_RESUME_DOCS;
/** The first version that receives `account_changed` (sync-protocol.md §6). */
export const ACCOUNT_CHANGED_SINCE = 2;

/** WebSocket close codes used by the server. */
export const CloseCode = {
  normal: 1000,
  goingAway: 1001,
  internal: 1011,
  protocol: 4400,
  unauthorized: 4401,
  /** Too many connections: retry later. */
  tryAgainLater: 1013,
  /** This device was revoked (reason in the close reason and the preceding error): wipe local data. */
  deviceRevoked: 4410,
} as const;

/** Decoded size of a base64url string without decoding it. */
export const b64Size = (s: string) => Math.floor((s.length * 3) / 4);
