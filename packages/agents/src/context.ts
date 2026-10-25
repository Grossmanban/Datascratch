/**
 * The interface between @datascratch/agents and the server process that
 * hosts it. The server implements `AgentsContext` on top of PostgreSQL, its
 * document service and its key store (KMS); tests use the in-memory
 * implementation from `@datascratch/agents/testing`.
 *
 * Contract: docs/architecture/contracts/agents-api.md, section "Plugin context".
 */
import type { FastifyRequest } from "fastify";
import type * as Y from "yjs";

export type Permission = "read" | "read_write";

/** An agent-mode notebook as seen by the plugin. Private notebooks are never returned. */
export interface AgentNotebook {
  id: string;
  /**
   * Display name. The account document (where names live) is encrypted with
   * the master key, so the server may not know it; when null the plugin falls
   * back to `meta.name` of the notebook document.
   */
  name: string | null;
  icon: string | null;
  space: { id: string; name: string; icon: string | null } | null;
  createdAt: string;
}

/** Who caused an update — stored by the server with the update (history, highlighting). */
export interface AgentEditOrigin {
  kind: "agent";
  grantId: string;
  userId: string;
  /** Token name or OAuth client name. */
  agentName: string;
  /** Tool or REST operation that produced the edit. */
  action: string;
}

export interface LoadedDoc {
  /** A fresh, decrypted Y.Doc owned by the caller. */
  doc: Y.Doc;
  /** Last server seq included in `doc`; used as a cache key. */
  seq: number;
}

/** Access to decrypted documents of agent-mode notebooks (server side: KMS + document service). */
export interface AgentDataSource {
  /** Agent-mode notebooks of the user. */
  listAgentNotebooks(userId: string): Promise<AgentNotebook[]>;
  /**
   * Loads a `notebook` or `note` document of an agent-mode notebook, decrypted.
   * Returns null when the doc does not exist or is not readable by the server.
   */
  loadDoc(userId: string, docId: string): Promise<LoadedDoc | null>;
  /**
   * Applies a plain Yjs update as a regular document update: the server
   * encrypts it with the doc key, assigns a seq, stores it (version history)
   * and broadcasts it to connected clients. Returns the new seq.
   */
  applyUpdate(userId: string, docId: string, update: Uint8Array, origin: AgentEditOrigin): Promise<{ seq: number }>;
  /**
   * Registers a new note document in an agent-mode notebook and creates its
   * note key. Returns the note key wrapped with the notebook key (base64url),
   * which the plugin writes to `NoteMeta.wrappedKey` in the notebook index.
   */
  createNoteDoc(userId: string, notebookId: string, noteId: string): Promise<{ wrappedKey: string }>;
  /**
   * Optional: decrypted bytes of an image attachment (PNG/JPEG), used to draw
   * handwriting made on top of pictures. When absent a placeholder is drawn.
   */
  loadAttachmentImage?(userId: string, attachmentId: string): Promise<Uint8Array | null>;
}

/** A logged-in user of the web/iOS apps, as recognised by the server. */
export interface UserIdentity {
  userId: string;
  email?: string;
}

export interface UserAuth {
  /**
   * Authenticates a user request: `Authorization: Bearer <accessToken>` for
   * `/v1/agent-tokens`, and additionally the server's browser session (cookie)
   * for the OAuth consent page. Returns null when not authenticated.
   */
  authenticate(request: FastifyRequest): Promise<UserIdentity | null>;
  /**
   * Where to send a browser that opened the consent page without a session.
   * `returnTo` is the absolute consent URL to come back to. Null → the plugin
   * shows a "sign in to Datascratch first" page with a link to `appUrl`.
   */
  loginUrl?(returnTo: string): string | null;
}

// ---------------------------------------------------------------------------
// Persistence (server: PostgreSQL tables, see agents-api.md "Storage")
// ---------------------------------------------------------------------------

/**
 * A grant is what the user allowed an agent to do: a static token created in
 * settings, or an OAuth authorization given on the consent screen. Revoking a
 * grant immediately invalidates all its tokens.
 */
export interface AgentGrant {
  id: string;
  userId: string;
  kind: "static" | "oauth";
  name: string;
  /** OAuth client id (kind = oauth). */
  clientId: string | null;
  notebookIds: string[];
  permission: Permission;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  /** SHA-256 (hex) of the static token secret (kind = static). */
  secretHash: string | null;
}

export interface OAuthClient {
  clientId: string;
  /** SHA-256 (hex) of the client secret for confidential DCR clients. */
  clientSecretHash: string | null;
  clientName: string;
  clientUri: string | null;
  logoUri: string | null;
  redirectUris: string[];
  tokenEndpointAuthMethod: "none" | "client_secret_post" | "client_secret_basic";
  /** `dcr` — RFC 7591 registration; `cimd` — Client ID Metadata Document (cached copy). */
  registration: "dcr" | "cimd";
  createdAt: string;
}

export interface AuthorizationCode {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  notebookIds: string[];
  permission: Permission;
  expiresAt: string;
}

export interface OAuthToken {
  tokenHash: string;
  kind: "access" | "refresh";
  grantId: string;
  clientId: string;
  scope: string;
  resource: string;
  expiresAt: string;
}

export interface AuditEntry {
  id: string;
  grantId: string;
  userId: string;
  at: string;
  via: "mcp" | "rest";
  action: string;
  notebookId: string | null;
  noteId: string | null;
  ok: boolean;
  errorCode: string | null;
  durationMs: number;
}

export interface AgentsStore {
  insertGrant(grant: AgentGrant): Promise<void>;
  getGrant(id: string): Promise<AgentGrant | null>;
  findGrantBySecretHash(secretHash: string): Promise<AgentGrant | null>;
  listGrants(userId: string): Promise<AgentGrant[]>;
  updateGrant(id: string, patch: Partial<Pick<AgentGrant, "revokedAt" | "lastUsedAt" | "notebookIds" | "permission">>): Promise<void>;

  upsertClient(client: OAuthClient): Promise<void>;
  getClient(clientId: string): Promise<OAuthClient | null>;

  insertCode(code: AuthorizationCode): Promise<void>;
  /** Returns and deletes the code (single use). */
  takeCode(codeHash: string): Promise<AuthorizationCode | null>;

  insertToken(token: OAuthToken): Promise<void>;
  getToken(tokenHash: string): Promise<OAuthToken | null>;
  deleteToken(tokenHash: string): Promise<void>;
  deleteTokensOfGrant(grantId: string): Promise<void>;

  appendAudit(entry: AuditEntry): Promise<void>;
  /** Newest first. */
  listAudit(grantId: string, options: { limit: number; before?: string }): Promise<AuditEntry[]>;
}

export interface AgentsContext {
  store: AgentsStore;
  data: AgentDataSource;
  users: UserAuth;
  /** Clock, injectable for tests. */
  now?(): Date;
}
