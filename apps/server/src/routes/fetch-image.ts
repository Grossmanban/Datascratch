import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { ApiError } from '../lib/errors.js';
import { FetchImageFailure, type FetchImageError } from '../services/image-fetch.js';
import { errorResponses } from './schemas.js';

const FetchImageErrorBody = z
  .object({ error: z.enum(['blocked', 'not_image', 'too_large', 'timeout', 'unreachable']) })
  .meta({ id: 'FetchImageError' });

/**
 * POST /v1/fetch-image (D-52): the server downloads a pasted image link for the web
 * app, whose CSP forbids fetching other sites. The URL is never logged or stored:
 * only the result code, size and duration are.
 */
export function fetchImageRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const perMinute = ctx.config.FETCH_IMAGE_PER_MINUTE;
    const windows = new Map<string, { start: number; count: number }>();
    let running = 0;
    const runningFor = new Map<string, number>();

    /** Fixed one-minute window per account; returns how long to wait when over the limit (0: allowed). */
    function wait(userId: string): number {
      const now = Date.now();
      let w = windows.get(userId);
      if (!w || now - w.start >= 60_000) {
        if (windows.size > 10_000) {
          for (const [k, v] of windows) if (now - v.start >= 60_000) windows.delete(k);
        }
        w = { start: now, count: 0 };
        windows.set(userId, w);
      }
      w.count += 1;
      return w.count <= perMinute ? 0 : 60_000 - (now - w.start);
    }

    app.post(
      '/fetch-image',
      {
        schema: {
          tags: ['attachments'],
          security: [{ bearer: [] }],
          body: z.object({ url: z.string().min(1).max(2048) }),
          response: { 422: FetchImageErrorBody, ...errorResponses },
        },
      },
      async (req, reply) => {
        const p = await requireUser(ctx, req);
        const retryAfterMs = wait(p.userId);
        if (retryAfterMs > 0) {
          throw new ApiError('rate_limited', 'too many image downloads, retry in a minute', undefined, retryAfterMs);
        }
        // One account cannot take every slot; the server-wide cap bounds memory.
        const mine = runningFor.get(p.userId) ?? 0;
        if (mine >= ctx.config.FETCH_IMAGE_CONCURRENCY_PER_USER || running >= ctx.config.FETCH_IMAGE_CONCURRENCY) {
          throw new ApiError('rate_limited', 'too many image downloads in progress, retry shortly', undefined, 2_000);
        }
        running += 1;
        runningFor.set(p.userId, mine + 1);
        const started = Date.now();
        let result: 'ok' | FetchImageError = 'unreachable';
        try {
          const image = await ctx.imageFetcher.fetch(req.body.url);
          result = 'ok';
          return reply
            .code(200)
            .header('content-type', image.mime)
            .header('content-length', image.bytes.length)
            .header('cache-control', 'no-store')
            .header('x-content-type-options', 'nosniff')
            // A Buffer is sent as is (never serialized); the typed reply only knows the JSON bodies.
            .send(image.bytes as never);
        } catch (e) {
          if (!(e instanceof FetchImageFailure)) throw e;
          result = e.code;
          return reply.code(422).send({ error: e.code });
        } finally {
          running -= 1;
          const left = (runningFor.get(p.userId) ?? 1) - 1;
          if (left > 0) runningFor.set(p.userId, left);
          else runningFor.delete(p.userId);
          ctx.metrics.fetchImage.inc({ result });
          req.log.info({ result, ms: Date.now() - started }, 'fetch-image');
        }
      },
    );
  };
}
