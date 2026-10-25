import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { AgentsContext } from './agents-context.js';
import { PgAgentDataSource } from './agents-data.js';
import { PgAgentsStore } from './agents-store.js';
import { ServerUserAuth } from './agents-users.js';

export interface LoadedPlugin {
  name: string;
  register(app: FastifyInstance, ctx: AppContext): Promise<void>;
}

/** The server's implementation of the agents plugin context (packages/agents/src/context.ts). */
export function createAgentsContext(ctx: AppContext): AgentsContext {
  return {
    store: new PgAgentsStore(ctx.database.db),
    data: new PgAgentDataSource(ctx),
    users: new ServerUserAuth(ctx),
  };
}

type AgentsModule = { agentsPlugin?: (app: FastifyInstance, opts: Record<string, unknown>) => Promise<void> };

/** Wrap the `agentsPlugin` export of @datascratch/agents (or a test double). */
export function agentsPlugin(mod: AgentsModule): LoadedPlugin {
  return {
    name: '@datascratch/agents',
    async register(app, ctx) {
      // Registered at the root: the plugin owns /mcp, /oauth/*, /.well-known/*, /v1/agent/*, /v1/agent-tokens.
      await app.register(mod.agentsPlugin as never, {
        context: createAgentsContext(ctx),
        publicUrl: ctx.config.PUBLIC_URL,
        secret: ctx.tokens.pluginSecret,
        appUrl: ctx.config.APP_URL ?? null,
        allowedOrigins: ctx.config.CORS_ORIGINS.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    },
  };
}

/** Load @datascratch/agents if it is installed; the server works without it. */
export async function loadPlugins(ctx: AppContext): Promise<LoadedPlugin[]> {
  const spec = '@datascratch/agents';
  let mod: AgentsModule;
  try {
    mod = (await import(spec)) as AgentsModule;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      ctx.log.warn({ plugin: spec }, 'agents plugin not installed: MCP and agent API are disabled');
      return [];
    }
    throw err;
  }
  if (typeof mod.agentsPlugin !== 'function') {
    ctx.log.warn({ plugin: spec }, 'package does not export agentsPlugin');
    return [];
  }
  return [agentsPlugin(mod)];
}
