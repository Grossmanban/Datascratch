// Prompts of the text AI for voice (D-65): the server builds them from a `POST /voice/text`
// request and sends them to the configured model. Russian, because the notes are.
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

/** Rules for every task (D-65). */
export const VOICE_RULES = `Правила, которые важнее всего остального:
1. Ничего не выдумывай. Не добавляй фактов, имён, цифр, дат, выводов и задач, которых нет в исходном тексте.
2. Не меняй смысл. Если человек передумал или поправил себя, сохраняй то, к чему он пришёл в итоге.
3. Ошибки распознавания речи исправляй, только когда по контексту правильное слово очевидно. Если не очевидно — оставь как есть.
4. Если место нельзя понять, напиши «(неразборчиво)» и не угадывай.
5. Пиши на языке исходного текста.
6. Отвечай только готовым текстом в Markdown — без вступлений, пояснений и обрамления \`\`\`.`;

const PROFANITY: Record<VoiceProfanity, string> = {
  keep: "Ненормативную лексику оставляй как есть.",
  soften:
    "Ненормативную лексику смягчай: заменяй нейтральными словами того же смысла, не теряя оттенка (досада, удивление, резкая оценка).",
};

const MARKDOWN = `Формат — Markdown заметки Datascratch: заголовки \`#\`, \`##\`, \`###\`; списки \`-\` и \`1.\`; задачи \`- [ ] …\`; таблицы GitHub; **жирный**, *курсив*. Без HTML.`;

const TASKS: Record<VoiceTextTask, string> = {
  clean: `Задача: превратить расшифровку речи в аккуратный текст.
- Убери слова-паразиты («ну», «как бы», «короче», «э-э», «типа» и т. п.), повторы и оговорки.
- Расставь знаки препинания, раздели на абзацы по смыслу.
- Если говорят несколько человек, каждую реплику начинай с «**Собеседник N:**» (номер — как во входном тексте; если в разговоре прозвучали имена и ясно, кто есть кто, используй имена).
- Если в начале строк стоят метки времени «[мм:сс]», сохраняй их в начале соответствующих абзацев.
- Не сокращай содержание и не пересказывай: это та же речь, только чистая.`,
  minutes: `Задача: составить по расшифровке разговора краткий итог (протокол).
Разделы, в таком порядке:
## Коротко — 2–4 предложения: о чём разговор и чем закончился.
## Решения — что решили.
## Передумали — что сначала решили иначе: «было → стало, почему».
## Договорились не делать — от чего отказались.
## Задачи — списком «- [ ] кто — что — срок»; если кто или срок не прозвучали, пропусти эту часть, не выдумывай.
## Открытые вопросы — что осталось нерешённым.
## Главное — одна-две самые важные мысли разговора.
Пустые разделы пропускай целиком. Если это не рабочее обсуждение, а бытовая сцена или рассказ — только «Коротко» и «Главное».
Участников называй «Собеседник 1», «Собеседник 2» или по именам, если они прозвучали; никогда не пиши «speaker_0», «S1» и т. п.`,
  format: `Задача: оформить черновик в документ выбранного вида.
Используй заголовки, списки, таблицы и задачи там, где они помогают читать. Сохрани всё содержание черновика и его порядок по смыслу; можно переставлять и группировать, нельзя добавлять новое.`,
};

const STYLES: Record<VoiceStyle, string> = {
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
  const parts = [
    "Ты помогаешь вести заметки: обрабатываешь расшифровки речи и черновики пользователя.",
    VOICE_RULES,
    PROFANITY[req.profanity],
    TASKS[req.task],
  ];
  if (req.task === "format" && req.style) parts.push(STYLES[req.style]);
  parts.push(MARKDOWN);
  const input = req.turns ? turnsToTranscript(req.turns, options) : (req.text ?? "");
  const label = req.turns ? "Расшифровка" : "Черновик";
  return { system: parts.join("\n\n"), user: `${label}:\n\n${input}` };
}
