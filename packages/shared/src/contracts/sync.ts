// Messages of the WebSocket sync protocol (sync-protocol.md, versions 1–3).
// The server and every client validate incoming frames with these schemas.
import { z } from "zod";
import { authorSchema, deviceRevokedReasonSchema } from "./api.js";
import { base64UrlSchema, uuidSchema } from "./common.js";

/**
 * Protocol versions (sync-protocol.md §2). A client says the newest it speaks in `hello`; the
 * server answers `welcome` with the version it will use (≤ the client's). Version 2 adds the
 * `account_changed` message, version 3 `resume` / `resumed` (§3.1). Clients ignore unknown
 * message types (§4), so a newer server never breaks an older client.
 */
export const SYNC_PROTOCOL_MIN = 1;
export const SYNC_PROTOCOL_LATEST = 3;
/** The first version with `resume` / `resumed` (sync-protocol.md §3.1). */
export const SYNC_PROTOCOL_RESUME = 3;
/**
 * The baseline version every server accepts (1). Kept for servers that compare `hello.protocol`
 * with it; new code uses SYNC_PROTOCOL_MIN / SYNC_PROTOCOL_LATEST.
 */
export const SYNC_PROTOCOL_VERSION = SYNC_PROTOCOL_MIN;
const protocolSchema = z.number().int().min(SYNC_PROTOCOL_MIN).max(SYNC_PROTOCOL_LATEST);
export const SYNC_PATH = "/v1/sync";
/** WebSocket ping interval. */
export const SYNC_PING_INTERVAL_MS = 25_000;

/** Decoded payload limits (sync-protocol.md §7). */
/**
 * An update may be as large as a snapshot (2026-11-11, was 2 MiB): a big change (a pasted book,
 * an import) goes as a regular `push` and gets its own seq, so catch-up and relay need no special
 * case. A client still answers `payload_too_large` from an older server with a snapshot.
 */
export const MAX_UPDATE_BYTES = 16 * 1024 * 1024;
export const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;

/** A client compacts a document once either threshold is exceeded (sync-protocol.md §5). */
export const SNAPSHOT_THRESHOLD_UPDATES = 500;
export const SNAPSHOT_THRESHOLD_BYTES = 1024 * 1024;

const seqSchema = z.number().int().positive();
const sinceSchema = z.number().int().nonnegative();
const payloadSchema = base64UrlSchema;
const clientMsgIdSchema = z.string().min(1).max(64);
const deviceIdSchema = z.string().min(1).max(64);

// ---------------------------------------------------------------------------
// Client → server (§3)
// ---------------------------------------------------------------------------

export const syncAuthSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user"), accessToken: z.string().min(1) }),
  z.object({ kind: z.literal("guest"), shareId: uuidSchema, guestToken: z.string().min(1) }),
]);
export type SyncAuth = z.infer<typeof syncAuthSchema>;

export const CLIENT_PLATFORMS = ["ios", "web"] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

export const helloMessageSchema = z.object({
  type: z.literal("hello"),
  protocol: protocolSchema,
  auth: syncAuthSchema,
  deviceId: deviceIdSchema,
  client: z.object({ platform: z.enum(CLIENT_PLATFORMS), version: z.string().min(1) }),
});

/** At most this many documents per `subscribe` message; clients split larger sets. */
export const MAX_SUBSCRIBE_DOCS = 1000;

export const subscribeMessageSchema = z.object({
  type: z.literal("subscribe"),
  docs: z
    .array(z.object({ docId: uuidSchema, since: sinceSchema }))
    .min(1)
    .max(MAX_SUBSCRIBE_DOCS)
    .refine((docs) => new Set(docs.map((d) => d.docId)).size === docs.length, {
      message: "duplicate docId in subscribe",
    }),
});

/** Longest account cursor (opaque, set by the server). */
export const MAX_RESUME_CURSOR_CHARS = 256;
/** At most this many entries in `resumed.docs` and in `resumed.removed`; more → `reset`. */
export const MAX_RESUME_DOCS = 1000;
const resumeCursorSchema = z.string().min(1).max(MAX_RESUME_CURSOR_CHARS);

/**
 * Protocol 3, user connections only (sync-protocol.md §3.1): instead of subscribing every
 * document again, ask what changed in the account since `cursor` (null: no cursor yet).
 */
export const resumeMessageSchema = z.object({
  type: z.literal("resume"),
  cursor: resumeCursorSchema.nullable(),
});

export const unsubscribeMessageSchema = z.object({
  type: z.literal("unsubscribe"),
  docIds: z.array(uuidSchema).min(1),
});

export const pushMessageSchema = z.object({
  type: z.literal("push"),
  docId: uuidSchema,
  clientMsgId: clientMsgIdSchema,
  payload: payloadSchema,
});

export const snapshotMessageSchema = z.object({
  type: z.literal("snapshot"),
  docId: uuidSchema,
  clientMsgId: clientMsgIdSchema,
  /** The snapshot includes every update with seq ≤ baseSeq. */
  baseSeq: sinceSchema,
  payload: payloadSchema,
});

export const clientAwarenessMessageSchema = z.object({
  type: z.literal("awareness"),
  docId: uuidSchema,
  payload: payloadSchema,
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  subscribeMessageSchema,
  unsubscribeMessageSchema,
  pushMessageSchema,
  snapshotMessageSchema,
  clientAwarenessMessageSchema,
  resumeMessageSchema,
]);

export type HelloMessage = z.infer<typeof helloMessageSchema>;
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;
export type UnsubscribeMessage = z.infer<typeof unsubscribeMessageSchema>;
export type PushMessage = z.infer<typeof pushMessageSchema>;
export type SnapshotMessage = z.infer<typeof snapshotMessageSchema>;
export type ClientAwarenessMessage = z.infer<typeof clientAwarenessMessageSchema>;
export type ResumeMessage = z.infer<typeof resumeMessageSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ---------------------------------------------------------------------------
// Server → client (§4)
// ---------------------------------------------------------------------------

export const welcomeMessageSchema = z.object({
  type: z.literal("welcome"),
  /** null for guests. */
  userId: uuidSchema.nullable(),
  serverTime: z.string(),
  protocol: protocolSchema,
});

/** Server-stamped author (D-54); optional so older servers still parse. */
const authorFieldSchema = authorSchema.optional();

export const updateItemSchema = z.object({
  seq: seqSchema,
  payload: payloadSchema,
  deviceId: deviceIdSchema,
  author: authorFieldSchema,
});
export type UpdateItem = z.infer<typeof updateItemSchema>;

export const updatesMessageSchema = z.object({
  type: z.literal("updates"),
  docId: uuidSchema,
  snapshot: z.object({ seq: sinceSchema, payload: payloadSchema }).nullable(),
  items: z.array(updateItemSchema),
  /** The last part of a catch-up response has `upToDate: true`. */
  upToDate: z.boolean(),
});

export const updateMessageSchema = z.object({
  type: z.literal("update"),
  docId: uuidSchema,
  seq: seqSchema,
  payload: payloadSchema,
  deviceId: deviceIdSchema,
  author: authorFieldSchema,
});

export const ackMessageSchema = z.object({
  type: z.literal("ack"),
  docId: uuidSchema,
  clientMsgId: clientMsgIdSchema,
  /** seq of the stored update; for a snapshot its baseSeq (may be 0). */
  seq: sinceSchema,
});

export const serverAwarenessMessageSchema = z.object({
  type: z.literal("awareness"),
  docId: uuidSchema,
  payload: payloadSchema,
  deviceId: deviceIdSchema,
});

export const SYNC_ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "forbidden",
  "doc_not_found",
  "payload_too_large",
  "rate_limited",
  "protocol_mismatch",
  "internal",
  "device_revoked",
] as const;
export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[number];

export const errorMessageSchema = z.object({
  type: z.literal("error"),
  code: z.enum(SYNC_ERROR_CODES),
  message: z.string(),
  /** clientMsgId or docId the error refers to. */
  ref: z.string().optional(),
  /** For `rate_limited`: how long to wait before reconnecting/resending. */
  retryAfterMs: z.number().int().nonnegative().optional(),
  /** Present with `device_revoked` (D-53). */
  reason: deviceRevokedReasonSchema.optional(),
});

/**
 * WebSocket close code after `error device_revoked` (D-53); the close reason
 * string carries the DeviceRevokedReason. Clients treat this close code alone
 * as a revocation too, in case the error frame was lost.
 */
export const SYNC_CLOSE_DEVICE_REVOKED = 4410;

/** What `account_changed` says changed (protocol 2); unknown values are dropped. */
export const ACCOUNT_CHANGES = [
  "invitations",
  "spaces",
  "members",
  "keys",
  "notebooks",
  /** This account's voice access or quota changed (D-65). */
  "voice",
] as const;
export type AccountChange = (typeof ACCOUNT_CHANGES)[number];
const isAccountChange = (v: string): v is AccountChange =>
  (ACCOUNT_CHANGES as readonly string[]).includes(v);

/**
 * Protocol 2: shared state of the account changed (invitations, members, key wraps, space
 * notebooks, a rotation) — refresh it now instead of polling (sync-protocol.md §4).
 */
export const accountChangedMessageSchema = z.object({
  type: z.literal("account_changed"),
  what: z
    .array(z.string())
    .max(8)
    .transform((w) => [...new Set(w.filter(isAccountChange))]),
});

/**
 * Protocol 3: the answer to `resume` (sync-protocol.md §3.1). `reset: false` — the account
 * subscription is on, `docs` changed (or became accessible) after the cursor, with their latest
 * seq; `removed` were deleted or lost access. `reset: true` — the cursor is unknown, invalid or
 * too old: subscribe every document as in version 1 (`docs` and `removed` are empty). `cursor`
 * replaces the client's once it has caught up.
 */
export const resumedMessageSchema = z
  .object({
    type: z.literal("resumed"),
    reset: z.boolean(),
    cursor: resumeCursorSchema,
    docs: z.array(z.object({ docId: uuidSchema, seq: sinceSchema })).max(MAX_RESUME_DOCS),
    removed: z.array(uuidSchema).max(MAX_RESUME_DOCS),
  })
  .refine((m) => !m.reset || (m.docs.length === 0 && m.removed.length === 0), {
    message: "a reset lists no documents",
  });

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  updatesMessageSchema,
  updateMessageSchema,
  ackMessageSchema,
  serverAwarenessMessageSchema,
  errorMessageSchema,
  accountChangedMessageSchema,
  resumedMessageSchema,
]);

/** Message types this version knows; a frame of another `type` is ignored by clients. */
export const SERVER_MESSAGE_TYPES = [
  "welcome",
  "updates",
  "update",
  "ack",
  "awareness",
  "error",
  "account_changed",
  "resumed",
] as const;

export type WelcomeMessage = z.infer<typeof welcomeMessageSchema>;
export type UpdatesMessage = z.infer<typeof updatesMessageSchema>;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;
export type AckMessage = z.infer<typeof ackMessageSchema>;
export type ServerAwarenessMessage = z.infer<typeof serverAwarenessMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type AccountChangedMessage = z.infer<typeof accountChangedMessageSchema>;
export type ResumedMessage = z.infer<typeof resumedMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Parse a text frame received from the server; returns null for invalid JSON or schema. */
export function parseServerMessage(raw: string): ServerMessage | null {
  return parseFrame(raw, serverMessageSchema);
}

/**
 * Parse a server frame, telling a message of an unknown `type` (from a newer server: ignore it)
 * from a broken one (invalid JSON, no `type`, or a known type that fails its schema: an error).
 */
export function parseServerFrame(
  raw: string,
):
  | { kind: "message"; message: ServerMessage }
  | { kind: "unknown"; type: string }
  | { kind: "invalid" } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { kind: "invalid" };
  }
  const type = (json as { type?: unknown } | null)?.type;
  if (typeof type !== "string") return { kind: "invalid" };
  if (!(SERVER_MESSAGE_TYPES as readonly string[]).includes(type)) return { kind: "unknown", type };
  const result = serverMessageSchema.safeParse(json);
  return result.success ? { kind: "message", message: result.data } : { kind: "invalid" };
}

/** Parse a text frame received from a client; returns null for invalid JSON or schema. */
export function parseClientMessage(raw: string): ClientMessage | null {
  return parseFrame(raw, clientMessageSchema);
}

function parseFrame<T>(raw: string, schema: z.ZodType<T>): T | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}
