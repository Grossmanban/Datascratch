import { PenToolbar, penColorToken, type PenSelection, type PenWidth } from "@datascratch/ui";
import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { TOOL_DEFAULTS, type PenLayer, type PenSettings } from "../pen/PenLayer";

/** Width steps of the design-system palette, as multipliers of the tool's base width. */
const WIDTH_STEPS: Record<PenWidth, number> = { 1: 0.6, 2: 1, 3: 1.6 };

function toSelection(s: PenSettings): PenSelection {
  const strokeTool = s.tool && s.tool !== "eraser" && s.tool !== "lasso" ? s.tool : null;
  const base = strokeTool ? TOOL_DEFAULTS[strokeTool].width : 1;
  const ratio = s.width / base;
  const width = (Object.entries(WIDTH_STEPS).reduce((best, [k, v]) => (Math.abs(v - ratio) < Math.abs(WIDTH_STEPS[best] - ratio) ? (Number(k) as PenWidth) : best), 2 as PenWidth));
  return {
    tool: s.tool,
    color: s.color.replace(/^(ink|highlight)\./, "") as PenSelection["color"],
    width,
    eraserMode: s.eraserMode,
    drawWithAnyPointer: s.drawWithAnyPointer,
  };
}

function toSettings(v: PenSelection): Partial<PenSettings> {
  const strokeTool = v.tool && v.tool !== "eraser" && v.tool !== "lasso" ? v.tool : null;
  const patch: Partial<PenSettings> = { tool: v.tool, eraserMode: v.eraserMode, drawWithAnyPointer: v.drawWithAnyPointer };
  if (strokeTool) {
    // Named inks map to tokens, a custom colour to #RRGGBB (strokes.md §1).
    patch.color = penColorToken(v.color, strokeTool === "highlighter" ? "highlight" : "ink");
    patch.width = TOOL_DEFAULTS[strokeTool].width * WIDTH_STEPS[v.width];
  }
  return patch;
}

const COLLAPSED_KEY = "ds.pen.palette.collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** The design-system pen palette (D-38) bound to the pen layer and the shared undo manager. */
export function PenPalette({ pen, undoManager }: { pen: PenLayer; undoManager: Y.UndoManager }) {
  const [s, setS] = useState<PenSettings>(pen.getSettings());
  // Collapsed into one round button; remembered per viewer.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const onCollapsedChange = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      // Storage unavailable (private window): keep the state in memory only.
    }
  };
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

  return (
    <div className="ds-palette ds-pen-ignore">
      <PenToolbar
        value={toSelection(s)}
        onChange={(v) => pen.setSettings(toSettings(v))}
        tools={["pen", "pencil", "marker", "highlighter", "eraser", "lasso"]}
        textMode
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => undoManager.undo()}
        onRedo={() => undoManager.redo()}
      />
    </div>
  );
}
