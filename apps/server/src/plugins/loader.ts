import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import type { ServerPlugin } from './api.js';
import { createPluginHost } from './host.js';

export interface LoadedPlugin {
  name: string;
  register(app: FastifyInstance, ctx: AppContext): Promise<void>;
}

/** Optional plugin packages, loaded if installed. */
const OPTIONAL_PLUGINS = ['@datascratch/agents'];

export function wrapPlugin(plugin: ServerPlugin): LoadedPlugin {
  return {
    name: plugin.name,
    register: (app, ctx) => plugin.register(app, createPluginHost(ctx)),
  };
}

export async function loadPlugins(ctx: AppContext): Promise<LoadedPlugin[]> {
  const out: LoadedPlugin[] = [];
  for (const spec of OPTIONAL_PLUGINS) {
    let mod: { plugin?: ServerPlugin; default?: ServerPlugin };
    try {
      mod = (await import(spec)) as typeof mod;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
        ctx.log.info({ plugin: spec }, 'optional plugin not installed');
        continue;
      }
      throw err;
    }
    const plugin = mod.plugin ?? mod.default;
    if (!plugin || typeof plugin.register !== 'function') {
      ctx.log.warn({ plugin: spec }, 'package does not export a server plugin');
      continue;
    }
    out.push(wrapPlugin(plugin));
  }
  return out;
}
