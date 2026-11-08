// Prompts of the text AI for voice (D-65): the server builds them from a `POST /voice/text`
// request and sends them to the configured model. Russian, because the notes are.
import { DEFAULT_VOICE_STYLE } from "../contracts/voice.js";
import type {
  VoiceProfanity,
  VoiceStyle,
  VoiceTextRequest,
  VoiceTextTask,
  VoiceTurn,
} from "../contracts/voice.js";

/** "S1" → "Собеседник 1". */
export function speakerLabel(speaker: string): string {
  const n = /^S(\d+)$/.exec(speaker)?.[1];
  return n ? `Собеседник ${n}` : speaker;
}

/** Seconds → "мм:сс" (or "ч:мм:сс" from one hour), the timestamps of a cleaned transcript. */
export function formatVoiceTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

/**
 * The transcript as the model reads it: one line per turn. With one speaker (dictation) — plain
 * lines; with several — «**Собеседник N:** …». `timestamps` prefixes each line with «[мм:сс]».
 */
export function turnsToTranscript(
  turns: VoiceTurn[],
  options: { timestamps?: boolean } = {},
): string {
  const many = new Set(turns.map((t) => t.speaker)).size > 1;
  return turns
    .map((t) => {
      const time = options.timestamps ? `[${formatVoiceTime(t.start)}] ` : "";
      const who = many ? `**${speakerLabel(t.speaker)}:** ` : "";
      return `${time}${who}${t.text.trim()}`;
    })
    .join("\n");
}

/**
 * Rules for every task (D-65) — the prompts tested in the bake-off (4 recordings; gpt-5.6-luna,
 * DeepSeek and Sonnet passed), verbatim. The profanity line is added only for `soften`.
 */
export const VOICE_RULES_HEAD = `Ты обрабатываешь расшифровку живой речи на русском. Строгие правила:
- Ничего не выдумывай. Только то, что было сказано. Если что-то неразборчиво — так и пиши «(неразборчиво)».
- Не меняй смысл. Ошибки распознавания исправляй, только если по контексту очевидно, какое слово имелось в виду.`;
export const VOICE_RULE_SOFTEN =
  "- Мат и грубость в чистом тексте смягчай до нейтральных формулировок, не теряя смысла.";
export const VOICE_RULES_TAIL = "- Пиши по-русски, Markdown.";

/** The rules for a request: head, the profanity line when softening, tail. */
export function voiceRules(profanity: VoiceProfanity = "soften"): string {
  return [
    VOICE_RULES_HEAD,
    ...(profanity === "soften" ? [VOICE_RULE_SOFTEN] : []),
    VOICE_RULES_TAIL,
  ].join("\n");
}
/** The rules with softening (the default). */
export const VOICE_RULES = voiceRules("soften");

const MARKDOWN = `Формат — Markdown заметки Datascratch: заголовки \`#\`, \`##\`, \`###\`; списки \`-\` и \`1.\`; задачи \`- [ ] …\`; таблицы GitHub; **жирный**, *курсив*. Без HTML. Отвечай только готовым текстом, без вступлений и пояснений.`;

const TASKS: Record<VoiceTextTask, string> = {
  // Tested verbatim (bake-off).
  clean: `Задача: ЧИСТЫЙ ТЕКСТ. Убери слова-паразиты (ээ, ну, как бы, типа, короче, знаешь), повторы, оговорки и обрывы. Расставь пунктуацию и абзацы. Если говорят несколько человек — сохрани реплики по собеседникам («**Собеседник 1:** …»). Больше ничего не добавляй.`,
  // Tested verbatim (bake-off).
  minutes: `Задача: ПРОТОКОЛ. Сделай структурированный документ:
## Коротко — 1–2 предложения, о чём разговор.
## Решения — что в итоге решили (только окончательное).
## Передумали — что сначала решили, а потом отменили или изменили: «было → стало», и почему, если сказано.
## Договорились не делать — с причиной.
## Задачи — список задач \`- [ ] кто — что — к какому сроку\`, только если они прозвучали.
## Открытые вопросы — если есть.
## Главное — 3–6 ключевых мыслей.
Пустые разделы пропусти. Если это не разговор о делах, а, например, рассказ или бытовая сцена — оформи «Коротко» и «Главное», а остальные разделы не придумывай. Вместо speaker_0/1 пиши «Собеседник 1/2» или имя, если оно прозвучало.`,
  format: `Задача: ОФОРМИТЬ. Из черновика сделай документ выбранного вида: заголовки, списки, таблицы и задачи там, где они помогают читать. Сохрани всё содержание черновика; можно переставлять и группировать, нельзя добавлять новое.`,
};

/** Only when the transcript carries «[мм:сс]» (phase 2). */
const KEEP_TIMESTAMPS =
  "Метки времени «[мм:сс]» в начале реплик сохраняй в начале соответствующих абзацев.";

const STYLES: Record<VoiceStyle, string> = {
  document:
    "Вид: документ — заголовок по сути, разделы с подзаголовками там, где тем несколько; списки, таблицы и задачи там, где они помогают читать.",
  plan: "Вид: план — цели, шаги по порядку (нумерованный список или задачи), сроки и ответственные, если они есть в тексте.",
  minutes:
    "Вид: протокол встречи — участники и тема (если названы), решения, задачи «- [ ] кто — что — срок», открытые вопросы.",
  article:
    "Вид: статья — заголовок, короткое вступление, разделы с подзаголовками, связный текст абзацами.",
  letter:
    "Вид: письмо — обращение, суть по абзацам, просьба или итог, подпись (только если имя есть в тексте).",
  notes: "Вид: конспект — тезисы по темам, короткие пункты, ключевые термины жирным.",
};

export interface VoicePrompt {
  system: string;
  user: string;
}

/** The prompt for a `POST /voice/text` request (validated by voiceTextRequestSchema). */
export function buildVoiceTextPrompt(
  req: Pick<VoiceTextRequest, "task" | "style" | "profanity" | "turns" | "text">,
  options: { timestamps?: boolean } = {},
): VoicePrompt {
  const parts = [voiceRules(req.profanity ?? "soften"), TASKS[req.task]];
  if (options.timestamps && req.turns) parts.push(KEEP_TIMESTAMPS);
  if (req.task === "format") parts.push(STYLES[req.style ?? DEFAULT_VOICE_STYLE]);
  parts.push(MARKDOWN);
  const input = req.turns ? turnsToTranscript(req.turns, options) : (req.text ?? "");
  const label = req.turns ? "Расшифровка" : "Черновик";
  return { system: parts.join("\n\n"), user: `${label}:\n\n${input}` };
}
