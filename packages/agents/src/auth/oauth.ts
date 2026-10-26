/**
 * OAuth 2.1 authorization server for MCP clients (MCP spec 2026-07-28,
 * "Authorization"): RFC 9728 protected resource metadata, RFC 8414 server
 * metadata, Client ID Metadata Documents (preferred) and RFC 7591 dynamic
 * registration (kept for older clients), authorization code + PKCE (S256
 * only), RFC 8707 resource indicators, RFC 9207 `iss` in responses, refresh
 * token rotation, RFC 7009 revocation.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import type { AgentGrant, AgentsContext, OAuthClient, Permission } from "../context.js";
import { AgentError } from "../errors.js";
import type { RateLimiter } from "../http/rate-limit.js";
import { hmac, randomToken, safeEqual, sha256Base64url, sha256Hex, uuidv7 } from "../util.js";
import { ACCESS_PREFIX, REFRESH_PREFIX, SCOPE_READ, SCOPE_WRITE, scopeFor, type GrantService } from "./grants.js";
import { describeAgentNotebooks } from "../service/notebook-meta.js";
import { consentPage, errorPage, signInPage } from "./pages.js";

export interface OAuthConfig {
  /** Issuer = public origin of the server, e.g. `https://notes.example.com`. */
  issuer: string;
  /** Canonical resource URIs this server accepts tokens for (MCP endpoint first). */
  resources: string[];
  secret: Uint8Array;
  appUrl: string | null;
  accessTtlSec: number;
  refreshTtlSec: number;
  codeTtlSec: number;
  /** Fetches a Client ID Metadata Document. Default: HTTPS GET with SSRF guard. */
  fetchClientMetadata: (url: string) => Promise<unknown>;
  /**
   * Advertise Client ID Metadata Documents in the server metadata. Off on servers that cannot
   * reach clients' hosts (e.g. claude.ai is unreachable from some regions): MCP clients then
   * use dynamic registration, which needs no outbound request. URL client ids still work.
   */
  advertiseClientIdMetadataDocuments: boolean;
}

const SCOPES = [SCOPE_READ, SCOPE_WRITE];

export function protectedResourceMetadata(cfg: OAuthConfig, resource: string) {
  return {
    resource,
    authorization_servers: [cfg.issuer],
    scopes_supported: SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: "Datascratch",
    resource_documentation: `${cfg.issuer}/docs/agents`,
  };
}

export function authorizationServerMetadata(cfg: OAuthConfig) {
  return {
    issuer: cfg.issuer,
    authorization_endpoint: `${cfg.issuer}/oauth/authorize`,
    token_endpoint: `${cfg.issuer}/oauth/token`,
    registration_endpoint: `${cfg.issuer}/oauth/register`,
    revocation_endpoint: `${cfg.issuer}/oauth/revoke`,
    scopes_supported: SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    client_id_metadata_document_supported: cfg.advertiseClientIdMetadataDocuments,
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${cfg.issuer}/docs/agents`,
  };
}

// ---------------------------------------------------------------------------
// Clients: CIMD and dynamic registration
// ---------------------------------------------------------------------------

class OAuthProblem extends Error {
  constructor(
    readonly error: string,
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
  }
}

function isLoopback(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function validRedirectUri(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash) return false;
  if (u.protocol === "https:") return true;
  if (u.protocol === "http:") return isLoopback(u.hostname);
  // Private-use URI schemes of native apps (RFC 8252 §7.1), e.g. `cursor://…`.
  return /^[a-z][a-z0-9+.-]*\.?[a-z0-9+.-]*:$/.test(u.protocol) && !["javascript:", "data:", "file:", "vbscript:"].includes(u.protocol);
}

/** Exact match; for loopback redirect URIs any port is accepted (RFC 8252 §7.3). */
function redirectAllowed(client: OAuthClient, uri: string): boolean {
  if (client.redirectUris.includes(uri)) return true;
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" || !isLoopback(u.hostname)) return false;
  return client.redirectUris.some((r) => {
    try {
      const ru = new URL(r);
      return ru.protocol === "http:" && ru.hostname === u.hostname && ru.pathname === u.pathname;
    } catch {
      return false;
    }
  });
}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v === "::";
  }
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Default CIMD fetcher: HTTPS only, public addresses only, 64 KiB, 5 s. */
export async function fetchClientMetadataDocument(url: string): Promise<unknown> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("client_id must be an https URL");
  const addresses = isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("client_id host resolves to a private address");
  const res = await fetch(url, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`metadata document returned HTTP ${res.status}`);
  const text = await res.text();
  if (text.length > 65_536) throw new Error("metadata document is too large");
  return JSON.parse(text);
}

const CIMD_TTL_MS = 24 * 3600_000;

export class ClientRegistry {
  constructor(
    private readonly ctx: AgentsContext,
    private readonly cfg: OAuthConfig,
  ) {}

  private now(): Date {
    return this.ctx.now?.() ?? new Date();
  }

  async get(clientId: string): Promise<OAuthClient> {
    if (/^https:\/\//.test(clientId)) return this.fromMetadataDocument(clientId);
    const c = await this.ctx.store.getClient(clientId);
    if (!c) throw new OAuthProblem("invalid_client", "Unknown client_id. Register the client again.", 401);
    return c;
  }

  private async fromMetadataDocument(clientId: string): Promise<OAuthClient> {
    const cached = await this.ctx.store.getClient(clientId);
    if (cached && this.now().getTime() - new Date(cached.createdAt).getTime() < CIMD_TTL_MS) return cached;
    let doc: Record<string, unknown>;
    try {
      doc = (await this.cfg.fetchClientMetadata(clientId)) as Record<string, unknown>;
    } catch (err) {
      throw new OAuthProblem("invalid_client", `Could not fetch the client metadata document: ${(err as Error).message}`, 401);
    }
    if (!doc || typeof doc !== "object" || doc.client_id !== clientId)
      throw new OAuthProblem("invalid_client", "The client metadata document must contain client_id equal to its URL.", 401);
    const redirectUris = Array.isArray(doc.redirect_uris) ? doc.redirect_uris.filter((r): r is string => typeof r === "string" && validRedirectUri(r)) : [];
    if (redirectUris.length === 0) throw new OAuthProblem("invalid_client", "The client metadata document has no valid redirect_uris.", 401);
    const method = doc.token_endpoint_auth_method ?? "none";
    if (method !== "none") throw new OAuthProblem("invalid_client", "Client ID Metadata Document clients must use token_endpoint_auth_method \"none\".", 401);
    const client: OAuthClient = {
      clientId,
      clientSecretHash: null,
      clientName: typeof doc.client_name === "string" && doc.client_name.trim() ? doc.client_name.trim().slice(0, 100) : new URL(clientId).host,
      clientUri: typeof doc.client_uri === "string" ? doc.client_uri : null,
      logoUri: typeof doc.logo_uri === "string" ? doc.logo_uri : null,
      redirectUris,
      tokenEndpointAuthMethod: "none",
      registration: "cimd",
      createdAt: this.now().toISOString(),
    };
    await this.ctx.store.upsertClient(client);
    return client;
  }

  /** RFC 7591 dynamic client registration. */
  async register(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    if (redirectUris.length === 0 || !redirectUris.every((r) => typeof r === "string" && validRedirectUri(r)))
      throw new OAuthProblem("invalid_redirect_uri", "redirect_uris must be https URLs, http loopback URLs or private-use scheme URIs, without fragments.");
    const method = (body.token_endpoint_auth_method as string | undefined) ?? "none";
    if (!["none", "client_secret_post", "client_secret_basic"].includes(method))
      throw new OAuthProblem("invalid_client_metadata", `Unsupported token_endpoint_auth_method "${method}".`);
    const grantTypes = (body.grant_types as string[] | undefined) ?? ["authorization_code", "refresh_token"];
    if (!grantTypes.includes("authorization_code")) throw new OAuthProblem("invalid_client_metadata", "grant_types must include authorization_code.");
    const clientId = uuidv7(this.now().getTime());
    const secret = method === "none" ? null : randomToken("dsc_");
    const name = typeof body.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 100) : "ИИ-агент";
    const client: OAuthClient = {
      clientId,
      clientSecretHash: secret ? sha256Hex(secret) : null,
      clientName: name,
      clientUri: typeof body.client_uri === "string" ? body.client_uri : null,
      logoUri: typeof body.logo_uri === "string" ? body.logo_uri : null,
      redirectUris: redirectUris as string[],
      tokenEndpointAuthMethod: method as OAuthClient["tokenEndpointAuthMethod"],
      registration: "dcr",
      createdAt: this.now().toISOString(),
    };
    await this.ctx.store.upsertClient(client);
    return {
      client_id: clientId,
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(this.now().getTime() / 1000),
      client_name: name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: method,
      ...(client.clientUri ? { client_uri: client.clientUri } : {}),
      ...(client.logoUri ? { logo_uri: client.logoUri } : {}),
    };
  }
}

// ---------------------------------------------------------------------------
// Signed authorization request (carried through the consent form)
// ---------------------------------------------------------------------------

interface PendingRequest {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  resource: string;
  scope: string;
  userId: string;
  exp: number;
}

function seal(secret: Uint8Array, req: PendingRequest): string {
  const body = Buffer.from(JSON.stringify(req)).toString("base64url");
  return `${body}.${hmac(secret, body)}`;
}

function unseal(secret: Uint8Array, value: string, now: number): PendingRequest | null {
  const [body, mac] = value.split(".");
  if (!body || !mac || !safeEqual(mac, hmac(secret, body))) return null;
  const req = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PendingRequest;
  return req.exp > now ? req : null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

function noStore(reply: FastifyReply): FastifyReply {
  return reply.header("cache-control", "no-store").header("pragma", "no-cache");
}

function sendProblem(reply: FastifyReply, p: OAuthProblem) {
  noStore(reply).code(p.status);
  if (p.status === 401) reply.header("www-authenticate", 'Basic realm="datascratch-oauth"');
  return reply.send({ error: p.error, error_description: p.description });
}

function html(reply: FastifyReply, status: number, body: string, formAction?: string) {
  return noStore(reply)
    .code(status)
    .header("content-type", "text/html; charset=utf-8")
    .header("x-frame-options", "DENY")
    .header("referrer-policy", "no-referrer")
    .header("content-security-policy", `default-src 'none'; style-src 'unsafe-inline'; img-src https:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'${formAction ? " " + formAction : ""}`)
    .send(body);
}

function redirectWith(reply: FastifyReply, redirectUri: string, params: Record<string, string | null>) {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v !== null) u.searchParams.set(k, v);
  return noStore(reply).redirect(u.toString(), 302);
}

/** RFC 8707 canonical form: no fragment, no trailing slash on a bare origin (URL lowercases scheme and host). */
export function canonicalResource(value: string): string {
  try {
    const u = new URL(value);
    u.hash = "";
    const s = u.toString();
    return u.pathname === "/" && !u.search ? s.slice(0, -1) : s;
  } catch {
    return value;
  }
}

function clientAuth(request: FastifyRequest, body: Record<string, string>): { clientId: string | null; secret: string | null } {
  const header = request.headers.authorization;
  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i !== -1) return { clientId: decodeURIComponent(decoded.slice(0, i)), secret: decodeURIComponent(decoded.slice(i + 1)) };
  }
  return { clientId: body.client_id ?? null, secret: body.client_secret ?? null };
}

export interface OAuthDeps {
  ctx: AgentsContext;
  grants: GrantService;
  cfg: OAuthConfig;
  /** Limits registration/token calls per client IP. */
  limiter: RateLimiter;
}

export function registerOAuthRoutes(app: FastifyInstance, deps: OAuthDeps): void {
  const { ctx, cfg, limiter } = deps;
  const clients = new ClientRegistry(ctx, cfg);
  const now = () => ctx.now?.() ?? new Date();
  const resources = cfg.resources.map(canonicalResource);

  const limited = (request: FastifyRequest) => {
    try {
      limiter.take(`oauth:${request.ip}`);
    } catch (err) {
      if (err instanceof AgentError) throw new OAuthProblem("temporarily_unavailable", err.message, 429);
      throw err;
    }
  };

  // RFC 9728: path-aware metadata for every resource, plus the root form.
  const prmPaths = new Map<string, string>();
  for (const r of cfg.resources) {
    const path = new URL(r).pathname.replace(/\/$/, "");
    prmPaths.set(`/.well-known/oauth-protected-resource${path}`, r);
  }
  prmPaths.set("/.well-known/oauth-protected-resource", cfg.resources[0]!);
  for (const [path, resource] of prmPaths) {
    app.get(path, async (_req, reply) => reply.header("access-control-allow-origin", "*").send(protectedResourceMetadata(cfg, resource)));
  }
  app.get("/.well-known/oauth-authorization-server", async (_req, reply) =>
    reply.header("access-control-allow-origin", "*").send(authorizationServerMetadata(cfg)),
  );

  app.post("/oauth/register", async (request, reply) => {
    try {
      limited(request);
      const body = (request.body ?? {}) as Record<string, unknown>;
      return noStore(reply).code(201).send(await clients.register(body));
    } catch (err) {
      if (err instanceof OAuthProblem) return sendProblem(reply, err);
      throw err;
    }
  });

  app.get("/oauth/authorize", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    // Errors before the redirect URI is trusted are shown to the user, never redirected (open redirect).
    if (!q.client_id || !q.redirect_uri) return html(reply, 400, errorPage("В запросе нет client_id или redirect_uri."));
    let client: OAuthClient;
    try {
      client = await clients.get(q.client_id);
    } catch (err) {
      return html(reply, 400, errorPage(err instanceof OAuthProblem ? err.description : "Неизвестный клиент."));
    }
    if (!redirectAllowed(client, q.redirect_uri)) return html(reply, 400, errorPage("Адрес возврата (redirect_uri) не зарегистрирован для этого клиента."));
    const back = (error: string, description: string) =>
      redirectWith(reply, q.redirect_uri!, { error, error_description: description, state: q.state ?? null, iss: cfg.issuer });
    if (q.response_type !== "code") return back("unsupported_response_type", "Only response_type=code is supported.");
    if (!q.code_challenge || q.code_challenge_method !== "S256") return back("invalid_request", "PKCE with code_challenge_method=S256 is required.");
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(q.code_challenge)) return back("invalid_request", "Malformed code_challenge.");
    const resource = canonicalResource(q.resource ?? cfg.resources[0]!);
    if (!resources.includes(resource)) return back("invalid_target", `Unknown resource. Use ${cfg.resources[0]}.`);
    const requested = (q.scope ?? SCOPES.join(" ")).split(/\s+/).filter(Boolean);
    const unknown = requested.filter((s) => !SCOPES.includes(s) && s !== "offline_access");
    if (unknown.length) return back("invalid_scope", `Unknown scope: ${unknown.join(" ")}. Supported: ${SCOPES.join(" ")}.`);

    const user = await ctx.users.authenticate(request);
    if (!user) {
      const returnTo = `${cfg.issuer}${request.url}`;
      const login = ctx.users.loginUrl?.(returnTo) ?? null;
      return login ? noStore(reply).redirect(login, 302) : html(reply, 200, signInPage(cfg.appUrl));
    }
    const notebooks = await describeAgentNotebooks(ctx, user.userId);
    const pending = seal(cfg.secret, {
      clientId: client.clientId,
      redirectUri: q.redirect_uri,
      state: q.state ?? null,
      codeChallenge: q.code_challenge,
      resource,
      scope: requested.join(" "),
      userId: user.userId,
      exp: now().getTime() + 15 * 60_000,
    });
    const redirectOrigin = (() => {
      try {
        const u = new URL(q.redirect_uri!);
        return u.protocol === "http:" || u.protocol === "https:" ? u.origin : `${u.protocol}`;
      } catch {
        return undefined;
      }
    })();
    return html(
      reply,
      200,
      consentPage({
        clientName: client.clientName,
        clientUri: client.clientUri,
        logoUri: client.logoUri,
        redirectHost: (() => {
          const u = new URL(q.redirect_uri!);
          return u.host || u.protocol;
        })(),
        userEmail: user.email ?? null,
        notebooks: notebooks.map((n) => ({ id: n.id, name: n.name, space: n.space?.name ?? null, icon: n.icon, color: n.color ?? null, unavailable: n.unavailable })),
        writeRequested: requested.includes(SCOPE_WRITE),
        request: pending,
        action: "/oauth/authorize",
        appUrl: cfg.appUrl,
      }),
      redirectOrigin,
    );
  });

  app.post("/oauth/authorize", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, string | string[]>;
    const raw = typeof body.request === "string" ? body.request : "";
    const pending = unseal(cfg.secret, raw, now().getTime());
    if (!pending) return html(reply, 400, errorPage("Запрос устарел или повреждён. Начните подключение агента заново."));
    const user = await ctx.users.authenticate(request);
    if (!user || user.userId !== pending.userId) return html(reply, 403, errorPage("Вы вошли под другим пользователем. Начните подключение заново."));
    const back = (params: Record<string, string>) => redirectWith(reply, pending.redirectUri, { ...params, state: pending.state, iss: cfg.issuer });
    if (body.decision !== "allow") return back({ error: "access_denied", error_description: "The user denied access." });

    const chosen = ([] as string[]).concat(body.notebook ?? []);
    const allowed = new Set((await ctx.data.listAgentNotebooks(user.userId)).map((n) => n.id));
    const notebookIds = [...new Set(chosen)].filter((id) => allowed.has(id));
    if (notebookIds.length === 0) return html(reply, 400, errorPage("Выберите хотя бы один блокнот в режиме «для агентов»."));
    const permission: Permission = body.permission === "read_write" ? "read_write" : "read";
    const code = randomToken("dso_code_");
    await ctx.store.insertCode({
      codeHash: sha256Hex(code),
      clientId: pending.clientId,
      userId: user.userId,
      redirectUri: pending.redirectUri,
      codeChallenge: pending.codeChallenge,
      resource: pending.resource,
      scope: scopeFor(permission),
      notebookIds,
      permission,
      expiresAt: new Date(now().getTime() + cfg.codeTtlSec * 1000).toISOString(),
    });
    return back({ code });
  });

  app.post("/oauth/token", async (request, reply) => {
    try {
      limited(request);
      const body = (request.body ?? {}) as Record<string, string>;
      const auth = clientAuth(request, body);
      if (!auth.clientId) throw new OAuthProblem("invalid_client", "client_id is required.", 401);
      const client = await clients.get(auth.clientId);
      if (client.tokenEndpointAuthMethod !== "none") {
        if (!auth.secret || !client.clientSecretHash || !safeEqual(sha256Hex(auth.secret), client.clientSecretHash))
          throw new OAuthProblem("invalid_client", "Client authentication failed.", 401);
      }
      if (body.grant_type === "authorization_code") return noStore(reply).send(await exchangeCode(client, body));
      if (body.grant_type === "refresh_token") return noStore(reply).send(await refresh(client, body));
      throw new OAuthProblem("unsupported_grant_type", "Supported grant types: authorization_code, refresh_token.");
    } catch (err) {
      if (err instanceof OAuthProblem) return sendProblem(reply, err);
      throw err;
    }
  });

  app.post("/oauth/revoke", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, string>;
    const token = body.token ?? "";
    const rec = token ? await ctx.store.getToken(sha256Hex(token)) : null;
    const auth = clientAuth(request, body);
    // RFC 7009: always 200; only revoke when the token belongs to the caller.
    if (rec && auth.clientId === rec.clientId) {
      if (rec.kind === "refresh") await deps.grants.revoke(rec.grantId);
      else await ctx.store.deleteToken(rec.tokenHash);
    }
    return noStore(reply).code(200).send({});
  });

  async function issue(grant: AgentGrant, clientId: string, resource: string) {
    const access = randomToken(ACCESS_PREFIX);
    const refreshToken = randomToken(REFRESH_PREFIX);
    const t = now().getTime();
    const scope = scopeFor(grant.permission);
    await ctx.store.insertToken({ tokenHash: sha256Hex(access), kind: "access", grantId: grant.id, clientId, scope, resource, expiresAt: new Date(t + cfg.accessTtlSec * 1000).toISOString() });
    await ctx.store.insertToken({ tokenHash: sha256Hex(refreshToken), kind: "refresh", grantId: grant.id, clientId, scope, resource, expiresAt: new Date(t + cfg.refreshTtlSec * 1000).toISOString() });
    return { access_token: access, token_type: "Bearer", expires_in: cfg.accessTtlSec, refresh_token: refreshToken, scope };
  }

  async function exchangeCode(client: OAuthClient, body: Record<string, string>) {
    if (!body.code || !body.code_verifier) throw new OAuthProblem("invalid_request", "code and code_verifier are required.");
    const code = await ctx.store.takeCode(sha256Hex(body.code));
    if (!code || new Date(code.expiresAt) <= now()) throw new OAuthProblem("invalid_grant", "The authorization code is invalid or expired.");
    if (code.clientId !== client.clientId) throw new OAuthProblem("invalid_grant", "The code was issued to another client.");
    if (body.redirect_uri && body.redirect_uri !== code.redirectUri) throw new OAuthProblem("invalid_grant", "redirect_uri does not match the authorization request.");
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier) || sha256Base64url(body.code_verifier) !== code.codeChallenge)
      throw new OAuthProblem("invalid_grant", "PKCE verification failed.");
    if (body.resource && canonicalResource(body.resource) !== code.resource) throw new OAuthProblem("invalid_target", "resource does not match the authorization request.");
    // One grant per user and client: re-authorizing updates it instead of piling up connections.
    const existing = (await ctx.store.listGrants(code.userId)).find((g) => g.kind === "oauth" && g.clientId === client.clientId && !g.revokedAt);
    let grant: AgentGrant;
    if (existing) {
      await ctx.store.updateGrant(existing.id, { notebookIds: code.notebookIds, permission: code.permission });
      grant = { ...existing, notebookIds: code.notebookIds, permission: code.permission };
    } else {
      grant = {
        id: uuidv7(now().getTime()),
        userId: code.userId,
        kind: "oauth",
        name: client.clientName,
        clientId: client.clientId,
        notebookIds: code.notebookIds,
        permission: code.permission,
        createdAt: now().toISOString(),
        expiresAt: null,
        revokedAt: null,
        lastUsedAt: null,
        secretHash: null,
      };
      await ctx.store.insertGrant(grant);
    }
    return issue(grant, client.clientId, code.resource);
  }

  async function refresh(client: OAuthClient, body: Record<string, string>) {
    if (!body.refresh_token) throw new OAuthProblem("invalid_request", "refresh_token is required.");
    const rec = await ctx.store.getToken(sha256Hex(body.refresh_token));
    if (!rec || rec.kind !== "refresh" || new Date(rec.expiresAt) <= now()) throw new OAuthProblem("invalid_grant", "The refresh token is invalid or expired. Authorize again.");
    if (rec.clientId !== client.clientId) throw new OAuthProblem("invalid_grant", "The refresh token was issued to another client.");
    const grant = await ctx.store.getGrant(rec.grantId);
    if (!grant || grant.revokedAt) throw new OAuthProblem("invalid_grant", "Access was revoked by the user. Authorize again.");
    if (body.resource && canonicalResource(body.resource) !== rec.resource) throw new OAuthProblem("invalid_target", "resource does not match the original authorization.");
    await ctx.store.deleteToken(rec.tokenHash); // rotation
    return issue(grant, client.clientId, rec.resource);
  }
}
