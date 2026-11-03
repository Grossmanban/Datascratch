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
  IncomingInvitation,
  Member,
  MemberRole,
  OutgoingInvitation,
  SharedItem,
  ShareTarget,
  SignupRequest,
  SecurityEvent,
} from "@/lib/shared";
import { checkedPrelogin } from "@/auth/kdfBounds";
import { api } from "./client";

const noAuth = { auth: false } as const;

/** A sharing target, including a whole shared space (D-62, api.md «Общие пространства»). */
export type AnyTarget = ShareTarget | { kind: "space"; id: string };

/** `Space` of the REST API (D-62); its name and icon live in the space doc. */
export type ServerSpace = {
  id: string;
  ownerUserId: string;
  keyVersion: number;
  keyRotationPending: boolean;
  pendingSinceVersion: number | null;
  createdAt: string;
};
export type SpaceKeyResponse = { version: number; wrappedKey: string; keyChain: string[]; keyRotationPending: boolean; pendingSinceVersion: number | null };
export type SpaceNotebookKey = { notebookId: string; version: number; spaceWrappedKey: string; keyChain: string[]; mode: NotebookMode };

/** Shared spaces (D-62, api.md «Общие пространства»). */
export const spacesApi = {
  create: (spaceId: string, wrappedKey: string) => api.post<ServerSpace>("/spaces", { spaceId, wrappedKey }),
  list: () => api.get<ServerSpace[]>("/spaces"),
  key: (id: string) => api.get<SpaceKeyResponse>(`/spaces/${id}/key`),
  notebooks: (id: string) => api.get<SpaceNotebookKey[]>(`/spaces/${id}/notebooks`),
  moveIn: (id: string, notebookId: string, body: { version: number; spaceWrappedKey: string }) => api.put<void>(`/spaces/${id}/notebooks/${notebookId}`, body),
  moveOut: (id: string, notebookId: string, body: { version: number; ownerWrappedKey: string; previousKeyWrap: string; notebookKey?: string }) =>
    api.post<void>(`/spaces/${id}/notebooks/${notebookId}/move-out`, body),
  rotate: (
    id: string,
    body: {
      version: number;
      ownerWrappedKey: string;
      previousKeyWrap: string;
      memberKeys: { userId: string; wrappedKey: string }[];
      notebooks: { notebookId: string; version: number; spaceWrappedKey: string; previousKeyWrap: string; notebookKey?: string }[];
    },
  ) => api.post<void>(`/spaces/${id}/rotate`, body),
  rotateDone: (id: string) => api.post<void>(`/spaces/${id}/rotate/done`),
  remove: (id: string) => api.del<void>(`/spaces/${id}`),
};

export const authApi = {
  // The KDF parameters are checked against the client bounds (crypto.md §2) before any use.
  prelogin: async (email: string): Promise<PreloginResponse> => checkedPrelogin(await api.post<unknown>("/auth/prelogin", { email }, noAuth)),
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

/** Sharing with accounts by email (D-54, api.md «Совместный доступ по аккаунтам»). */
export const membersApi = {
  invite: (body: { invitationId: string; target: AnyTarget; email: string; role: MemberRole }) => api.post<void>("/invitations", body),
  outgoing: (target: AnyTarget) => api.get<OutgoingInvitation[]>(`/invitations?target=${target.kind}:${target.id}`),
  cancelInvitation: (id: string) => api.del<void>(`/invitations/${id}`),
  incoming: () => api.get<IncomingInvitation[]>("/invitations/incoming"),
  accept: (id: string) => api.post<SharedItem>(`/invitations/${id}/accept`),
  decline: (id: string) => api.post<void>(`/invitations/${id}/decline`),
  list: (target: AnyTarget) => api.get<Member[]>(`/members/${target.kind}/${target.id}`),
  setRole: (target: AnyTarget, userId: string, role: MemberRole) => api.patch<void>(`/members/${target.kind}/${target.id}/${userId}`, { role }),
  /** The owner removes a member; a member passes their own id to leave. */
  remove: (target: AnyTarget, userId: string) => api.del<void>(`/members/${target.kind}/${target.id}/${userId}`),
  sharedWithMe: () => api.get<SharedItem[]>("/shared-with-me"),
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
