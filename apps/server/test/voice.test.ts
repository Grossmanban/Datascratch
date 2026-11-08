import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { voiceAccess, voiceUsage } from '../src/db/schema.js';
import { groupTurns, VoiceService } from '../src/voice/service.js';
import { SyncClient, api, rnd, signup, startServer, type TestServer, type TestUser } from './helpers.js';

// D-65: voice through the server (api.md «Голос»); ElevenLabs and OpenRouter are fakes here.

interface Seen {
  path: string;
  headers: IncomingMessage['headers'];
  body: Buffer;
}

/** A fake upstream: records every request and answers with `reply`. */
async function fake(reply: (seen: Seen) => { status: number; json: unknown }) {
  const seen: Seen[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const s = { path: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) };
      seen.push(s);
      const r = reply(s);
      res.writeHead(r.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.json));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, seen, close: () => new Promise<void>((r) => server.close(() => r())) };
}

/** The fields of a multipart body (text parts only) and its file part. */
function parseMultipart(s: Seen) {
  const boundary = /boundary=(.+)$/.exec(String(s.headers['content-type']))![1]!;
  const parts = s.body.toString('latin1').split(`--${boundary}`).slice(1, -1);
  const fields: Record<string, string> = {};
  let file: Buffer | null = null;
  for (const p of parts) {
    const [head, ...rest] = p.split('\r\n\r\n');
    const value = rest.join('\r\n\r\n').replace(/\r\n$/, '');
    const name = /name="([^"]+)"/.exec(head!)![1]!;
    if (/filename=/.test(head!)) file = Buffer.from(value, 'latin1');
    else fields[name] = value;
  }
  return { fields, file };
}

const MARK = 'SECRET-VOICE-CONTENT-7f3a';
const json = (r: Response): Promise<any> => r.json();

const conversation = {
  audio_duration_secs: 61.5,
  words: [
    { text: 'Привет', start: 0.1, end: 0.5, type: 'word', speaker_id: 'speaker_0' },
    { text: ' ', start: 0.5, end: 0.6, type: 'spacing', speaker_id: 'speaker_0' },
    { text: MARK, start: 0.6, end: 1.2, type: 'word', speaker_id: 'speaker_0' },
    { text: ' ', start: 1.2, end: 1.3, type: 'spacing', speaker_id: 'speaker_0' },
    { text: 'Здравствуй', start: 1.3, end: 2.0, type: 'word', speaker_id: 'speaker_1' },
    { text: '(смех)', start: 2.0, end: 2.2, type: 'audio_event', speaker_id: 'speaker_1' },
    { text: 'Итак', start: 3.0, end: 3.5, type: 'word', speaker_id: 'speaker_0' },
  ],
};

let stt: Awaited<ReturnType<typeof fake>>;
let llm: Awaited<ReturnType<typeof fake>>;
let sttReply: (s: Seen) => { status: number; json: unknown };
let llmReply: (s: Seen) => { status: number; json: unknown };
let s: TestServer;
const logLines: string[] = [];
let accounts = 0;
const address = () => `10.65.${Math.floor(accounts / 200)}.${(accounts++ % 200) + 1}`;

beforeAll(async () => {
  stt = await fake((x) => sttReply(x));
  llm = await fake((x) => llmReply(x));
  s = await startServer(
    {
      LOG_LEVEL: 'info',
      ELEVENLABS_API_KEY: 'el-test-key',
      OPENROUTER_API_KEY: 'or-test-key',
      ELEVENLABS_URL: stt.url,
      OPENROUTER_URL: `${llm.url}/api`,
      DS_VOICE_USERS: 'voice-on@example.com',
      DS_ADMIN_EMAILS: 'owner@example.com, Second-Admin@example.com',
      VOICE_PER_MINUTE: '1000',
    },
    [],
    { write: (line) => void logLines.push(line) },
  );
});
afterAll(async () => {
  await s.close();
  await stt.close();
  await llm.close();
});
beforeEach(() => {
  sttReply = () => ({ status: 200, json: conversation });
  llmReply = (x) => ({
    status: 200,
    json: {
      model: JSON.parse(x.body.toString()).model,
      choices: [{ message: { role: 'assistant', content: `# Итоги\n\n${MARK}` } }],
      usage: { cost: 0.0042 },
    },
  });
});

/** Set an account's voice access directly (what an admin's PUT or `ds voice` does). */
async function setAccess(u: TestUser, enabled: boolean, monthlyMinutes: number | null = null, server = s) {
  await server.ctx.database.db
    .insert(voiceAccess)
    .values({ userId: u.userId, enabled, monthlyMinutes })
    .onConflictDoUpdate({ target: voiceAccess.userId, set: { enabled, monthlyMinutes } });
}

/** An account with voice on. */
async function voiceUser(server = s): Promise<TestUser> {
  const u = await signup(server, undefined, address());
  await setAccess(u, true, null, server);
  return u;
}

function transcribe(
  u: TestUser,
  fields: Record<string, string>,
  audio: Uint8Array = Buffer.from(`fake-audio-${MARK}`),
  filename = 'memo.m4a',
  server = s,
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('audio', new Blob([audio], { type: 'audio/mp4' }), filename);
  return fetch(`${server.url}/v1/voice/transcribe`, {
    method: 'POST',
    headers: { authorization: `Bearer ${u.session.accessToken}` },
    body: form,
  });
}

const text = (u: TestUser, body: unknown, server = s) =>
  api(server, 'POST', '/voice/text', { token: u.session.accessToken, body });

describe('voice: transcribe', () => {
  it('streams a conversation to ElevenLabs and groups the words into turns by speaker', async () => {
    const u = await voiceUser();
    const audio = rnd(4096);
    stt.seen.length = 0;
    const r = await transcribe(u, { mode: 'conversation', speakers: '2', language: 'ru' }, audio);
    expect(r.status).toBe(200);
    expect(await json(r)).toEqual({
      durationSec: 61.5,
      turns: [
        { speaker: 'S1', start: 0.1, end: 1.2, text: `Привет ${MARK}` },
        { speaker: 'S2', start: 1.3, end: 2.0, text: 'Здравствуй' },
        { speaker: 'S1', start: 3.0, end: 3.5, text: 'Итак' },
      ],
    });
    expect(stt.seen).toHaveLength(1);
    const call = stt.seen[0]!;
    expect(call.path).toBe('/v1/speech-to-text');
    expect(call.headers['xi-api-key']).toBe('el-test-key');
    const { fields, file } = parseMultipart(call);
    expect(fields).toEqual({
      model_id: 'scribe_v2',
      diarize: 'true',
      tag_audio_events: 'false',
      timestamps_granularity: 'word',
      language_code: 'rus',
      num_speakers: '2',
    });
    expect(Buffer.compare(file!, Buffer.from(audio))).toBe(0);
    // Usage counts the seconds (rounded up), never the content.
    const [row] = await s.ctx.database.db.select().from(voiceUsage).where(eq(voiceUsage.userId, u.userId));
    expect(row).toMatchObject({ seconds: 62, requests: 1 });
  });

  it('dictation: one speaker, no diarization; `auto` leaves the language to the service, `ru` is the default', async () => {
    const u = await voiceUser();
    sttReply = () => ({
      status: 200,
      json: { words: [{ text: 'Купить', start: 0, end: 0.4, type: 'word' }, { text: ' ', type: 'spacing' }, { text: 'хлеб', start: 0.5, end: 0.9, type: 'word' }] },
    });
    stt.seen.length = 0;
    const r = await transcribe(u, { mode: 'dictation', language: 'auto' });
    expect(await json(r)).toEqual({ durationSec: 0.9, turns: [{ speaker: 'S1', start: 0, end: 0.9, text: 'Купить хлеб' }] });
    const { fields } = parseMultipart(stt.seen[0]!);
    expect(fields.diarize).toBe('false');
    expect(fields.language_code).toBeUndefined();
    expect(fields.num_speakers).toBeUndefined();
    await transcribe(u, { mode: 'dictation' });
    expect(parseMultipart(stt.seen.at(-1)!).fields.language_code).toBe('rus');
  });

  it('refuses bad requests before anything reaches the service', async () => {
    const u = await voiceUser();
    stt.seen.length = 0;
    expect((await transcribe(u, { mode: 'monologue' })).status).toBe(400);
    expect((await transcribe(u, { mode: 'conversation', speakers: '9' })).status).toBe(400);
    expect((await transcribe(u, { mode: 'dictation' }, rnd(10), 'notes.txt')).status).toBe(200); // audio/mp4 type wins
    const form = new FormData();
    form.append('mode', 'dictation');
    form.append('audio', new Blob([rnd(10)], { type: 'text/plain' }), 'notes.txt');
    const bad = await fetch(`${s.url}/v1/voice/transcribe`, {
      method: 'POST',
      headers: { authorization: `Bearer ${u.session.accessToken}` },
      body: form,
    });
    expect(bad.status).toBe(400);
    expect(stt.seen).toHaveLength(1);
  });

  it('a speech-to-text model the service refuses: 502, then the fallback model', async () => {
    const other = await startServer(
      { ELEVENLABS_API_KEY: 'k', OPENROUTER_API_KEY: 'k', ELEVENLABS_URL: stt.url },
    );
    try {
      const u = await voiceUser(other);
      sttReply = (x) =>
        parseMultipart(x).fields.model_id === 'scribe_v2'
          ? { status: 422, json: { detail: { message: 'invalid model_id' } } }
          : { status: 200, json: conversation };
      const first = await transcribe(u, { mode: 'conversation' }, undefined, undefined, other);
      expect(first.status).toBe(502);
      expect((await json(first)).error.code).toBe('voice_upstream');
      const second = await transcribe(u, { mode: 'conversation' }, undefined, undefined, other);
      expect(second.status).toBe(200);
      expect(parseMultipart(stt.seen.at(-1)!).fields.model_id).toBe('scribe_v1');
    } finally {
      await other.close();
    }
  });
});

describe('voice: text', () => {
  it('sends the task to the model of the requested quality with privacy settings', async () => {
    const u = await voiceUser();
    llm.seen.length = 0;
    const turns = [{ speaker: 'S1', start: 0, end: 2, text: MARK }];
    const best = await text(u, { task: 'minutes', profanity: 'soften', quality: 'best', turns });
    expect(best.status).toBe(200);
    expect(best.body).toEqual({ markdown: `# Итоги\n\n${MARK}`, model: 'anthropic/claude-sonnet-5.5' });
    const std = await text(u, { task: 'clean', profanity: 'keep', text: `${MARK} эээ ну` });
    expect(std.body.model).toBe('openai/gpt-5.6-luna');

    expect(llm.seen.map((x) => x.path)).toEqual(['/api/v1/chat/completions', '/api/v1/chat/completions']);
    expect(llm.seen[0]!.headers.authorization).toBe('Bearer or-test-key');
    const sent = JSON.parse(llm.seen[0]!.body.toString());
    expect(sent).toMatchObject({
      model: 'anthropic/claude-sonnet-5.5',
      temperature: 0.2,
      usage: { include: true },
      provider: { data_collection: 'deny' },
    });
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[1].content).toContain(MARK);
  });

  it('validates the body: exactly one of turns and text, known tasks', async () => {
    const u = await voiceUser();
    expect((await text(u, { task: 'clean', profanity: 'keep' })).status).toBe(400);
    expect((await text(u, { task: 'clean', profanity: 'keep', text: 'a', turns: [{ speaker: 'S1', start: 0, end: 1, text: 'b' }] })).status).toBe(400);
    expect((await text(u, { task: 'poem', profanity: 'keep', text: 'a' })).status).toBe(400);
    // `format` needs a style (shared contract).
    expect((await text(u, { task: 'format', profanity: 'keep', text: 'a' })).status).toBe(400);
  });

  it('a failing model is 502 voice_upstream', async () => {
    const u = await voiceUser();
    llmReply = () => ({ status: 500, json: { error: { message: `upstream echoes ${MARK}` } } });
    const r = await text(u, { task: 'format', style: 'notes', profanity: 'keep', text: 'abc' });
    expect(r.status).toBe(502);
    expect(r.body.error.code).toBe('voice_upstream');
  });
});

describe('voice: access and limits', () => {
  it('is off unless switched on; admins have it by default; DS_VOICE_USERS switches listed accounts on once', async () => {
    const stranger = await signup(s, undefined, address());
    stt.seen.length = 0;
    const r = await transcribe(stranger, { mode: 'dictation' });
    expect(r.status).toBe(403);
    expect((await json(r)).error.code).toBe('voice_disabled');
    expect((await text(stranger, { task: 'clean', profanity: 'keep', text: 'a' })).body.error.code).toBe('voice_disabled');
    expect(stt.seen).toHaveLength(0);

    expect((await transcribe(await getAdmin(), { mode: 'dictation' })).status).toBe(200);

    // The seed runs at startup for accounts that exist then; an admin's later choice stays.
    const listed = await signup(s, 'voice-on@example.com', address());
    expect((await transcribe(listed, { mode: 'dictation' })).status).toBe(403);
    expect(await new VoiceService(s.ctx).seed()).toBe(1);
    expect((await transcribe(listed, { mode: 'dictation' })).status).toBe(200);
    await setAccess(listed, false);
    expect(await new VoiceService(s.ctx).seed()).toBe(0);
    expect((await transcribe(listed, { mode: 'dictation' })).status).toBe(403);
  });

  it('counts minutes per month: a used-up quota is 429 voice_quota until the next month', async () => {
    const u = await signup(s, undefined, address());
    await setAccess(u, true, 1);
    // 61.5 s: the request that crosses the quota still goes through, the next one does not.
    expect((await transcribe(u, { mode: 'conversation' })).status).toBe(200);
    const over = await transcribe(u, { mode: 'conversation' });
    expect(over.status).toBe(429);
    const body = await json(over);
    expect(body.error.code).toBe('voice_quota');
    expect(body.error.retryAfterMs).toBeGreaterThan(0);
    // Texts need no minutes.
    expect((await text(u, { task: 'clean', profanity: 'keep', text: 'a' })).status).toBe(200);
  });

  it('size limit (413), rate limit (429) and missing keys (503)', async () => {
    const small = await startServer({
      ELEVENLABS_API_KEY: 'k',
      ELEVENLABS_URL: stt.url,
      VOICE_MAX_BYTES: '1000',
      VOICE_PER_MINUTE: '3',
    });
    try {
      const u = await voiceUser(small);
      const big = await transcribe(u, { mode: 'dictation' }, rnd(5000), 'big.m4a', small);
      expect(big.status).toBe(413);
      expect((await transcribe(u, { mode: 'dictation' }, rnd(100), 'ok.m4a', small)).status).toBe(200);
      // The third request of the minute is allowed, the fourth is not.
      await transcribe(u, { mode: 'dictation' }, rnd(100), 'ok.m4a', small);
      const limited = await transcribe(u, { mode: 'dictation' }, rnd(100), 'ok.m4a', small);
      expect(limited.status).toBe(429);
      expect((await json(limited)).error.code).toBe('rate_limited');
      // No OpenRouter key: texts are 503, transcription still works.
      const t = await text(u, { task: 'clean', profanity: 'keep', text: 'a' }, small);
      expect(t.status).toBe(503);
      expect(t.body.error.code).toBe('voice_unavailable');
    } finally {
      await small.close();
    }
  });
});

describe('voice: long recordings', () => {
  it('longer than 3 hours: 413 voice_too_long, and the minutes are not counted', async () => {
    const u = await voiceUser();
    sttReply = () => ({ status: 200, json: { audio_duration_secs: 3 * 3600 + 1, words: [] } });
    const r = await transcribe(u, { mode: 'dictation' });
    expect(r.status).toBe(413);
    expect((await json(r)).error.code).toBe('voice_too_long');
    expect((await api(s, 'GET', '/voice/me', { token: u.session.accessToken })).body.usedMinutes).toBe(0);
  });
});

describe('voice: privacy', () => {
  it('never writes audio, transcripts or texts to the log, also on failures', async () => {
    const u = await voiceUser();
    logLines.length = 0;
    await transcribe(u, { mode: 'conversation' });
    sttReply = () => ({ status: 500, json: { detail: MARK } });
    await transcribe(u, { mode: 'dictation' });
    await text(u, { task: 'clean', profanity: 'keep', text: MARK });
    llmReply = () => ({ status: 400, json: { error: MARK } });
    await text(u, { task: 'clean', profanity: 'keep', text: MARK });
    const all = logLines.join('');
    expect(all).not.toContain(MARK);
    expect(all).not.toContain('el-test-key');
    expect(all).not.toContain('or-test-key');
    // What is logged: who, sizes, durations, model, cost, code.
    const lines = logLines.map((l) => JSON.parse(l)).filter((l) => l.voice);
    expect(lines.map((l) => [l.voice, l.code])).toEqual([
      ['transcribe', 'ok'],
      ['transcribe', 'voice_upstream'],
      ['text', 'ok'],
      ['text', 'voice_upstream'],
    ]);
    expect(lines[0]).toMatchObject({ userId: u.userId, durationSec: 61.5, model: 'scribe_v2', bytes: expect.any(Number) });
    expect(lines[2]).toMatchObject({ model: 'openai/gpt-5.6-luna', cost: 0.0042, chars: MARK.length });
    expect(lines[1].upstreamStatus).toBe(500);
  });
});

describe('voice: grouping', () => {
  it('labels speakers S1, S2… in order of first appearance and skips empty turns', () => {
    const w = (speaker_id: string, text: string, start: number) => ({ text, start, end: start + 0.5, type: 'word', speaker_id });
    expect(groupTurns({ words: [w('speaker_3', 'а', 0), w('speaker_0', 'б', 1), w('speaker_3', 'в', 2)] }).turns.map((t) => t.speaker)).toEqual([
      'S1',
      'S2',
      'S1',
    ]);
    expect(groupTurns({ words: [{ text: ' ', type: 'spacing' }] })).toEqual({ durationSec: 0, turns: [] });
  });
});

describe('voice: smoke', () => {
  it('a valid body without a token is 401 (infra/deploy/smoke.mjs relies on it)', async () => {
    const r = await api(s, 'POST', '/voice/text', { body: { task: 'clean', profanity: 'keep', text: 'smoke' } });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('unauthorized');
  });
});

describe('voice: what an account sees, and the admin screen', () => {
  it('GET /voice/me: on or off, minutes and when they reset', async () => {
    const u = await signup(s, undefined, address());
    const off = await api(s, 'GET', '/voice/me', { token: u.session.accessToken });
    expect(off.body).toMatchObject({ enabled: false, available: true, monthlyMinutes: 120, usedMinutes: 0, admin: false });
    expect(new Date(off.body.resetsAt).getUTCDate()).toBe(1);
    await setAccess(u, true);
    await transcribe(u, { mode: 'conversation' });
    const on = await api(s, 'GET', '/voice/me', { token: u.session.accessToken });
    expect(on.body).toMatchObject({ enabled: true, monthlyMinutes: 120, usedMinutes: 1 });
    const owner = await signup(s, 'second-admin@example.com', address());
    expect((await api(s, 'GET', '/voice/me', { token: owner.session.accessToken })).body).toMatchObject({
      enabled: true,
      monthlyMinutes: 600,
      admin: true,
    });
  });

  it('only admins list and change access; a change reaches the account at once and applies to the next request', async () => {
    const ownerAdmin = await getAdmin();
    const member = await signup(s, undefined, address());
    const other = await signup(s, undefined, address());
    const as = (u: TestUser) => ({ token: u.session.accessToken });

    // Not an admin: 403 on both.
    expect((await api(s, 'GET', '/admin/voice', as(member))).status).toBe(403);
    expect((await api(s, 'PUT', `/admin/voice/${other.userId}`, { ...as(member), body: { enabled: true } })).status).toBe(403);

    const list = await api(s, 'GET', '/admin/voice', as(ownerAdmin));
    expect(list.status).toBe(200);
    expect(list.body.month).toMatch(/^\d{4}-\d{2}$/);
    const row = list.body.accounts.find((a: any) => a.userId === member.userId);
    expect(row).toEqual({
      userId: member.userId,
      email: member.email,
      name: null,
      admin: false,
      enabled: false,
      monthlyMinutes: 120,
      customMinutes: false,
      usedMinutes: 0,
      costUsd: 0,
      requests: 0,
    });
    expect(list.body.totals).toMatchObject({ usedMinutes: expect.any(Number), costUsd: expect.any(Number) });

    const sync = await SyncClient.user(s, member, 2);
    const put = await api(s, 'PUT', `/admin/voice/${member.userId}`, { ...as(ownerAdmin), body: { enabled: true, monthlyMinutes: 1 } });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ enabled: true, monthlyMinutes: 1, customMinutes: true });
    expect(await sync.next((m) => m.type === 'account_changed' && m.what.includes('voice'), 5000, true)).toEqual({ type: 'account_changed', what: ['voice'] });
    sync.close();

    // The new quota counts at once: 61.5 s go through, then the minute is used up.
    expect((await transcribe(member, { mode: 'conversation' })).status).toBe(200);
    expect((await json(await transcribe(member, { mode: 'conversation' }))).error.code).toBe('voice_quota');
    // Usage and cost show up: transcription estimated from the duration, text from OpenRouter.
    expect((await text(member, { task: 'clean', profanity: 'keep', text: 'a' })).status).toBe(200);
    const after = (await api(s, 'GET', '/admin/voice', as(ownerAdmin))).body.accounts.find((a: any) => a.userId === member.userId);
    expect(after).toMatchObject({ usedMinutes: 1, requests: 2 });
    expect(after.costUsd).toBeCloseTo(61.5 / 3600 * 0.4 + 0.0042, 4);

    // Back to the default minutes; switched off: 403 again.
    await api(s, 'PUT', `/admin/voice/${member.userId}`, { ...as(ownerAdmin), body: { enabled: false, monthlyMinutes: null } });
    const me = await api(s, 'GET', '/voice/me', as(member));
    expect(me.body).toMatchObject({ enabled: false, monthlyMinutes: 120 });
    expect((await transcribe(member, { mode: 'dictation' })).status).toBe(403);
    expect((await api(s, 'PUT', `/admin/voice/${'0'.repeat(8)}-0000-7000-8000-000000000000`, { ...as(ownerAdmin), body: { enabled: true } })).status).toBe(404);
  });
});

/** The admin of the main test server (`owner@example.com` is in DS_ADMIN_EMAILS), signed up once. */
let adminUser: Promise<TestUser> | null = null;
function getAdmin(): Promise<TestUser> {
  adminUser ??= signup(s, 'owner@example.com', address());
  return adminUser;
}
