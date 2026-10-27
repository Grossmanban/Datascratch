import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { SyncConnection, type SyncPrincipal } from './connection.js';
import { CloseCode } from './messages.js';

const PING_INTERVAL_MS = 25_000;

/** Registers WebSocket `/v1/sync` (sync-protocol.md). Call inside the /v1 prefix. */
export async function registerSync(app: FastifyInstance, ctx: AppContext) {
  const connections = new Set<SyncConnection>();
  const perIp = new Map<string, number>();
  // Base64 inflates by 4/3, plus JSON framing. Applies once a connection is authenticated;
  // before that a connection accepts only small frames (PRE_AUTH_MAX_PAYLOAD).
  const maxPayload = Math.ceil((ctx.config.SYNC_SNAPSHOT_MAX_BYTES * 4) / 3) + 64 * 1024;
  await app.register(websocket, { options: { maxPayload } });
  ctx.metrics.gauge('ds_sync_connections', 'Open sync WebSocket connections.', () => connections.size);

  /** Per-user cap, checked at hello (guests count per share). */
  const admit = (p: SyncPrincipal) => {
    let n = 0;
    for (const c of connections) {
      const q = c.principal;
      if (!q) continue;
      if (p.kind === 'user' ? q.kind === 'user' && q.userId === p.userId : q.kind === 'guest' && q.shareId === p.shareId) n++;
    }
    return n < ctx.config.SYNC_MAX_CONN_PER_USER;
  };

  app.get('/sync', { websocket: true, schema: { hide: true } }, (socket, req) => {
    const ip = req.ip;
    const fromIp = perIp.get(ip) ?? 0;
    if (fromIp >= ctx.config.SYNC_MAX_CONN_PER_IP) {
      socket.close(CloseCode.tryAgainLater, 'too many connections');
      return;
    }
    perIp.set(ip, fromIp + 1);
    let alive = true;
    socket.on('pong', () => {
      alive = true;
    });
    const ping = setInterval(() => {
      if (!alive) {
        socket.terminate();
        return;
      }
      alive = false;
      socket.ping();
    }, PING_INTERVAL_MS);
    const conn = new SyncConnection(
      ctx,
      socket,
      (c) => {
        clearInterval(ping);
        connections.delete(c);
        const left = (perIp.get(ip) ?? 1) - 1;
        if (left > 0) perIp.set(ip, left);
        else perIp.delete(ip);
      },
      admit,
      maxPayload,
    );
    connections.add(conn);
  });

  app.addHook('onClose', async () => {
    for (const c of [...connections]) c.close(CloseCode.goingAway, 'server shutting down');
  });

  return { connections };
}
