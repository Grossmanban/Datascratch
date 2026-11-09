// Vectors for voice (D-65): the timestamps «[мм:сс]» of a cleaned transcript; the suggested title.
import { formatVoiceTime, speakerLabel, splitVoiceTitle } from "@datascratch/shared/voice";

export function voiceVectors() {
  const secs = [0, 0.9, 5, 59.99, 60, 65.9, 599, 3599, 3600, 3725.4, 10800];
  const answers = [
    "# План переезда\n\n## Шаги\n\n1. Коробки",
    "\n# «Встреча по бюджету».\r\nТекст",
    "# **Итоги** #\nx",
    "## Коротко\nx",
    "Текст\n# Не первая строка",
    "#   \nтекст",
    "# Одна строка",
    `# ${"слово ".repeat(30)}\nx`,
  ];
  return {
    "voice/timestamps.json": {
      description:
        "Voice (D-65): seconds → the «мм:сс» timestamp (from one hour «ч:мм:сс»), seconds rounded down; speaker ids S<n> → «Собеседник <n>».",
      timestamps: secs.map((sec) => ({ sec, text: formatVoiceTime(sec) })),
      speakers: ["S1", "S2", "S8"].map((id) => ({ id, label: speakerLabel(id) })),
    },
    "voice/titles.json": {
      description:
        "Voice (D-65): the model's answer → the suggested title (first non-empty line «# …», quotes, bold, closing # and trailing full stops removed, ≤ 80 chars at a word boundary) and the markdown without it; no «# » first line — no title.",
      cases: answers.map((answer) => ({ answer, ...splitVoiceTitle(answer) })),
    },
  };
}
