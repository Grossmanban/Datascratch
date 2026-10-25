import Fastify, { type FastifyInstance } from "fastify";
import { createServer } from "node:net";
import { agentsPlugin, type AgentsPluginOptions } from "../src/plugin.js";
import { makeWorld } from "./world.js";

export const SECRET = "0123456789abcdef0123456789abcdef-test-secret";

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

export async function startServer(extra: Partial<AgentsPluginOptions> = {}) {
  const ctx = makeWorld();
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const app: FastifyInstance = Fastify();
  await app.register(agentsPlugin, { context: ctx, publicUrl: base, secret: SECRET, appUrl: "https://app.example", ...extra });
  await app.listen({ port, host: "127.0.0.1" });
  return { app, ctx, base, close: () => app.close() };
}
