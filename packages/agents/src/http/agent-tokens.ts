/**
 * `/v1/agent-tokens` (contracts/api.md): the user manages agent access —
 * static tokens and OAuth connections — and reads the audit log.
 * Authenticated as a user (server session), not as an agent.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import * as z from "zod/v4";
import type { AgentGrant, AgentsContext } from "../context.js";
import { AgentError } from "../errors.js";
import { sendError, type AgentsRuntime } from "../plugin.js";

const createInput = z.object({
  name: z.string().trim().min(1).max(100),
  notebookIds: z.array(z.string()).min(1).max(500),
  permission: z.enum(["read", "read_write"]),
  expiresAt: z.iso.datetime().nullable().optional(),
});

/** Public view of a grant (never includes secrets). */
export function grantView(g: AgentGrant) {
  return {
    id: g.id,
    kind: g.kind,
    name: g.name,
    clientId: g.clientId,
    notebookIds: g.notebookIds,
    permission: g.permission,
    createdAt: g.createdAt,
    expiresAt: g.expiresAt,
    lastUsedAt: g.lastUsedAt,
  };
}

export function registerAgentTokenRoutes(app: FastifyInstance, ctx: AgentsContext, rt: AgentsRuntime): void {
  const user = async (req: FastifyRequest) => {
    const u = await ctx.users.authenticate(req);
    if (!u) throw new AgentError("unauthorized", "Sign in required.");
    return u;
  };
  const owned = async (userId: string, id: string) => {
    const g = await ctx.store.getGrant(id);
    if (!g || g.userId !== userId || g.revokedAt) throw new AgentError("not_found", "Agent token not found.");
    return g;
  };

  app.post("/v1/agent-tokens", async (request, reply) => {
    try {
      const u = await user(request);
      const r = createInput.safeParse(request.body ?? {});
      if (!r.success) throw new AgentError("bad_request", `Invalid ${r.error.issues[0]!.path.join(".")}: ${r.error.issues[0]!.message}.`);
      const agentNotebooks = new Set((await ctx.data.listAgentNotebooks(u.userId)).map((n) => n.id));
      const bad = r.data.notebookIds.filter((id) => !agentNotebooks.has(id));
      if (bad.length) throw new AgentError("bad_request", `Notebooks must be in "for agents" mode: ${bad.join(", ")}.`);
      const { grant, token } = await rt.grants.createStatic(u.userId, r.data);
      return reply.code(201).send({ ...grantView(grant), token });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get("/v1/agent-tokens", async (request, reply) => {
    try {
      const u = await user(request);
      const list = (await ctx.store.listGrants(u.userId)).filter((g) => !g.revokedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return reply.send(list.map(grantView));
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.delete("/v1/agent-tokens/:id", async (request, reply) => {
    try {
      const u = await user(request);
      const g = await owned(u.userId, (request.params as { id: string }).id);
      await rt.grants.revoke(g.id);
      return reply.code(204).send();
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get("/v1/agent-tokens/:id/audit", async (request, reply) => {
    try {
      const u = await user(request);
      const g = await ctx.store.getGrant((request.params as { id: string }).id);
      if (!g || g.userId !== u.userId) throw new AgentError("not_found", "Agent token not found.");
      const q = request.query as { limit?: string; before?: string };
      const limit = Math.min(500, Math.max(1, Number(q.limit ?? 100) || 100));
      return reply.send(await ctx.store.listAudit(g.id, { limit, before: q.before }));
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
