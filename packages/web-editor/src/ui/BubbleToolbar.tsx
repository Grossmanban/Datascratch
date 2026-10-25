import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { HIGHLIGHT_TOKENS, TINTS, colorTokenVar } from "../tokens";
import { Floating } from "./Popups";

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
  const [href, setHref] = useState("");
  const [, force] = useState(0);
  useEffect(() => {
    let pointerDown = false;
    const update = () => {
      if (pointerDown) return;
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
    const onBlur = () => setTimeout(() => !editor.isFocused && setRect(null), 120);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", onBlur);
    editor.view.dom.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", update, true);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", onBlur);
      editor.view.dom.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", update, true);
    };
  }, [editor]);
  useEffect(() => {
    if (!rect) setPanel(null);
  }, [rect]);
  if (!rect || !editor.isEditable) return null;

  const btn = (label: string, title: string, active: boolean, run: () => void, cls = "") => (
    <button type="button" className={`ds-tb-btn ${cls}${active ? " is-active" : ""}`} title={title} aria-label={title} aria-pressed={active} onClick={run}>
      {label}
    </button>
  );
  const c = () => editor.chain().focus();
  const hasAgent = editor.isActive("agentEdit");

  return (
    <Floating rect={rect} placement="above" className="ds-toolbar">
      <div className="ds-tb-row">
        {btn("Aa", "Превратить в…", panel === "turn", () => setPanel(panel === "turn" ? null : "turn"))}
        <span className="ds-tb-sep" />
        {btn("B", "Жирный (⌘B)", editor.isActive("bold"), () => c().toggleBold().run(), "is-bold")}
        {btn("I", "Курсив (⌘I)", editor.isActive("italic"), () => c().toggleItalic().run(), "is-italic")}
        {btn("U", "Подчёркнутый (⌘U)", editor.isActive("underline"), () => c().toggleUnderline().run(), "is-underline")}
        {btn("S", "Зачёркнутый", editor.isActive("strike"), () => c().toggleStrike().run(), "is-strike")}
        {btn("‹›", "Код", editor.isActive("code"), () => c().toggleCode().run(), "is-code")}
        <span className="ds-tb-sep" />
        {btn("🔗", "Ссылка", editor.isActive("link") || panel === "link", () => {
          setHref((editor.getAttributes("link").href as string) ?? "");
          setPanel(panel === "link" ? null : "link");
        })}
        {btn("A", "Цвет и выделение", panel === "color", () => setPanel(panel === "color" ? null : "color"), "is-color")}
        {hasAgent && btn("✓", "Принять правку агента", false, () => c().acceptAgentEdits().run(), "is-accept")}
      </div>
      {panel === "turn" && (
        <div className="ds-tb-panel ds-tb-turn">
          {btn("Текст", "Абзац", editor.isActive("paragraph"), () => c().setParagraph().run())}
          {btn("H1", "Заголовок 1", editor.isActive("heading", { level: 1 }), () => c().toggleHeading({ level: 1 }).run())}
          {btn("H2", "Заголовок 2", editor.isActive("heading", { level: 2 }), () => c().toggleHeading({ level: 2 }).run())}
          {btn("H3", "Заголовок 3", editor.isActive("heading", { level: 3 }), () => c().toggleHeading({ level: 3 }).run())}
          {btn("☐", "Задача", editor.isActive("taskList"), () => c().toggleTaskList().run())}
          {btn("•", "Список", editor.isActive("bulletList"), () => c().toggleBulletList().run())}
          {btn("1.", "Нумерованный", editor.isActive("orderedList"), () => c().toggleOrderedList().run())}
          {btn("❝", "Цитата", editor.isActive("blockquote"), () => c().toggleBlockquote().run())}
        </div>
      )}
      {panel === "link" && (
        <form
          className="ds-tb-panel ds-tb-link"
          onSubmit={(e) => {
            e.preventDefault();
            if (href.trim()) c().extendMarkRange("link").setLink({ href: href.trim() }).run();
            else c().extendMarkRange("link").unsetLink().run();
            setPanel(null);
          }}
        >
          <input autoFocus className="ds-input" placeholder="https://…" value={href} onChange={(e) => setHref(e.target.value)} onMouseDown={(e) => e.stopPropagation()} />
          <button type="submit" className="ds-tb-btn">
            OK
          </button>
        </form>
      )}
      {panel === "color" && (
        <div className="ds-tb-panel ds-tb-colors">
          <div className="ds-tb-label">Текст</div>
          <div className="ds-swatches">
            <button type="button" className="ds-swatch is-none" title="По умолчанию" onClick={() => c().unsetTextColor().run()} />
            {TINTS.map((t) => (
              <button key={t} type="button" className="ds-swatch" title={t} style={{ background: colorTokenVar(`tint.${t}.fg`) }} onClick={() => c().setTextColor(`tint.${t}.fg`).run()} />
            ))}
          </div>
          <div className="ds-tb-label">Выделение</div>
          <div className="ds-swatches">
            <button type="button" className="ds-swatch is-none" title="Без выделения" onClick={() => c().unsetHighlight().run()} />
            {HIGHLIGHT_TOKENS.map((t) => (
              <button key={t} type="button" className="ds-swatch" title={t} style={{ background: colorTokenVar(t) }} onClick={() => c().toggleHighlight(t).run()} />
            ))}
          </div>
        </div>
      )}
    </Floating>
  );
}
