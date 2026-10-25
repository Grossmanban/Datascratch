import { describe, expect, it } from "vitest";
// The production Caddyfile, read as text by Vite.
import caddyfile from "../../../../infra/deploy/Caddyfile?raw";
import { securityHeaders } from "./securityHeaders";


describe("security headers", () => {
  it("the production Caddyfile sends exactly the headers the e2e suite runs under", () => {
    // In production the sync WebSocket is on the same host: Caddy's {http.request.hostport} placeholder.
    for (const [name, value] of Object.entries(securityHeaders(["wss://{http.request.hostport}"]))) {
      expect(caddyfile).toContain(`${name} "${value}"`);
    }
  });
  it("forbids framing, plugins and foreign scripts", () => {
    const csp = securityHeaders([])["Content-Security-Policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/script-src 'self' 'wasm-unsafe-eval'(;|$)/);
    expect(csp).not.toMatch(/ 'unsafe-eval'/);
  });
});
