// Voice (D-65, api.md «Голос»): recognition of dictation and conversations and the text AI
// over it. The server proxies both (the keys stay on the server); audio and text pass through
// it in memory and are not stored or logged.
import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "./common.js";

export const VOICE_MODES = ["dictation", "conversation"] as const;
export type VoiceMode = (typeof VOICE_MODES)[number];
export const VOICE_LANGUAGES = ["ru", "auto"] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

/** Accepted audio types of `POST /voice/transcribe` (m4a/mp4, webm, ogg, wav). */
export const VOICE_AUDIO_MIME = [
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "video/mp4",
  "audio/webm",
  "video/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
] as const;
export const MAX_VOICE_AUDIO_BYTES = 200 * 1024 * 1024;
export const MAX_VOICE_DURATION_SEC = 3 * 60 * 60;
export const MAX_VOICE_SPEAKERS = 8;

/**
 * Text fields of the multipart `POST /voice/transcribe` (the file is the part `audio`).
 * Multipart values are strings: `speakers` is parsed as an integer.
 */
export const voiceTranscribeFieldsSchema = z.object({
  mode: z.enum(VOICE_MODES),
  /** Expected number of speakers, a hint for conversations (1–8). */
  speakers: z.coerce.number().int().min(1).max(MAX_VOICE_SPEAKERS).optional(),
  language: z.enum(VOICE_LANGUAGES).default("ru"),
});
export type VoiceTranscribeFields = z.infer<typeof voiceTranscribeFieldsSchema>;

/** A speaker of a transcript: "S1", "S2", … in order of first appearance. */
export const voiceSpeakerSchema = z.string().regex(/^S[1-9][0-9]?$/);

export const voiceTurnSchema = z
  .object({
    speaker: voiceSpeakerSchema,
    /** Seconds from the start of the recording. */
    start: z.number().nonnegative(),
    end: z.number().nonnegative(),
    text: z.string(),
  })
  .refine((t) => t.end >= t.start, { message: "end before start", path: ["end"] });
export type VoiceTurn = z.infer<typeof voiceTurnSchema>;

export const voiceTranscribeResponseSchema = z.object({
  durationSec: z.number().nonnegative(),
  /** Dictation: one speaker ("S1"). */
  turns: z.array(voiceTurnSchema),
});
export type VoiceTranscribeResponse = z.infer<typeof voiceTranscribeResponseSchema>;

export const VOICE_TEXT_TASKS = ["clean", "minutes", "format"] as const;
export type VoiceTextTask = (typeof VOICE_TEXT_TASKS)[number];
export const VOICE_STYLES = ["document", "plan", "minutes", "article", "letter", "notes"] as const;
export type VoiceStyle = (typeof VOICE_STYLES)[number];
export const VOICE_PROFANITY = ["soften", "keep"] as const;
export type VoiceProfanity = (typeof VOICE_PROFANITY)[number];
export const VOICE_QUALITY = ["standard", "best"] as const;
export type VoiceQuality = (typeof VOICE_QUALITY)[number];

/** Limits of `POST /voice/text` input (about 3 h of speech). */
export const MAX_VOICE_TEXT_CHARS = 400_000;
export const MAX_VOICE_TURNS = 20_000;

/**
 * `POST /voice/text`: exactly one of `turns` (a transcript) or `text` (a draft or a note).
 * `style` is for `format` only (default `document`); `profanity` defaults to `soften`.
 */
export const voiceTextRequestSchema = z
  .object({
    task: z.enum(VOICE_TEXT_TASKS),
    style: z.enum(VOICE_STYLES).optional(),
    profanity: z.enum(VOICE_PROFANITY).default("soften"),
    quality: z.enum(VOICE_QUALITY).default("standard"),
    turns: z.array(voiceTurnSchema).min(1).max(MAX_VOICE_TURNS).optional(),
    text: z.string().min(1).max(MAX_VOICE_TEXT_CHARS).optional(),
  })
  .refine((b) => (b.turns === undefined) !== (b.text === undefined), {
    message: "exactly one of turns or text",
    path: ["text"],
  })
  .refine((b) => b.task === "format" || b.style === undefined, {
    message: "style is for format only",
    path: ["style"],
  })
  .refine(
    (b) => !b.turns || b.turns.reduce((n, t) => n + t.text.length, 0) <= MAX_VOICE_TEXT_CHARS,
    { message: "transcript too long", path: ["turns"] },
  );
export type VoiceTextRequest = z.input<typeof voiceTextRequestSchema>;

export const voiceTextResponseSchema = z.object({
  /** Datascratch Markdown (the dialect agents import, agents-api.md §4). */
  markdown: z.string(),
  /** The model that wrote it (OpenRouter id), for the note's history. */
  model: z.string().min(1),
});
export type VoiceTextResponse = z.infer<typeof voiceTextResponseSchema>;

/**
 * Text models (OpenRouter ids) — the one configuration line of D-65; the server may override it.
 * `best` is the «Лучшее качество» setting.
 */
export const DEFAULT_VOICE_TEXT_MODELS: Readonly<Record<VoiceQuality, string>> = Object.freeze({
  standard: "openai/gpt-5.6-luna",
  best: "anthropic/claude-sonnet-5.5",
});

/** The default `style` of `format`. */
export const DEFAULT_VOICE_STYLE: VoiceStyle = "document";

/**
 * Author of text written by voice (D-65): the result is highlighted with the `agentEdit` mark
 * (D-10) with this `agentId`; clients label it «Голос».
 */
export const VOICE_AGENT_ID = "voice";

// --- Access and quota (D-65: managed by the server admin, per account, months by UTC) -------

/** `GET /voice/me`: whether to show the voice button and «N min left». */
export const voiceMeSchema = z.object({
  enabled: z.boolean(),
  /** The server has the keys of both services (recognition and text). */
  available: z.boolean(),
  /** Minutes of recognition per calendar month (UTC). */
  monthlyMinutes: z.number().int().nonnegative(),
  usedMinutes: z.number().nonnegative(),
  /** Start of the next month, UTC. */
  resetsAt: isoDateTimeSchema,
  /** A server admin: may open the voice access screen (`GET /admin/voice`). */
  admin: z.boolean(),
});
export type VoiceMe = z.infer<typeof voiceMeSchema>;

/** An account of `GET /admin/voice` and the response of `PUT /admin/voice/:userId` (server admin only). */
export const adminVoiceAccountSchema = z.object({
  userId: uuidSchema,
  email: z.string(),
  /** Display name, if the account has one (the server sends null for now). */
  name: z.string().nullable(),
  /** The account is a server admin. */
  admin: z.boolean(),
  enabled: z.boolean(),
  /** Effective monthly minutes: the admin's own value or the default. */
  monthlyMinutes: z.number().int().nonnegative(),
  /** false: the server default for this account (admin or not); true: set by an admin. */
  customMinutes: z.boolean(),
  /** This month (UTC). */
  usedMinutes: z.number().nonnegative(),
  /** What this account's voice cost this month (recognition + text), US dollars. */
  costUsd: z.number().nonnegative(),
  /** Voice requests this month (`transcribe` and `text`). */
  requests: z.number().int().nonnegative(),
});
export type AdminVoiceAccount = z.infer<typeof adminVoiceAccountSchema>;

/** `GET /admin/voice`: all accounts and this month's totals (UTC month). */
export const adminVoiceResponseSchema = z.object({
  /** "YYYY-MM", UTC. */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  resetsAt: isoDateTimeSchema,
  accounts: z.array(adminVoiceAccountSchema),
  totals: z.object({
    usedMinutes: z.number().nonnegative(),
    costUsd: z.number().nonnegative(),
    requests: z.number().int().nonnegative(),
    enabledAccounts: z.number().int().nonnegative(),
  }),
});
export type AdminVoiceResponse = z.infer<typeof adminVoiceResponseSchema>;

/** Default monthly minutes (D-65): server admins and other accounts, unless an admin set the account's own. */
export const DEFAULT_VOICE_MONTHLY_MINUTES = Object.freeze({ admin: 600, others: 120 });

/**
 * `PUT /admin/voice/:userId` → the account row (`adminVoiceAccountSchema`).
 * `monthlyMinutes`: a number sets the account's own minutes, `null` returns to the default,
 * an absent field leaves them as they are.
 */
export const putAdminVoiceRequestSchema = z.object({
  enabled: z.boolean(),
  monthlyMinutes: z.number().int().nonnegative().max(100_000).nullable().optional(),
});
export type PutAdminVoiceRequest = z.infer<typeof putAdminVoiceRequestSchema>;
