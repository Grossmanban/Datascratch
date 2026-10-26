import { agentsPlugin as plugin } from '@datascratch/agents';
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

/**
 * MCP, OAuth 2.1, agent REST API and agent tokens (@datascratch/agents). Registered at
 * the root: the plugin owns /mcp, /oauth/*, /.well-known/oauth-*, /v1/agent/*, /v1/agent-tokens.
 */
export const agentsPlugin: LoadedPlugin = {
  name: '@datascratch/agents',
  async register(app, ctx) {
    await app.register(plugin, {
      context: createAgentsContext(ctx),
      publicUrl: ctx.config.PUBLIC_URL,
      secret: ctx.tokens.pluginSecret,
      appUrl: ctx.config.APP_URL ?? null,
      clientIdMetadataDocuments: ctx.config.OAUTH_CLIENT_METADATA_DOCUMENTS,
      allowedOrigins: ctx.config.CORS_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  },
};

export function loadPlugins(): LoadedPlugin[] {
  return [agentsPlugin];
}
