import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "./server.js";
import { NB_WORK, NOTE_PLAN, USER } from "./world.js";

let close: (() => Promise<void>) | null = null;
afterEach(async () => {
  await close?.();
  close = null;
});

async function staticToken(base: string, permission: "read" | "read_write" = "read_write") {
  const res = await fetch(`${base}/v1/agent-tokens`, {
    method: "POST",
    headers: { authorization: `Bearer user:${USER}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Test agent", notebookIds: [NB_WORK], permission }),
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; token: string };
}

async function connect(base: string, token: string) {
  const client = new Client({ name: "test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}` } } });
  await client.connect(transport);
  return client;
}

describe("MCP over Streamable HTTP", () => {
  it("lists tools and runs them with a static token", async () => {
    const s = await startServer();
    close = s.close;
    const { token, id } = await staticToken(s.base);
    const client = await connect(s.base, token);
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual(
      ["add_comment", "create_note", "edit_note", "get_backlinks", "get_handwriting_image", "list_notebooks", "list_notes", "list_spaces", "list_tasks", "read_note", "search_notes", "update_task"].sort(),
    );
    const nb = await client.callTool({ name: "list_notebooks", arguments: {} });
    expect(JSON.parse((nb.content as { text: string }[])[0]!.text).notebooks[0].name).toBe("Работа");

    const read = await client.callTool({ name: "read_note", arguments: { noteId: NOTE_PLAN } });
    const content = read.content as { type: string; text?: string; mimeType?: string }[];
    expect(content[0]!.text).toContain("# План запуска");
    expect(content[0]!.text).toContain("handwriting:");
    expect(content.some((c) => c.type === "image" && c.mimeType === "image/png")).toBe(true);

    const bad = await client.callTool({ name: "read_note", arguments: { noteId: "0192f3c4-0000-7000-8000-00000000ffff" } });
    expect(bad.isError).toBe(true);
    expect((bad.content as { text: string }[])[0]!.text).toMatch(/^not_found:/);

    const audit = await fetch(`${s.base}/v1/agent-tokens/${id}/audit`, { headers: { authorization: `Bearer user:${USER}` } }).then((r) => r.json());
    expect(audit.map((e: { action: string; ok: boolean; via: string }) => `${e.action}:${e.ok}:${e.via}`)).toEqual(
      expect.arrayContaining(["list_notebooks:true:mcp", "read_note:true:mcp", "read_note:false:mcp"]),
    );
    await client.close();
  });

  it("challenges unauthenticated requests with resource metadata", async () => {
    const s = await startServer();
    close = s.close;
    const res = await fetch(`${s.base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: "{}" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${s.base}/.well-known/oauth-protected-resource/mcp", scope="notes:read notes:write"`);
    const prm = await fetch(`${s.base}/.well-known/oauth-protected-resource/mcp`).then((r) => r.json());
    expect(prm).toMatchObject({ resource: `${s.base}/mcp`, authorization_servers: [s.base] });
    const bad = await fetch(`${s.base}/mcp`, { method: "POST", headers: { authorization: "Bearer dsa_nope" }, body: "{}" });
    expect(bad.headers.get("www-authenticate")).toContain('error="invalid_token"');
  });

  it("rejects revoked tokens and foreign origins, rate-limits", async () => {
    const s = await startServer({ rateLimit: { agent: { perMinute: 60, burst: 3 } } });
    close = s.close;
    const { token, id } = await staticToken(s.base);
    const call = (headers: Record<string, string> = {}) =>
      fetch(`${s.base}/v1/agent/notebooks`, { headers: { authorization: `Bearer ${token}`, ...headers } });
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    const limited = await call();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("1");
    const evil = await fetch(`${s.base}/mcp`, { method: "POST", headers: { authorization: `Bearer ${token}`, origin: "https://evil.example" }, body: "{}" });
    expect(evil.status).toBe(403);
    await fetch(`${s.base}/v1/agent-tokens/${id}`, { method: "DELETE", headers: { authorization: `Bearer user:${USER}` } });
    s.ctx.clock.now = new Date(s.ctx.clock.now.getTime() + 60_000);
    const revoked = await call();
    expect(revoked.status).toBe(401);
  });

  it("read-only static tokens get a clear error from write tools", async () => {
    const s = await startServer();
    close = s.close;
    const { token } = await staticToken(s.base, "read");
    const client = await connect(s.base, token);
    const r = await client.callTool({ name: "create_note", arguments: { notebookId: NB_WORK, title: "x" } });
    expect(r.isError).toBe(true);
    expect((r.content as { text: string }[])[0]!.text).toMatch(/^forbidden: .*read-only/);
    await client.close();
  });
});
