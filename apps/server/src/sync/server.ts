import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { SyncConnection } from './connection.js';
import { CloseCode } from './messages.js';

const PING_INTERVAL_MS = 25_000;

/** Registers WebSocket `/v1/sync` (sync-protocol.md). Call inside the /v1 prefix. */
export async function registerSync(app: FastifyInstance, ctx: AppContext) {
  const connections = new Set<SyncConnection>();
  // Base64 inflates by 4/3, plus JSON framing.
  const maxPayload = Math.ceil((ctx.config.SYNC_SNAPSHOT_MAX_BYTES * 4) / 3) + 64 * 1024;
  await app.register(websocket, { options: { maxPayload } });

  app.get('/sync', { websocket: true, schema: { hide: true } }, (socket) => {
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
    const conn = new SyncConnection(ctx, socket, (c) => {
      clearInterval(ping);
      connections.delete(c);
    });
    connections.add(conn);
  });

  app.addHook('onClose', async () => {
    for (const c of [...connections]) c.close(CloseCode.goingAway, 'server shutting down');
  });

  return { connections };
}
