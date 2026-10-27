import { and, desc, eq, lt } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { agentAudit, agentGrants, oauthClients, oauthCodes, oauthTokens } from '../db/schema.js';
import { noteKeyCache } from './agent-key-cache.js';
import type {
  AgentGrant,
  AgentsStore,
  AuditEntry,
  AuthorizationCode,
  OAuthClient,
  OAuthToken,
} from './agents-context.js';

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const date = (s: string | null | undefined) => (s ? new Date(s) : null);

type GrantRow = typeof agentGrants.$inferSelect;
const grantDto = (g: GrantRow): AgentGrant => ({
  id: g.id,
  userId: g.userId,
  kind: g.kind,
  name: g.name,
  clientId: g.clientId,
  notebookIds: g.notebookIds,
  permission: g.permission,
  createdAt: g.createdAt.toISOString(),
  expiresAt: iso(g.expiresAt),
  revokedAt: iso(g.revokedAt),
  lastUsedAt: iso(g.lastUsedAt),
  secretHash: g.secretHash,
});

/** PostgreSQL implementation of the agents plugin storage (agents-api.md, "Storage"). */
export class PgAgentsStore implements AgentsStore {
  constructor(private readonly db: Db) {}

  async insertGrant(g: AgentGrant) {
    await this.db.insert(agentGrants).values({
      id: g.id,
      userId: g.userId,
      kind: g.kind,
      name: g.name,
      clientId: g.clientId,
      notebookIds: g.notebookIds,
      permission: g.permission,
      createdAt: new Date(g.createdAt),
      expiresAt: date(g.expiresAt),
      revokedAt: date(g.revokedAt),
      lastUsedAt: date(g.lastUsedAt),
      secretHash: g.secretHash,
    });
  }

  async getGrant(id: string) {
    const [g] = await this.db.select().from(agentGrants).where(eq(agentGrants.id, id));
    return g ? grantDto(g) : null;
  }

  async findGrantBySecretHash(secretHash: string) {
    const [g] = await this.db.select().from(agentGrants).where(eq(agentGrants.secretHash, secretHash));
    return g ? grantDto(g) : null;
  }

  async listGrants(userId: string) {
    const rows = await this.db
      .select()
      .from(agentGrants)
      .where(eq(agentGrants.userId, userId))
      .orderBy(desc(agentGrants.createdAt));
    return rows.map(grantDto);
  }

  async updateGrant(
    id: string,
    patch: Partial<Pick<AgentGrant, 'revokedAt' | 'lastUsedAt' | 'notebookIds' | 'permission'>>,
  ) {
    const set: Partial<typeof agentGrants.$inferInsert> = {};
    if ('revokedAt' in patch) set.revokedAt = date(patch.revokedAt);
    if ('lastUsedAt' in patch) set.lastUsedAt = date(patch.lastUsedAt);
    if (patch.notebookIds) set.notebookIds = patch.notebookIds;
    if (patch.permission) set.permission = patch.permission;
    if (Object.keys(set).length === 0) return;
    // A revoked or narrowed grant: drop decrypted note keys of the notebooks it covered (crypto.md §8).
    const narrows = Boolean(patch.revokedAt || patch.notebookIds);
    const [before] = narrows
      ? await this.db.select({ notebookIds: agentGrants.notebookIds }).from(agentGrants).where(eq(agentGrants.id, id))
      : [];
    await this.db.update(agentGrants).set(set).where(eq(agentGrants.id, id));
    if (before) noteKeyCache.forgetNotebooks(before.notebookIds);
  }

  async upsertClient(c: OAuthClient) {
    const values = {
      clientId: c.clientId,
      clientSecretHash: c.clientSecretHash,
      clientName: c.clientName,
      clientUri: c.clientUri,
      logoUri: c.logoUri,
      redirectUris: c.redirectUris,
      tokenEndpointAuthMethod: c.tokenEndpointAuthMethod,
      registration: c.registration,
      createdAt: new Date(c.createdAt),
    };
    const { clientId: _id, ...rest } = values;
    await this.db.insert(oauthClients).values(values).onConflictDoUpdate({ target: oauthClients.clientId, set: rest });
  }

  async getClient(clientId: string): Promise<OAuthClient | null> {
    const [c] = await this.db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
    return c ? { ...c, createdAt: c.createdAt.toISOString() } : null;
  }

  async insertCode(c: AuthorizationCode) {
    await this.db.insert(oauthCodes).values({ ...c, expiresAt: new Date(c.expiresAt) });
  }

  async takeCode(codeHash: string): Promise<AuthorizationCode | null> {
    // DELETE ... RETURNING is atomic: a code can be redeemed only once.
    const [c] = await this.db.delete(oauthCodes).where(eq(oauthCodes.codeHash, codeHash)).returning();
    return c ? { ...c, expiresAt: c.expiresAt.toISOString() } : null;
  }

  async insertToken(t: OAuthToken) {
    await this.db.insert(oauthTokens).values({ ...t, expiresAt: new Date(t.expiresAt) });
  }

  async getToken(tokenHash: string): Promise<OAuthToken | null> {
    const [t] = await this.db.select().from(oauthTokens).where(eq(oauthTokens.tokenHash, tokenHash));
    return t ? { ...t, expiresAt: t.expiresAt.toISOString() } : null;
  }

  async deleteToken(tokenHash: string) {
    await this.db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, tokenHash));
  }

  async useRefreshToken(tokenHash: string) {
    // UPDATE … RETURNING is atomic: of two concurrent refreshes only one gets the token.
    const [t] = await this.db
      .update(oauthTokens)
      .set({ kind: 'refresh_used' })
      .where(and(eq(oauthTokens.tokenHash, tokenHash), eq(oauthTokens.kind, 'refresh')))
      .returning();
    if (t) return { token: { ...t, kind: 'refresh' as const, expiresAt: t.expiresAt.toISOString() }, reused: false };
    const [old] = await this.db
      .select()
      .from(oauthTokens)
      .where(and(eq(oauthTokens.tokenHash, tokenHash), eq(oauthTokens.kind, 'refresh_used')));
    return old ? { token: { ...old, expiresAt: old.expiresAt.toISOString() }, reused: true } : null;
  }

  async deleteTokensOfGrant(grantId: string) {
    await this.db.delete(oauthTokens).where(eq(oauthTokens.grantId, grantId));
  }

  async appendAudit(e: AuditEntry) {
    await this.db.insert(agentAudit).values({ ...e, at: new Date(e.at) });
  }

  async listAudit(grantId: string, options: { limit: number; before?: string }): Promise<AuditEntry[]> {
    const rows = await this.db
      .select()
      .from(agentAudit)
      .where(
        options.before
          ? and(eq(agentAudit.grantId, grantId), lt(agentAudit.at, new Date(options.before)))
          : eq(agentAudit.grantId, grantId),
      )
      .orderBy(desc(agentAudit.at), desc(agentAudit.id))
      .limit(options.limit);
    return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
  }
}
