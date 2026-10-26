import type {
  AgentAuditEntry,
  AgentPermission,
  AgentGrant,
  Device,
  DocKind,
  DocVersion,
  GuestGrant,
  KdfParams,
  Me,
  Notebook,
  NotebookMode,
  PreloginResponse,
  RecoveryStartResponse,
  Session,
  Share,
  SharePermission,
  ShareTarget,
  SignupRequest,
  SecurityEvent,
} from "@/lib/shared";
import { api } from "./client";

const noAuth = { auth: false } as const;

export const authApi = {
  prelogin: (email: string) => api.post<PreloginResponse>("/auth/prelogin", { email }, noAuth),
  signup: (body: SignupRequest) => api.post<Session>("/auth/signup", body, noAuth),
  login: (email: string, loginKey: string, deviceName: string) =>
    api.post<Session>("/auth/login", { email, loginKey, deviceName }, noAuth),
  /** New recovery key (crypto.md §4); the old one stops working at once. */
  rotateRecoveryKey: (body: { currentLoginKey: string; recoveryLoginKey: string; wrappedMasterKeyRecovery: string }) =>
    api.post<void>("/auth/recovery-key", body),
  refresh: (refreshToken: string) => api.post<Session>("/auth/refresh", { refreshToken }, noAuth),
  logout: (refreshToken: string) => api.post<void>("/auth/logout", { refreshToken }, noAuth),
  recoveryStart: (email: string, recoveryLoginKey: string) =>
    api.post<RecoveryStartResponse>("/auth/recovery/start", { email, recoveryLoginKey }, noAuth),
  recoveryFinish: (body: {
    recoveryToken: string;
    salt: string;
    kdf: KdfParams;
    loginKey: string;
    wrappedMasterKeyPassword: string;
  }) => api.post<Session>("/auth/recovery/finish", body, noAuth),
  changePassword: (body: {
    currentLoginKey: string;
    salt: string;
    kdf: KdfParams;
    loginKey: string;
    wrappedMasterKeyPassword: string;
  }) => api.post<void>("/auth/password", body),
};

export const accountApi = {
  me: () => api.get<Me>("/me"),
  devices: () => api.get<Device[]>("/devices"),
  revokeDevice: (id: string) => api.del<void>(`/devices/${id}`),
  securityEvents: () => api.get<SecurityEvent[]>("/me/security-events"),
  deleteAccount: (loginKey: string) => api.del<void>("/me", { loginKey }),
};

export const notebooksApi = {
  list: () => api.get<Notebook[]>("/notebooks"),
  key: (id: string) => api.get<{ wrappedKey: string }>(`/notebooks/${id}/key`),
};

export const docsApi = {
  versions: (docId: string) => api.get<DocVersion[]>(`/docs/${docId}/versions`),
  version: (docId: string, seq: number) => api.get<{ payload: string }>(`/docs/${docId}/versions/${seq}`),
  /** Move a note to another notebook of the same user (api.md «Перенос заметки»). */
  move: (docId: string, notebookId: string) => api.patch<void>(`/docs/${docId}`, { notebookId }),
};

// Mutating calls that must survive offline go through the op queue (sync/ops.ts);
// these bodies are the queue's payload shapes.
export const opBodies = {
  createNotebook: (notebookId: string, mode: NotebookMode, wrappedKey: string, notebookKey?: string) => ({
    notebookId,
    mode,
    wrappedKey,
    ...(notebookKey ? { notebookKey } : {}),
  }),
  registerDoc: (docId: string, kind: DocKind, notebookId: string | null) => ({ docId, kind, notebookId }),
};

export const notebooksModeApi = {
  setMode: (id: string, mode: NotebookMode, notebookKey?: string) =>
    api.patch<void>(`/notebooks/${id}/mode`, { mode, ...(notebookKey ? { notebookKey } : {}) }, { retry: true }),
};

export const sharesApi = {
  create: (body: { shareId: string; target: ShareTarget; permission: SharePermission; expiresAt: string | null }) =>
    api.post<Share>("/shares", body),
  list: () => api.get<Share[]>("/shares"),
  revoke: (id: string) => api.del<void>(`/shares/${id}`),
  guest: (id: string) => api.post<GuestGrant>(`/shares/${id}/guest`, {}, noAuth),
};

export const agentTokensApi = {
  create: (body: { name: string; notebookIds: string[]; permission: AgentPermission; expiresAt?: string | null }) =>
    api.post<AgentGrant & { token: string }>("/agent-tokens", body),
  list: () => api.get<AgentGrant[]>("/agent-tokens"),
  revoke: (id: string) => api.del<void>(`/agent-tokens/${id}`),
  audit: (id: string) => api.get<AgentAuditEntry[]>(`/agent-tokens/${id}/audit?limit=100`),
};
