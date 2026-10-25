// Mirrors of docs/architecture/contracts/* (v1). The real copies will live in
// @datascratch/shared/src/contracts — keep field names identical.

// ---------- api.md ----------
export type KdfParams = { alg: "argon2id13"; ops: number; mem: number };

export type Session = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  wrappedMasterKeyPassword: string;
  accountDocId: string;
};

export type PreloginResponse = { salt: string; kdf: KdfParams };

export type SignupRequest = {
  email: string;
  salt: string;
  kdf: KdfParams;
  loginKey: string;
  recoveryLoginKey: string;
  wrappedMasterKeyPassword: string;
  wrappedMasterKeyRecovery: string;
  userId: string;
  accountDocId: string;
};

export type RecoveryStartResponse = {
  recoveryToken: string;
  wrappedMasterKeyRecovery: string;
  userId: string;
};

export type Me = { userId: string; email: string; accountDocId: string; createdAt: string };
export type Device = { id: string; name: string; createdAt: string; lastSeenAt: string; current?: boolean };

export type NotebookMode = "private" | "agent";
export type Notebook = { id: string; mode: NotebookMode; createdAt: string; wrappedKey: string };

export type DocKind = "account" | "notebook" | "note";

export type DocVersion = { seq: number; createdAt: string; deviceId: string };

export type SharePermission = "view" | "edit";
export type ShareTarget = { kind: "note" | "notebook"; id: string };
export type Share = {
  id: string;
  target: ShareTarget;
  permission: SharePermission;
  expiresAt: string | null;
  createdAt: string;
};
export type GuestGrant = {
  guestToken: string;
  target: ShareTarget;
  permission: SharePermission;
  docIds: string[];
};

export type AgentPermission = "read" | "read_write";
export type AgentToken = {
  id: string;
  name: string;
  notebookIds: string[];
  permission: AgentPermission;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};
export type AgentAuditEntry = { at: string; action: string; docId?: string | null; detail?: string };

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "payload_too_large"
  | "internal";

// ---------- sync-protocol.md ----------
export type HelloAuth =
  | { kind: "user"; accessToken: string }
  | { kind: "guest"; shareId: string; guestToken: string };

export type ClientMessage =
  | {
      type: "hello";
      protocol: 1;
      auth: HelloAuth;
      deviceId: string;
      client: { platform: "ios" | "web"; version: string };
    }
  | { type: "subscribe"; docs: { docId: string; since: number }[] }
  | { type: "unsubscribe"; docIds: string[] }
  | { type: "push"; docId: string; clientMsgId: string; payload: string }
  | { type: "snapshot"; docId: string; clientMsgId: string; baseSeq: number; payload: string }
  | { type: "awareness"; docId: string; payload: string };

export type SyncErrorCode =
  | "unauthorized"
  | "forbidden"
  | "doc_not_found"
  | "payload_too_large"
  | "rate_limited"
  | "protocol_mismatch"
  | "internal";

export type ServerMessage =
  | { type: "welcome"; userId: string | null; serverTime: string; protocol: 1 }
  | {
      type: "updates";
      docId: string;
      snapshot: { seq: number; payload: string } | null;
      items: { seq: number; payload: string; deviceId: string }[];
      upToDate: boolean;
    }
  | { type: "update"; docId: string; seq: number; payload: string; deviceId: string }
  | { type: "ack"; docId: string; clientMsgId: string; seq: number }
  | { type: "awareness"; docId: string; payload: string; deviceId: string }
  | { type: "error"; code: SyncErrorCode; message: string; ref?: string };

// ---------- document-model.md ----------
export type Space = {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdAt: string;
};

export type NotebookRef = {
  id: string;
  spaceId: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  mode: NotebookMode;
  createdAt: string;
};

export type StarredRef = { kind: "note" | "folder" | "notebook"; id: string };

export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdAt: string;
};

export type NoteKind = "note" | "daily" | "inbox";

export type NoteMeta = {
  id: string;
  folderId: string | null;
  parentNoteId: string | null;
  title: string;
  kind: NoteKind;
  dailyDate: string | null;
  tags: string[];
  icon: string | null;
  coverThumb: string | null;
  wrappedKey: string;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
  order: number;
};

export type TaskState = "open" | "done" | "cancelled";

export type NoteStyle = {
  font: "serif" | "sans" | "mono";
  width: "normal" | "wide" | "full";
  paper: "plain" | "dots" | "grid" | "lines";
  textColor: string | null;
};
export type NoteCover = { attachmentId: string; offsetY: number } | null;
export type NoteBackdrop = { kind: "color" | "gradient"; value: string } | null;

export const FORMAT_VERSION = 1;
