import { describe, expect, it } from "vitest";
import {
  API_ERROR_CODES,
  buildVoiceTextPrompt,
  formatVoiceTime,
  speakerLabel,
  turnsToTranscript,
  voiceTextRequestSchema,
  voiceTranscribeFieldsSchema,
  voiceTranscribeResponseSchema,
} from "../src/index.js";

const turns = [
  { speaker: "S1", start: 0, end: 4.2, text: "ну короче давай во вторник" },
  { speaker: "S2", start: 4.5, end: 9, text: " нет, лучше в среду " },
  { speaker: "S1", start: 3725.4, end: 3730, text: "ладно, в среду" },
];

describe("voice schemas (D-65)", () => {
  it("parses multipart fields and transcripts", () => {
    expect(voiceTranscribeFieldsSchema.parse({ mode: "conversation", speakers: "3" })).toEqual({
      mode: "conversation",
      speakers: 3,
      language: "ru",
    });
    expect(
      voiceTranscribeFieldsSchema.safeParse({ mode: "dictation", speakers: "9" }).success,
    ).toBe(false);
    expect(voiceTranscribeFieldsSchema.safeParse({ mode: "podcast" }).success).toBe(false);
    expect(voiceTranscribeResponseSchema.safeParse({ durationSec: 9, turns }).success).toBe(true);
    expect(
      voiceTranscribeResponseSchema.safeParse({
        durationSec: 1,
        turns: [{ speaker: "speaker_0", start: 0, end: 1, text: "" }],
      }).success,
    ).toBe(false);
    expect(
      voiceTranscribeResponseSchema.safeParse({
        durationSec: 1,
        turns: [{ speaker: "S1", start: 2, end: 1, text: "" }],
      }).success,
    ).toBe(false);
  });

  it("needs exactly one of turns or text, and a style for format", () => {
    const ok = (b: unknown) => voiceTextRequestSchema.safeParse(b).success;
    expect(ok({ task: "clean", profanity: "keep", turns })).toBe(true);
    expect(ok({ task: "minutes", profanity: "soften", quality: "best", turns })).toBe(true);
    expect(ok({ task: "format", style: "letter", profanity: "keep", text: "черновик" })).toBe(true);
    expect(ok({ task: "format", profanity: "keep", text: "черновик" })).toBe(false);
    expect(ok({ task: "clean", profanity: "keep" })).toBe(false);
    expect(ok({ task: "clean", profanity: "keep", turns, text: "x" })).toBe(false);
    expect(
      voiceTextRequestSchema.parse({ task: "clean", profanity: "keep", text: "x" }).quality,
    ).toBe("standard");
    expect(API_ERROR_CODES).toEqual(
      expect.arrayContaining(["voice_disabled", "voice_quota", "voice_upstream"]),
    );
  });
});

describe("voice prompts (D-65)", () => {
  it("formats times, speakers and the transcript", () => {
    expect(formatVoiceTime(0)).toBe("00:00");
    expect(formatVoiceTime(65.9)).toBe("01:05");
    expect(formatVoiceTime(3725.4)).toBe("1:02:05");
    expect(speakerLabel("S2")).toBe("Собеседник 2");
    expect(turnsToTranscript(turns)).toBe(
      "**Собеседник 1:** ну короче давай во вторник\n**Собеседник 2:** нет, лучше в среду\n**Собеседник 1:** ладно, в среду",
    );
    expect(turnsToTranscript([turns[0]!], { timestamps: true })).toBe(
      "[00:00] ну короче давай во вторник",
    );
  });

  it("builds the task prompts with the shared rules", () => {
    const clean = buildVoiceTextPrompt({ task: "clean", profanity: "soften", turns });
    expect(clean.system).toContain("Ничего не выдумывай");
    expect(clean.system).toContain("(неразборчиво)");
    expect(clean.system).toContain("смягчай");
    expect(clean.system).toContain("**Собеседник N:**");
    expect(clean.user.startsWith("Расшифровка:")).toBe(true);
    const minutes = buildVoiceTextPrompt({ task: "minutes", profanity: "keep", turns });
    for (const section of [
      "Коротко",
      "Решения",
      "Передумали",
      "Договорились не делать",
      "Задачи",
      "Открытые вопросы",
      "Главное",
    ])
      expect(minutes.system).toContain(`## ${section}`);
    expect(minutes.system).toContain("speaker_0");
    expect(minutes.system).not.toContain("смягчай");
    const format = buildVoiceTextPrompt({
      task: "format",
      style: "plan",
      profanity: "keep",
      text: "купить, позвонить",
    });
    expect(format.system).toContain("Вид: план");
    expect(format.user).toBe("Черновик:\n\nкупить, позвонить");
  });
});
