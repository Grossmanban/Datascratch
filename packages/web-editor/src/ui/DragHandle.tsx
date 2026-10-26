import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection, type Transaction } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
import { ySyncPluginKey } from "y-prosemirror";
import { blockLiftKey } from "./blockLift";
import { Floating } from "./Popups";

interface Target {
  pos: number;
  rect: DOMRect;
  name: string;
  /** "hover": shown by a mouse/trackpad over the block; "caret": the touch handle at the caret. */
  mode: "hover" | "caret";
  /** Top of the line the handle sits on (the block top, or the caret's line). */
  lineTop: number;
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

/**
 * Where a dragged block may land: list items among items of the same kind, other blocks among the
 * top-level blocks (never before the title).
 */
export function dropTargetAt(editor: Editor, pos: number, sourceName: string): { pos: number; name: string } | null {
  if (LIST_ITEMS.has(sourceName)) {
    const t = blockTargetAt(editor, pos);
    return t && t.name === sourceName ? t : null;
  }
  const $pos = editor.state.doc.resolve(pos);
  if ($pos.depth === 0) {
    const after = $pos.nodeAfter;
    return after && after.type.name !== "title" && after.isBlock ? { pos, name: after.type.name } : null;
  }
  const top = $pos.node(1);
  return top.type.name === "title" ? null : { pos: $pos.before(1), name: top.type.name };
}

/** Moves the block at `from` to the insertion position `to` (a position between blocks). */
export function moveBlock(editor: Editor, from: number, to: number): boolean {
  const node = editor.state.doc.nodeAt(from);
  if (!node || (to >= from && to <= from + node.nodeSize)) return false;
  const tr = editor.state.tr.delete(from, from + node.nodeSize);
  const at = tr.mapping.map(to);
  tr.insert(at, node);
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

function insertBelow(editor: Editor, t: { pos: number; name: string }) {
  const node = editor.state.doc.nodeAt(t.pos);
  if (!node) return;
  const after = t.pos + node.nodeSize;
  const tr = editor.state.tr;
  if (LIST_ITEMS.has(t.name)) {
    const item = node.type.create(node.type.name === "taskItem" ? { state: "open" } : null, editor.schema.nodes.paragraph!.create(null, editor.schema.text("/")));
    tr.insert(after, item);
    tr.setSelection(TextSelection.create(tr.doc, after + 3));
  } else {
    tr.insert(after, editor.schema.nodes.paragraph!.create(null, editor.schema.text("/")));
    tr.setSelection(TextSelection.create(tr.doc, after + 2));
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/** Long-press before a touch drag lifts the block; movement beyond the slop cancels it. */
const LONG_PRESS_MS = 400;
const TOUCH_SLOP = 8;
const TAP_MAX_MS = 500;
const AUTOSCROLL_EDGE = 56;

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * Block handle (Craft/Notion style), different per input:
 * - mouse/trackpad (pointerType "mouse", iPad with trackpad included): "+" and "⋮⋮" appear on hover;
 *   the grip drags (HTML5 drag) or opens the block menu;
 * - finger: nothing appears while touching or scrolling; after a tap that places the caret, one quiet
 *   grip fades in at the caret's block. Tap opens the block menu («Добавить блок ниже» included),
 *   long-press lifts the block and drags it to a new place;
 * - Apple Pencil (pointerType "pen") never shows handles.
 */
export function DragHandle({ editor, root }: { editor: Editor; root: HTMLElement }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [menu, setMenu] = useState<Target | null>(null);
  const [lifted, setLifted] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef(false);
  menuRef.current = menu !== null;
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    timer: number;
    lifted: boolean;
    source: Target;
    ghost: HTMLElement | null;
    indicator: HTMLElement | null;
    drop: number | null;
    lastY: number;
    scrollFrame: number;
    suppressClick: boolean;
  } | null>(null);

  useEffect(() => {
    let frame = 0;
    let tap: { x: number; y: number; t: number } | null = null;
    // Touch mode: the handle follows the caret's block until typing, blur or another pointer.
    let caretMode = false;

    const caretTarget = (): Target | null => {
      if (editor.isDestroyed || !editor.isEditable || !editor.view.hasFocus()) return null;
      const sel = editor.state.selection;
      if (!(sel instanceof TextSelection)) return null;
      const t = blockTargetAt(editor, sel.from);
      if (!t) return null;
      const el = editor.view.nodeDOM(t.pos);
      if (!(el instanceof HTMLElement)) return null;
      const rect = el.getBoundingClientRect();
      let lineTop = rect.top;
      try {
        lineTop = Math.min(Math.max(editor.view.coordsAtPos(sel.from).top, rect.top), rect.bottom);
      } catch {
        // keep the block top
      }
      return { ...t, rect, mode: "caret", lineTop };
    };
    const showCaret = () => {
      caretMode = true;
      setTarget(caretTarget());
    };
    const hide = () => {
      caretMode = false;
      setTarget(null);
    };

    const onMove = (e: PointerEvent) => {
      // Only a real hover pointer shows handles; touch moves are scrolls, the pen writes.
      if (e.pointerType !== "mouse" || editor.isDestroyed || !editor.isEditable) return;
      if (handleRef.current?.contains(e.target as Node)) return;
      caretMode = false;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed) return;
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
        const rect = el.getBoundingClientRect();
        setTarget({ ...t, rect, mode: "hover", lineTop: rect.top });
      });
    };
    const onDown = (e: PointerEvent) => {
      if (handleRef.current?.contains(e.target as Node)) return;
      tap = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
      if (e.pointerType === "touch" || e.pointerType === "pen") hide();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !tap) return;
      const deliberate = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TOUCH_SLOP * 1.5 && e.timeStamp - tap.t < TAP_MAX_MS;
      tap = null;
      // The caret lands after the tap (and iOS may move it once more): look twice.
      if (deliberate) {
        requestAnimationFrame(showCaret);
        window.setTimeout(() => caretMode && setTarget(caretTarget()), 120);
      }
    };
    const onCancel = () => {
      tap = null;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !caretMode && !root.contains(e.relatedTarget as Node)) setTarget(null);
    };
    const onScroll = () => {
      if (dragRef.current?.lifted) return;
      if (caretMode) setTarget(caretTarget());
      else setTarget(null);
    };
    const onSelection = () => {
      if (caretMode && !dragRef.current?.lifted) setTarget(caretTarget());
    };
    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged || dragRef.current?.lifted) return;
      const remote = (transaction.getMeta(ySyncPluginKey) as { isChangeOrigin?: boolean } | undefined)?.isChangeOrigin;
      // Typing hides the touch handle (it comes back on the next tap); remote edits only move it.
      if (remote) onScroll();
      else if (caretMode) hide();
    };
    const onBlur = () => {
      window.setTimeout(() => {
        if (!caretMode || menuRef.current || dragRef.current) return;
        if (!editor.isDestroyed && !editor.view.hasFocus()) hide();
      }, 0);
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onDown, true);
    root.addEventListener("pointerup", onUp, true);
    root.addEventListener("pointercancel", onCancel, true);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, true);
    editor.on("selectionUpdate", onSelection);
    editor.on("transaction", onTransaction);
    editor.on("blur", onBlur);
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown, true);
      root.removeEventListener("pointerup", onUp, true);
      root.removeEventListener("pointercancel", onCancel, true);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll, true);
      editor.off("selectionUpdate", onSelection);
      editor.off("transaction", onTransaction);
      editor.off("blur", onBlur);
      ro.disconnect();
    };
  }, [editor, root]);

  // Drop any touch drag left over when the editor goes away.
  useEffect(() => () => endTouchDrag(false), []);

  if ((!target && !menu) || editor.isDestroyed) return null;
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

  // ---------- touch drag: long-press lifts, the finger moves the block ----------
  function liftTouchDrag() {
    const d = dragRef.current;
    if (!d || editor.isDestroyed) return;
    const el = editor.view.nodeDOM(d.source.pos);
    if (!(el instanceof HTMLElement)) return endTouchDrag(false);
    d.lifted = true;
    d.suppressClick = true;
    const rect = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "ds-block-ghost ds-prose";
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.cssText = `left:${rect.left - rr.left}px;top:${rect.top - rr.top}px;width:${rect.width}px`;
    ghost.append(el.cloneNode(true));
    root.append(ghost);
    const indicator = document.createElement("div");
    indicator.className = "ds-drop-indicator";
    indicator.hidden = true;
    root.append(indicator);
    d.ghost = ghost;
    d.indicator = indicator;
    editor.view.dispatch(editor.state.tr.setMeta(blockLiftKey, { pos: d.source.pos }).setMeta("addToHistory", false));
    setLifted(true);
    navigator.vibrate?.(8);
    const scroller = scrollParent(root);
    const tick = () => {
      const cur = dragRef.current;
      if (!cur?.lifted) return;
      const h = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const dy = cur.lastY < h.top + AUTOSCROLL_EDGE ? -12 : cur.lastY > h.bottom - AUTOSCROLL_EDGE ? 12 : 0;
      if (dy) {
        if (scroller) scroller.scrollTop += dy;
        else window.scrollBy(0, dy);
        updateDrop(cur.lastY);
      }
      cur.scrollFrame = requestAnimationFrame(tick);
    };
    d.scrollFrame = requestAnimationFrame(tick);
  }

  function updateDrop(clientY: number) {
    const d = dragRef.current;
    if (!d?.lifted || !d.ghost || !d.indicator || editor.isDestroyed) return;
    const rr = root.getBoundingClientRect();
    d.ghost.style.transform = `translateY(${clientY - d.y}px) scale(1.02)`;
    const dom = editor.view.dom;
    const r = dom.getBoundingClientRect();
    const style = getComputedStyle(dom);
    const x = r.left + parseFloat(style.paddingLeft) + 8;
    const y = Math.min(Math.max(clientY, r.top + 1), r.bottom - 1);
    const hit = editor.view.posAtCoords({ left: x, top: y });
    const over = hit && dropTargetAt(editor, hit.inside >= 0 ? hit.inside : hit.pos, d.source.name);
    const el = over && editor.view.nodeDOM(over.pos);
    const node = over && editor.state.doc.nodeAt(over.pos);
    if (!over || !node || !(el instanceof HTMLElement)) {
      d.drop = null;
      d.indicator.hidden = true;
      return;
    }
    const br = el.getBoundingClientRect();
    const before = clientY < br.top + br.height / 2;
    d.drop = before ? over.pos : over.pos + node.nodeSize;
    const lineY = before ? br.top : br.bottom;
    d.indicator.hidden = false;
    d.indicator.style.cssText = `left:${br.left - rr.left}px;top:${lineY - rr.top - 1}px;width:${br.width}px`;
  }

  function endTouchDrag(commit: boolean) {
    const d = dragRef.current;
    if (!d) return;
    window.clearTimeout(d.timer);
    cancelAnimationFrame(d.scrollFrame);
    d.ghost?.remove();
    d.indicator?.remove();
    if (d.suppressClick) {
      // Swallow the click that may follow the drop, then forget the drag.
      const done = { ...d, lifted: false, ghost: null, indicator: null };
      dragRef.current = done;
      window.setTimeout(() => {
        if (dragRef.current === done) dragRef.current = null;
      }, 400);
    } else dragRef.current = null;
    if (!d.lifted) return;
    setLifted(false);
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(blockLiftKey, null).setMeta("addToHistory", false));
    if (commit && d.drop !== null) moveBlock(editor, d.source.pos, d.drop);
    setTarget(null);
  }

  const gripTouch = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !t) return;
      const timer = window.setTimeout(liftTouchDrag, LONG_PRESS_MS);
      dragRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, timer, lifted: false, source: t, ghost: null, indicator: null, drop: null, lastY: e.clientY, scrollFrame: 0, suppressClick: false };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // synthetic or already released pointer
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      d.lastY = e.clientY;
      if (!d.lifted) {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TOUCH_SLOP) endTouchDrag(false);
        return;
      }
      e.preventDefault();
      updateDrop(e.clientY);
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      endTouchDrag(true);
    },
    onPointerCancel: () => endTouchDrag(false),
  };

  const caret = t?.mode === "caret";
  return (
    <>
      {t && (
        <div
          ref={handleRef}
          className={`ds-block-handle ds-pen-ignore${caret ? " is-touch" : ""}${lifted ? " is-lifted" : ""}`}
          style={{ left: t.rect.left - rootRect.left - (caret ? 34 : 52), top: t.lineTop - rootRect.top + Math.max(0, (lineHeight - (caret ? 28 : 24)) / 2) }}
          onMouseDown={(e) => {
            e.stopPropagation();
            // Keep the caret (and the iPad keyboard) where it is.
            if (caret) e.preventDefault();
          }}
          onContextMenu={(e) => caret && e.preventDefault()}
        >
          {!caret && (
            <button type="button" className="ds-handle-btn" title="Добавить блок ниже" aria-label="Добавить блок" onClick={() => insertBelow(editor, t)}>
              +
            </button>
          )}
          <div
            className="ds-handle-btn ds-handle-grip"
            draggable={!caret}
            role="button"
            tabIndex={-1}
            title={caret ? "Нажмите для меню, удерживайте, чтобы перетащить" : "Перетащите или нажмите для меню"}
            aria-label="Меню блока"
            onDragStart={caret ? undefined : onDragStart}
            onDragEnd={() => setTarget(null)}
            onClick={() => {
              const d = dragRef.current;
              if (d?.suppressClick) {
                dragRef.current = null;
                return;
              }
              setMenu(t);
            }}
            {...(caret ? gripTouch : {})}
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
        {target.mode === "caret" && (
          <>
            {item("Добавить блок ниже", () => insertBelow(editor, target))}
            <div className="ds-menu-sep" />
          </>
        )}
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
