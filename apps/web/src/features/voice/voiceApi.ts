import type {
  AdminVoiceAccount,
  AdminVoiceResponse,
  PutAdminVoiceRequest,
  VoiceMe,
  VoiceMode,
  VoiceTextRequest,
  VoiceTextResponse,
  VoiceTranscribeResponse,
  VoiceTurn,
} from "@datascratch/shared/voice";
import { request } from "@/api/client";

// D-65 «Голос» (api.md «Голос», `@datascratch/shared/voice`).

export type { VoiceProfanity, VoiceQuality, VoiceStyle, VoiceTurn } from "@datascratch/shared/voice";

export type MyVoice = VoiceMe;
export type AdminVoiceRow = AdminVoiceAccount;
export type AdminVoice = AdminVoiceResponse;
export type AdminVoicePut = PutAdminVoiceRequest;
export { DEFAULT_VOICE_MONTHLY_MINUTES, DEFAULT_VOICE_STYLE, VOICE_AGENT_ID, VOICE_STYLES } from "@datascratch/shared/voice";

export const voiceApi = {
  /** Audio → words (the server passes it to the speech service and keeps nothing). */
  transcribe(audio: Blob, mode: VoiceMode, signal?: AbortSignal): Promise<VoiceTranscribeResponse> {
    const form = new FormData();
    form.append("mode", mode);
    form.append("language", "ru");
    form.append("audio", audio, `voice.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
    return request<VoiceTranscribeResponse>("POST", "/voice/transcribe", { body: form, signal, timeoutMs: 180_000 });
  },
  /** Words → tidy text (clean), minutes, or a formatted version (format) as Markdown. */
  text(req: VoiceTextRequest, signal?: AbortSignal): Promise<VoiceTextResponse> {
    return request<VoiceTextResponse>("POST", "/voice/text", { body: req, signal, timeoutMs: 180_000 });
  },
  /** This account's access and what is left this month. */
  me: () => request<MyVoice>("GET", "/voice/me"),
  /** Server admin only (others get 403): every account's access and use, and the month's totals. */
  adminList: () => request<AdminVoice>("GET", "/admin/voice"),
  /** `monthlyMinutes: null` puts the account back on the default limit. */
  adminPut: (userId: string, body: AdminVoicePut) => request<AdminVoiceRow>("PUT", `/admin/voice/${userId}`, { body }),
};

/** The spoken words as one plain text, speakers kept apart by paragraphs. */
export const turnsText = (turns: VoiceTurn[]) =>
  turns
    .map((t) => t.text.trim())
    .filter(Boolean)
    .join("\n\n");
