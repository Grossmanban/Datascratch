import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppContext } from './context.js';
import { safeEqual } from './lib/encoding.js';
import { ApiError, type ApiErrorCode } from './lib/errors.js';
import { loadPlugins, type LoadedPlugin } from './plugins/loader.js';
import { accountRoutes } from './routes/account.js';
import { attachmentRoutes } from './routes/attachments.js';
import { authRoutes } from './routes/auth.js';
import { fetchImageRoutes } from './routes/fetch-image.js';
import { notebookRoutes } from './routes/notebooks.js';
import { shareRoutes } from './routes/shares.js';
import { registerSync } from './sync/server.js';
import { VERSION } from './version.js';

const codeForStatus = (status: number): ApiErrorCode =>
  status === 400
    ? 'bad_request'
    : status === 401
      ? 'unauthorized'
      : status === 403
        ? 'forbidden'
        : status === 404
          ? 'not_found'
          : status === 409
            ? 'conflict'
            : status === 413
              ? 'payload_too_large'
              : status === 429
                ? 'rate_limited'
                : status < 500
                  ? 'bad_request'
                  : 'internal';

export interface BuildOptions {
  /** Extra plugins (tests); by default `@datascratch/agents` is loaded if installed. */
  plugins?: LoadedPlugin[];
}

export async function buildApp(ctx: AppContext, opts: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: ctx.log,
    // Only proxies on private hops are trusted (our Caddy, a host nginx, Sinhron's Caddy):
    // the client address is the rightmost untrusted X-Forwarded-For entry, so a client
    // cannot choose its own address by sending the header itself.
    trustProxy: ctx.config.TRUST_PROXY.split(',').map((s) => s.trim()).filter(Boolean),
    bodyLimit: 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof ApiError) {
      return reply
        .code(err.statusCode)
        .send({ error: { code: err.code, message: err.message, ...(err.reason ? { reason: err.reason } : {}) } });
    }
    if (hasZodFastifySchemaValidationErrors(err)) {
      const issue = err.validation[0];
      const where = issue ? `${issue.instancePath || err.validationContext || ''} ${issue.message ?? ''}` : '';
      return reply.code(400).send({ error: { code: 'bad_request', message: `invalid request: ${where}`.trim() } });
    }
    if (isResponseSerializationError(err)) {
      req.log.error({ err, issues: err.cause.issues }, 'response serialization failed');
      return reply.code(500).send({ error: { code: 'internal', message: 'internal error' } });
    }
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, 'request failed');
    const code = codeForStatus(status);
    return reply.code(status).send({ error: { code, message: status >= 500 ? 'internal error' : err.message } });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ error: { code: 'not_found', message: 'route not found' } }),
  );

  const origins = ctx.config.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length > 0) {
    await app.register(cors, {
      origin: origins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['authorization', 'content-type', 'mcp-session-id', 'mcp-protocol-version'],
      credentials: true,
      maxAge: 86_400,
    });
  }

  await app.register(rateLimit, {
    global: false,
    // Thrown by the plugin; an ApiError goes through the error handler as a proper 429.
    errorResponseBuilder: (_req, c) =>
      new ApiError('rate_limited', `rate limit exceeded, retry in ${Math.ceil(c.ttl / 1000)} s`),
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Datascratch API',
        version: VERSION,
        description: 'REST API v1. Contract: docs/architecture/contracts/api.md',
      },
      servers: [{ url: `${ctx.config.PUBLIC_URL}/v1` }],
      components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  app.addHook('onResponse', async (req, reply) => {
    ctx.metrics.httpRequests.inc({ method: req.method, status: `${Math.floor(reply.statusCode / 100)}xx` });
  });
  const { pool } = ctx.database;
  ctx.metrics.gauge('ds_db_pool_total', 'PostgreSQL pool connections.', () => pool.totalCount);
  ctx.metrics.gauge('ds_db_pool_idle', 'Idle PostgreSQL pool connections.', () => pool.idleCount);
  ctx.metrics.gauge('ds_db_pool_waiting', 'Queries waiting for a pool connection.', () => pool.waitingCount);
  if (ctx.config.METRICS_TOKEN) {
    const expected = Buffer.from(`Bearer ${ctx.config.METRICS_TOKEN}`);
    app.get('/metrics', { logLevel: 'warn', schema: { hide: true } }, async (req, reply) => {
      const got = Buffer.from(req.headers.authorization ?? '');
      if (!safeEqual(got, expected)) {
        return reply.code(401).send({ error: { code: 'unauthorized', message: 'metrics token required' } });
      }
      return reply.header('content-type', 'text/plain; version=0.0.4').send(ctx.metrics.render());
    });
  }

  const plugins = opts.plugins ?? loadPlugins();

  await app.register(
    async (v1) => {
      v1.get(
        '/health',
        { logLevel: 'warn', schema: { tags: ['service'], response: { 200: z.object({ ok: z.literal(true), version: z.string() }) } } },
        async () => ({ ok: true as const, version: VERSION }),
      );
      v1.get('/openapi.json', { schema: { hide: true } }, async () => {
        const spec = app.swagger() as { servers?: unknown };
        return spec;
      });
      await v1.register(authRoutes(ctx));
      await v1.register(accountRoutes(ctx));
      await v1.register(notebookRoutes(ctx));
      await v1.register(attachmentRoutes(ctx));
      await v1.register(fetchImageRoutes(ctx));
      await v1.register(shareRoutes(ctx));
      await registerSync(v1, ctx);
    },
    { prefix: '/v1' },
  );

  for (const p of plugins) {
    await app.register(async (scope) => p.register(scope, ctx));
    ctx.log.info({ plugin: p.name }, 'plugin registered');
  }

  return app as unknown as FastifyInstance;
}
