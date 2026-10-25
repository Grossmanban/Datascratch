const raw = (import.meta.env.VITE_DS_SERVER_URL as string | undefined) ?? "";

/** Server origin without trailing slash. Empty env → same origin as the web app. */
export function serverOrigin(): string {
  const fromWindow = typeof window !== "undefined" ? (window as { __DS_SERVER_URL__?: string }).__DS_SERVER_URL__ : undefined;
  const base = fromWindow || raw || (typeof location !== "undefined" ? location.origin : "http://localhost:8787");
  return base.replace(/\/+$/, "");
}

export const apiBase = () => `${serverOrigin()}/v1`;

export function syncUrl(): string {
  const u = new URL(`${serverOrigin()}/v1/sync`);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
}

export const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "0.1.0";
