import { Client, StreamableHTTPClientTransport, UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/client";
import { createHash, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "./server.js";
import { NB_OTHER, NB_WORK, NOTE_PLAN, USER } from "./world.js";

let close: (() => Promise<void>) | null = null;
afterEach(async () => {
  await close?.();
  close = null;
});

const REDIRECT = "http://127.0.0.1:53682/callback";

class TestProvider implements OAuthClientProvider {
  info: any;
  stored: any;
  verifier = "";
  authUrl: URL | null = null;
  constructor(
    private readonly scope?: string,
    readonly clientMetadataUrl?: string,
  ) {}
  get redirectUrl() {
    return REDIRECT;
  }
  get clientMetadata() {
    return { client_name: "Test Agent", redirect_uris: [REDIRECT], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none", ...(this.scope ? { scope: this.scope } : {}) };
  }
  clientInformation() {
    return this.info;
  }
  saveClientInformation(i: any) {
    this.info = i;
  }
  tokens() {
    return this.stored;
  }
  saveTokens(t: any) {
    this.stored = t;
  }
  redirectToAuthorization(url: URL) {
    this.authUrl = url;
  }
  saveCodeVerifier(v: string) {
    this.verifier = v;
  }
  codeVerifier() {
    return this.verifier;
  }
}

/** Plays the user in a browser: opens the consent page with a session cookie and submits the form. */
async function consent(authUrl: URL, choose: { notebooks: string[]; permission: "read" | "read_write"; decision?: "allow" | "deny" }) {
  const page = await fetch(authUrl, { headers: { cookie: `ds_session=${USER}` }, redirect: "manual" });
  expect(page.status).toBe(200);
  expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  const html = await page.text();
  expect(html).toContain("Доступ для ИИ-агента");
  const request = /name="request" value="([^"]+)"/.exec(html)![1]!;
  const form = new URLSearchParams({ request, decision: choose.decision ?? "allow", permission: choose.permission });
  for (const n of choose.notebooks) form.append("notebook", n);
  const res = await fetch(new URL("/oauth/authorize", authUrl), {
    method: "POST",
    headers: { cookie: `ds_session=${USER}`, "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    redirect: "manual",
  });
  expect(res.status).toBe(302);
  return new URL(res.headers.get("location")!);
}

async function authorize(base: string, provider: TestProvider, choose: Parameters<typeof consent>[1]) {
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider: provider });
  const client = new Client({ name: "oauth-test", version: "1.0.0" });
  await expect(client.connect(transport)).rejects.toBeInstanceOf(UnauthorizedError);
  expect(provider.authUrl).not.toBeNull();
  const cb = await consent(provider.authUrl!, choose);
  expect(cb.searchParams.get("iss")).toBe(base);
  await transport.finishAuth(cb.searchParams.get("code")!, cb.searchParams.get("iss")!);
  const client2 = new Client({ name: "oauth-test", version: "1.0.0" });
  await client2.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { authProvider: provider }));
  return client2;
}

describe("OAuth 2.1 for MCP clients", () => {
  it("publishes authorization server metadata", async () => {
    const s = await startServer();
    close = s.close;
    const meta = await fetch(`${s.base}/.well-known/oauth-authorization-server`).then((r) => r.json());
    expect(meta).toMatchObject({
      issuer: s.base,
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
      registration_endpoint: `${s.base}/oauth/register`,
    });
  });

  it("can stop advertising Client ID Metadata Documents (server cannot reach client hosts)", async () => {
    const s = await startServer({ clientIdMetadataDocuments: false });
    close = s.close;
    const meta = await fetch(`${s.base}/.well-known/oauth-authorization-server`).then((r) => r.json());
    expect(meta.client_id_metadata_document_supported).toBe(false);
    expect(meta.registration_endpoint).toBe(`${s.base}/oauth/register`);
  });

  it("runs the full flow with dynamic registration, consent and refresh", async () => {
    const s = await startServer();
    close = s.close;
    const provider = new TestProvider("notes:read notes:write");
    const client = await authorize(s.base, provider, { notebooks: [NB_WORK, NB_OTHER], permission: "read_write" });
    const r = await client.callTool({ name: "read_note", arguments: { noteId: NOTE_PLAN, includeImages: false } });
    expect((r.content as { text: string }[])[0]!.text).toContain("План запуска");
    const created = await client.callTool({ name: "create_note", arguments: { notebookId: NB_WORK, title: "From OAuth" } });
    expect(created.isError).toBeFalsy();

    // The connection shows up in the user's list and is one grant per client.
    const list = await fetch(`${s.base}/v1/agent-tokens`, { headers: { authorization: `Bearer user:${USER}` } }).then((x) => x.json());
    expect(list).toMatchObject([{ kind: "oauth", name: "Test Agent", notebookIds: [NB_WORK, NB_OTHER], permission: "read_write" }]);

    // Refresh token rotation: the old refresh token stops working.
    const old = provider.stored.refresh_token as string;
    const refreshed = await fetch(`${s.base}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: old, client_id: provider.info.client_id }).toString(),
    });
    expect(refreshed.status).toBe(200);
    const again = await fetch(`${s.base}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: old, client_id: provider.info.client_id }).toString(),
    });
    expect(again.status).toBe(400);
    expect((await again.json()).error).toBe("invalid_grant");
    // Reuse of a rotated token means it leaked: the grant is revoked, so even the fresh refresh token is dead.
    const fresh = (await refreshed.json()).refresh_token as string;
    const afterReuse = await fetch(`${s.base}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: fresh, client_id: provider.info.client_id }).toString(),
    });
    expect(afterReuse.status).toBe(400);
    const revoked = await fetch(`${s.base}/v1/agent-tokens`, { headers: { authorization: `Bearer user:${USER}` } }).then((x) => x.json());
    expect(revoked).toEqual([]);
    // …and the agent is cut off (revoking from the token list does the same).
    void list;
    await expect(client.callTool({ name: "list_notebooks", arguments: {} })).rejects.toThrow();
  });

  it("supports Client ID Metadata Documents", async () => {
    const cimd = "https://agent.example/oauth/client.json";
    const s = await startServer({
      fetchClientMetadata: async (url) => {
        expect(url).toBe(cimd);
        return { client_id: cimd, client_name: "CIMD Agent", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" };
      },
    });
    close = s.close;
    const provider = new TestProvider(undefined, cimd);
    const client = await authorize(s.base, provider, { notebooks: [NB_WORK], permission: "read" });
    const r = await client.callTool({ name: "list_notebooks", arguments: {} });
    expect(JSON.parse((r.content as { text: string }[])[0]!.text).notebooks[0].permission).toBe("read");
    expect(s.ctx.store.clients.get(cimd)?.registration).toBe("cimd");
  });

  it("sends a scope challenge (403) when a read-only OAuth grant tries to write", async () => {
    const s = await startServer();
    close = s.close;
    const provider = new TestProvider("notes:read");
    await authorize(s.base, provider, { notebooks: [NB_WORK], permission: "read" });
    const res = await fetch(`${s.base}/mcp`, {
      method: "POST",
      headers: { authorization: `Bearer ${provider.stored.access_token}`, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_note", arguments: { notebookId: NB_WORK, title: "x" } } }),
    });
    expect(res.status).toBe(403);
    expect(res.headers.get("www-authenticate")).toContain('error="insufficient_scope"');
    expect(res.headers.get("www-authenticate")).toContain('scope="notes:read notes:write"');
  });

  it("validates PKCE, redirect URIs and user decisions", async () => {
    const s = await startServer();
    close = s.close;
    const reg = await fetch(`${s.base}/oauth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "Manual", redirect_uris: [REDIRECT] }),
    }).then((r) => r.json());
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = (params: Record<string, string>) => {
      const u = new URL(`${s.base}/oauth/authorize`);
      for (const [k, v] of Object.entries({ response_type: "code", client_id: reg.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state: "xyz", resource: `${s.base}/mcp`, ...params }))
        u.searchParams.set(k, v);
      return u;
    };
    // Unregistered redirect: an error page, never a redirect.
    const evil = await fetch(url({ redirect_uri: "https://evil.example/cb" }), { redirect: "manual" });
    expect(evil.status).toBe(400);
    // No PKCE: an error page too — errors before consent are never redirected (no open redirect, RFC 9700 §4.11.2).
    const noPkce = await fetch(url({ code_challenge_method: "plain" }), { redirect: "manual" });
    expect(noPkce.status).toBe(400);
    expect(noPkce.headers.get("location")).toBeNull();
    expect(await noPkce.text()).toContain("invalid_request");
    // Not signed in: sent to the app login with a return URL.
    const anon = await fetch(url({}), { redirect: "manual" });
    expect(anon.headers.get("location")).toMatch(/^https:\/\/app\.example\/login\?returnTo=/);
    // Deny.
    const denied = await consent(url({}), { notebooks: [NB_WORK], permission: "read", decision: "deny" });
    expect(denied.searchParams.get("error")).toBe("access_denied");
    expect(denied.searchParams.get("state")).toBe("xyz");
    // Allow, then a wrong verifier fails and the code is single-use.
    const ok = await consent(url({}), { notebooks: [NB_WORK], permission: "read" });
    const code = ok.searchParams.get("code")!;
    const token = (v: string) =>
      fetch(`${s.base}/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: v, client_id: reg.client_id, redirect_uri: REDIRECT, resource: `${s.base}/mcp` }).toString(),
      });
    const wrong = await token(randomBytes(32).toString("base64url"));
    expect((await wrong.json()).error).toBe("invalid_grant");
    const ok2 = await consent(url({}), { notebooks: [NB_WORK], permission: "read" });
    const res = await fetch(`${s.base}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: ok2.searchParams.get("code")!, code_verifier: verifier, client_id: reg.client_id, redirect_uri: REDIRECT }).toString(),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const t = await res.json();
    expect(t).toMatchObject({ token_type: "Bearer", scope: "notes:read", expires_in: 3600 });
    // A REST call with the OAuth token works too.
    const rest = await fetch(`${s.base}/v1/agent/notebooks`, { headers: { authorization: `Bearer ${t.access_token}` } });
    expect(rest.status).toBe(200);
  });

  it("serves 2025-era clients through the stateless legacy path", async () => {
    const s = await startServer();
    close = s.close;
    const reg = await fetch(`${s.base}/v1/agent-tokens`, {
      method: "POST",
      headers: { authorization: `Bearer user:${USER}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "Legacy", notebookIds: [NB_WORK], permission: "read" }),
    }).then((r) => r.json());
    const res = await fetch(`${s.base}/mcp`, {
      method: "POST",
      headers: { authorization: `Bearer ${reg.token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "old", version: "1" } } }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"serverInfo"');
    expect(text).toContain("datascratch");
  });

  it("shows notebook names, icons and spaces from the notebook document on the consent page", async () => {
    const s = await startServer();
    close = s.close;
    const nb = s.ctx.data.notebooks.get(NB_WORK)!;
    nb.name = null; // the server does not know names (account doc is end-to-end encrypted)
    nb.icon = null;
    nb.space = null;
    const doc = s.ctx.data.current(NB_WORK);
    doc.transact(() => {
      doc.getMap("meta").set("icon", "globe");
      doc.getMap("meta").set("color", "tint.teal");
      doc.getMap("meta").set("space", { id: "s1", name: "Основное", icon: null });
    });
    const reg = await fetch(`${s.base}/oauth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "Claude", redirect_uris: [REDIRECT] }),
    }).then((r) => r.json());
    const u = new URL(`${s.base}/oauth/authorize`);
    const challenge = createHash("sha256").update(randomBytes(32).toString("base64url")).digest("base64url");
    for (const [k, v] of Object.entries({ response_type: "code", client_id: reg.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256" }))
      u.searchParams.set(k, v);
    const html = await fetch(u, { headers: { cookie: `ds_session=${USER}` } }).then((r) => r.text());
    expect(html).not.toContain("Без названия");
    expect(html).toMatch(/<span class="ico" style="[^"]*"><svg viewBox="0 0 24 24"[^>]*><circle cx="12" cy="12" r="9"\/>/);
    expect(html).toContain("<span>Работа</span><small>Основное</small>");
  });
});
