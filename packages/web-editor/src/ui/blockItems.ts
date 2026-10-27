import type { Editor, Range } from "@tiptap/core";
import type { EditorHost } from "../host";
import { pickAndInsert } from "../uploads";

export interface BlockItem {
  id: string;
  title: string;
  hint: string;
  icon: string;
  group: "Текст" | "Списки" | "Блоки" | "Медиа" | "Связи";
  keywords: string[];
  /** Markdown shortcut shown in the menu (for discoverability). */
  shortcut?: string;
  run: (editor: Editor, range: Range | null, host: EditorHost) => void;
}

const chainAt = (editor: Editor, range: Range | null) => {
  const c = editor.chain().focus();
  return range ? c.deleteRange(range) : c;
};

/** Rich blocks (Craft-style "/" menu). */
export const BLOCK_ITEMS: BlockItem[] = [
  { id: "paragraph", title: "Текст", hint: "Обычный абзац", icon: "¶", group: "Текст", keywords: ["text", "paragraph", "текст", "абзац"], run: (e, r) => chainAt(e, r).setParagraph().run() },
  { id: "h1", title: "Заголовок 1", hint: "Крупный раздел", icon: "H1", group: "Текст", keywords: ["h1", "heading", "заголовок"], shortcut: "#", run: (e, r) => chainAt(e, r).setHeading({ level: 1 }).run() },
  { id: "h2", title: "Заголовок 2", hint: "Подраздел", icon: "H2", group: "Текст", keywords: ["h2", "heading", "заголовок"], shortcut: "##", run: (e, r) => chainAt(e, r).setHeading({ level: 2 }).run() },
  { id: "h3", title: "Заголовок 3", hint: "Мелкий подраздел", icon: "H3", group: "Текст", keywords: ["h3", "heading", "заголовок"], shortcut: "###", run: (e, r) => chainAt(e, r).setHeading({ level: 3 }).run() },
  { id: "quote", title: "Цитата", hint: "Выделенная цитата", icon: "❝", group: "Текст", keywords: ["quote", "blockquote", "цитата"], shortcut: ">", run: (e, r) => chainAt(e, r).toggleBlockquote().run() },
  { id: "callout", title: "Выноска", hint: "Блок с иконкой и цветом", icon: "💡", group: "Текст", keywords: ["callout", "note", "выноска", "заметка"], shortcut: "!>", run: (e, r) => chainAt(e, r).setCallout().run() },
  { id: "task", title: "Задача", hint: "Чек-бокс с датами", icon: "☐", group: "Списки", keywords: ["todo", "task", "check", "задача", "дело"], shortcut: "[]", run: (e, r) => chainAt(e, r).toggleTaskList().run() },
  { id: "bullet", title: "Маркированный список", hint: "Простой список", icon: "•", group: "Списки", keywords: ["bullet", "list", "список"], shortcut: "-", run: (e, r) => chainAt(e, r).toggleBulletList().run() },
  { id: "ordered", title: "Нумерованный список", hint: "Список с номерами", icon: "1.", group: "Списки", keywords: ["ordered", "number", "нумерованный"], shortcut: "1.", run: (e, r) => chainAt(e, r).toggleOrderedList().run() },
  { id: "table", title: "Таблица", hint: "Строки и столбцы", icon: "▦", group: "Блоки", keywords: ["table", "таблица"], run: (e, r) => chainAt(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "code", title: "Код", hint: "С подсветкой синтаксиса", icon: "</>", group: "Блоки", keywords: ["code", "код"], shortcut: "```", run: (e, r) => chainAt(e, r).setCodeBlock().run() },
  { id: "math", title: "Формула", hint: "LaTeX", icon: "∑", group: "Блоки", keywords: ["math", "latex", "formula", "формула"], shortcut: "$$", run: (e, r) => chainAt(e, r).insertMathBlock().run() },
  { id: "mermaid", title: "Диаграмма", hint: "Mermaid", icon: "⎔", group: "Блоки", keywords: ["mermaid", "diagram", "диаграмма", "схема"], run: (e, r) => chainAt(e, r).insertMermaid().run() },
  { id: "divider", title: "Разделитель", hint: "Линия, точки или волна", icon: "—", group: "Блоки", keywords: ["divider", "hr", "line", "разделитель"], shortcut: "---", run: (e, r) => chainAt(e, r).setHorizontalRule().run() },
  { id: "drawing", title: "Рисунок", hint: "Блок для рисования пером", icon: "✎", group: "Медиа", keywords: ["drawing", "sketch", "рисунок", "перо"], run: (e, r) => chainAt(e, r).insertDrawing().run() },
  {
    id: "image",
    title: "Картинка",
    hint: "Загрузить изображение",
    icon: "🖼",
    group: "Медиа",
    keywords: ["image", "picture", "картинка", "фото"],
    run: (e, r, host) => {
      if (r) e.chain().focus().deleteRange(r).run();
      pickAndInsert(e, { current: host }, "image/*");
    },
  },
  {
    id: "file",
    title: "Файл",
    hint: "PDF или любой файл",
    icon: "📎",
    group: "Медиа",
    keywords: ["file", "pdf", "attachment", "файл"],
    run: (e, r, host) => {
      if (r) e.chain().focus().deleteRange(r).run();
      pickAndInsert(e, { current: host }, "*/*");
    },
  },
  {
    id: "page",
    title: "Документ-карточка",
    hint: "Новая вложенная заметка",
    icon: "📄",
    group: "Связи",
    keywords: ["page", "card", "document", "документ", "страница"],
    run: (e, r, host) => {
      if (r) e.chain().focus().deleteRange(r).run();
      void host.createNote?.("Без названия").then((n) => e.chain().focus().insertPageCard(n.noteId).run());
    },
  },
  { id: "link", title: "Ссылка на заметку", hint: "[[ ]]", icon: "↗", group: "Связи", keywords: ["link", "note", "ссылка", "[["], shortcut: "[[", run: (e, r) => chainAt(e, r).insertContent("[[").run() },
];

export function filterBlocks(query: string, host: EditorHost): BlockItem[] {
  const q = query.trim().toLowerCase();
  return BLOCK_ITEMS.filter((b) => {
    if ((b.id === "image" || b.id === "file") && !host.uploadAttachment) return false;
    if (b.id === "page" && !host.createNote) return false;
    if (!q) return true;
    return b.title.toLowerCase().includes(q) || b.keywords.some((k) => k.startsWith(q));
  });
}
