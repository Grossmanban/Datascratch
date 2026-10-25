import { useEffect, useState, type ReactNode } from "react";
import type * as Y from "yjs";
import { TOOL_DEFAULTS, type PenLayer, type PenSettings, type PenTool } from "../pen/PenLayer";
import { HIGHLIGHT_TOKENS, INK_TOKENS, colorTokenVar } from "../tokens";

const TOOL_LABELS: Record<PenTool, string> = {
  pen: "Ручка",
  pencil: "Карандаш",
  marker: "Маркер",
  highlighter: "Текстовыделитель",
  eraser: "Ластик",
  lasso: "Лассо: выделить штрихи и текст (перетащить, Delete — удалить)",
};

const WIDTH_STEPS = [0.6, 1, 1.6];

function ToolIcon({ tool, color }: { tool: PenTool | "text"; color: string }): ReactNode {
  // Simple, recognisable nib silhouettes; the tip takes the current ink colour.
  const tip = tool === "eraser" ? "var(--ds-text-tertiary, #9C978E)" : color;
  const body = "var(--ds-tool-body, #F6F3EE)";
  const stroke = "var(--ds-line-strong, #CFC8BC)";
  if (tool === "lasso") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 5c4.4 0 8 2.2 8 5s-3.6 5-8 5-8-2.2-8-5 3.6-5 8-5Zm-6 9c-1 2 0 4 2 4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (tool === "text") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M9 4h6M12 4v16M9 20h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  const tips: Record<PenTool, string> = {
    pen: "M10 28 L12 14 L14 28 Z",
    pencil: "M9.5 28 L12 12 L14.5 28 Z",
    marker: "M9 28 L9.5 18 L14.5 18 L15 28 Z",
    highlighter: "M7 28 L7 20 L17 16 L17 28 Z",
    eraser: "M7 28 L7 20 Q12 16 17 20 L17 28 Z",
    lasso: "",
  };
  return (
    <svg viewBox="0 0 24 56" width="18" height="42" aria-hidden="true">
      <path d={tips[tool]} fill={tip} />
      <rect x={tool === "highlighter" || tool === "eraser" ? 6 : 7} y="28" width={tool === "highlighter" || tool === "eraser" ? 12 : 10} height="28" rx="3" fill={body} stroke={stroke} strokeWidth="0.8" />
    </svg>
  );
}

/** Glass tool palette of the pen layer (D-38): tools, inks from tokens, width, eraser mode, undo. */
export function PenPalette({ pen, undoManager }: { pen: PenLayer; undoManager: Y.UndoManager }) {
  const [s, setS] = useState<PenSettings>(pen.getSettings());
  const [canUndo, setCanUndo] = useState(undoManager.canUndo());
  const [canRedo, setCanRedo] = useState(undoManager.canRedo());
  useEffect(() => pen.subscribe(setS), [pen]);
  useEffect(() => {
    const update = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };
    undoManager.on("stack-item-added", update);
    undoManager.on("stack-item-popped", update);
    undoManager.on("stack-cleared", update);
    return () => {
      undoManager.off("stack-item-added", update);
      undoManager.off("stack-item-popped", update);
      undoManager.off("stack-cleared", update);
    };
  }, [undoManager]);

  const strokeTool = s.tool && s.tool !== "eraser" && s.tool !== "lasso" ? s.tool : null;
  const base = strokeTool ? TOOL_DEFAULTS[strokeTool].width : 2;
  const colors = strokeTool === "highlighter" ? HIGHLIGHT_TOKENS : INK_TOKENS;
  const pick = (tool: PenTool | null) => {
    if (tool === "eraser" && s.tool === "eraser") {
      pen.setSettings({ eraserMode: s.eraserMode === "stroke" ? "pixel" : "stroke" });
      return;
    }
    if (!tool || tool === "eraser" || tool === "lasso") {
      pen.setSettings({ tool });
      return;
    }
    const d = TOOL_DEFAULTS[tool];
    const keepColor = tool === "highlighter" ? (HIGHLIGHT_TOKENS as readonly string[]).includes(s.color) : (INK_TOKENS as readonly string[]).includes(s.color);
    pen.setSettings({ tool, width: d.width, color: keepColor ? s.color : d.color });
  };

  return (
    <div className="ds-palette ds-glass ds-pen-ignore" role="toolbar" aria-label="Перо">
      <button type="button" className={`ds-pal-tool${s.tool === null ? " is-active" : ""}`} title="Текст (перо выделяет и печатает)" aria-pressed={s.tool === null} onClick={() => pick(null)}>
        <ToolIcon tool="text" color="currentColor" />
      </button>
      {(["pen", "pencil", "marker", "highlighter", "eraser"] as const).map((tool) => (
        <button
          key={tool}
          type="button"
          className={`ds-pal-tool ds-pal-nib${s.tool === tool ? " is-active" : ""}`}
          title={tool === "eraser" ? `${TOOL_LABELS.eraser}: ${s.eraserMode === "stroke" ? "по штриху" : "по пикселю"} (нажмите ещё раз, чтобы сменить)` : TOOL_LABELS[tool]}
          aria-pressed={s.tool === tool}
          onClick={() => pick(tool)}
        >
          <ToolIcon tool={tool} color={colorTokenVar(s.tool === tool ? s.color : TOOL_DEFAULTS[tool === "eraser" ? "pen" : tool].color)} />
          {tool === "eraser" && s.tool === "eraser" && <span className="ds-pal-badge">{s.eraserMode === "stroke" ? "штрих" : "пиксель"}</span>}
        </button>
      ))}
      <button
        type="button"
        className={`ds-pal-tool ds-pal-lasso${s.tool === "lasso" ? " is-active" : ""}`}
        title={TOOL_LABELS.lasso}
        aria-pressed={s.tool === "lasso"}
        onClick={() => pick("lasso")}
      >
        <ToolIcon tool="lasso" color="currentColor" />
      </button>
      <span className="ds-pal-sep" />
      {strokeTool && (
        <>
          <div className="ds-pal-colors">
            {colors.map((c) => (
              <button key={c} type="button" className={`ds-pal-color${s.color === c ? " is-active" : ""}`} title={c} aria-label={c} style={{ background: colorTokenVar(c) }} onClick={() => pen.setSettings({ color: c })} />
            ))}
          </div>
          <div className="ds-pal-widths">
            {WIDTH_STEPS.map((k) => (
              <button key={k} type="button" className={`ds-pal-width${Math.abs(s.width - base * k) < 0.01 ? " is-active" : ""}`} title={`Толщина ×${k}`} onClick={() => pen.setSettings({ width: base * k })}>
                <span style={{ width: 4 + k * 6, height: 4 + k * 6, background: colorTokenVar(s.color) }} />
              </button>
            ))}
          </div>
          <span className="ds-pal-sep" />
        </>
      )}
      <button
        type="button"
        className={`ds-pal-toggle${s.drawWithAnyPointer ? " is-active" : ""}`}
        title="Рисовать мышью и пальцем (иначе — только стилусом)"
        aria-pressed={s.drawWithAnyPointer}
        onClick={() => pen.setSettings({ drawWithAnyPointer: !s.drawWithAnyPointer })}
      >
        ☝︎
      </button>
      <button type="button" className="ds-pal-toggle" title="Отменить (⌘Z)" disabled={!canUndo} onClick={() => undoManager.undo()}>
        ↶
      </button>
      <button type="button" className="ds-pal-toggle" title="Повторить (⇧⌘Z)" disabled={!canRedo} onClick={() => undoManager.redo()}>
        ↷
      </button>
    </div>
  );
}
