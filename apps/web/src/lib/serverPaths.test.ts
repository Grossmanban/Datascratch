import { describe, expect, it } from "vitest";
import { SERVER_PATHS } from "./serverPaths";

const isServer = (path: string) => SERVER_PATHS.some((re) => re.test(path));

describe("server paths left to the network by the service worker", () => {
  it("covers the API, MCP, OAuth and well-known paths of the shared domain", () => {
    for (const p of ["/v1/health", "/mcp", "/mcp/sse", "/oauth/authorize", "/.well-known/oauth-authorization-server"]) expect(isServer(p)).toBe(true);
  });
  it("leaves app routes to the app shell", () => {
    for (const p of ["/", "/all", "/doc/abc", "/connect", "/s/xyz", "/settings/account", "/mcpfoo"]) expect(isServer(p)).toBe(false);
  });
});
