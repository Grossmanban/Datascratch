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
  "device_revoked",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/**
 * Why a device session was revoked (D-53, api.md). The client wipes all local
 * data for every reason; the reason only picks the wording / security note.
 */
export const DEVICE_REVOKED_REASONS = [
  /** Disconnected in the device list on another device, or logged out. */
  "user",
  /** The password was changed on another device. */
  "password_change",
  /** Access was restored with the recovery key. */
  "recovery",
  /** A used refresh token was presented again outside the 60 s grace: a sign of theft. */
  "token_reuse",
  /** The account was deleted (a still-valid access token; `/auth/refresh` then answers `unauthorized`). */
  "account_deleted",
] as const;
export type DeviceRevokedReason = (typeof DEVICE_REVOKED_REASONS)[number];
export const deviceRevokedReasonSchema = z.enum(DEVICE_REVOKED_REASONS);

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    /** Present with `device_revoked` (HTTP 401). */
    reason: deviceRevokedReasonSchema.optional(),
    /** For `rate_limited`. */
    retryAfterMs: z.number().int().nonnegative().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * How a client must react to a failed REST call (D-53). `device_revoked` is
 * strictly separate from an expired token (`unauthorized` → refresh) and from
 * network failures (`network` → retry later): only it wipes local data.
 */
export type ApiFailure =
  | { kind: "device_revoked"; reason: DeviceRevokedReason }
  | { kind: "unauthorized" }
  | { kind: "network" }
  | { kind: "error"; status: number; code: ApiErrorCode | null; message: string };

/**
 * Classify a REST failure. Pass `status: null` when no HTTP response arrived
 * (fetch threw, timeout, offline). `body` is the parsed JSON or raw text.
 * Only a 401 whose JSON body has `error.code: "device_revoked"` yields
 * `device_revoked`; a proxy's 401 or garbage never does.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function classifyApiFailure(status: number | null, body: unknown): ApiFailure {
  if (status === null) return { kind: "network" };
  let json = body;
  if (typeof body === "string") {
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
  }
  if (status === 401 && isRecord(json) && isRecord(json.error)) {
    if (json.error.code === "device_revoked") {
      // A reason added by a newer server still means "revoked" (fallback "user").
      const reason = deviceRevokedReasonSchema.safeParse(json.error.reason);
      return { kind: "device_revoked", reason: reason.success ? reason.data : "user" };
    }
  }
  const parsed = apiErrorSchema.safeParse(json);
  const error = parsed.success ? parsed.data.error : null;
  if (status === 401) return { kind: "unauthorized" };
  if (status >= 502 && status <= 504 && !error) return { kind: "network" };
  return {
    kind: "error",
    status,
    code: error?.code ?? null,
    message: error?.message ?? `HTTP ${status}`,
  };
}

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
  /** The notebook has members (D-54); absent from older servers. */
  shared: z.boolean().optional(),
});
export type Notebook = z.infer<typeof notebookSchema>;

const keyVersionSchema = z.number().int().positive();

export const notebookKeyResponseSchema = z.object({
  wrappedKey: wrappedKeySchema,
  /** D-54 key rotation (crypto.md §10.3); absent = version 1, empty chain. */
  version: keyVersionSchema.optional(),
  keyChain: z.array(wrappedKeySchema).optional(),
  keyRotationPending: z.boolean().optional(),
});
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

/** Who wrote an update — stamped by the server, never claimed by the client (D-54). */
export const authorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user"), userId: uuidSchema }),
  z.object({ kind: z.literal("guest"), shareId: uuidSchema }),
  z.object({ kind: z.literal("agent"), tokenId: z.string().min(1) }),
]);
export type Author = z.infer<typeof authorSchema>;

export const docVersionSchema = z.object({
  seq: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  deviceId: z.string(),
  /** Who changed the document since the previous version (D-54); absent from older servers. */
  authors: z.array(authorSchema).optional(),
});
export type DocVersion = z.infer<typeof docVersionSchema>;

export const docVersionPayloadSchema = z.object({ payload: base64UrlSchema });
export type DocVersionPayload = z.infer<typeof docVersionPayloadSchema>;

// ---------------------------------------------------------------------------
// Account sharing (D-54, api.md «Совместный доступ», crypto.md §10)
// ---------------------------------------------------------------------------

export const MEMBER_ROLES = ["editor", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const memberRoleSchema = z.enum(MEMBER_ROLES);
/** People per shared notebook/note, pending invitations included. */
export const MAX_MEMBERS = 50;
export const INVITATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_INVITATIONS_PER_DAY = 50;

export const shareTargetSchema = z.object({
  kind: z.enum(["note", "notebook"]),
  id: uuidSchema,
});
export type ShareTarget = z.infer<typeof shareTargetSchema>;

export const boxKeySchema = z.object({
  publicKey: key32Schema,
  wrappedSecretKey: wrappedKeySchema,
});
export type BoxKey = z.infer<typeof boxKeySchema>;

export const publicKeyResponseSchema = z.object({ userId: uuidSchema, publicKey: key32Schema });

export const createInvitationRequestSchema = z.object({
  invitationId: uuidSchema,
  target: shareTargetSchema,
  email: emailSchema,
  role: memberRoleSchema,
});
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;

export const INVITATION_STATUSES = ["pending", "accepted", "declined", "expired"] as const;

export const outgoingInvitationSchema = z.object({
  id: uuidSchema,
  email: z.string(),
  role: memberRoleSchema,
  status: z.enum(INVITATION_STATUSES),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
});
export type OutgoingInvitation = z.infer<typeof outgoingInvitationSchema>;

export const incomingInvitationSchema = z.object({
  id: uuidSchema,
  target: shareTargetSchema,
  from: z.object({ userId: uuidSchema, email: z.string() }),
  role: memberRoleSchema,
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
});
export type IncomingInvitation = z.infer<typeof incomingInvitationSchema>;

export const memberSchema = z.object({
  userId: uuidSchema,
  email: z.string(),
  role: memberRoleSchema,
  status: z.enum(["active", "awaiting_key"]),
  joinedAt: isoDateTimeSchema,
  accountCreatedAfterInvite: z.boolean(),
});
export type Member = z.infer<typeof memberSchema>;

export const patchMemberRequestSchema = z.object({ role: memberRoleSchema });

export const putMemberKeyRequestSchema = z.object({
  version: keyVersionSchema,
  wrappedKey: wrappedKeySchema,
});
export type PutMemberKeyRequest = z.infer<typeof putMemberKeyRequestSchema>;

export const rotateKeyRequestSchema = z
  .object({
    version: keyVersionSchema.min(2),
    ownerWrappedKey: wrappedKeySchema,
    previousKeyWrap: wrappedKeySchema,
    memberKeys: z
      .array(z.object({ userId: uuidSchema, wrappedKey: wrappedKeySchema }))
      .max(MAX_MEMBERS),
    notebookKey: key32Schema.optional(),
  })
  .refine((b) => new Set(b.memberKeys.map((m) => m.userId)).size === b.memberKeys.length, {
    message: "duplicate userId in memberKeys",
    path: ["memberKeys"],
  });
export type RotateKeyRequest = z.infer<typeof rotateKeyRequestSchema>;

export const sharedItemSchema = z.object({
  target: shareTargetSchema,
  owner: z.object({ userId: uuidSchema, email: z.string(), publicKey: key32Schema }),
  role: memberRoleSchema,
  keyVersion: keyVersionSchema,
  /** null while the owner's client has not delivered the key yet. */
  wrappedKey: wrappedKeySchema.nullable(),
  keyChain: z.array(wrappedKeySchema),
  docIds: z.array(uuidSchema),
  addedAt: isoDateTimeSchema,
});
export type SharedItem = z.infer<typeof sharedItemSchema>;

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
  putBoxKey: { method: "PUT", path: "/me/box-key" },
  getBoxKey: { method: "GET", path: "/me/box-key" },
  getPublicKey: { method: "GET", path: "/users/:userId/public-key" },
  createInvitation: { method: "POST", path: "/invitations" },
  listInvitations: { method: "GET", path: "/invitations" },
  deleteInvitation: { method: "DELETE", path: "/invitations/:id" },
  incomingInvitations: { method: "GET", path: "/invitations/incoming" },
  acceptInvitation: { method: "POST", path: "/invitations/:id/accept" },
  declineInvitation: { method: "POST", path: "/invitations/:id/decline" },
  listMembers: { method: "GET", path: "/members/:kind/:id" },
  patchMember: { method: "PATCH", path: "/members/:kind/:id/:userId" },
  deleteMember: { method: "DELETE", path: "/members/:kind/:id/:userId" },
  putMemberKey: { method: "PUT", path: "/members/:kind/:id/:userId/key" },
  rotateKey: { method: "POST", path: "/members/:kind/:id/rotate" },
  rotateKeyDone: { method: "POST", path: "/members/:kind/:id/rotate/done" },
  sharedWithMe: { method: "GET", path: "/shared-with-me" },
  createAgentToken: { method: "POST", path: "/agent-tokens" },
  listAgentTokens: { method: "GET", path: "/agent-tokens" },
  deleteAgentToken: { method: "DELETE", path: "/agent-tokens/:id" },
  agentTokenAudit: { method: "GET", path: "/agent-tokens/:id/audit" },
  health: { method: "GET", path: "/health" },
  openapi: { method: "GET", path: "/openapi.json" },
} as const;
export type ApiRouteName = keyof typeof API_ROUTES;
