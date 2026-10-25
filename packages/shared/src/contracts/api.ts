// Request/response bodies of the REST API (api.md, v1). Base path: /v1.
// The server validates request bodies with these schemas; clients may validate responses.
import { z } from "zod";
import {
  base64UrlSchema,
  docKindSchema,
  isoDateTimeSchema,
  key32Schema,
  base64UrlBytesSchema,
  notebookModeSchema,
  uuidSchema,
} from "./common.js";
import { SALT_BYTES, kdfParamsSchema } from "./crypto.js";

export const API_PREFIX = "/v1";

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Default attachment size limit (configurable on the server). */
export const MAX_ATTACHMENT_BYTES = 200 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const API_ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "payload_too_large",
  "internal",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({ code: z.enum(API_ERROR_CODES), message: z.string() }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** Clients and the server compare emails after trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const saltSchema = base64UrlBytesSchema(SALT_BYTES);
/** A key wrapped in a crypto envelope (crypto.md §3), base64url. */
export const wrappedKeySchema = base64UrlSchema.min(1);

export const sessionSchema = z.object({
  userId: uuidSchema,
  /** The session's device (refresh-token family); also the sync `deviceId`. */
  deviceId: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessExpiresAt: isoDateTimeSchema,
  wrappedMasterKeyPassword: wrappedKeySchema,
  accountDocId: uuidSchema,
});
export type Session = z.infer<typeof sessionSchema>;

// ---------------------------------------------------------------------------
// Auth (D-34, crypto.md)
// ---------------------------------------------------------------------------

export const preloginRequestSchema = z.object({ email: emailSchema });
export type PreloginRequest = z.infer<typeof preloginRequestSchema>;
export const preloginResponseSchema = z.object({ salt: saltSchema, kdf: kdfParamsSchema });
export type PreloginResponse = z.infer<typeof preloginResponseSchema>;

export const signupRequestSchema = z.object({
  email: emailSchema,
  salt: saltSchema,
  kdf: kdfParamsSchema,
  loginKey: key32Schema,
  recoveryLoginKey: key32Schema,
  wrappedMasterKeyPassword: wrappedKeySchema,
  wrappedMasterKeyRecovery: wrappedKeySchema,
  userId: uuidSchema,
  accountDocId: uuidSchema,
  deviceName: z.string().min(1).max(200).optional(),
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  loginKey: key32Schema,
  deviceName: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const logoutRequestSchema = z.object({ refreshToken: z.string().min(1) });
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

export const recoveryStartRequestSchema = z.object({
  email: emailSchema,
  recoveryLoginKey: key32Schema,
});
export type RecoveryStartRequest = z.infer<typeof recoveryStartRequestSchema>;
export const recoveryStartResponseSchema = z.object({
  recoveryToken: z.string().min(1),
  wrappedMasterKeyRecovery: wrappedKeySchema,
  userId: uuidSchema,
});
export type RecoveryStartResponse = z.infer<typeof recoveryStartResponseSchema>;

export const recoveryFinishRequestSchema = z.object({
  recoveryToken: z.string().min(1),
  salt: saltSchema,
  kdf: kdfParamsSchema,
  loginKey: key32Schema,
  wrappedMasterKeyPassword: wrappedKeySchema,
  deviceName: z.string().min(1).max(200).optional(),
});
export type RecoveryFinishRequest = z.infer<typeof recoveryFinishRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentLoginKey: key32Schema,
  salt: saltSchema,
  kdf: kdfParamsSchema,
  loginKey: key32Schema,
  wrappedMasterKeyPassword: wrappedKeySchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

/** `POST /auth/recovery-key` (authorized): replace the recovery key; confirmed by the password. */
export const rotateRecoveryKeyRequestSchema = z.object({
  currentLoginKey: key32Schema,
  recoveryLoginKey: key32Schema,
  wrappedMasterKeyRecovery: wrappedKeySchema,
});
export type RotateRecoveryKeyRequest = z.infer<typeof rotateRecoveryKeyRequestSchema>;

/** Account security log (`GET /me/security-events`). */
export const SECURITY_EVENT_KINDS = [
  "password_changed",
  "recovery_used",
  "recovery_key_rotated",
] as const;
export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number];
export const securityEventSchema = z.object({
  kind: z.enum(SECURITY_EVENT_KINDS),
  at: isoDateTimeSchema,
  deviceId: z.string().nullable(),
  deviceName: z.string().nullable(),
});
export type SecurityEvent = z.infer<typeof securityEventSchema>;

// ---------------------------------------------------------------------------
// Account and devices
// ---------------------------------------------------------------------------

export const meResponseSchema = z.object({
  userId: uuidSchema,
  email: z.string(),
  accountDocId: uuidSchema,
  createdAt: isoDateTimeSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * A device = one refresh-token session. The contract does not fix the fields yet;
 * this shape is the core stream's proposal (sent to the coordinator).
 */
export const deviceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  createdAt: isoDateTimeSchema,
  lastSeenAt: isoDateTimeSchema,
  current: z.boolean(),
});
export type Device = z.infer<typeof deviceSchema>;

export const deleteMeRequestSchema = z.object({ loginKey: key32Schema });
export type DeleteMeRequest = z.infer<typeof deleteMeRequestSchema>;

// ---------------------------------------------------------------------------
// Notebooks and documents (D-36)
// ---------------------------------------------------------------------------

export const createNotebookRequestSchema = z
  .object({
    notebookId: uuidSchema,
    mode: notebookModeSchema,
    /** notebookKey wrapped by the masterKey. */
    wrappedKey: wrappedKeySchema,
    /** Raw notebookKey, only for mode = "agent" (crypto.md §8). */
    notebookKey: key32Schema.optional(),
  })
  .refine((b) => (b.mode === "agent") === (b.notebookKey !== undefined), {
    message: "notebookKey is required for mode=agent and forbidden for mode=private",
    path: ["notebookKey"],
  });
export type CreateNotebookRequest = z.infer<typeof createNotebookRequestSchema>;

export const notebookSchema = z.object({
  id: uuidSchema,
  mode: notebookModeSchema,
  createdAt: isoDateTimeSchema,
  wrappedKey: wrappedKeySchema,
});
export type Notebook = z.infer<typeof notebookSchema>;

export const notebookKeyResponseSchema = z.object({ wrappedKey: wrappedKeySchema });
export type NotebookKeyResponse = z.infer<typeof notebookKeyResponseSchema>;

export const patchNotebookModeRequestSchema = z
  .object({ mode: notebookModeSchema, notebookKey: key32Schema.optional() })
  .refine((b) => (b.mode === "agent") === (b.notebookKey !== undefined), {
    message: "notebookKey is required for mode=agent and forbidden for mode=private",
    path: ["notebookKey"],
  });
export type PatchNotebookModeRequest = z.infer<typeof patchNotebookModeRequestSchema>;

export const registerDocRequestSchema = z
  .object({ docId: uuidSchema, kind: docKindSchema, notebookId: uuidSchema.nullable() })
  .refine((b) => (b.kind === "account") === (b.notebookId === null), {
    message: "notebookId must be null for account documents and set otherwise",
    path: ["notebookId"],
  })
  .refine((b) => b.kind !== "notebook" || b.docId === b.notebookId, {
    message: "a notebook document's docId equals its notebookId",
    path: ["docId"],
  });
export type RegisterDocRequest = z.infer<typeof registerDocRequestSchema>;

/** `PATCH /docs/:id`: move a note document to another notebook. */
export const moveDocRequestSchema = z.object({ notebookId: uuidSchema });
export type MoveDocRequest = z.infer<typeof moveDocRequestSchema>;

export const docVersionSchema = z.object({
  seq: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  deviceId: z.string(),
});
export type DocVersion = z.infer<typeof docVersionSchema>;

export const docVersionPayloadSchema = z.object({ payload: base64UrlSchema });
export type DocVersionPayload = z.infer<typeof docVersionPayloadSchema>;

// ---------------------------------------------------------------------------
// Attachments (crypto.md §6)
// ---------------------------------------------------------------------------

export const createAttachmentRequestSchema = z.object({
  attachmentId: uuidSchema,
  noteId: uuidSchema,
  /** Total ciphertext bytes. */
  size: z.number().int().nonnegative(),
  chunkCount: z.number().int().positive(),
  mime: z.string().min(1).max(255),
});
export type CreateAttachmentRequest = z.infer<typeof createAttachmentRequestSchema>;

export const attachmentStatusSchema = z.object({
  size: z.number().int().nonnegative(),
  chunkCount: z.number().int().positive(),
  mime: z.string(),
  uploadedChunks: z.array(z.number().int().nonnegative()),
});
export type AttachmentStatus = z.infer<typeof attachmentStatusSchema>;

// ---------------------------------------------------------------------------
// Sharing (D-13, D-37)
// ---------------------------------------------------------------------------

export const SHARE_PERMISSIONS = ["view", "edit"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

export const shareTargetSchema = z.object({
  kind: z.enum(["note", "notebook"]),
  id: uuidSchema,
});
export type ShareTarget = z.infer<typeof shareTargetSchema>;

export const createShareRequestSchema = z.object({
  shareId: uuidSchema,
  target: shareTargetSchema,
  permission: z.enum(SHARE_PERMISSIONS),
  expiresAt: isoDateTimeSchema.nullable().default(null),
});
export type CreateShareRequest = z.input<typeof createShareRequestSchema>;

/** The contract names `Share` without fields; this shape is the core stream's proposal. */
export const shareSchema = z.object({
  id: uuidSchema,
  target: shareTargetSchema,
  permission: z.enum(SHARE_PERMISSIONS),
  expiresAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type Share = z.infer<typeof shareSchema>;

export const guestSessionResponseSchema = z.object({
  guestToken: z.string().min(1),
  target: shareTargetSchema,
  permission: z.enum(SHARE_PERMISSIONS),
  docIds: z.array(uuidSchema),
});
export type GuestSessionResponse = z.infer<typeof guestSessionResponseSchema>;

// ---------------------------------------------------------------------------
// Agent tokens (spec/09-agents-api.md)
// ---------------------------------------------------------------------------

export const AGENT_PERMISSIONS = ["read", "read_write"] as const;
export type AgentPermission = (typeof AGENT_PERMISSIONS)[number];

export const createAgentTokenRequestSchema = z.object({
  name: z.string().min(1).max(200),
  notebookIds: z.array(uuidSchema).min(1),
  permission: z.enum(AGENT_PERMISSIONS),
  expiresAt: isoDateTimeSchema.nullable().optional(),
});
export type CreateAgentTokenRequest = z.infer<typeof createAgentTokenRequestSchema>;

export const createAgentTokenResponseSchema = z.object({
  id: uuidSchema,
  /** Shown once. */
  token: z.string().min(1),
});
export type CreateAgentTokenResponse = z.infer<typeof createAgentTokenResponseSchema>;

/** List item without the secret; fields beyond api.md are the core stream's proposal. */
export const agentTokenSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  notebookIds: z.array(uuidSchema),
  permission: z.enum(AGENT_PERMISSIONS),
  expiresAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  lastUsedAt: isoDateTimeSchema.nullable(),
});
export type AgentToken = z.infer<typeof agentTokenSchema>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const healthResponseSchema = z.object({ ok: z.literal(true), version: z.string() });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Route table for typed clients: method + path template (relative to /v1). */
export const API_ROUTES = {
  prelogin: { method: "POST", path: "/auth/prelogin" },
  signup: { method: "POST", path: "/auth/signup" },
  login: { method: "POST", path: "/auth/login" },
  refresh: { method: "POST", path: "/auth/refresh" },
  logout: { method: "POST", path: "/auth/logout" },
  recoveryStart: { method: "POST", path: "/auth/recovery/start" },
  recoveryFinish: { method: "POST", path: "/auth/recovery/finish" },
  changePassword: { method: "POST", path: "/auth/password" },
  rotateRecoveryKey: { method: "POST", path: "/auth/recovery-key" },
  me: { method: "GET", path: "/me" },
  securityEvents: { method: "GET", path: "/me/security-events" },
  deleteMe: { method: "DELETE", path: "/me" },
  listDevices: { method: "GET", path: "/devices" },
  deleteDevice: { method: "DELETE", path: "/devices/:id" },
  createNotebook: { method: "POST", path: "/notebooks" },
  listNotebooks: { method: "GET", path: "/notebooks" },
  getNotebookKey: { method: "GET", path: "/notebooks/:id/key" },
  patchNotebookMode: { method: "PATCH", path: "/notebooks/:id/mode" },
  deleteNotebook: { method: "DELETE", path: "/notebooks/:id" },
  registerDoc: { method: "POST", path: "/docs" },
  moveDoc: { method: "PATCH", path: "/docs/:id" },
  deleteDoc: { method: "DELETE", path: "/docs/:id" },
  listDocVersions: { method: "GET", path: "/docs/:id/versions" },
  getDocVersion: { method: "GET", path: "/docs/:id/versions/:seq" },
  createAttachment: { method: "POST", path: "/attachments" },
  putAttachmentChunk: { method: "PUT", path: "/attachments/:id/chunks/:index" },
  getAttachment: { method: "GET", path: "/attachments/:id" },
  getAttachmentChunk: { method: "GET", path: "/attachments/:id/chunks/:index" },
  deleteAttachment: { method: "DELETE", path: "/attachments/:id" },
  createShare: { method: "POST", path: "/shares" },
  listShares: { method: "GET", path: "/shares" },
  deleteShare: { method: "DELETE", path: "/shares/:id" },
  createGuestSession: { method: "POST", path: "/shares/:id/guest" },
  createAgentToken: { method: "POST", path: "/agent-tokens" },
  listAgentTokens: { method: "GET", path: "/agent-tokens" },
  deleteAgentToken: { method: "DELETE", path: "/agent-tokens/:id" },
  agentTokenAudit: { method: "GET", path: "/agent-tokens/:id/audit" },
  health: { method: "GET", path: "/health" },
  openapi: { method: "GET", path: "/openapi.json" },
} as const;
export type ApiRouteName = keyof typeof API_ROUTES;
