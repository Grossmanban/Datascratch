import { describe, expect, it } from "vitest";
import {
  API_ERROR_CODES,
  buildVoiceTextPrompt,
  splitVoiceTitle,
  voiceTextResponseSchema,
  VOICE_TITLE_RULE,
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

  it("needs exactly one of turns or text; style only for format; defaults", () => {
    const ok = (b: unknown) => voiceTextRequestSchema.safeParse(b).success;
    expect(ok({ task: "clean", profanity: "keep", turns })).toBe(true);
    expect(ok({ task: "minutes", profanity: "soften", quality: "best", turns })).toBe(true);
    expect(ok({ task: "format", style: "letter", profanity: "keep", text: "черновик" })).toBe(true);
    expect(ok({ task: "format", text: "черновик" })).toBe(true);
    expect(ok({ task: "clean", style: "plan", text: "x" })).toBe(false);
    expect(ok({ task: "format", style: "poem", text: "x" })).toBe(false);
    expect(voiceTextRequestSchema.parse({ task: "clean", text: "x" }).profanity).toBe("soften");
    expect(ok({ task: "clean", profanity: "keep" })).toBe(false);
    expect(ok({ task: "clean", profanity: "keep", turns, text: "x" })).toBe(false);
    expect(
      voiceTextRequestSchema.parse({ task: "clean", profanity: "keep", text: "x" }).quality,
    ).toBe("standard");
    expect(API_ERROR_CODES).toEqual(
      expect.arrayContaining([
        "voice_disabled",
        "voice_quota",
        "voice_too_long",
        "voice_upstream",
        "voice_unavailable",
      ]),
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
    expect(clean.system).toContain("Ничего не выдумывай. Только то, что было сказано.");
    expect(clean.system).toContain("ЧИСТЫЙ ТЕКСТ");
    expect(clean.system).toContain("(неразборчиво)");
    expect(clean.system).toContain("Мат и грубость");
    expect(clean.system).toContain("**Собеседник 1:**");
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
    expect(minutes.system).not.toContain("Мат и грубость");
    const format = buildVoiceTextPrompt({
      task: "format",
      style: "plan",
      profanity: "keep",
      text: "купить, позвонить",
    });
    expect(format.system).toContain("Вид: план");
    expect(buildVoiceTextPrompt({ task: "format", text: "x" }).system).toContain("Вид: документ");
    expect(buildVoiceTextPrompt({ task: "clean", text: "x" }).system).toContain("Мат и грубость");
    expect(format.user).toBe("Черновик:\n\nкупить, позвонить");
    expect(format.system).toContain(VOICE_TITLE_RULE);
    expect(minutes.system).toContain(VOICE_TITLE_RULE);
    expect(clean.system).not.toContain("Первой строкой");
    expect(VOICE_TITLE_RULE).toContain("до 8 слов");
  });

  it("cuts the suggested title out of the answer", () => {
    expect(splitVoiceTitle("# План переезда\n\n## Шаги\n\n1. Коробки")).toEqual({
      title: "План переезда",
      markdown: "## Шаги\n\n1. Коробки",
    });
    expect(splitVoiceTitle("\n# «Встреча по бюджету».\r\nТекст")).toEqual({
      title: "Встреча по бюджету",
      markdown: "Текст",
    });
    expect(splitVoiceTitle("# **Итоги** #\nx").title).toBe("Итоги");
    expect(splitVoiceTitle("## Коротко\nx")).toEqual({ markdown: "## Коротко\nx" });
    expect(splitVoiceTitle("Текст\n# Не первая строка")).toEqual({
      markdown: "Текст\n# Не первая строка",
    });
    expect(splitVoiceTitle("#   \nтекст")).toEqual({ markdown: "текст" });
    expect(splitVoiceTitle("# Одна строка")).toEqual({ title: "Одна строка", markdown: "" });
    const long = splitVoiceTitle(`# ${"слово ".repeat(30)}\nx`).title!;
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith(" ")).toBe(false);
    const ok = (b: unknown) => voiceTextResponseSchema.safeParse(b).success;
    expect(ok({ markdown: "x", model: "m", title: "План" })).toBe(true);
    expect(ok({ markdown: "x", model: "m" })).toBe(true);
    expect(ok({ markdown: "x", model: "m", title: "План." })).toBe(false);
    expect(ok({ markdown: "x", model: "m", title: "" })).toBe(false);
    expect(ok({ markdown: "x", model: "m", title: "я".repeat(81) })).toBe(false);
  });
});

describe("voice access (D-65)", () => {
  it("parses /voice/me, the admin list and the admin update", async () => {
    const {
      voiceMeSchema,
      adminVoiceAccountSchema,
      adminVoiceResponseSchema,
      putAdminVoiceRequestSchema,
      DEFAULT_VOICE_MONTHLY_MINUTES,
      ACCOUNT_CHANGES,
    } = await import("../src/index.js");
    const me = {
      enabled: true,
      available: true,
      monthlyMinutes: 600,
      usedMinutes: 12.5,
      resetsAt: "2026-12-01T00:00:00.000Z",
      isAdmin: false,
    };
    expect(voiceMeSchema.safeParse(me).success).toBe(true);
    const { isAdmin: _isAdmin, ...withoutAdmin } = me;
    expect(voiceMeSchema.safeParse(withoutAdmin).success).toBe(false);
    const account = {
      userId: "0192f3c4-0000-7000-8000-00000000f101",
      email: "a@b.co",
      name: null,
      admin: false,
      enabled: true,
      monthlyMinutes: 120,
      customMinutes: false,
      usedMinutes: 30,
      costUsd: 0.21,
      requests: 4,
    };
    const list = {
      month: "2026-11",
      resetsAt: "2026-12-01T00:00:00.000Z",
      accounts: [account],
      totals: { usedMinutes: 30, costUsd: 0.21, requests: 4, enabledAccounts: 1 },
    };
    expect(adminVoiceResponseSchema.safeParse(list).success).toBe(true);
    expect(adminVoiceResponseSchema.safeParse({ ...list, month: "11-2026" }).success).toBe(false);
    expect(adminVoiceAccountSchema.safeParse({ ...account, customMinutes: 120 }).success).toBe(
      false,
    );
    const put = (b: unknown) => putAdminVoiceRequestSchema.safeParse(b).success;
    expect(put({ enabled: false, monthlyMinutes: 0 })).toBe(true);
    expect(put({ enabled: true, monthlyMinutes: null })).toBe(true);
    expect(put({ enabled: true })).toBe(true);
    expect(put({ enabled: true, monthlyMinutes: -1 })).toBe(false);
    expect(DEFAULT_VOICE_MONTHLY_MINUTES).toEqual({ admin: 600, others: 120 });
    expect(ACCOUNT_CHANGES).toContain("voice");
  });
});
