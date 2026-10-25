import type { Story } from "@ladle/react";
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  Palette,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Backdrop,
  ColorPanel,
  FormatToolbar,
  LinkPanel,
  PenToolbar,
  SuggestionMenu,
  defaultPenSelection,
  type HighlightName,
  type PenSelection,
  type TintName,
} from "..";

export const Document: Story = () => {
  const [pen, setPen] = useState<PenSelection>(defaultPenSelection);
  const [marks, setMarks] = useState<Record<string, boolean>>({ bold: true });
  const [panel, setPanel] = useState<null | "color" | "link">("color");
  const [text, setText] = useState<TintName | null>(null);
  const [mark, setMark] = useState<HighlightName | null>("yellow");
  const [task, setTask] = useState<"open" | "done" | "cancelled">("open");
  const toggle = (id: string) => () => setMarks((m) => ({ ...m, [id]: !m[id] }));
  const item = (id: string, label: string, icon: ReactNode, shortcut?: string) => ({
    id,
    label,
    icon,
    active: !!marks[id],
    onClick: toggle(id),
    ...(shortcut ? { shortcut } : {}),
  });
  return (
    <div className="fixed inset-0 overflow-y-auto bg-canvas">
      <div className="relative h-[200px]">
        <Backdrop name="dusk" />
      </div>
      <article className="relative mx-auto -mt-16 max-w-doc-normal rounded-xl border border-hairline bg-surface px-14 pb-40 pt-12 shadow-card">
        <h1 className="font-display text-h1">Заметки о пере</h1>
        <p className="mt-3 text-body">
          Штрихи привязаны к словам и{" "}
          <mark className="rounded-[3px] bg-highlight-yellow px-0.5 text-fg">
            едут вместе с текстом
          </mark>{" "}
          при перекладке.
        </p>
        <p className="mt-4 flex items-center gap-3 text-body">
          <button
            type="button"
            role="checkbox"
            aria-checked={task === "done"}
            aria-label="CSS-чек-бокс"
            className="ds-task-check"
            data-state={task}
            onClick={() =>
              setTask(task === "open" ? "done" : task === "done" ? "cancelled" : "open")
            }
          />
          <span>
            Чек-бокс задачи без React —{" "}
            <code className="font-mono text-footnote">.ds-task-check</code> (нажмите: открыто →
            выполнено → отменено)
          </span>
        </p>
        <p className="mt-4 text-body text-fg-secondary">/ — меню блоков:</p>
      </article>

      <div className="fixed left-1/2 top-5 -translate-x-1/2">
        <FormatToolbar
          aria-label="Формат"
          items={[
            item("h1", "Заголовок", <Heading1 />),
            "separator",
            item("bold", "Жирный", <Bold />, "mod+b"),
            item("italic", "Курсив", <Italic />, "mod+i"),
            item("underline", "Подчеркнуть", <Underline />, "mod+u"),
            item("strike", "Зачеркнуть", <Strikethrough />),
            {
              id: "color",
              label: "Цвет",
              icon: <Palette />,
              active: panel === "color",
              onClick: () => setPanel(panel === "color" ? null : "color"),
            },
            {
              id: "link",
              label: "Ссылка",
              icon: <Link2 />,
              active: panel === "link",
              onClick: () => setPanel(panel === "link" ? null : "link"),
              shortcut: "mod+k",
            },
            "separator",
            item("code", "Код", <Code />),
          ]}
          panel={
            panel === "color" ? (
              <ColorPanel
                textColor={text}
                highlight={mark}
                onTextColor={setText}
                onHighlight={setMark}
              />
            ) : panel === "link" ? (
              <LinkPanel
                href="https://datascratch.app"
                onApply={() => setPanel(null)}
                onRemove={() => setPanel(null)}
                autoFocus={false}
              />
            ) : undefined
          }
        />
      </div>

      <SuggestionMenu
        anchorRect={{ top: 410, left: 420, width: 1, height: 22 }}
        selectedIndex={2}
        onPick={() => {}}
        groups={[
          {
            heading: "Текст",
            items: [
              { id: "h1", label: "Заголовок 1", icon: <Heading1 />, hint: "#" },
              { id: "h2", label: "Заголовок 2", icon: <Heading2 />, hint: "##" },
              {
                id: "task",
                label: "Задача",
                description: "Чек-бокс с датой",
                icon: <CheckSquare />,
                hint: "[]",
              },
              { id: "list", label: "Список", icon: <List />, hint: "-" },
              { id: "quote", label: "Цитата", icon: <Quote />, hint: ">" },
            ],
          },
          {
            heading: "Рукопись",
            items: [{ id: "draw", label: "Рисунок", icon: <Highlighter />, hint: "mod+alt+d" }],
          },
        ]}
      />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <PenToolbar value={pen} onChange={setPen} canUndo onUndo={() => {}} onRedo={() => {}} />
      </div>
    </div>
  );
};
