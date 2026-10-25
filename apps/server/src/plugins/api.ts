/**
 * Plugin API of the server: what `@datascratch/agents` (and any future plugin)
 * receives. Documented in apps/server/README.md ("Плагины"). Keep this file
 * dependency-light: plugins mirror these types structurally, so that the
 * plugin package does not depend on the server package (no dependency cycle).
 */
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

export interface ServerPlugin {
  name: string;
  /**
   * Called once at startup with the root Fastify instance (routes are not
   * prefixed; use `/v1/...`, `/mcp`, `/.well-known/...` as needed).
   */
  register(app: FastifyInstance, host: PluginHost): Promise<void>;
}

export interface PluginHost {
  /** API version of this interface; bumped on breaking changes. */
  apiVersion: 1;
  log: Logger;
  config: {
    publicUrl: string;
    nodeEnv: 'development' | 'production' | 'test';
  };
  /** Drizzle database and schema, for plugin-owned tables (create them in your own migrations schema). */
  db: unknown;
  /** pg Pool, e.g. for a plugin's own migrations. */
  pool: unknown;
  jobs: PluginJobs;
  agents: AgentHost;
  /** Envelope v1 (crypto.md §3) and key helpers. */
  crypto: PluginCrypto;
}

export interface PluginJobs {
  register<T extends object>(
    name: string,
    handler: (data: T) => Promise<void>,
    opts?: { concurrency?: number; policy?: 'standard' | 'short' },
  ): Promise<void>;
  enqueue<T extends object>(
    name: string,
    data: T,
    opts?: { singletonKey?: string; startAfterSec?: number; retryLimit?: number },
  ): Promise<void>;
  schedule(name: string, cron: string, data?: object): Promise<void>;
}

export interface PluginCrypto {
  seal(key: Uint8Array, plaintext: Uint8Array, ad: string): Promise<Uint8Array>;
  open(key: Uint8Array, envelope: Uint8Array, ad: string): Promise<Uint8Array>;
  /** 32 random bytes (a new noteKey). */
  randomKey(): Promise<Uint8Array>;
  ad: {
    doc(docId: string): string;
    note(noteId: string): string;
    attachment(attachmentId: string, index: number, last: boolean): string;
  };
}

export interface AgentPrincipal {
  kind: 'agent';
  tokenId: string;
  userId: string;
  permission: 'read' | 'read_write';
  /** Notebooks granted to the token that are currently in agent mode. */
  notebookIds: string[];
}

export interface AgentHost {
  /** Verify a raw agent token (`dsa_...`). Returns null if unknown, revoked or expired. */
  authenticate(token: string): Promise<AgentPrincipal | null>;
  /**
   * Run `fn` on behalf of an agent: inside one database transaction restricted
   * by Row-Level Security to the token's notebooks. Live updates made through
   * the scope are broadcast to clients after the transaction commits.
   */
  withScope<T>(principal: AgentPrincipal, fn: (scope: AgentScope) => Promise<T>): Promise<T>;
}

export interface AgentNotebook {
  id: string;
  createdAt: string;
}

export interface AgentDoc {
  id: string;
  kind: 'notebook' | 'note';
  notebookId: string;
  lastSeq: number;
  updatedAt: string;
}

export interface AgentScope {
  principal: AgentPrincipal;
  /** The RLS-scoped drizzle transaction. */
  tx: unknown;
  listNotebooks(): Promise<AgentNotebook[]>;
  listDocs(notebookId: string): Promise<AgentDoc[]>;
  getDoc(docId: string): Promise<AgentDoc | null>;
  /** Decrypted notebook key (agent-mode notebooks only). */
  notebookKey(notebookId: string): Promise<Uint8Array>;
  /**
   * Key that encrypts a document: the notebook key for the notebook index,
   * the note key (unwrapped from NoteMeta.wrappedKey of the notebook index) for a note.
   */
  docKey(docId: string): Promise<Uint8Array>;
  /**
   * Decrypted current state of a document as one Yjs update
   * (apply with `Y.applyUpdate(new Y.Doc(), state)`), and the seq it reflects.
   */
  readDoc(docId: string, key?: Uint8Array): Promise<{ state: Uint8Array; seq: number }>;
  /**
   * Encrypt and append a Yjs update made by the agent; it is relayed to clients
   * like any other update (deviceId `agent:<tokenId>`). Requires read_write.
   */
  applyUpdate(docId: string, update: Uint8Array, key?: Uint8Array): Promise<{ seq: number }>;
  /** Register a new note document in a notebook (before its first update). Requires read_write. */
  createNoteDoc(notebookId: string, noteId: string): Promise<void>;
  /** Read and decrypt a whole attachment (all chunks, in order). */
  readAttachment(attachmentId: string): Promise<{ noteId: string; mime: string; data: Uint8Array }>;
  /** Encrypt (with the note key) and store a new attachment. Requires read_write. */
  writeAttachment(input: { attachmentId: string; noteId: string; mime: string; data: Uint8Array }): Promise<void>;
  /** Append to the agent journal shown to the user (GET /v1/agent-tokens/:id/audit). */
  audit(action: string, entry?: { notebookId?: string; docId?: string; ok?: boolean; details?: Record<string, unknown> }): Promise<void>;
}
