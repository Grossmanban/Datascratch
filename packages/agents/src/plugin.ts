/**
 * Fastify plugin that the server registers in its process:
 *
 *   await app.register(agentsPlugin, { context, publicUrl, secret });
 *
 * Routes (absolute paths, register without a prefix):
 *   /mcp                                    MCP, Streamable HTTP (SDK v2, spec 2026-07-28 + 2025 clients)
 *   /.well-known/oauth-protected-resource…  RFC 9728
 *   /.well-known/oauth-authorization-server RFC 8414
 *   /oauth/register|authorize|token|revoke  OAuth 2.1 authorization server
 *   /v1/agent/*                             REST for agents without MCP
 *   /v1/agent-tokens…                       static tokens and connections (user auth)
 */
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import { bearer, GrantService, SCOPE_READ, SCOPE_WRITE, type VerifiedToken } from "./auth/grants.js";
import { canonicalResource, fetchClientMetadataDocument, registerOAuthRoutes, type OAuthConfig } from "./auth/oauth.js";
import type { AgentsContext } from "./context.js";
import { AgentError, errorBody, toAgentError } from "./errors.js";
import { registerAgentTokenRoutes } from "./http/agent-tokens.js";
import { RateLimiter, type RateLimitRule } from "./http/rate-limit.js";
import { registerRestRoutes } from "./http/rest.js";
import { buildMcpServer } from "./mcp/tools.js";
import type { Principal } from "./service/access.js";
import { AgentService } from "./service/agent-service.js";
import { VERSION } from "./version.js";

export interface AgentsPluginOptions {
  context: AgentsContext;
  /** Public origin of the server, e.g. `https://notes.example.com` (OAuth issuer, base of resource URIs). */
  publicUrl: string;
  /** At least 32 bytes; signs consent-form state. Keep it stable across restarts. */
  secret: string | Uint8Array;
  /** Web app URL for links on the consent page ("open Datascratch"). */
  appUrl?: string | null;
  /** Browser origins allowed to call /mcp (DNS-rebinding protection). Requests without Origin are allowed. */
  allowedOrigins?: string[];
  rateLimit?: { agent?: RateLimitRule; oauth?: RateLimitRule };
  tokenTtl?: { accessSec?: number; refreshSec?: number; codeSec?: number };
  routes?: { mcp?: boolean; rest?: boolean; oauth?: boolean; agentTokens?: boolean };
  /** Override for fetching OAuth Client ID Metadata Documents (tests, proxies). */
  fetchClientMetadata?: (url: string) => Promise<unknown>;
  /** Max handwriting images attached to read_note (default 6). */
  maxImagesPerRead?: number;
}

export interface AgentsRuntime {
  service: AgentService;
  grants: GrantService;
  mcpUrl: string;
  /** Authenticates an agent request; throws AgentError("unauthorized"). */
  authenticate(request: FastifyRequest, via: Principal["via"]): Promise<VerifiedToken>;
  limit(p: Principal): void;
}

function parseForm(body: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of new URLSearchParams(body)) {
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

export function sendError(reply: FastifyReply, err: unknown): FastifyReply {
  const e = toAgentError(err);
  if (e.retryAfterSec) reply.header("retry-after", String(e.retryAfterSec));
  return reply.code(e.status).send(errorBody(e));
}

export const agentsPlugin: FastifyPluginAsync<AgentsPluginOptions> = async (app: FastifyInstance, opts: AgentsPluginOptions) => {
  const ctx = opts.context;
  const issuer = new URL(opts.publicUrl).origin;
  const secret = typeof opts.secret === "string" ? new TextEncoder().encode(opts.secret) : opts.secret;
  if (secret.byteLength < 32) throw new Error("agentsPlugin: secret must be at least 32 bytes");
  const mcpUrl = `${issuer}/mcp`;
  const restUrl = `${issuer}/v1/agent`;
  const routes = { mcp: true, rest: true, oauth: true, agentTokens: true, ...opts.routes };
  const now = () => (ctx.now?.() ?? new Date()).getTime();

  const service = new AgentService(ctx, { maxImagesPerRead: opts.maxImagesPerRead });
  const grants = new GrantService(ctx);
  const agentLimiter = new RateLimiter(opts.rateLimit?.agent ?? { perMinute: 120, burst: 60 }, now);
  const oauthLimiter = new RateLimiter(opts.rateLimit?.oauth ?? { perMinute: 30, burst: 15 }, now);
  const resources = [mcpUrl, restUrl];

  const runtime: AgentsRuntime = {
    service,
    grants,
    mcpUrl,
    async authenticate(request, via) {
      const token = bearer(request.headers.authorization);
      if (!token) throw new AgentError("unauthorized", "Authorization: Bearer <token> is required.");
      const v = await grants.verify(token, via);
      if (v.resource && !resources.includes(canonicalResource(v.resource)))
        throw new AgentError("unauthorized", "The access token was issued for another resource.");
      return v;
    },
    limit(p) {
      agentLimiter.take(`grant:${p.grant.id}`);
    },
  };

  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string", bodyLimit: 64 * 1024 }, (_req, body, done) => {
    try {
      done(null, parseForm(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  if (routes.oauth) {
    const cfg: OAuthConfig = {
      issuer,
      resources,
      secret,
      appUrl: opts.appUrl ?? null,
      accessTtlSec: opts.tokenTtl?.accessSec ?? 3600,
      refreshTtlSec: opts.tokenTtl?.refreshSec ?? 30 * 24 * 3600,
      codeTtlSec: opts.tokenTtl?.codeSec ?? 300,
      fetchClientMetadata: opts.fetchClientMetadata ?? fetchClientMetadataDocument,
    };
    registerOAuthRoutes(app, { ctx, grants, cfg, limiter: oauthLimiter });
  }
  if (routes.rest) registerRestRoutes(app, ctx, runtime);
  if (routes.agentTokens) registerAgentTokenRoutes(app, ctx, runtime);
  if (routes.mcp) registerMcpRoute(app, ctx, runtime, opts.allowedOrigins ?? [issuer], issuer);

  app.decorate("datascratchAgents", runtime);
};

function registerMcpRoute(app: FastifyInstance, ctx: AgentsContext, rt: AgentsRuntime, allowedOrigins: string[], issuer: string): void {
  const prm = `${issuer}/.well-known/oauth-protected-resource/mcp`;
  const handler = createMcpHandler(({ authInfo }) => {
    const principal = authInfo?.extra?.principal as Principal | undefined;
    if (!principal) throw new Error("unauthenticated MCP request reached the handler");
    return buildMcpServer(ctx, rt.service, principal, VERSION);
  });

  const challenge = (reply: FastifyReply, err: AgentError, hadToken: boolean) => {
    const params = [`resource_metadata="${prm}"`, `scope="${SCOPE_READ} ${SCOPE_WRITE}"`];
    if (hadToken) params.unshift(`error="invalid_token"`, `error_description="${err.message.replace(/"/g, "'")}"`);
    return reply.code(401).header("www-authenticate", `Bearer ${params.join(", ")}`).send(errorBody(err));
  };

  app.route({
    method: ["GET", "POST", "DELETE"],
    url: "/mcp",
    handler: async (request, reply) => {
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.includes(origin)) return reply.code(403).send(errorBody(new AgentError("forbidden", "Origin not allowed.")));
      let verified: VerifiedToken;
      try {
        verified = await rt.authenticate(request, "mcp");
        if (verified.resource && canonicalResource(verified.resource) !== rt.mcpUrl)
          throw new AgentError("unauthorized", "The access token was not issued for the MCP endpoint.");
      } catch (err) {
        return challenge(reply, toAgentError(err), Boolean(request.headers.authorization));
      }
      try {
        rt.limit(verified.principal);
      } catch (err) {
        return sendError(reply, err);
      }
      const url = `${issuer}${request.url}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (v === undefined) continue;
        headers.set(k, Array.isArray(v) ? v.join(", ") : v);
      }
      const hasBody = request.method === "POST" && request.body !== undefined;
      const webRequest = new Request(url, { method: request.method, headers, body: hasBody ? JSON.stringify(request.body) : undefined });
      const response = await handler.fetch(webRequest, {
        authInfo: {
          token: "redacted",
          clientId: verified.principal.grant.clientId ?? verified.principal.grant.id,
          scopes: verified.scopes,
          expiresAt: Math.floor(verified.expiresAt.getTime() / 1000),
          resourceMetadataUrl: prm,
          extra: { principal: verified.principal, kind: verified.principal.grant.kind },
        },
        parsedBody: hasBody ? request.body : undefined,
      });
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "content-length" && key !== "transfer-encoding") reply.header(key, value);
      });
      if (!response.body) return reply.send();
      return reply.send(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream));
    },
  });
}

declare module "fastify" {
  interface FastifyInstance {
    datascratchAgents?: AgentsRuntime;
  }
}
