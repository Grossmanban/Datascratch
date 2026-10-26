import type { WebSocketFactory } from "@datascratch/shared";

/**
 * A WebSocket that is not open within this time is closed, so SyncClient reconnects with its
 * backoff instead of waiting on a connection stuck in the TLS handshake.
 */
const SOCKET_CONNECT_TIMEOUT_MS = 8_000;
export const connectWithTimeout: WebSocketFactory = (url) => {
  const ws = new WebSocket(url);
  const timer = setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) ws.close();
  }, SOCKET_CONNECT_TIMEOUT_MS);
  ws.addEventListener("open", () => clearTimeout(timer), { once: true });
  ws.addEventListener("close", () => clearTimeout(timer), { once: true });
  // A DOM WebSocket is a WebSocketLike (the handler types differ only in `this`/event typing).
  return ws as unknown as ReturnType<WebSocketFactory>;
};
