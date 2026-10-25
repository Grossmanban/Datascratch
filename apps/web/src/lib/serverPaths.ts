// Paths the server owns when the web app shares its domain (infra/deploy/Caddyfile `@api`):
// the service worker must let navigations there through (e.g. the OAuth consent page for
// agents) instead of answering with the app shell.
export const SERVER_PATHS: RegExp[] = [/^\/v1\//, /^\/mcp(\/|$)/, /^\/oauth\//, /^\/\.well-known\//];
