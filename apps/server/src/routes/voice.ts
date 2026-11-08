import multipart from '@fastify/multipart';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireUser } from '../auth/guard.js';
import type { AppContext } from '../context.js';
import { ApiError, badRequest } from '../lib/errors.js';
import { VoiceService, voiceUnavailable } from '../voice/service.js';
import { errorResponses } from './schemas.js';

/** Audio the speech-to-text service takes (api.md «Голос»). */
const AUDIO_TYPES: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
};
const AUDIO_MIME = new Set([
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'video/mp4',
  'audio/webm',
  'video/webm',
  'audio/ogg',
  'application/ogg',
  'audio/opus',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
]);

const TranscribeParams = z.object({
  mode: z.enum(['dictation', 'conversation']),
  speakers: z.coerce.number().int().min(1).max(8).optional(),
  language: z.enum(['ru', 'auto']).default('auto'),
});

const Turn = z.object({
  speaker: z.string().min(1).max(16),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string().max(100_000),
});

const TranscribeResponse = z.object({ durationSec: z.number().nonnegative(), turns: z.array(Turn) });

const TextRequest = z
  .object({
    task: z.enum(['clean', 'minutes', 'format']),
    style: z.string().trim().max(500).optional(),
    profanity: z.enum(['keep', 'soften']),
    quality: z.enum(['standard', 'best']).default('standard'),
    turns: z.array(Turn).min(1).max(20_000).optional(),
    text: z.string().min(1).max(500_000).optional(),
  })
  .refine((b) => (b.turns === undefined) !== (b.text === undefined), { message: 'send exactly one of turns and text' });

const TextResponse = z.object({ markdown: z.string(), model: z.string() });

/**
 * Voice (D-65, api.md «Голос»): speech to text and text from transcripts through the server, which
 * keeps the keys. Neither audio nor text is stored or logged; the log line of a request carries
 * only the account, sizes, durations, model, cost and result code.
 */
export function voiceRoutes(ctx: AppContext): FastifyPluginAsyncZod {
  return async (app) => {
    const voice = new VoiceService(ctx);
    const security = [{ bearer: [] }];
    await app.register(multipart, {
      limits: { fileSize: ctx.config.VOICE_MAX_BYTES, files: 1, fields: 8, fieldSize: 64, parts: 9, headerPairs: 50 },
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

    app.post(
      '/voice/transcribe',
      {
        schema: {
          tags: ['voice'],
          security,
          consumes: ['multipart/form-data'],
          response: { 200: TranscribeResponse, ...errorResponses },
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
          const params = TranscribeParams.safeParse(sent);
          if (!params.success) throw badRequest(`invalid request: ${params.error.issues[0]?.path.join('.') ?? ''}`.trim());
          const ext = (/\.([A-Za-z0-9]{1,5})$/.exec(part.filename ?? '')?.[1] ?? '').toLowerCase();
          const mime = part.mimetype.toLowerCase().split(';')[0]!.trim();
          const contentType = AUDIO_MIME.has(mime) ? mime : AUDIO_TYPES[ext];
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
          if (result.durationSec > ctx.config.VOICE_MAX_SECONDS) {
            throw new ApiError('payload_too_large', 'the recording is longer than 3 hours');
          }
          await voice.addUsage(p.userId, result.durationSec);
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
          body: TextRequest,
          response: { 200: TextResponse, ...errorResponses },
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
