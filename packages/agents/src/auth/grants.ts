/**
 * Agent credentials: static tokens (`dsa_…`, created in settings) and OAuth
 * access tokens (`dso_at_…`). Both resolve to a grant — what the user allowed.
 * Only SHA-256 hashes of secrets are stored.
 */
import type { AgentGrant, AgentsContext, Permission } from "../context.js";
import { AgentError } from "../errors.js";
import type { Principal } from "../service/access.js";
import { randomToken, sha256Hex, uuidv7 } from "../util.js";

export const STATIC_PREFIX = "dsa_";
export const ACCESS_PREFIX = "dso_at_";
export const REFRESH_PREFIX = "dso_rt_";

export const SCOPE_READ = "notes:read";
export const SCOPE_WRITE = "notes:write";

export function scopeFor(permission: Permission): string {
  return permission === "read_write" ? `${SCOPE_READ} ${SCOPE_WRITE}` : SCOPE_READ;
}

export interface VerifiedToken {
  principal: Principal;
  /** Token expiry (static tokens without expiry report one hour ahead). */
  expiresAt: Date;
  /** Resource (RFC 8707 audience) the token was issued for; null for static tokens. */
  resource: string | null;
  scopes: string[];
}

const TOUCH_INTERVAL_MS = 60_000;

export class GrantService {
  constructor(private readonly ctx: AgentsContext) {}

  private now(): Date {
    return this.ctx.now?.() ?? new Date();
  }

  private active(grant: AgentGrant | null): AgentGrant {
    if (!grant || grant.revokedAt) throw new AgentError("unauthorized", "The token was revoked. Ask the user to reconnect the agent in Datascratch settings.");
    if (grant.expiresAt && new Date(grant.expiresAt) <= this.now()) throw new AgentError("unauthorized", "The token has expired. Ask the user to create a new one.");
    return grant;
  }

  async createStatic(userId: string, input: { name: string; notebookIds: string[]; permission: Permission; expiresAt?: string | null }): Promise<{ grant: AgentGrant; token: string }> {
    const token = randomToken(STATIC_PREFIX);
    const grant: AgentGrant = {
      id: uuidv7(this.now().getTime()),
      userId,
      kind: "static",
      name: input.name,
      clientId: null,
      notebookIds: [...new Set(input.notebookIds)],
      permission: input.permission,
      createdAt: this.now().toISOString(),
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
      lastUsedAt: null,
      secretHash: sha256Hex(token),
    };
    await this.ctx.store.insertGrant(grant);
    return { grant, token };
  }

  async revoke(grantId: string): Promise<void> {
    await this.ctx.store.updateGrant(grantId, { revokedAt: this.now().toISOString() });
    await this.ctx.store.deleteTokensOfGrant(grantId);
  }

  /** Verifies a bearer token of either kind. Throws AgentError("unauthorized"). */
  async verify(token: string, via: Principal["via"]): Promise<VerifiedToken> {
    let grant: AgentGrant;
    let expiresAt: Date;
    let resource: string | null = null;
    if (token.startsWith(STATIC_PREFIX)) {
      grant = this.active(await this.ctx.store.findGrantBySecretHash(sha256Hex(token)));
      if (grant.kind !== "static") throw new AgentError("unauthorized", "Invalid token.");
      const hour = new Date(this.now().getTime() + 3600_000);
      expiresAt = grant.expiresAt && new Date(grant.expiresAt) < hour ? new Date(grant.expiresAt) : hour;
    } else if (token.startsWith(ACCESS_PREFIX)) {
      const rec = await this.ctx.store.getToken(sha256Hex(token));
      if (!rec || rec.kind !== "access") throw new AgentError("unauthorized", "Invalid or expired access token. Refresh it or authorize again.");
      expiresAt = new Date(rec.expiresAt);
      if (expiresAt <= this.now()) throw new AgentError("unauthorized", "The access token has expired. Use the refresh token to get a new one.");
      grant = this.active(await this.ctx.store.getGrant(rec.grantId));
      resource = rec.resource;
    } else {
      throw new AgentError("unauthorized", "Invalid token. Use a Datascratch agent token (dsa_…) or an OAuth access token issued by this server.");
    }
    if (!grant.lastUsedAt || this.now().getTime() - new Date(grant.lastUsedAt).getTime() > TOUCH_INTERVAL_MS) {
      await this.ctx.store.updateGrant(grant.id, { lastUsedAt: this.now().toISOString() });
    }
    return {
      principal: { grant, agentName: grant.name, via },
      expiresAt,
      resource,
      scopes: scopeFor(grant.permission).split(" "),
    };
  }
}

/** Extracts a bearer token from an Authorization header. Never from the query string (MCP spec). */
export function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return m ? m[1]! : null;
}
