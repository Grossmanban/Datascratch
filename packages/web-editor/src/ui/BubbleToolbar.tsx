import type { Editor } from "@tiptap/core";
import { safeHref } from "../schema/core";
import { useEffect, useState } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { ColorPanel, FormatToolbar, LinkPanel, type FormatElement } from "@datascratch/ui";
import { Bold, Check, Code, Heading1, Heading2, Heading3, Highlighter, Italic, Link2, List, ListChecks, ListOrdered, Pilcrow, Quote, Strikethrough, Type, Underline } from "lucide-react";

function selectionRect(editor: Editor): DOMRect | null {
  const { from, to, empty } = editor.state.selection;
  if (empty || !editor.isFocused) return null;
  if (editor.state.selection instanceof NodeSelection) return null;
  const $from = editor.state.selection.$from;
  if ($from.parent.type.spec.code) return null;
  const a = editor.view.coordsAtPos(from);
  const b = editor.view.coordsAtPos(to, -1);
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.right, b.right);
  return new DOMRect(left, Math.min(a.top, b.top), Math.max(1, right - left), Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top));
}

type Panel = null | "color" | "link" | "turn";

/** Floating formatting toolbar over a text selection. */
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [, force] = useState(0);
  useEffect(() => {
    let pointerDown = false;
    // The editor can be destroyed (remount) before this effect is cleaned up; keep the node we used.
    const dom = editor.view.dom;
    const update = () => {
      if (pointerDown || editor.isDestroyed) return;
      setRect(selectionRect(editor));
      force((n) => n + 1);
    };
    const onDown = () => {
      pointerDown = true;
      setRect(null);
    };
    const onUp = () => {
      pointerDown = false;
      requestAnimationFrame(update);
    };
    const onBlur = () => setTimeout(() => (editor.isDestroyed || !editor.isFocused) && setRect(null), 120);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", onBlur);
    dom.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", update, true);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", onBlur);
      dom.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", update, true);
    };
  }, [editor]);
  useEffect(() => {
    if (!rect) setPanel(null);
  }, [rect]);
  if (!rect || !editor.isEditable) return null;

  const c = () => editor.chain().focus();
  const item = (id: string, label: string, icon: React.ReactNode, active: boolean, onClick: () => void, shortcut?: string): FormatElement => ({ id, label, icon, active, onClick, ...(shortcut ? { shortcut } : {}) });
  const togglePanel = (p: Panel) => setPanel(panel === p ? null : p);
  const items: FormatElement[] = [
    item("turn", "Превратить в…", <Type />, panel === "turn", () => togglePanel("turn")),
    "separator",
    item("bold", "Жирный", <Bold />, editor.isActive("bold"), () => c().toggleBold().run(), "mod+b"),
    item("italic", "Курсив", <Italic />, editor.isActive("italic"), () => c().toggleItalic().run(), "mod+i"),
    item("underline", "Подчёркнутый", <Underline />, editor.isActive("underline"), () => c().toggleUnderline().run(), "mod+u"),
    item("strike", "Зачёркнутый", <Strikethrough />, editor.isActive("strike"), () => c().toggleStrike().run(), "mod+shift+s"),
    item("code", "Код", <Code />, editor.isActive("code"), () => c().toggleCode().run(), "mod+e"),
    "separator",
    item("link", "Ссылка", <Link2 />, editor.isActive("link") || panel === "link", () => togglePanel("link"), "mod+k"),
    item("color", "Цвет и выделение", <Highlighter />, panel === "color", () => togglePanel("color")),
  ];
  if (editor.isActive("agentEdit")) items.push("separator", item("accept", "Принять правку агента", <Check />, false, () => c().acceptAgentEdits().run()));

  const textColor = (editor.getAttributes("textColor").color as string | undefined)?.match(/^tint\.(\w+)\.fg$/)?.[1] ?? null;
  const highlight = (editor.getAttributes("highlight").color as string | undefined)?.replace(/^highlight\./, "") ?? null;

  let panelNode: React.ReactNode = null;
  if (panel === "link") {
    panelNode = (
      <LinkPanel
        href={(editor.getAttributes("link").href as string) ?? ""}
        onApply={(href) => {
          if (!href.trim()) {
            c().extendMarkRange("link").unsetLink().run();
            setPanel(null);
            return;
          }
          // Only web and mail links; «example.com» means https://example.com. Anything else
          // (javascript:, data:, …) is not applied and the panel stays open.
          const raw = href.trim();
          const safe = safeHref(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`);
          if (!safe) return;
          c().extendMarkRange("link").setLink({ href: safe }).run();
          setPanel(null);
        }}
        onRemove={() => {
          c().extendMarkRange("link").unsetLink().run();
          setPanel(null);
        }}
      />
    );
  } else if (panel === "color") {
    panelNode = (
      <ColorPanel
        textColor={textColor as never}
        highlight={highlight as never}
        onTextColor={(t) => (t ? c().setTextColor(`tint.${t}.fg`).run() : c().unsetTextColor().run())}
        onHighlight={(h) => (h ? c().setMark("highlight", { color: `highlight.${h}` }).run() : c().unsetHighlight().run())}
      />
    );
  } else if (panel === "turn") {
    const turn: [string, string, React.ReactNode, boolean, () => void][] = [
      ["p", "Текст", <Pilcrow />, editor.isActive("paragraph"), () => c().setParagraph().run()],
      ["h1", "Заголовок 1", <Heading1 />, editor.isActive("heading", { level: 1 }), () => c().toggleHeading({ level: 1 }).run()],
      ["h2", "Заголовок 2", <Heading2 />, editor.isActive("heading", { level: 2 }), () => c().toggleHeading({ level: 2 }).run()],
      ["h3", "Заголовок 3", <Heading3 />, editor.isActive("heading", { level: 3 }), () => c().toggleHeading({ level: 3 }).run()],
      ["task", "Задача", <ListChecks />, editor.isActive("taskList"), () => c().toggleTaskList().run()],
      ["bullet", "Список", <List />, editor.isActive("bulletList"), () => c().toggleBulletList().run()],
      ["ordered", "Нумерованный", <ListOrdered />, editor.isActive("orderedList"), () => c().toggleOrderedList().run()],
      ["quote", "Цитата", <Quote />, editor.isActive("blockquote"), () => c().toggleBlockquote().run()],
    ];
    panelNode = <FormatToolbar items={turn.map(([id, label, icon, active, onClick]) => item(id, label, icon, active, onClick))} className="ds-turn-into" />;
  }

  return <FormatToolbar items={items} panel={panelNode} anchorRect={rect} aria-label="Форматирование" />;
}
