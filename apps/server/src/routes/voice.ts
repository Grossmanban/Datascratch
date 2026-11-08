import multipart from '@fastify/multipart';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  MAX_VOICE_DURATION_SEC,
  VOICE_AUDIO_MIME,
  voiceTextRequestSchema,
  voiceTextResponseSchema,
  voiceTranscribeFieldsSchema,
  voiceTranscribeResponseSchema,
} from '@datascratch/shared/voice';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { users } from '../db/schema.js';
import { ApiError, badRequest, forbidden, notFound } from '../lib/errors.js';
import { resetsAt, VoiceService, voiceUnavailable, type VoiceStatus } from '../voice/service.js';
import { errorResponses, id } from './schemas.js';

/** Audio types by file extension, for clients that send `application/octet-stream`. */
const BY_EXTENSION: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
};
const AUDIO_MIME = new Set<string>([...VOICE_AUDIO_MIME, 'audio/aac', 'application/ogg', 'audio/opus', 'audio/vnd.wave']);

const minutes = (sec: number) => Math.round((sec / 60) * 10) / 10;
const usd = (v: number) => Math.round(v * 1e4) / 1e4;

const VoiceMe = z.object({
  enabled: z.boolean(),
  /** Keys for both services are set on this server (otherwise voice answers 503). */
  available: z.boolean(),
  monthlyMinutes: z.number().int().nonnegative(),
  usedMinutes: z.number().nonnegative(),
  /** Start of the next month (UTC): the minutes reset then. */
  resetsAt: z.string(),
  /** A server admin: may open the voice access screen (GET /admin/voice). */
  admin: z.boolean(),
});

const AdminAccount = z.object({
  userId: z.string(),
  email: z.string(),
  /** The server does not know names (they are in the encrypted account document). */
  name: z.null(),
  admin: z.boolean(),
  enabled: z.boolean(),
  monthlyMinutes: z.number().int().nonnegative(),
  /** false: the server default for this account (admin or not). */
  customMinutes: z.boolean(),
  usedMinutes: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
  requests: z.number().int().nonnegative(),
});

const AdminList = z.object({
  /** The month (UTC), `YYYY-MM`. */
  month: z.string(),
  resetsAt: z.string(),
  accounts: z.array(AdminAccount),
  totals: z.object({
    usedMinutes: z.number().nonnegative(),
    costUsd: z.number().nonnegative(),
    requests: z.number().int().nonnegative(),
    enabledAccounts: z.number().int().nonnegative(),
  }),
});

const AdminPut = z.object({
  enabled: z.boolean(),
  /** null: back to the server default; omitted: unchanged. */
  monthlyMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
});

const adminAccount = (st: VoiceStatus) => ({
  userId: st.userId,
  email: st.email,
  name: null,
  admin: st.admin,
  enabled: st.enabled,
  monthlyMinutes: st.monthlyMinutes,
  customMinutes: st.customMinutes,
  usedMinutes: minutes(st.usedSec),
  costUsd: usd(st.costUsd),
  requests: st.requests,
});

/**
 * Voice (D-65, api.md «Голос»): speech to text and text from transcripts through the server, which
 * keeps the keys; access and minutes per account, managed by the server's admins in the app.
 * Neither audio nor text is stored or logged; the log line of a request carries only the account,
 * sizes, durations, model, cost and result code.
 */
export function voiceRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const voice = new VoiceService(ctx);
    const security = [{ bearer: [] }];
    await app.register(multipart, {
      limits: { fileSize: ctx.config.VOICE_MAX_BYTES, files: 1, fields: 8, fieldSize: 64, parts: 9, headerPairs: 50 },
    });
    // DS_VOICE_USERS: a one-time switch-on for listed accounts that have no setting yet.
    app.addHook('onReady', async () => {
      const n = await voice.seed();
      if (n > 0) ctx.log.info({ accounts: n }, 'voice switched on from DS_VOICE_USERS');
    });

    /** One log line and one metric per request, whatever happens (never the content). */
    function record(endpoint: string, userId: string | null, started: number, fields: Record<string, unknown>, err?: unknown) {
      const code = err ? (err instanceof ApiError ? err.code : 'internal') : 'ok';
      ctx.metrics.voice.inc({ endpoint, code });
      const upstreamStatus = (err as { upstreamStatus?: number } | undefined)?.upstreamStatus;
      ctx.log.info(
        { voice: endpoint, userId, code, ms: Date.now() - started, ...fields, ...(upstreamStatus ? { upstreamStatus } : {}) },
        'voice request',
      );
    }

    async function requireAdmin(req: Parameters<typeof requireUser>[1]) {
      const p = await requireUser(ctx, req);
      const [u] = await ctx.database.db.select({ email: users.email }).from(users).where(eq(users.id, p.userId));
      if (!u || !voice.isAdmin(u.email)) throw forbidden('only a server admin can do this');
      return p;
    }

    app.get(
      '/voice/me',
      { schema: { tags: ['voice'], security, response: { 200: VoiceMe, ...errorResponses } } },
      async (req) => {
        const p = await requireUser(ctx, req);
        const st = (await voice.status(p.userId))!;
        return {
          enabled: st.enabled,
          available: Boolean(ctx.config.ELEVENLABS_API_KEY && ctx.config.OPENROUTER_API_KEY),
          monthlyMinutes: st.monthlyMinutes,
          usedMinutes: minutes(st.usedSec),
          resetsAt: resetsAt(),
          admin: st.admin,
        };
      },
    );

    app.get(
      '/admin/voice',
      { schema: { tags: ['voice'], security, response: { 200: AdminList, ...errorResponses } } },
      async (req) => {
        await requireAdmin(req);
        const all = await voice.statuses();
        const accounts = all.map(adminAccount);
        return {
          month: new Date().toISOString().slice(0, 7),
          resetsAt: resetsAt(),
          accounts,
          totals: {
            usedMinutes: minutes(all.reduce((n, a) => n + a.usedSec, 0)),
            costUsd: usd(all.reduce((n, a) => n + a.costUsd, 0)),
            requests: all.reduce((n, a) => n + a.requests, 0),
            enabledAccounts: all.filter((a) => a.enabled).length,
          },
        };
      },
    );

    app.put(
      '/admin/voice/:userId',
      {
        schema: {
          tags: ['voice'],
          security,
          params: z.object({ userId: id() }),
          body: AdminPut,
          response: { 200: AdminAccount, ...errorResponses },
        },
      },
      async (req) => {
        const admin = await requireAdmin(req);
        const [target] = await ctx.database.db.select({ id: users.id }).from(users).where(eq(users.id, req.params.userId));
        if (!target) throw notFound('account not found');
        await voice.setAccess(target.id, req.body, admin.userId);
        ctx.log.info({ voice: 'admin', by: admin.userId, userId: target.id, enabled: req.body.enabled }, 'voice access changed');
        return adminAccount((await voice.status(target.id))!);
      },
    );

    app.post(
      '/voice/transcribe',
      {
        schema: {
          tags: ['voice'],
          security,
          consumes: ['multipart/form-data'],
          response: { 200: voiceTranscribeResponseSchema, ...errorResponses },
        },
      },
      async (req) => {
        const started = Date.now();
        let userId: string | null = null;
        const fields: Record<string, unknown> = {};
        let release = () => {};
        try {
          const p = await requireUser(ctx, req);
          userId = p.userId;
          if (!ctx.config.ELEVENLABS_API_KEY) throw voiceUnavailable();
          await voice.admit(p.userId, { needsMinutes: true });
          release = voice.acquire(p.userId);
          if (!req.isMultipart()) throw badRequest('expected multipart/form-data with an audio part');

          // `mode`, `speakers` and `language` come before `audio` (or in the query string).
          const part = await req.file();
          if (!part || part.fieldname !== 'audio') throw badRequest('the audio part is missing (send the fields first, then audio)');
          const sent: Record<string, unknown> = { ...(req.query as Record<string, unknown>) };
          for (const [k, v] of Object.entries(part.fields)) {
            if (v && !Array.isArray(v) && v.type === 'field') sent[k] = v.value;
          }
          const params = voiceTranscribeFieldsSchema.safeParse(sent);
          if (!params.success) throw badRequest(`invalid request: ${params.error.issues[0]?.path.join('.') ?? ''}`.trim());
          const ext = (/\.([A-Za-z0-9]{1,5})$/.exec(part.filename ?? '')?.[1] ?? '').toLowerCase();
          const mime = part.mimetype.toLowerCase().split(';')[0]!.trim();
          const contentType = AUDIO_MIME.has(mime) ? mime : BY_EXTENSION[ext];
          if (!contentType) throw badRequest('unsupported audio format (m4a, mp4, webm, ogg or wav)');
          fields.mode = params.data.mode;

          let bytes = 0;
          const stream = part.file;
          async function* audio() {
            for await (const chunk of stream as AsyncIterable<Buffer>) {
              bytes += chunk.length;
              yield chunk;
            }
            if (stream.truncated) throw new ApiError('payload_too_large', 'the recording is larger than 200 MB');
          }
          let result;
          try {
            result = await voice.transcribe({
              audio: audio(),
              filename: part.filename ?? `audio.${ext || 'm4a'}`,
              contentType,
              mode: params.data.mode,
              speakers: params.data.speakers,
              language: params.data.language,
            });
          } catch (err) {
            if (stream.truncated) throw new ApiError('payload_too_large', 'the recording is larger than 200 MB');
            throw err;
          } finally {
            fields.bytes = bytes;
          }
          fields.model = result.model;
          fields.durationSec = result.durationSec;
          const cost = voice.sttCost(result.durationSec);
          fields.cost = usd(cost);
          if (result.durationSec > Math.min(ctx.config.VOICE_MAX_SECONDS, MAX_VOICE_DURATION_SEC)) {
            throw new ApiError('voice_too_long', 'the recording is longer than 3 hours');
          }
          await voice.addUsage(p.userId, result.durationSec, cost);
          ctx.metrics.voiceSeconds.inc({}, Math.ceil(result.durationSec));
          record('transcribe', userId, started, fields);
          return { durationSec: result.durationSec, turns: result.turns };
        } catch (err) {
          record('transcribe', userId, started, fields, err);
          throw err;
        } finally {
          release();
        }
      },
    );

    app.post(
      '/voice/text',
      {
        bodyLimit: 4 * 1024 * 1024,
        schema: {
          tags: ['voice'],
          security,
          body: voiceTextRequestSchema,
          response: { 200: voiceTextResponseSchema, ...errorResponses },
        },
      },
      async (req) => {
        const started = Date.now();
        let userId: string | null = null;
        const b = req.body;
        const fields: Record<string, unknown> = {
          task: b.task,
          quality: b.quality,
          chars: b.text?.length ?? b.turns!.reduce((n, t) => n + t.text.length, 0),
        };
        try {
          const p = await requireUser(ctx, req);
          userId = p.userId;
          if (!ctx.config.OPENROUTER_API_KEY) throw voiceUnavailable();
          await voice.admit(p.userId, { needsMinutes: false });
          const r = await voice.text(
            { task: b.task, style: b.style, profanity: b.profanity, turns: b.turns, text: b.text },
            b.quality,
          );
          fields.model = r.model;
          if (r.cost !== null) fields.cost = r.cost;
          fields.outChars = r.markdown.length;
          await voice.addUsage(p.userId, 0, r.cost ?? 0);
          record('text', userId, started, fields);
          return { markdown: r.markdown, model: r.model };
        } catch (err) {
          record('text', userId, started, fields, err);
          throw err;
        }
      },
    );
  };
}
