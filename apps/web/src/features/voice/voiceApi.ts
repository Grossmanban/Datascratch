import { request } from "@/api/client";

// D-65 «Голос», phase 1 (api.md «Голос»). Local types until packages/shared/src/voice lands in
// main; then these become re-exports of core's.

export type VoiceTurn = { speaker?: string | null; text: string; start?: number; end?: number };
export type TranscribeResult = { durationSec: number; turns: VoiceTurn[] };
export type VoiceTask = "clean" | "minutes" | "format";
export type VoiceQuality = "fast" | "best";
export type VoiceProfanity = "keep" | "mask";
export type TextRequest = {
  task: VoiceTask;
  style?: string;
  profanity?: VoiceProfanity;
  quality?: VoiceQuality;
} & ({ text: string } | { turns: VoiceTurn[] });

export const voiceApi = {
  /** Audio → words (the server passes it to the speech service and keeps nothing). */
  transcribe(audio: Blob, mode: string, signal?: AbortSignal): Promise<TranscribeResult> {
    const form = new FormData();
    form.append("mode", mode);
    form.append("audio", audio, `voice.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
    return request<TranscribeResult>("POST", "/voice/transcribe", { body: form, signal, timeoutMs: 120_000 });
  },
  /** Words → tidy text (clean), minutes, or a formatted version (format) as markdown. */
  text(req: TextRequest, signal?: AbortSignal): Promise<{ markdown: string }> {
    return request<{ markdown: string }>("POST", "/voice/text", { body: req, signal, timeoutMs: 120_000 });
  },
};

/** The spoken words as one plain text, speakers kept apart by paragraphs. */
export const turnsText = (turns: VoiceTurn[]) =>
  turns
    .map((t) => t.text.trim())
    .filter(Boolean)
    .join("\n\n");
