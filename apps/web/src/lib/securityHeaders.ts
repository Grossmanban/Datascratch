// Security headers of the web app (served by Caddy in infra/deploy/Caddyfile; the same values
// on the Vite preview server for the e2e suite). serverPaths.test checks the Caddyfile copy.
//
// - scripts: only our own files; 'wasm-unsafe-eval' lets libsodium compile its WebAssembly;
// - styles: inline style attributes are used throughout (and by the editor);
// - images: attachments are decrypted into blob: URLs; KaTeX fonts may be data: URLs;
// - connect: the API and the sync WebSocket on the same host (`wss://<host>` is spelled out
//   because older Safari does not match WebSockets against 'self').
export function contentSecurityPolicy(connect: string[]): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${["'self'", ...connect].join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(connect: string[], opts: { hsts?: boolean } = {}): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(connect),
    ...(opts.hsts === false ? {} : { "Strict-Transport-Security": "max-age=31536000" }),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
