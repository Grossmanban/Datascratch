import type { JSONContent } from "@tiptap/core";

const t = (text: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text, ...(marks ? { marks } : {}) });
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });

export const SAMPLE_CONTENT: JSONContent = {
  type: "doc",
  content: [
    { type: "title", content: [t("Живой штрих")] },
    p(
      t("Возьмите стилус и подчеркните "),
      t("любую фразу", [{ type: "bold" }]),
      t(" в этом абзаце. Штрих привязан к буквам, а не к экрану: поменяйте ширину окна ползунком сверху, и он переложится вместе с текстом, а на переносе строки разрежется на части."),
    ),
    p(
      t("Мышью или пальцем рисуйте, включив кнопку "),
      t("☝︎", [{ type: "code" }]),
      t(" в палитре. Сотрите слово с пометкой — пометка исчезнет вместе с ним (D-35); отмените удаление — вернётся и она."),
    ),
    { type: "heading", attrs: { level: 2 }, content: [t("Задачи")] },
    {
      type: "taskList",
      content: [
        { type: "taskItem", attrs: { state: "open", scheduled: new Date().toISOString().slice(0, 10) }, content: [p(t("Проверить ощущение пера на iPad"))] },
        { type: "taskItem", attrs: { state: "done" }, content: [p(t("Собрать витрину редактора"))] },
        { type: "taskItem", attrs: { state: "open", deadline: "2026-11-01" }, content: [p(t("Обсудить обводки вокруг нескольких слов"))] },
      ],
    },
    { type: "callout", attrs: { tone: "info", emoji: null }, content: [p(t("Наберите «/», чтобы вставить блок: таблицу, формулу, диаграмму, рисунок, картинку."))] },
    { type: "heading", attrs: { level: 2 }, content: [t("Блоки")] },
    { type: "mathBlock", attrs: { latex: "\\int_0^1 x^2\\,dx = \\tfrac{1}{3}" } },
    { type: "codeBlock", attrs: { language: "ts" }, content: [t("const stroke = bindToText(points, lines);\n// each point: (anchor, dx, dy) in em")] },
    {
      type: "table",
      content: [
        { type: "tableRow", content: [{ type: "tableHeader", content: [p(t("Инструмент"))] }, { type: "tableHeader", content: [p(t("Где"))] }] },
        { type: "tableRow", content: [{ type: "tableCell", content: [p(t("Маркер"))] }, { type: "tableCell", content: [p(t("Под текстом"))] }] },
        { type: "tableRow", content: [{ type: "tableCell", content: [p(t("Ручка"))] }, { type: "tableCell", content: [p(t("Поверх текста"))] }] },
      ],
    },
    { type: "drawing", attrs: { height: 220 } },
    { type: "horizontalRule", attrs: { style: "wave" } },
    p(t("Связи: "), { type: "noteLink", attrs: { noteId: "note-ideas", label: "Идеи для книги" } }, t(" и тег "), { type: "tag", attrs: { name: "проекты/datascratch" } }, t(". Наберите «[[», чтобы сослаться на заметку.")),
    { type: "pageCard", attrs: { noteId: "note-trip", style: "card" } },
    { type: "blockquote", content: [p(t("Качество пера важнее широты функций."))] },
    { type: "mermaid", attrs: { source: "graph LR\n  Перо --> Якорь[Якорь на символ]\n  Якорь --> Перекладка\n  Перекладка --> Штрих" } },
  ],
};
