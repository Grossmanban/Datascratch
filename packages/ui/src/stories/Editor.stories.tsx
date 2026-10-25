import type { Story } from "@ladle/react";
import { Bold, Code, Heading1, Highlighter, Italic, Link2, List, ListChecks, Quote, Strikethrough, Underline } from "lucide-react";
import { useState } from "react";
import { Backdrop, FormatToolbar, PenToolbar, defaultPenSelection, type PenSelection } from "..";

export const Document: Story = () => {
  const [pen, setPen] = useState<PenSelection>(defaultPenSelection);
  const [marks, setMarks] = useState<Record<string, boolean>>({ bold: true });
  const toggle = (id: string) => () => setMarks((m) => ({ ...m, [id]: !m[id] }));
  const item = (id: string, label: string, icon: React.ReactNode, shortcut?: string) => ({
    id,
    label,
    icon,
    active: !!marks[id],
    onClick: toggle(id),
    ...(shortcut ? { shortcut } : {}),
  });
  return (
    <div className="fixed inset-0 overflow-y-auto bg-canvas">
      <div className="relative h-[220px]">
        <Backdrop name="dusk" />
      </div>
      <article data-paper="dots" className="relative mx-auto -mt-16 max-w-doc-normal rounded-xl border border-hairline bg-surface px-14 pb-24 pt-12 shadow-card">
        <div className="ds-prose">
          <h1>Заметки о пере</h1>
          <p>
            Штрихи привязаны к словам и <mark>едут вместе с текстом</mark> при перекладке. Ссылка на{" "}
            <a data-wikilink href="#">Теорию графов</a> и тег <span data-tag>#идеи</span>.
          </p>
          <div data-callout data-tint="blue">
            <span data-callout-icon>💡</span>
            <span>Выноска с оттенком из токенов <code>tint.blue</code>.</span>
          </div>
          <h2>Что проверить</h2>
          <ul>
            <li>Поворот экрана и Split View</li>
            <li>Вставка текста перед подчёркнутым словом</li>
          </ul>
          <blockquote>Качество важнее широты.</blockquote>
          <pre>{`const ink = tokens.ink.blue.dark; // осветлено генератором`}</pre>
        </div>
      </article>
      <div className="fixed left-1/2 top-6 -translate-x-1/2">
        <FormatToolbar
          aria-label="Формат"
          items={[
            item("h1", "Заголовок", <Heading1 />),
            "separator",
            item("bold", "Жирный", <Bold />, "mod+b"),
            item("italic", "Курсив", <Italic />, "mod+i"),
            item("underline", "Подчеркнуть", <Underline />, "mod+u"),
            item("strike", "Зачеркнуть", <Strikethrough />),
            item("mark", "Маркер", <Highlighter />),
            "separator",
            item("list", "Список", <List />),
            item("tasks", "Задачи", <ListChecks />),
            item("quote", "Цитата", <Quote />),
            item("code", "Код", <Code />),
            item("link", "Ссылка", <Link2 />, "mod+k"),
          ]}
        />
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <PenToolbar value={pen} onChange={setPen} />
      </div>
      <div className="fixed right-6 top-1/2 -translate-y-1/2">
        <PenToolbar value={pen} onChange={setPen} orientation="vertical" />
      </div>
    </div>
  );
};
