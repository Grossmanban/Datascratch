// Messages of the WebSocket sync protocol (sync-protocol.md, v1).
// The server and every client validate incoming frames with these schemas.
import { z } from "zod";
import { base64UrlSchema, uuidSchema } from "./common.js";

export const SYNC_PROTOCOL_VERSION = 1;
export const SYNC_PATH = "/v1/sync";
/** WebSocket ping interval. */
export const SYNC_PING_INTERVAL_MS = 25_000;

/** Decoded payload limits (sync-protocol.md §7). */
export const MAX_UPDATE_BYTES = 2 * 1024 * 1024;
export const MAX_SNAPSHOT_BYTES = 50 * 1024 * 1024;

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
  protocol: z.literal(SYNC_PROTOCOL_VERSION),
  auth: syncAuthSchema,
  deviceId: deviceIdSchema,
  client: z.object({ platform: z.enum(CLIENT_PLATFORMS), version: z.string().min(1) }),
});

export const subscribeMessageSchema = z.object({
  type: z.literal("subscribe"),
  docs: z.array(z.object({ docId: uuidSchema, since: sinceSchema })).min(1),
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
]);

export type HelloMessage = z.infer<typeof helloMessageSchema>;
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;
export type UnsubscribeMessage = z.infer<typeof unsubscribeMessageSchema>;
export type PushMessage = z.infer<typeof pushMessageSchema>;
export type SnapshotMessage = z.infer<typeof snapshotMessageSchema>;
export type ClientAwarenessMessage = z.infer<typeof clientAwarenessMessageSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ---------------------------------------------------------------------------
// Server → client (§4)
// ---------------------------------------------------------------------------

export const welcomeMessageSchema = z.object({
  type: z.literal("welcome"),
  /** null for guests. */
  userId: uuidSchema.nullable(),
  serverTime: z.string(),
  protocol: z.literal(SYNC_PROTOCOL_VERSION),
});

export const updateItemSchema = z.object({
  seq: seqSchema,
  payload: payloadSchema,
  deviceId: deviceIdSchema,
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
] as const;
export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[number];

export const errorMessageSchema = z.object({
  type: z.literal("error"),
  code: z.enum(SYNC_ERROR_CODES),
  message: z.string(),
  /** clientMsgId or docId the error refers to. */
  ref: z.string().optional(),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  welcomeMessageSchema,
  updatesMessageSchema,
  updateMessageSchema,
  ackMessageSchema,
  serverAwarenessMessageSchema,
  errorMessageSchema,
]);

export type WelcomeMessage = z.infer<typeof welcomeMessageSchema>;
export type UpdatesMessage = z.infer<typeof updatesMessageSchema>;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;
export type AckMessage = z.infer<typeof ackMessageSchema>;
export type ServerAwarenessMessage = z.infer<typeof serverAwarenessMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Parse a text frame received from the server; returns null for invalid JSON or schema. */
export function parseServerMessage(raw: string): ServerMessage | null {
  return parseFrame(raw, serverMessageSchema);
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
