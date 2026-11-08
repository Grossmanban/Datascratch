import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { eq, sql } from 'drizzle-orm';
import type { AppContext } from '../context.js';
import { users, voiceUsage } from '../db/schema.js';
import { ApiError } from '../lib/errors.js';
import { buildMessages, type PromptInput, type Turn } from './prompts.js';

/**
 * Voice (D-65): a proxy to ElevenLabs (speech to text) and OpenRouter (text from transcripts).
 * The keys never leave the server. Audio, transcripts and texts are neither stored nor logged:
 * only the account, sizes, durations, model, cost and result code are.
 */

export const voiceDisabled = () => new ApiError('voice_disabled', 'voice is not enabled for this account');
export const voiceUnavailable = () => new ApiError('voice_unavailable', 'voice is not configured on this server');
export const voiceUpstream = (m = 'the voice service failed, try again') => new ApiError('voice_upstream', m);

/** First day of the current month, UTC (`voice_usage.month`). */
export const currentMonth = (now = new Date()) => `${now.toISOString().slice(0, 7)}-01`;

/** First day of the next month, UTC: when a quota resets. */
const nextMonthStart = (now = new Date()) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

export interface VoiceAccount {
  userId: string;
  /** Seconds left this month (may be ≤ 0). */
  remainingSec: number;
}

export class VoiceService {
  readonly #windows = new Map<string, { start: number; count: number }>();
  readonly #running = new Map<string, number>();
  /** When the configured speech-to-text model was refused: the fallback is used for a while. */
  #sttModelRefusedAt = 0;

  constructor(private readonly ctx: AppContext) {}

  get #config() {
    return this.ctx.config;
  }

  /**
   * The caller may use voice now: enabled for the account, under the rate limit and with minutes
   * left (403 voice_disabled, 429 rate_limited / voice_quota).
   */
  async admit(userId: string, opts: { needsMinutes: boolean }): Promise<VoiceAccount> {
    const db = this.ctx.database.db;
    const [u] = await db
      .select({ email: users.email, enabled: users.voiceEnabled, quota: users.voiceMinutesQuota })
      .from(users)
      .where(eq(users.id, userId));
    if (!u || !this.#enabled(userId, u.email, u.enabled)) throw voiceDisabled();
    const wait = this.#rate(userId);
    if (wait > 0) throw new ApiError('rate_limited', 'too many voice requests, retry in a minute', undefined, wait);
    const quotaSec = (u.quota ?? this.#config.VOICE_MONTHLY_MINUTES) * 60;
    const [row] = await db
      .select({ seconds: voiceUsage.seconds })
      .from(voiceUsage)
      .where(sql`${voiceUsage.userId} = ${userId} AND ${voiceUsage.month} = ${currentMonth()}`);
    const remainingSec = quotaSec - (row?.seconds ?? 0);
    if (opts.needsMinutes && remainingSec <= 0) {
      throw new ApiError('voice_quota', 'the monthly voice minutes are used up', undefined, nextMonthStart() - Date.now());
    }
    return { userId, remainingSec };
  }

  #enabled(userId: string, email: string, flag: boolean | null): boolean {
    if (flag !== null) return flag;
    const list = this.#config.DS_VOICE_USERS.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return list.includes('*') || list.includes(userId) || list.includes(email.toLowerCase());
  }

  /** Fixed one-minute window per account over both endpoints; how long to wait (0: allowed). */
  #rate(userId: string): number {
    const now = Date.now();
    let w = this.#windows.get(userId);
    if (!w || now - w.start >= 60_000) {
      if (this.#windows.size > 10_000) {
        for (const [k, v] of this.#windows) if (now - v.start >= 60_000) this.#windows.delete(k);
      }
      w = { start: now, count: 0 };
      this.#windows.set(userId, w);
    }
    w.count += 1;
    return w.count <= this.#config.VOICE_PER_MINUTE ? 0 : 60_000 - (now - w.start);
  }

  /** A transcription slot of the account; release it in `finally`. */
  acquire(userId: string): () => void {
    const n = this.#running.get(userId) ?? 0;
    if (n >= this.#config.VOICE_CONCURRENCY_PER_USER) {
      throw new ApiError('rate_limited', 'a transcription is already running, retry when it is done', undefined, 5_000);
    }
    this.#running.set(userId, n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const m = (this.#running.get(userId) ?? 1) - 1;
      if (m <= 0) this.#running.delete(userId);
      else this.#running.set(userId, m);
    };
  }

  async addUsage(userId: string, seconds: number): Promise<void> {
    const s = Math.max(0, Math.ceil(seconds));
    await this.ctx.database.db
      .insert(voiceUsage)
      .values({ userId, month: currentMonth(), seconds: s, requests: 1 })
      .onConflictDoUpdate({
        target: [voiceUsage.userId, voiceUsage.month],
        set: { seconds: sql`${voiceUsage.seconds} + ${s}`, requests: sql`${voiceUsage.requests} + 1` },
      });
  }

  // ------------------------------------------------------------------ speech to text

  sttModel(): string {
    const refused = this.#sttModelRefusedAt && Date.now() - this.#sttModelRefusedAt < 10 * 60_000;
    return refused ? this.#config.VOICE_STT_FALLBACK_MODEL : this.#config.VOICE_STT_MODEL;
  }

  /**
   * Stream the audio to ElevenLabs as multipart (nothing is written to disk) and group the words
   * into turns. `audio` is consumed; if it grows past the limit it throws `tooLarge`.
   */
  async transcribe(args: {
    audio: AsyncIterable<Buffer>;
    filename: string;
    contentType: string;
    mode: 'dictation' | 'conversation';
    speakers?: number | undefined;
    language: 'ru' | 'auto';
  }): Promise<{ durationSec: number; turns: Turn[]; model: string }> {
    const key = this.#config.ELEVENLABS_API_KEY;
    if (!key) throw voiceUnavailable();
    const model = this.sttModel();
    const fields: [string, string][] = [
      ['model_id', model],
      ['diarize', String(args.mode === 'conversation')],
      ['tag_audio_events', 'false'],
      ['timestamps_granularity', 'word'],
    ];
    if (args.language === 'ru') fields.push(['language_code', 'rus']);
    if (args.speakers !== undefined && args.mode === 'conversation') fields.push(['num_speakers', String(args.speakers)]);

    const boundary = `----datascratch${randomBytes(12).toString('hex')}`;
    const safeName = args.filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 64) || 'audio';
    async function* body() {
      for (const [k, v] of fields) {
        yield Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
      }
      yield Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
          `Content-Type: ${args.contentType}\r\n\r\n`,
      );
      for await (const chunk of args.audio) yield chunk;
      yield Buffer.from(`\r\n--${boundary}--\r\n`);
    }

    const signal = AbortSignal.timeout(this.#config.VOICE_STT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(new URL('/v1/speech-to-text', this.#config.ELEVENLABS_URL), {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': `multipart/form-data; boundary=${boundary}`, accept: 'application/json' },
        body: Readable.toWeb(Readable.from(body())) as unknown as RequestInit['body'],
        // Node's fetch streams a request body only in half-duplex mode.
        duplex: 'half',
        signal,
      } as RequestInit & { duplex: 'half' });
    } catch (err) {
      throw upstreamFailure(err);
    }
    if (!res.ok) {
      // The upstream's answer is never logged (it may quote the request); only its status is.
      const detail = await res.text().catch(() => '');
      if ((res.status === 400 || res.status === 404 || res.status === 422) && /model/i.test(detail) && model === this.#config.VOICE_STT_MODEL) {
        this.#sttModelRefusedAt = Date.now();
      }
      throw Object.assign(voiceUpstream(), { upstreamStatus: res.status });
    }
    const json = (await res.json().catch(() => null)) as SttResponse | null;
    if (!json || !Array.isArray(json.words)) throw Object.assign(voiceUpstream('unexpected answer from the voice service'), { upstreamStatus: res.status });
    return { ...groupTurns(json), model };
  }

  // ------------------------------------------------------------------ text

  async text(input: PromptInput, quality: 'standard' | 'best'): Promise<{ markdown: string; model: string; cost: number | null }> {
    const key = this.#config.OPENROUTER_API_KEY;
    if (!key) throw voiceUnavailable();
    const model = quality === 'best' ? this.#config.VOICE_TEXT_MODEL_BEST : this.#config.VOICE_TEXT_MODEL_STANDARD;
    let res: Response;
    try {
      res = await fetch(new URL('v1/chat/completions', withSlash(this.#config.OPENROUTER_URL)), {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: buildMessages(input),
          temperature: 0.2,
          usage: { include: true },
          // Providers that keep or train on prompts are not used.
          provider: { data_collection: 'deny' },
        }),
        signal: AbortSignal.timeout(this.#config.VOICE_TEXT_TIMEOUT_MS),
      });
    } catch (err) {
      throw upstreamFailure(err);
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw Object.assign(voiceUpstream(), { upstreamStatus: res.status });
    }
    const json = (await res.json().catch(() => null)) as ChatResponse | null;
    const markdown = json?.choices?.[0]?.message?.content;
    if (typeof markdown !== 'string') throw Object.assign(voiceUpstream('unexpected answer from the text service'), { upstreamStatus: res.status });
    return { markdown, model: typeof json?.model === 'string' ? json.model : model, cost: typeof json?.usage?.cost === 'number' ? json.usage.cost : null };
  }
}

const withSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);

function upstreamFailure(err: unknown): ApiError {
  const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
  return voiceUpstream(timeout ? 'the voice service did not answer in time' : 'the voice service cannot be reached');
}

interface SttWord {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
  speaker_id?: string | null;
}
interface SttResponse {
  words: SttWord[];
  audio_duration_secs?: number;
}
interface ChatResponse {
  model?: string;
  choices?: { message?: { content?: unknown } }[];
  usage?: { cost?: unknown };
}

/** `speaker_0` → `S1`, `speaker_1` → `S2`…; no speaker (dictation) → `S1`. */
export function speakerLabel(id: string | null | undefined): string {
  const m = typeof id === 'string' ? /(\d+)$/.exec(id) : null;
  return `S${m ? Number(m[1]) + 1 : 1}`;
}

/** Consecutive words of one speaker make a turn; spacing goes with the turn it is in. */
export function groupTurns(r: SttResponse): { durationSec: number; turns: Turn[] } {
  const turns: Turn[] = [];
  let maxEnd = 0;
  for (const w of r.words) {
    if (w.type === 'audio_event') continue;
    const end = typeof w.end === 'number' ? w.end : 0;
    if (end > maxEnd) maxEnd = end;
    const last = turns[turns.length - 1];
    if (w.type === 'spacing') {
      if (last) last.text += w.text ?? ' ';
      continue;
    }
    const speaker = speakerLabel(w.speaker_id);
    const start = typeof w.start === 'number' ? w.start : end;
    if (last && last.speaker === speaker) {
      last.text += w.text ?? '';
      last.end = Math.max(last.end, end);
    } else {
      turns.push({ speaker, start, end, text: w.text ?? '' });
    }
  }
  for (const t of turns) t.text = t.text.replace(/\s+/g, ' ').trim();
  const duration = typeof r.audio_duration_secs === 'number' ? r.audio_duration_secs : maxEnd;
  return { durationSec: Math.round(duration * 1000) / 1000, turns: turns.filter((t) => t.text.length > 0) };
}
