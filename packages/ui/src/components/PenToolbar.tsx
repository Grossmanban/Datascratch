import { Hand, Lasso, Redo2, Type, Undo2 } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useLocale } from "../lib/i18n";
import { spring, type InkName } from "../lib/tokens";
import type { HighlightName } from "@datascratch/design-tokens";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Tooltip } from "./Tooltip";

/** Stroke tools of contracts/strokes.md plus eraser and lasso. `null` = text mode (the pen types and selects). */
export type PenTool = "pen" | "pencil" | "marker" | "highlighter" | "eraser" | "lasso";
export type PenWidth = 1 | 2 | 3;
export type EraserMode = "stroke" | "pixel";

export interface PenSelection {
  tool: PenTool | null;
  /** `highlight.*` for the highlighter, `ink.*` for every other tool. */
  color: InkName | HighlightName;
  /** Multiplier step of the tool's base width (the editor owns base widths). */
  width: PenWidth;
  eraserMode: EraserMode;
  /** Draw with mouse and finger too (otherwise stylus only). */
  drawWithAnyPointer: boolean;
}

export const defaultPenSelection: PenSelection = {
  tool: "pen",
  color: "black",
  width: 2,
  eraserMode: "stroke",
  drawWithAnyPointer: false,
};

export const INK_NAMES: InkName[] = ["black", "blue", "red", "green", "purple", "brown"];
export const HIGHLIGHT_NAMES: HighlightName[] = ["yellow", "green", "pink", "blue"];

const isHighlight = (c: string): c is HighlightName => (HIGHLIGHT_NAMES as string[]).includes(c);
const isInk = (c: string): c is InkName => (INK_NAMES as string[]).includes(c);
const colorVar = (tool: PenTool | null, c: string) =>
  tool === "highlighter" ? `var(--ds-highlight-${c})` : `var(--ds-ink-${c})`;

const L = {
  ru: {
    toolbar: "Перо",
    text: "Текст (перо печатает и выделяет)",
    pen: "Ручка",
    pencil: "Карандаш",
    marker: "Маркер",
    highlighter: "Текстовыделитель",
    eraser: "Ластик",
    lasso: "Лассо",
    stroke: "штрих",
    pixel: "пиксель",
    eraserHint: "нажмите ещё раз, чтобы сменить режим",
    color: "Цвет",
    width: "Толщина",
    widths: ["Тонкая", "Средняя", "Толстая"],
    anyPointer: "Рисовать мышью и пальцем",
    undo: "Отменить",
    redo: "Повторить",
  },
  en: {
    toolbar: "Pen",
    text: "Text (the pen types and selects)",
    pen: "Pen",
    pencil: "Pencil",
    marker: "Marker",
    highlighter: "Highlighter",
    eraser: "Eraser",
    lasso: "Lasso",
    stroke: "stroke",
    pixel: "pixel",
    eraserHint: "press again to switch mode",
    color: "Color",
    width: "Width",
    widths: ["Fine", "Medium", "Bold"],
    anyPointer: "Draw with mouse and finger",
    undo: "Undo",
    redo: "Redo",
  },
} as const;

export const penColorNames = {
  ru: {
    black: "Чёрный",
    blue: "Синий",
    red: "Красный",
    green: "Зелёный",
    purple: "Фиолетовый",
    brown: "Коричневый",
    yellow: "Жёлтый",
    pink: "Розовый",
  },
  en: {
    black: "Black",
    blue: "Blue",
    red: "Red",
    green: "Green",
    purple: "Purple",
    brown: "Brown",
    yellow: "Yellow",
    pink: "Pink",
  },
} as const;

/** Nib silhouettes: the tip takes the current colour (Goodnotes-like, quieter). */
function Nib({ tool, color }: { tool: Exclude<PenTool, "lasso">; color: string }) {
  const tips: Record<typeof tool, string> = {
    pen: "M10.2 9 12 2.5 13.8 9Z",
    pencil: "M9.6 9.5 12 1.8 14.4 9.5Z",
    marker: "M9.2 9.5 9.6 4.5h4.8l.4 5Z",
    highlighter: "M8.4 9.5V5.6l7.2-2.6v6.5Z",
    eraser: "M8.4 9.5V6.2c0-1.7 7.2-1.7 7.2 0v3.3Z",
  };
  const wide = tool === "highlighter" || tool === "eraser";
  return (
    <svg viewBox="5 1 14 25" aria-hidden className="!h-8 !w-[18px] overflow-visible">
      <path d={tips[tool]} fill={tool === "eraser" ? "var(--ds-tint-pink-fg)" : color} />
      <rect
        x={wide ? 8.4 : 9.2}
        y="9.5"
        width={wide ? 7.2 : 5.6}
        height="16"
        rx="1.6"
        fill="var(--ds-bg-surface)"
        stroke="color-mix(in oklab, var(--ds-text-primary) 28%, transparent)"
        strokeWidth="0.9"
      />
    </svg>
  );
}

export interface PenToolbarProps {
  value: PenSelection;
  onChange: (value: PenSelection) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Tools to show, in order. */
  tools?: PenTool[];
  /** Show the "text" (no ink) mode button. */
  textMode?: boolean;
  orientation?: "horizontal" | "vertical";
  /**
   * Fold colours and widths into one swatch button with a popover (phones).
   * "auto" (default) folds below a 640px wide viewport.
   */
  compact?: boolean | "auto";
  className?: string;
}

function useNarrow(enabled: boolean) {
  const query = "(max-width: 639px)";
  const [narrow, setNarrow] = useState(
    () => enabled && typeof window !== "undefined" && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    if (!enabled) return;
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [enabled]);
  return narrow;
}

/**
 * Glass pen palette (D-38): text mode, nibs coloured by ink, inks and
 * highlighters from tokens, widths, eraser mode, finger drawing, undo/redo.
 * The editor positions it; this is only the pill.
 */
export function PenToolbar({
  value,
  onChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  tools = ["pen", "pencil", "marker", "highlighter", "eraser"],
  textMode = true,
  orientation = "horizontal",
  compact = "auto",
  className,
}: PenToolbarProps) {
  const narrow = useNarrow(compact === "auto");
  const folded = compact === true || (compact === "auto" && narrow);
  const locale = useLocale();
  const t = L[locale];
  const names = penColorNames[locale];
  const reduce = useReducedMotion();
  const id = useId();
  const vertical = orientation === "vertical";
  // Remember the last ink and highlighter so switching tools restores them.
  const last = useRef<{ ink: InkName; highlight: HighlightName }>({
    ink: "black",
    highlight: "yellow",
  });
  if (value.tool === "highlighter") {
    if (isHighlight(value.color)) last.current.highlight = value.color;
  } else if (isInk(value.color)) last.current.ink = value.color;

  const drawing = value.tool !== null && value.tool !== "eraser" && value.tool !== "lasso";
  const colors = value.tool === "highlighter" ? HIGHLIGHT_NAMES : INK_NAMES;
  const transition = reduce ? { duration: 0 } : spring("snappy");

  const pick = (tool: PenTool | null) => {
    if (tool === "eraser" && value.tool === "eraser") {
      onChange({ ...value, eraserMode: value.eraserMode === "stroke" ? "pixel" : "stroke" });
      return;
    }
    const inks = tool !== null && tool !== "eraser" && tool !== "lasso" && tool !== "highlighter";
    let color = value.color;
    if (tool === "highlighter" && value.tool !== "highlighter") color = last.current.highlight;
    if (inks && (value.tool === "highlighter" || !isInk(color))) color = last.current.ink;
    onChange({ ...value, tool, color });
  };

  const sep = (
    <span
      aria-hidden
      className={cn(
        "shrink-0 bg-separator",
        vertical ? "my-1 h-px w-6 self-center" : folded ? "mx-0.5 h-6 w-px" : "mx-1 h-6 w-px",
      )}
    />
  );
  const side = vertical ? "right" : "top";
  const toolBtn = (
    key: string,
    label: string,
    active: boolean,
    onClick: () => void,
    icon: ReactNode,
    badge?: string,
  ) => (
    <Tooltip key={key} content={label} side={side}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        onClick={onClick}
        className={cn(
          folded
            ? "relative grid h-11 w-8 place-items-center rounded-[11px]"
            : "relative grid h-11 w-9 place-items-center rounded-[12px]",
          " text-fg-secondary outline-none transition-colors duration-fast",
          "hover:text-fg focus-visible:focus-ring aria-pressed:text-fg [&_svg]:relative [&_svg]:size-[19px]",
        )}
      >
        {active && (
          <motion.span
            layoutId="pen-tool"
            transition={transition}
            className="absolute inset-0 rounded-[12px] bg-selected"
          />
        )}
        <motion.span
          className="relative grid place-items-center"
          animate={{ y: active && !reduce ? -2 : 0 }}
          transition={transition}
        >
          {icon}
        </motion.span>
        {badge && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-1.5 text-[10px] font-medium leading-[14px] text-canvas">
            {badge}
          </span>
        )}
      </button>
    </Tooltip>
  );

  const sepFor = (v: boolean) => (
    <span
      aria-hidden
      className={cn("shrink-0 bg-separator", v ? "my-1 h-px w-6 self-center" : "mx-1 h-6 w-px")}
    />
  );
  const colorAndWidth = (v: boolean) => (
    <>
      <div
        role="radiogroup"
        aria-label={t.color}
        className={cn("flex items-center", v && "flex-col")}
      >
        {colors.map((c) => {
          const selected = value.color === c;
          const v = colorVar(value.tool, c);
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={names[c]}
              onClick={() => onChange({ ...value, color: c })}
              className="relative grid size-8 place-items-center rounded-full outline-none focus-visible:focus-ring"
            >
              {selected && (
                <motion.span
                  layoutId="pen-color"
                  transition={transition}
                  className="absolute inset-[3px] rounded-full border-2"
                  style={{
                    borderColor:
                      value.tool === "highlighter"
                        ? `color-mix(in oklab, ${v}, var(--ds-text-primary) 30%)`
                        : v,
                  }}
                />
              )}
              <span
                className={cn(
                  "rounded-full transition-[width,height] duration-fast ease-snappy",
                  selected ? "size-4" : "size-5",
                )}
                style={{
                  backgroundColor: v,
                  boxShadow:
                    "inset 0 0 0 0.5px color-mix(in oklab, var(--ds-text-primary) 22%, transparent)",
                }}
              />
            </button>
          );
        })}
      </div>
      {sepFor(v)}
      <div
        role="radiogroup"
        aria-label={t.width}
        className={cn("flex items-center", v && "flex-col")}
      >
        {([1, 2, 3] as const).map((w, i) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={value.width === w}
            aria-label={t.widths[i]}
            onClick={() => onChange({ ...value, width: w })}
            className="relative grid size-8 place-items-center rounded-full outline-none focus-visible:focus-ring"
          >
            {value.width === w && (
              <motion.span
                layoutId="pen-width"
                transition={transition}
                className="absolute inset-0 rounded-full bg-selected"
              />
            )}
            <span
              className="relative rounded-full"
              style={{
                width: 3 + w * 3,
                height: 3 + w * 3,
                backgroundColor: colorVar(value.tool, value.color),
              }}
            />
          </button>
        ))}
      </div>
    </>
  );

  return (
    <LayoutGroup id={id}>
      <div
        role="toolbar"
        aria-label={t.toolbar}
        aria-orientation={orientation}
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "glass inline-flex items-center rounded-[20px] p-1",
          folded ? "gap-0" : "gap-0.5",
          vertical && "flex-col",
          className,
        )}
      >
        {textMode && toolBtn("text", t.text, value.tool === null, () => pick(null), <Type />)}
        {tools.map((tool) =>
          toolBtn(
            tool,
            tool === "eraser"
              ? `${t.eraser}: ${value.eraserMode === "stroke" ? t.stroke : t.pixel} (${t.eraserHint})`
              : t[tool],
            value.tool === tool,
            () => pick(tool),
            tool === "lasso" ? (
              <Lasso />
            ) : (
              <Nib
                tool={tool}
                color={colorVar(
                  tool,
                  value.tool === tool
                    ? value.color
                    : tool === "highlighter"
                      ? last.current.highlight
                      : last.current.ink,
                )}
              />
            ),
            tool === "eraser" && value.tool === "eraser"
              ? value.eraserMode === "stroke"
                ? t.stroke
                : t.pixel
              : undefined,
          ),
        )}

        {drawing && !folded && (
          <>
            {sep}
            {colorAndWidth(vertical)}
          </>
        )}
        {drawing && folded && (
          <>
            {sep}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${t.color}, ${t.width}`}
                  className={cn(
                    folded ? "size-8" : "size-9",
                    "grid place-items-center rounded-full outline-none hover:bg-hover focus-visible:focus-ring",
                  )}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: 10 + value.width * 3,
                      height: 10 + value.width * 3,
                      backgroundColor: colorVar(value.tool, value.color),
                      boxShadow:
                        "inset 0 0 0 0.5px color-mix(in oklab, var(--ds-text-primary) 22%, transparent)",
                    }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                className="flex w-auto items-center rounded-[20px] p-1"
                onMouseDown={(e) => e.preventDefault()}
              >
                {colorAndWidth(false)}
              </PopoverContent>
            </Popover>
          </>
        )}

        {sep}
        <Tooltip content={t.anyPointer} side={side}>
          <button
            type="button"
            aria-pressed={value.drawWithAnyPointer}
            aria-label={t.anyPointer}
            onClick={() => onChange({ ...value, drawWithAnyPointer: !value.drawWithAnyPointer })}
            className={cn(
              folded ? "size-8" : "size-9",
              "grid place-items-center rounded-full text-fg-secondary outline-none transition-colors duration-fast hover:bg-hover hover:text-fg focus-visible:focus-ring aria-pressed:bg-accent-soft aria-pressed:text-accent [&_svg]:size-[18px]",
            )}
          >
            <Hand />
          </button>
        </Tooltip>
        {(onUndo || onRedo) && (
          <>
            <Tooltip content={t.undo} shortcut="mod+z" side={side}>
              <button
                type="button"
                aria-label={t.undo}
                disabled={!canUndo}
                onClick={onUndo}
                className={cn(
                  folded ? "size-8" : "size-9",
                  "grid place-items-center rounded-full text-fg-secondary outline-none hover:bg-hover hover:text-fg focus-visible:focus-ring disabled:opacity-35 disabled:hover:bg-transparent [&_svg]:size-[18px]",
                )}
              >
                <Undo2 />
              </button>
            </Tooltip>
            <Tooltip content={t.redo} shortcut="mod+shift+z" side={side}>
              <button
                type="button"
                aria-label={t.redo}
                disabled={!canRedo}
                onClick={onRedo}
                className={cn(
                  folded ? "size-8" : "size-9",
                  "grid place-items-center rounded-full text-fg-secondary outline-none hover:bg-hover hover:text-fg focus-visible:focus-ring disabled:opacity-35 disabled:hover:bg-transparent [&_svg]:size-[18px]",
                )}
              >
                <Redo2 />
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </LayoutGroup>
  );
}
