import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import {
  buildVoiceTextPrompt,
  type VoiceQuality,
  type VoiceTextRequest,
  type VoiceTurn,
} from '@datascratch/shared/voice';
import type { AppContext } from '../context.js';
import { users, voiceAccess, voiceUsage } from '../db/schema.js';
import { ApiError } from '../lib/errors.js';
import { accountChanged } from '../services/account-events.js';
import { Agent, ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici';

const listOf = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

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

export const resetsAt = (now = new Date()) => new Date(nextMonthStart(now)).toISOString();

/** An account's voice setting as it applies now (D-65). */
export interface VoiceStatus {
  userId: string;
  email: string;
  admin: boolean;
  enabled: boolean;
  /** The account's own minutes, or the default for it. */
  monthlyMinutes: number;
  /** The account has minutes of its own (not the server default). */
  customMinutes: boolean;
  usedSec: number;
  costUsd: number;
  requests: number;
}

export class VoiceService {
  readonly #windows = new Map<string, { start: number; count: number }>();
  readonly #running = new Map<string, number>();
  /** When the configured speech-to-text model was refused: the fallback is used for a while. */
  #sttModelRefusedAt = 0;

  /** fetch for the voice upstreams: through DS_VOICE_PROXY when it is set, else direct. */
  readonly #fetch: typeof fetch;

  constructor(private readonly ctx: AppContext) {
    const proxy = ctx.config.DS_VOICE_PROXY;
    // undici's own limits (5 min for headers and between body chunks) would cut a long upload
    // or a long generation short: ours are the AbortSignal timeouts of each call (D-65).
    const timeouts = voiceDispatcherTimeouts(ctx.config);
    const dispatcher: Dispatcher = proxy ? new ProxyAgent({ uri: proxy, ...timeouts }) : new Agent(timeouts);
    this.#fetch = ((url: string | URL, init?: RequestInit) =>
      undiciFetch(url, { ...(init as object), dispatcher } as Parameters<typeof undiciFetch>[1])) as unknown as typeof fetch;
  }

  get #config() {
    return this.ctx.config;
  }

  isAdmin(email: string): boolean {
    return listOf(this.#config.DS_ADMIN_EMAILS).includes(email.toLowerCase());
  }

  /** Voice settings and this month's usage of the given accounts (all accounts when omitted). */
  async statuses(userIds?: string[]): Promise<VoiceStatus[]> {
    const db = this.ctx.database.db;
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        enabled: voiceAccess.enabled,
        minutes: voiceAccess.monthlyMinutes,
        seconds: voiceUsage.seconds,
        costUsd: voiceUsage.costUsd,
        requests: voiceUsage.requests,
      })
      .from(users)
      .leftJoin(voiceAccess, eq(voiceAccess.userId, users.id))
      .leftJoin(voiceUsage, and(eq(voiceUsage.userId, users.id), eq(voiceUsage.month, currentMonth())))
      .where(userIds ? inArray(users.id, userIds) : undefined)
      .orderBy(asc(users.email));
    return rows.map((r) => {
      const admin = this.isAdmin(r.email);
      return {
        userId: r.userId,
        email: r.email,
        admin,
        // No setting: on for admins, off for the others.
        enabled: r.enabled ?? admin,
        monthlyMinutes: r.minutes ?? (admin ? this.#config.VOICE_ADMIN_MONTHLY_MINUTES : this.#config.VOICE_MONTHLY_MINUTES),
        customMinutes: r.minutes !== null,
        usedSec: r.seconds ?? 0,
        costUsd: r.costUsd ?? 0,
        requests: r.requests ?? 0,
      };
    });
  }

  async status(userId: string): Promise<VoiceStatus | null> {
    return (await this.statuses([userId]))[0] ?? null;
  }

  /**
   * The caller may use voice now: enabled for the account, under the rate limit and with minutes
   * left (403 voice_disabled, 429 rate_limited / voice_quota).
   */
  async admit(userId: string, opts: { needsMinutes: boolean }): Promise<VoiceStatus> {
    const st = await this.status(userId);
    if (!st || !st.enabled) throw voiceDisabled();
    const wait = this.#rate(userId);
    if (wait > 0) throw new ApiError('rate_limited', 'too many voice requests, retry in a minute', undefined, wait);
    if (opts.needsMinutes && st.monthlyMinutes * 60 - st.usedSec <= 0) {
      throw new ApiError('voice_quota', 'the monthly voice minutes are used up', undefined, nextMonthStart() - Date.now());
    }
    return st;
  }

  /** An admin's change; `monthlyMinutes` null returns the account to the default. */
  async setAccess(userId: string, set: { enabled: boolean; monthlyMinutes?: number | null | undefined }, by: string | null) {
    const minutes = set.monthlyMinutes === undefined ? {} : { monthlyMinutes: set.monthlyMinutes };
    await this.ctx.database.db
      .insert(voiceAccess)
      .values({ userId, enabled: set.enabled, ...minutes, updatedBy: by })
      .onConflictDoUpdate({
        target: voiceAccess.userId,
        set: { enabled: set.enabled, ...minutes, updatedBy: by, updatedAt: new Date() },
      });
    // The account's devices show the button and the minutes left at once (sync v2).
    accountChanged(this.ctx, [userId], ['voice']);
  }

  /**
   * DS_VOICE_USERS (ids or e-mails): voice on for listed accounts that have no setting yet.
   * Runs at startup; an admin's later choice stays.
   */
  async seed(): Promise<number> {
    const list = listOf(this.#config.DS_VOICE_USERS);
    if (list.length === 0) return 0;
    const db = this.ctx.database.db;
    const ids = list.filter((x) => /^[0-9a-f-]{36}$/.test(x));
    const emails = list.filter((x) => x.includes('@'));
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(or(ids.length ? inArray(users.id, ids) : sql`false`, emails.length ? inArray(sql`lower(${users.email})`, emails) : sql`false`));
    if (found.length === 0) return 0;
    const added = await db
      .insert(voiceAccess)
      .values(found.map((u) => ({ userId: u.id, enabled: true })))
      .onConflictDoNothing()
      .returning({ userId: voiceAccess.userId });
    return added.length;
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

  /** Count a request: seconds of audio (transcription) and what it cost (USD). */
  async addUsage(userId: string, seconds: number, costUsd: number): Promise<void> {
    const s = Math.max(0, Math.ceil(seconds));
    const c = Math.max(0, Math.round(costUsd * 1e6) / 1e6);
    await this.ctx.database.db
      .insert(voiceUsage)
      .values({ userId, month: currentMonth(), seconds: s, requests: 1, costUsd: c })
      .onConflictDoUpdate({
        target: [voiceUsage.userId, voiceUsage.month],
        set: {
          seconds: sql`${voiceUsage.seconds} + ${s}`,
          requests: sql`${voiceUsage.requests} + 1`,
          costUsd: sql`${voiceUsage.costUsd} + ${c}`,
        },
      });
  }

  /** Estimated speech-to-text cost of a recording (the service does not report one). */
  sttCost(seconds: number): number {
    return (seconds / 3600) * this.#config.VOICE_STT_USD_PER_HOUR;
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
  }): Promise<{ durationSec: number; turns: VoiceTurn[]; model: string }> {
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
      res = await this.#fetch(new URL('/v1/speech-to-text', this.#config.ELEVENLABS_URL), {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': `multipart/form-data; boundary=${boundary}`, accept: 'application/json' },
        body: Readable.toWeb(Readable.from(body())) as unknown as RequestInit['body'],
        // Node's fetch streams a request body only in half-duplex mode.
        duplex: 'half',
        signal,
      } as RequestInit & { duplex: 'half' });
    } catch (err) {
      throw upstreamFailure(err, 'elevenlabs');
    }
    if (!res.ok) {
      // The upstream's answer is never logged (it may quote the request); only its status is.
      const detail = await res.text().catch(() => '');
      if ((res.status === 400 || res.status === 404 || res.status === 422) && /model/i.test(detail) && model === this.#config.VOICE_STT_MODEL) {
        this.#sttModelRefusedAt = Date.now();
      }
      throw Object.assign(voiceUpstream(), { upstreamStatus: res.status, stage: 'elevenlabs' });
    }
    let json: SttResponse | null;
    try {
      json = (await res.json()) as SttResponse | null;
    } catch (err) {
      throw upstreamFailure(err, 'elevenlabs', res.status);
    }
    if (!json || !Array.isArray(json.words)) {
      throw Object.assign(voiceUpstream('unexpected answer from the voice service'), { upstreamStatus: res.status, stage: 'elevenlabs' });
    }
    return { ...groupTurns(json), model };
  }

  // ------------------------------------------------------------------ text

  /**
   * The text model's answer. `clean` of a long input runs in parts (whole turns or paragraphs of
   * at most VOICE_TEXT_CHUNK_CHARS), up to 3 at a time, joined in order: each part answers sooner
   * and stays well under the output limit. Other tasks need the whole text at once.
   */
  async text(
    input: Pick<VoiceTextRequest, 'task' | 'style' | 'profanity' | 'turns' | 'text'>,
    quality: VoiceQuality,
  ): Promise<{ markdown: string; model: string; cost: number | null; parts: number }> {
    if (!this.#config.OPENROUTER_API_KEY) throw voiceUnavailable();
    const parts = input.task === 'clean' ? splitForClean(input, this.#config.VOICE_TEXT_CHUNK_CHARS) : [input];
    const results = new Array<{ markdown: string; model: string; cost: number | null }>(parts.length);
    let next = 0;
    const worker = async () => {
      while (next < parts.length) {
        const k = next++;
        results[k] = await this.#textOnce(parts[k]!, quality);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, parts.length) }, worker));
    const costs = results.map((r) => r.cost);
    return {
      markdown: results.map((r) => r.markdown.trim()).filter(Boolean).join('\n\n'),
      model: results[0]!.model,
      cost: costs.every((c) => c === null) ? null : costs.reduce<number>((n, c) => n + (c ?? 0), 0),
      parts: parts.length,
    };
  }

  async #textOnce(
    input: Pick<VoiceTextRequest, 'task' | 'style' | 'profanity' | 'turns' | 'text'>,
    quality: VoiceQuality,
  ): Promise<{ markdown: string; model: string; cost: number | null }> {
    const key = this.#config.OPENROUTER_API_KEY!;
    const model = quality === 'best' ? this.#config.VOICE_TEXT_MODEL_BEST : this.#config.VOICE_TEXT_MODEL_STANDARD;
    const prompt = buildVoiceTextPrompt(input);
    let res: Response;
    try {
      res = await this.#fetch(new URL('v1/chat/completions', withSlash(this.#config.OPENROUTER_URL)), {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          temperature: 0.2,
          // A cleaned long dictation is long too (10 minutes ≈ 10–15k tokens).
          max_tokens: this.#config.VOICE_TEXT_MAX_TOKENS,
          usage: { include: true },
          // Providers that keep or train on prompts are not used.
          provider: { data_collection: 'deny' },
        }),
        signal: AbortSignal.timeout(this.#config.VOICE_TEXT_TIMEOUT_MS),
      });
    } catch (err) {
      throw upstreamFailure(err, 'openrouter');
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw Object.assign(voiceUpstream(), { upstreamStatus: res.status, stage: 'openrouter' });
    }
    let json: ChatResponse | null;
    try {
      json = (await res.json()) as ChatResponse | null;
    } catch (err) {
      throw upstreamFailure(err, 'openrouter', res.status);
    }
    const markdown = json?.choices?.[0]?.message?.content;
    if (typeof markdown !== 'string') {
      throw Object.assign(voiceUpstream('unexpected answer from the text service'), { upstreamStatus: res.status, stage: 'openrouter' });
    }
    return { markdown, model: typeof json?.model === 'string' ? json.model : model, cost: typeof json?.usage?.cost === 'number' ? json.usage.cost : null };
  }
}

/** undici limits for the voice upstreams: longer than any of our own call timeouts. */
export function voiceDispatcherTimeouts(c: { VOICE_STT_TIMEOUT_MS: number; VOICE_TEXT_TIMEOUT_MS: number }) {
  const ms = Math.max(c.VOICE_STT_TIMEOUT_MS, c.VOICE_TEXT_TIMEOUT_MS) + 60_000;
  return { headersTimeout: ms, bodyTimeout: ms };
}

type TextInput = Pick<VoiceTextRequest, 'task' | 'style' | 'profanity' | 'turns' | 'text'>;

/** Split a long `clean` input into parts of at most `max` characters, by turns or paragraphs. */
export function splitForClean(input: TextInput, max: number): TextInput[] {
  const groups = <T>(items: T[], size: (x: T) => number): T[][] => {
    const out: T[][] = [];
    let cur: T[] = [];
    let n = 0;
    for (const it of items) {
      const s = size(it);
      if (cur.length > 0 && n + s > max) {
        out.push(cur);
        cur = [];
        n = 0;
      }
      cur.push(it);
      n += s;
    }
    if (cur.length > 0) out.push(cur);
    return out;
  };
  if (input.turns) {
    const total = input.turns.reduce((n, t) => n + t.text.length, 0);
    if (total <= max) return [input];
    return groups(input.turns, (t) => t.text.length + 1).map((turns) => ({ ...input, turns }));
  }
  const text = input.text ?? '';
  if (text.length <= max) return [input];
  // Paragraphs, then lines, then sentences; a single over-long piece is cut at the limit.
  const pieces = text
    .split(/\n{2,}/)
    .flatMap((p) => (p.length <= max ? [p] : p.split(/\n/)))
    .flatMap((p) => (p.length <= max ? [p] : p.split(/(?<=[.!?…])\s+/)))
    .flatMap((p) => (p.length <= max ? [p] : (p.match(new RegExp(`[\\s\\S]{1,${max}}`, 'g')) ?? [])))
    .filter((p) => p.trim().length > 0);
  return groups(pieces, (p) => p.length + 2).map((ps) => ({ ...input, text: ps.join('\n\n') }));
}

const withSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);

/** Where a voice request failed, for the log (never with content). */
export type VoiceStage = 'upload' | 'elevenlabs' | 'openrouter' | 'timeout';

function upstreamFailure(err: unknown, stage: VoiceStage, upstreamStatus?: number): ApiError {
  const timeout =
    err instanceof Error &&
    (err.name === 'TimeoutError' || err.name === 'AbortError' || /timeout/i.test(String((err as { cause?: { code?: string } }).cause?.code ?? '')));
  return Object.assign(voiceUpstream(timeout ? 'the voice service did not answer in time' : 'the voice service cannot be reached'), {
    stage: timeout ? ('timeout' as const) : stage,
    upstream: stage,
    ...(upstreamStatus ? { upstreamStatus } : {}),
  });
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

/**
 * Consecutive words of one speaker make a turn; spacing goes with the turn it is in. Speakers are
 * `S1`, `S2`, … in order of first appearance (api.md «Голос»); no speaker (dictation) is `S1`.
 */
export function groupTurns(r: SttResponse): { durationSec: number; turns: VoiceTurn[] } {
  const labels = new Map<string, string>();
  const label = (id: string | null | undefined) => {
    const key = id ?? '';
    let l = labels.get(key);
    if (!l) {
      l = `S${labels.size + 1}`;
      labels.set(key, l);
    }
    return l;
  };
  const turns: VoiceTurn[] = [];
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
    if (!(w.text ?? '').trim()) continue;
    const speaker = label(w.speaker_id);
    const start = typeof w.start === 'number' ? w.start : end;
    if (last && last.speaker === speaker) {
      last.text += w.text ?? '';
      last.end = Math.max(last.end, end);
    } else {
      turns.push({ speaker, start, end: Math.max(start, end), text: w.text ?? '' });
    }
  }
  for (const t of turns) t.text = t.text.replace(/\s+/g, ' ').trim();
  const duration = typeof r.audio_duration_secs === 'number' ? r.audio_duration_secs : maxEnd;
  return { durationSec: Math.round(duration * 1000) / 1000, turns: turns.filter((t) => t.text.length > 0) };
}

