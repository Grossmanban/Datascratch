/**
 * In-memory implementation of AgentsContext for tests and local experiments.
 * Documents are kept as plain Y.Docs (no encryption); every applied update is
 * recorded with its origin so tests can check agent edits and history.
 */
import type { FastifyRequest } from "fastify";
import * as Y from "yjs";
import type {
  AgentDataSource,
  AgentEditOrigin,
  AgentGrant,
  AgentNotebook,
  AgentsContext,
  AgentsStore,
  AuditEntry,
  AuthorizationCode,
  LoadedDoc,
  OAuthClient,
  OAuthToken,
  UserAuth,
  UserIdentity,
} from "../context.js";

export class InMemoryAgentsStore implements AgentsStore {
  readonly grants = new Map<string, AgentGrant>();
  readonly clients = new Map<string, OAuthClient>();
  readonly codes = new Map<string, AuthorizationCode>();
  readonly tokens = new Map<string, OAuthToken>();
  readonly audit: AuditEntry[] = [];

  async insertGrant(grant: AgentGrant) {
    this.grants.set(grant.id, { ...grant });
  }
  async getGrant(id: string) {
    const g = this.grants.get(id);
    return g ? { ...g } : null;
  }
  async findGrantBySecretHash(secretHash: string) {
    for (const g of this.grants.values()) if (g.secretHash === secretHash) return { ...g };
    return null;
  }
  async listGrants(userId: string) {
    return [...this.grants.values()].filter((g) => g.userId === userId).map((g) => ({ ...g }));
  }
  async updateGrant(id: string, patch: Partial<AgentGrant>) {
    const g = this.grants.get(id);
    if (g) this.grants.set(id, { ...g, ...patch });
  }
  async upsertClient(client: OAuthClient) {
    this.clients.set(client.clientId, { ...client });
  }
  async getClient(clientId: string) {
    return this.clients.get(clientId) ?? null;
  }
  async insertCode(code: AuthorizationCode) {
    this.codes.set(code.codeHash, code);
  }
  async takeCode(codeHash: string) {
    const c = this.codes.get(codeHash) ?? null;
    this.codes.delete(codeHash);
    return c;
  }
  async insertToken(token: OAuthToken) {
    this.tokens.set(token.tokenHash, token);
  }
  async getToken(tokenHash: string) {
    return this.tokens.get(tokenHash) ?? null;
  }
  async deleteToken(tokenHash: string) {
    this.tokens.delete(tokenHash);
  }
  async useRefreshToken(tokenHash: string) {
    const t = this.tokens.get(tokenHash);
    if (!t || (t.kind !== "refresh" && t.kind !== "refresh_used")) return null;
    if (t.kind === "refresh_used") return { token: t, reused: true };
    this.tokens.set(tokenHash, { ...t, kind: "refresh_used" });
    return { token: t, reused: false };
  }
  async deleteTokensOfGrant(grantId: string) {
    for (const [k, t] of this.tokens) if (t.grantId === grantId) this.tokens.delete(k);
  }
  async appendAudit(entry: AuditEntry) {
    this.audit.push(entry);
  }
  async listAudit(grantId: string, options: { limit: number; before?: string }) {
    return this.audit
      .filter((e) => e.grantId === grantId && (!options.before || e.at < options.before))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, options.limit);
  }
}

interface StoredDoc {
  userId: string;
  notebookId: string | null;
  doc: Y.Doc;
  seq: number;
  history: { seq: number; origin: AgentEditOrigin | null; update: Uint8Array }[];
}

interface StoredNotebook extends AgentNotebook {
  userId: string;
  mode: "private" | "agent";
}

export class InMemoryDataSource implements AgentDataSource {
  readonly docs = new Map<string, StoredDoc>();
  readonly notebooks = new Map<string, StoredNotebook>();
  loads = 0;
  /** Docs the "server" fails to decrypt (loadDoc → null), to test degraded paths. */
  readonly broken = new Set<string>();
  /** Updates reported as skipped by loadDoc, per doc. */
  readonly skippedFor = new Map<string, NonNullable<LoadedDoc["skipped"]>>();
  /** grantId of every agent call, as the server would use it for RLS. */
  readonly grantCalls: (string | undefined)[] = [];
  /** Makes the next moveNoteDoc fail after building the updates (atomicity tests). */
  failNextMove = false;

  addNotebook(userId: string, nb: Partial<AgentNotebook> & { id: string; mode?: "private" | "agent" }, doc: Y.Doc): void {
    this.notebooks.set(nb.id, {
      userId,
      id: nb.id,
      name: nb.name ?? null,
      icon: nb.icon ?? null,
      space: nb.space ?? null,
      createdAt: nb.createdAt ?? "2026-10-01T00:00:00.000Z",
      mode: nb.mode ?? "agent",
    });
    this.putDoc(userId, nb.id, null, doc);
  }

  setMode(notebookId: string, mode: "private" | "agent"): void {
    const nb = this.notebooks.get(notebookId);
    if (nb) nb.mode = mode;
  }

  putDoc(userId: string, docId: string, notebookId: string | null, doc: Y.Doc): void {
    const copy = new Y.Doc({ gc: false });
    Y.applyUpdate(copy, Y.encodeStateAsUpdate(doc));
    this.docs.set(docId, { userId, notebookId, doc: copy, seq: 1, history: [] });
  }

  /** The server-side state of a doc (shared, do not mutate in tests). */
  current(docId: string): Y.Doc {
    const d = this.docs.get(docId);
    if (!d) throw new Error(`no doc ${docId}`);
    return d.doc;
  }

  history(docId: string) {
    return this.docs.get(docId)?.history ?? [];
  }

  private readable(userId: string, docId: string): StoredDoc | null {
    const d = this.docs.get(docId);
    if (!d || d.userId !== userId) return null;
    const nbId = d.notebookId ?? docId;
    const nb = this.notebooks.get(nbId);
    if (!nb || nb.mode !== "agent") return null; // the server cannot decrypt private notebooks
    return d;
  }

  async listAgentNotebooks(userId: string): Promise<AgentNotebook[]> {
    return [...this.notebooks.values()]
      .filter((n) => n.userId === userId && n.mode === "agent")
      .map(({ userId: _u, mode: _m, ...rest }) => rest);
  }

  async loadDoc(userId: string, docId: string, grantId?: string): Promise<LoadedDoc | null> {
    this.grantCalls.push(grantId);
    if (this.broken.has(docId)) return null;
    const d = this.readable(userId, docId);
    if (!d) return null;
    this.loads++;
    const doc = new Y.Doc({ gc: false });
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(d.doc));
    const skipped = this.skippedFor.get(docId);
    return skipped ? { doc, seq: d.seq, skipped } : { doc, seq: d.seq };
  }

  async docSeqs(userId: string, docIds: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const id of docIds) {
      const d = this.readable(userId, id);
      if (d) out[id] = d.seq;
    }
    return out;
  }

  async applyUpdate(userId: string, docId: string, update: Uint8Array, origin: AgentEditOrigin): Promise<{ seq: number }> {
    const d = this.readable(userId, docId);
    if (!d) throw new Error(`doc ${docId} is not writable`);
    Y.applyUpdate(d.doc, update);
    d.seq++;
    d.history.push({ seq: d.seq, origin, update });
    return { seq: d.seq };
  }

  async createNoteDoc(userId: string, notebookId: string, noteId: string): Promise<{ wrappedKey: string }> {
    const nb = this.notebooks.get(notebookId);
    if (!nb || nb.userId !== userId || nb.mode !== "agent") throw new Error("notebook not writable");
    this.docs.set(noteId, { userId, notebookId, doc: new Y.Doc({ gc: false }), seq: 0, history: [] });
    return { wrappedKey: `wrapped-${noteId}` };
  }

  async moveNoteDoc(
    userId: string,
    move: Parameters<NonNullable<AgentDataSource["moveNoteDoc"]>>[1],
  ): Promise<{ fromSeq: number; toSeq: number }> {
    this.grantCalls.push(move.origin.grantId);
    const note = this.readable(userId, move.noteId);
    const from = this.readable(userId, move.fromNotebookId);
    const to = this.readable(userId, move.toNotebookId);
    if (!note || note.notebookId !== move.fromNotebookId || !from || !to) throw new Error("note or notebook not writable");
    // Stand-in for re-wrapping the note key with the target notebook key.
    const { from: fromUpdate, to: toUpdate } = move.indexUpdates(`wrapped-${move.noteId}@${move.toNotebookId}`);
    if (this.failNextMove) {
      this.failNextMove = false;
      throw new Error("simulated failure: nothing stored");
    }
    note.notebookId = move.toNotebookId;
    const toSeq = (await this.applyUpdate(userId, move.toNotebookId, toUpdate, move.origin)).seq;
    const fromSeq = (await this.applyUpdate(userId, move.fromNotebookId, fromUpdate, move.origin)).seq;
    return { fromSeq, toSeq };
  }
}

/**
 * Test user auth: `Authorization: Bearer user:<userId>` or cookie `ds_session=<userId>`.
 */
export class InMemoryUserAuth implements UserAuth {
  readonly users = new Map<string, UserIdentity>();
  loginPage: string | null = "https://app.example/login";

  addUser(userId: string, email = `${userId}@example.com`): void {
    this.users.set(userId, { userId, email });
  }

  async authenticate(request: FastifyRequest): Promise<UserIdentity | null> {
    const auth = request.headers.authorization;
    if (auth?.startsWith("Bearer user:")) return this.users.get(auth.slice("Bearer user:".length)) ?? null;
    const cookie = request.headers.cookie ?? "";
    const m = /(?:^|;\s*)ds_session=([^;]+)/.exec(cookie);
    return m ? (this.users.get(decodeURIComponent(m[1]!)) ?? null) : null;
  }

  loginUrl(returnTo: string): string | null {
    return this.loginPage ? `${this.loginPage}?returnTo=${encodeURIComponent(returnTo)}` : null;
  }
}

export interface InMemoryAgentsContext extends AgentsContext {
  store: InMemoryAgentsStore;
  data: InMemoryDataSource;
  users: InMemoryUserAuth;
  clock: { now: Date };
}

export function createInMemoryContext(start = new Date("2026-10-25T12:00:00.000Z")): InMemoryAgentsContext {
  const clock = { now: start };
  return {
    store: new InMemoryAgentsStore(),
    data: new InMemoryDataSource(),
    users: new InMemoryUserAuth(),
    clock,
    now: () => clock.now,
  };
}
