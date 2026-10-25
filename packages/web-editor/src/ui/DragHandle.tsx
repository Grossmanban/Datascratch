import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
import { Floating } from "./Popups";

interface Target {
  pos: number;
  rect: DOMRect;
  name: string;
}

const LIST_ITEMS = new Set(["listItem", "taskItem"]);

/** The draggable unit at a document position: a list item, or a top-level block (never the title). */
export function blockTargetAt(editor: Editor, pos: number): { pos: number; name: string } | null {
  const $pos = editor.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (LIST_ITEMS.has(node.type.name)) return { pos: $pos.before(d), name: node.type.name };
  }
  if ($pos.depth === 0) {
    const after = $pos.nodeAfter;
    if (after && after.type.name !== "title" && after.isBlock) return { pos, name: after.type.name };
    return null;
  }
  const top = $pos.node(1);
  if (top.type.name === "title") return null;
  return { pos: $pos.before(1), name: top.type.name };
}

/** Craft-style block handle: "+" inserts a block, "⋮⋮" drags or opens the block menu. */
export function DragHandle({ editor, root }: { editor: Editor; root: HTMLElement }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [menu, setMenu] = useState<Target | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "pen" || !editor.isEditable) return;
      if (handleRef.current?.contains(e.target as Node)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const dom = editor.view.dom;
        const r = dom.getBoundingClientRect();
        const style = getComputedStyle(dom);
        const x = Math.min(Math.max(e.clientX, r.left + parseFloat(style.paddingLeft) + 4), r.right - parseFloat(style.paddingRight) - 4);
        const hit = editor.view.posAtCoords({ left: x, top: e.clientY });
        if (!hit) return setTarget(null);
        const t = blockTargetAt(editor, hit.inside >= 0 ? hit.inside : hit.pos);
        if (!t) return setTarget(null);
        const el = editor.view.nodeDOM(t.pos);
        if (!(el instanceof HTMLElement)) return setTarget(null);
        setTarget({ ...t, rect: el.getBoundingClientRect() });
      });
    };
    const onLeave = (e: PointerEvent) => {
      if (!root.contains(e.relatedTarget as Node)) setTarget(null);
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    const onScroll = () => setTarget(null);
    window.addEventListener("scroll", onScroll, true);
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll, true);
      ro.disconnect();
    };
  }, [editor, root]);

  if (!target && !menu) return null;
  const rootRect = root.getBoundingClientRect();
  const t = target;
  const lineHeight = t ? Math.min(t.rect.height, parseFloat(getComputedStyle(editor.view.dom).fontSize) * 1.5) : 0;

  const onDragStart = (e: React.DragEvent) => {
    if (!t) return;
    const view = editor.view;
    const sel = NodeSelection.create(view.state.doc, t.pos);
    view.dispatch(view.state.tr.setSelection(sel));
    const slice = sel.content();
    // ProseMirror's drop handler moves the dragged slice when `view.dragging.move` is set.
    (view as unknown as { dragging: unknown }).dragging = { slice, move: true, node: sel };
    const el = view.nodeDOM(t.pos);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", slice.content.textBetween(0, slice.content.size, "\n"));
    if (el instanceof HTMLElement) e.dataTransfer.setDragImage(el, 0, 0);
  };

  const insertBelow = () => {
    if (!t) return;
    const node = editor.state.doc.nodeAt(t.pos);
    if (!node) return;
    const after = t.pos + node.nodeSize;
    const para = editor.schema.nodes.paragraph!.create(null, editor.schema.text("/"));
    const isItem = LIST_ITEMS.has(t.name);
    const tr = editor.state.tr;
    if (isItem) {
      const item = node.type.create(node.type.name === "taskItem" ? { state: "open" } : null, editor.schema.nodes.paragraph!.create(null, editor.schema.text("/")));
      tr.insert(after, item);
      tr.setSelection(TextSelection.create(tr.doc, after + 3));
    } else {
      tr.insert(after, para);
      tr.setSelection(TextSelection.create(tr.doc, after + 2));
    }
    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
  };

  return (
    <>
      {t && (
        <div
          ref={handleRef}
          className="ds-block-handle"
          style={{ left: t.rect.left - rootRect.left - 52, top: t.rect.top - rootRect.top + Math.max(0, (lineHeight - 24) / 2) }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button type="button" className="ds-handle-btn" title="Добавить блок ниже" aria-label="Добавить блок" onClick={insertBelow}>
            +
          </button>
          <div
            className="ds-handle-btn ds-handle-grip"
            draggable
            role="button"
            tabIndex={-1}
            title="Перетащите или нажмите для меню"
            aria-label="Меню блока"
            onDragStart={onDragStart}
            onDragEnd={() => setTarget(null)}
            onClick={() => setMenu(t)}
          >
            ⋮⋮
          </div>
        </div>
      )}
      {menu && <BlockMenu editor={editor} target={menu} onClose={() => setMenu(null)} />}
    </>
  );
}

function BlockMenu({ editor, target, onClose }: { editor: Editor; target: Target; onClose: () => void }) {
  const node = editor.state.doc.nodeAt(target.pos);
  if (!node) return null;
  const select = () => editor.chain().focus().setNodeSelection(target.pos);
  const textLike = node.isTextblock;
  const item = (label: string, run: () => void, danger = false) => (
    <button
      type="button"
      className={`ds-menu-item${danger ? " is-danger" : ""}`}
      onClick={() => {
        run();
        onClose();
      }}
    >
      <span className="ds-menu-title">{label}</span>
    </button>
  );
  return (
    <Floating rect={target.rect} className="ds-menu ds-block-menu" onDismiss={onClose}>
      <div className="ds-menu-list">
        {textLike && (
          <>
            {item("Текст", () => editor.chain().focus().setTextSelection(target.pos + 1).setParagraph().run())}
            {item("Заголовок 1", () => editor.chain().focus().setTextSelection(target.pos + 1).setHeading({ level: 1 }).run())}
            {item("Заголовок 2", () => editor.chain().focus().setTextSelection(target.pos + 1).setHeading({ level: 2 }).run())}
            {item("Задача", () => editor.chain().focus().setTextSelection(target.pos + 1).toggleTaskList().run())}
            <div className="ds-menu-sep" />
          </>
        )}
        {item("Дублировать", () => {
          const copy = editor.state.doc.nodeAt(target.pos)!;
          const json = copy.toJSON();
          // blockIds are regenerated for the copy by the blockId plugin (duplicates get fresh ids).
          editor.chain().focus().insertContentAt(target.pos + copy.nodeSize, json).run();
        })}
        {node.attrs.blockId &&
          item("Копировать ссылку на блок", () => {
            void navigator.clipboard?.writeText(`#block-${node.attrs.blockId}`);
          })}
        {item("Удалить", () => select().deleteSelection().run(), true)}
      </div>
    </Floating>
  );
}
