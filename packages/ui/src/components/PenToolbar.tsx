import { ChevronDown, Hand, Plus, Redo2, Type, Undo2 } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useLocale } from "../lib/i18n";
import { spring, type InkName } from "../lib/tokens";
import type { HighlightName } from "@datascratch/design-tokens";
import { ColorPicker } from "./ColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Tooltip } from "./Tooltip";

/** Stroke tools of contracts/strokes.md plus eraser and lasso. `null` = text mode (the pen types and selects). */
export type PenTool = "pen" | "pencil" | "marker" | "highlighter" | "eraser" | "lasso";
export type PenWidth = 1 | 2 | 3;
export type EraserMode = "stroke" | "pixel";
/** A preset token name or a custom `#RRGGBB` (strokes.md §1). */
export type PenColor = InkName | HighlightName | `#${string}`;
export type PenColorFamily = "ink" | "highlight";

export interface PenSelection {
  tool: PenTool | null;
  /** `highlight.*` or a custom hex for the highlighter; `ink.*` or a custom hex for other tools. */
  color: PenColor;
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
const RECENT_MAX = 6;

export const isCustomColor = (c: string): c is `#${string}` => /^#[0-9a-f]{6}$/i.test(c);
const isHighlight = (c: string): c is HighlightName => (HIGHLIGHT_NAMES as string[]).includes(c);
const isInk = (c: string): c is InkName => (INK_NAMES as string[]).includes(c);
const familyOf = (tool: PenTool | null): PenColorFamily =>
  tool === "highlighter" ? "highlight" : "ink";

/** CSS colour for a pen colour in a family. */
export function penColorCss(color: PenColor, family: PenColorFamily): string {
  if (isCustomColor(color)) return color;
  return family === "highlight" ? `var(--ds-highlight-${color})` : `var(--ds-ink-${color})`;
}

/** The value stored in a stroke (strokes.md §1): `ink.black`, `highlight.yellow` or `#RRGGBB`. */
export function penColorToken(color: PenColor, family: PenColorFamily): string {
  if (isCustomColor(color)) return color.toUpperCase();
  return `${family}.${color}`;
}

/** Newest first, uppercase, deduplicated, at most 6 (same rule as DSRecentPenColors on iOS). */
export function pushRecentColor(list: string[], hex: string): string[] {
  const h = hex.toUpperCase();
  return [h, ...list.filter((x) => x.toUpperCase() !== h)].slice(0, RECENT_MAX);
}

const storageKey = (f: PenColorFamily) => `ds.pen.recent.${f}`;

/** Recent custom colours per family, kept in localStorage (a per-viewer convenience). */
export function useRecentPenColors() {
  const read = (f: PenColorFamily): string[] => {
    try {
      const v = JSON.parse(localStorage.getItem(storageKey(f)) ?? "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string" && isCustomColor(x)) : [];
    } catch {
      return [];
    }
  };
  const [recent, setRecent] = useState<Record<PenColorFamily, string[]>>(() => ({
    ink: read("ink"),
    highlight: read("highlight"),
  }));
  const push = useCallback((family: PenColorFamily, hex: string) => {
    setRecent((r) => {
      const next = { ...r, [family]: pushRecentColor(r[family], hex) };
      try {
        localStorage.setItem(storageKey(family), JSON.stringify(next[family]));
      } catch {
        /* storage unavailable: keep in memory */
      }
      return next;
    });
  }, []);
  return { recent, push };
}

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
    custom: "Свой цвет",
    recent: "Недавний цвет",
    width: "Толщина",
    widths: ["Тонкая", "Средняя", "Толстая"],
    anyPointer: "Рисовать мышью и пальцем",
    undo: "Отменить",
    redo: "Повторить",
    collapse: "Свернуть палитру",
    expand: "Развернуть палитру",
    more: "Цвет, толщина и другие настройки",
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
    custom: "Custom color",
    recent: "Recent color",
    width: "Width",
    widths: ["Fine", "Medium", "Bold"],
    anyPointer: "Draw with mouse and finger",
    undo: "Undo",
    redo: "Redo",
    collapse: "Collapse palette",
    expand: "Expand palette",
    more: "Color, width and more",
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

/**
 * Realistic tool art (Apple Notes / GoodNotes feel): a filled barrel with a soft
 * highlight, a band and a tip in the current colour. Same shapes as `DSPenNib`.
 * Draw at 20×56 (viewBox 24×64); the bottom is meant to be clipped by the tray.
 */
export function PenNib({
  tool,
  color,
  className,
}: {
  tool: PenTool | "text";
  color: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const barrel = (x: number, w: number, top: number) => (
    <>
      <rect
        x={x}
        y={top}
        width={w}
        height={64 - top + 6}
        rx={w / 2.6}
        fill={`url(#b${id})`}
        stroke="var(--ui-nib-edge)"
        strokeWidth="0.6"
      />
      <rect
        x={x + 1.3}
        y={top + 2}
        width="1"
        height={64 - top}
        rx="0.5"
        fill="var(--ui-nib-shine)"
      />
    </>
  );
  const band = (x: number, w: number, y: number) => (
    <rect x={x} y={y} width={w} height="3.6" fill={color} />
  );
  let art: ReactNode;
  switch (tool) {
    case "pen":
      art = (
        <>
          {barrel(7, 10, 24)}
          {band(7, 10, 30)}
          <path d="M8 24.5 9.5 17h5l1.5 7.5Z" fill={`url(#m${id})`} />
          <path d="M9.6 17.2 12 6l2.4 11.2Z" fill={color} />
          <path d="M11.5 8.5 12 6l.5 2.5Z" fill="var(--ui-nib-shine)" opacity="0.7" />
        </>
      );
      break;
    case "pencil":
      art = (
        <>
          {barrel(7, 10, 24)}
          {band(7, 10, 30)}
          <path d="M7 24.5 12 11l5 13.5Z" fill={`url(#w${id})`} />
          <path d="M10.15 16 12 11l1.85 5Z" fill={color} />
        </>
      );
      break;
    case "marker":
      art = (
        <>
          {barrel(6, 12, 22)}
          {band(6, 12, 28)}
          <path d="M7.5 22.5 8.4 15h7.2l.9 7.5Z" fill={`url(#m${id})`} />
          <rect x="9" y="8.5" width="6" height="7" rx="2.6" fill={color} />
        </>
      );
      break;
    case "highlighter":
      art = (
        <>
          {barrel(5.5, 13, 22)}
          {band(5.5, 13, 28)}
          <path d="M7 22.5 7.5 15h9l.5 7.5Z" fill={`url(#m${id})`} />
          <path d="M8 15.2V10l8-3.5v8.7Z" fill={color} opacity="0.9" />
        </>
      );
      break;
    case "eraser":
      art = (
        <>
          {barrel(5.5, 13, 24)}
          <rect
            x="5.5"
            y="10"
            width="13"
            height="16"
            rx="3.4"
            fill="var(--ds-tint-pink-bg)"
            stroke="var(--ui-nib-edge)"
            strokeWidth="0.6"
          />
          <rect
            x="5.5"
            y="21"
            width="13"
            height="3"
            fill="color-mix(in oklab, var(--ds-tint-pink-fg) 45%, transparent)"
          />
        </>
      );
      break;
    case "lasso":
      art = (
        <>
          {barrel(8, 8, 30)}
          <ellipse
            cx="12"
            cy="15"
            rx="8"
            ry="6.5"
            fill="none"
            stroke="var(--ds-text-secondary)"
            strokeWidth="1.6"
            strokeDasharray="3 2.6"
          />
          <path d="M12 21.5v8.5" stroke="var(--ds-text-secondary)" strokeWidth="1.4" />
        </>
      );
      break;
    default:
      art = null;
  }
  return (
    <svg
      viewBox="0 0 24 64"
      aria-hidden
      className={cn("h-[60px] w-[22px] overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--ui-nib-body-a)" />
          <stop offset="1" stopColor="var(--ui-nib-body-b)" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#C9C5BE" />
          <stop offset="0.5" stopColor="#F1EEE8" />
          <stop offset="1" stopColor="#A8A39B" />
        </linearGradient>
        <linearGradient id={`w${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#E9C79A" />
          <stop offset="1" stopColor="#D4A877" />
        </linearGradient>
      </defs>
      {art}
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
  /**
   * Fold colours and widths into one swatch button with a popover (phones).
   * "auto" (default) folds below a 640px wide viewport.
   */
  compact?: boolean | "auto";
  /** Collapsed into one round button. Pass `onCollapsedChange` to make the palette collapsible. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Recent custom colours (controlled). Omit to keep them in localStorage. */
  recentColors?: Record<PenColorFamily, string[]>;
  onRecentColor?: (family: PenColorFamily, hex: string) => void;
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
 * Pen palette (D-15, D-38): tools stand in a quiet glass tray and the chosen one
 * rises; each nib wears the current ink. Presets from tokens, recent custom
 * colours and a picker; widths as dots of real thickness; finger drawing,
 * undo/redo; compact (phones) and collapsed states. The editor positions it.
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
  compact = "auto",
  collapsed = false,
  onCollapsedChange,
  recentColors,
  onRecentColor,
  className,
}: PenToolbarProps) {
  const locale = useLocale();
  const t = L[locale];
  const names = penColorNames[locale];
  const reduce = useReducedMotion();
  const id = useId();
  const narrow = useNarrow(compact === "auto");
  const folded = compact === true || (compact === "auto" && narrow);
  const stored = useRecentPenColors();
  const recent = recentColors ?? stored.recent;
  const pushRecent = (f: PenColorFamily, hex: string) => {
    if (onRecentColor) onRecentColor(f, hex);
    else stored.push(f, hex);
  };

  // Last colour per family, so switching tools restores it.
  const last = useRef<{ ink: PenColor; highlight: PenColor }>({
    ink: "black",
    highlight: "yellow",
  });
  if (value.tool === "highlighter") {
    if (isHighlight(value.color) || isCustomColor(value.color))
      last.current.highlight = value.color;
  } else if (value.tool !== null && (isInk(value.color) || isCustomColor(value.color))) {
    last.current.ink = value.color;
  }

  const drawing = value.tool !== null && value.tool !== "eraser" && value.tool !== "lasso";
  const family = familyOf(value.tool);
  const presets: PenColor[] = family === "highlight" ? HIGHLIGHT_NAMES : INK_NAMES;
  const transition = reduce ? { duration: 0.15 } : spring("snappy");
  const current = penColorCss(value.color, family);

  const pick = (tool: PenTool | null) => {
    if (tool === "eraser" && value.tool === "eraser") {
      onChange({ ...value, eraserMode: value.eraserMode === "stroke" ? "pixel" : "stroke" });
      return;
    }
    let color = value.color;
    if (tool === "highlighter" && value.tool !== "highlighter") color = last.current.highlight;
    const inks = tool !== null && tool !== "eraser" && tool !== "lasso" && tool !== "highlighter";
    if (inks && (value.tool === "highlighter" || !(isInk(color) || isCustomColor(color))))
      color = last.current.ink;
    onChange({ ...value, tool, color });
  };

  const nibColor = (tool: PenTool) =>
    tool === "highlighter"
      ? penColorCss(
          value.tool === "highlighter" ? value.color : last.current.highlight,
          "highlight",
        )
      : penColorCss(value.tool === tool ? value.color : last.current.ink, "ink");

  // ---------- collapsed ----------
  if (collapsed && onCollapsedChange) {
    return (
      <Tooltip content={t.expand}>
        <motion.button
          type="button"
          layoutId={`${id}-pal`}
          aria-label={t.expand}
          data-testid="pen-expand"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCollapsedChange(false)}
          className={cn(
            "glass grid size-[52px] place-items-center overflow-hidden rounded-full outline-none focus-visible:focus-ring",
            className,
          )}
        >
          {value.tool === null ? (
            <Type className="size-5 text-fg" />
          ) : (
            <PenNib tool={value.tool} color={nibColor(value.tool)} className="mt-6 h-12" />
          )}
        </motion.button>
      </Tooltip>
    );
  }

  const sep = <span aria-hidden className="mx-1 h-7 w-px shrink-0 self-center bg-separator" />;

  const toolSlot = (
    key: string,
    label: string,
    active: boolean,
    onClick: () => void,
    art: ReactNode,
    badge?: string,
  ) => (
    <Tooltip key={key} content={label}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        data-testid={`tool-${key}`}
        onClick={onClick}
        className={cn(
          "group relative flex h-[60px] shrink-0 justify-center overflow-hidden rounded-[14px] outline-none focus-visible:focus-ring",
          folded ? "w-9" : "w-11",
        )}
      >
        <motion.span
          className="absolute top-0 flex h-full items-start justify-center"
          initial={false}
          animate={{ y: active ? 2 : 14 }}
          transition={transition}
          style={{ filter: active ? "drop-shadow(0 4px 6px rgb(0 0 0 / 0.14))" : undefined }}
        >
          {art}
        </motion.span>
        {badge && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-1.5 text-[10px] font-medium leading-[14px] text-canvas">
            {badge}
          </span>
        )}
      </button>
    </Tooltip>
  );

  const swatch = (c: PenColor, label: string, testId: string) => {
    const selected = value.color.toString().toUpperCase() === c.toString().toUpperCase();
    const css = penColorCss(c, family);
    return (
      <button
        key={testId}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={label}
        data-testid={testId}
        onClick={() => onChange({ ...value, color: c })}
        className="relative grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:focus-ring"
      >
        {selected && (
          <motion.span
            layoutId={`${id}-swatch`}
            transition={transition}
            className="absolute inset-[2px] rounded-full border-2"
            style={{
              borderColor:
                family === "highlight"
                  ? `color-mix(in oklab, ${css}, var(--ds-text-primary) 30%)`
                  : css,
            }}
          />
        )}
        <span
          className={cn(
            "rounded-full transition-[width,height] duration-fast ease-snappy",
            selected ? "size-[18px]" : "size-[22px]",
          )}
          style={{
            backgroundColor: css,
            boxShadow:
              "inset 0 0 0 0.5px color-mix(in oklab, var(--ds-text-primary) 22%, transparent)",
          }}
        />
      </button>
    );
  };

  const colours = (
    <div role="radiogroup" aria-label={t.color} className="flex items-center">
      {presets.map((c) => swatch(c, names[c as keyof typeof names] ?? c, `color-${c}`))}
      {recent[family].map((hex, i) =>
        swatch(hex as PenColor, `${t.recent} ${hex}`, `color-recent-${i}`),
      )}
      <Popover>
        <Tooltip content={t.custom}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t.custom}
              data-testid="color-custom"
              className="grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:focus-ring"
            >
              <span className="grid size-[22px] place-items-center rounded-full border-[1.5px] border-dashed border-[color-mix(in_oklab,var(--ds-text-tertiary)_70%,transparent)] text-fg-secondary">
                <Plus className="size-3.5" />
              </span>
            </button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          side="top"
          align="center"
          className="w-auto p-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ColorPicker
            initial={isCustomColor(value.color) ? value.color : "#2B58DA"}
            onPick={(hex) => {
              pushRecent(family, hex);
              onChange({ ...value, color: hex as PenColor });
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const widths = (
    <div role="radiogroup" aria-label={t.width} className="flex items-center">
      {([1, 2, 3] as const).map((w, i) => {
        const d = family === "highlight" ? [8, 12, 16][i]! : [4, 7, 11][i]!;
        return (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={value.width === w}
            aria-label={t.widths[i]}
            data-testid={`width-${w}`}
            onClick={() => onChange({ ...value, width: w })}
            className="relative grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:focus-ring"
          >
            {value.width === w && (
              <motion.span
                layoutId={`${id}-width`}
                transition={transition}
                className="absolute inset-0 rounded-full bg-selected"
              />
            )}
            <span
              className="relative"
              style={
                family === "highlight"
                  ? {
                      width: 14,
                      height: d,
                      borderRadius: 2,
                      backgroundColor: current,
                      opacity: 0.85,
                    }
                  : { width: d, height: d, borderRadius: 9999, backgroundColor: current }
              }
            />
          </button>
        );
      })}
    </div>
  );

  const roundBtn = (
    testId: string,
    label: string,
    icon: ReactNode,
    onClick?: () => void,
    opts: { pressed?: boolean; disabled?: boolean; shortcut?: string } = {},
  ) => (
    <Tooltip content={label} {...(opts.shortcut ? { shortcut: opts.shortcut } : {})}>
      <button
        type="button"
        aria-label={label}
        data-testid={testId}
        {...(opts.pressed !== undefined ? { "aria-pressed": opts.pressed } : {})}
        disabled={opts.disabled}
        onClick={onClick}
        className={cn(
          folded ? "size-8" : "size-9",
          "grid shrink-0 place-items-center rounded-full text-fg-secondary outline-none transition-colors duration-fast",
          "hover:bg-hover hover:text-fg focus-visible:focus-ring disabled:opacity-35 disabled:hover:bg-transparent",
          "aria-pressed:bg-accent-soft aria-pressed:text-accent [&_svg]:size-[18px]",
        )}
      >
        {icon}
      </button>
    </Tooltip>
  );

  const extras = (
    <>
      {roundBtn(
        "tool-finger",
        t.anyPointer,
        <Hand />,
        () => onChange({ ...value, drawWithAnyPointer: !value.drawWithAnyPointer }),
        {
          pressed: value.drawWithAnyPointer,
        },
      )}
      {(onUndo || onRedo) && (
        <>
          {roundBtn("tool-undo", t.undo, <Undo2 />, onUndo, {
            disabled: !canUndo,
            shortcut: "mod+z",
          })}
          {roundBtn("tool-redo", t.redo, <Redo2 />, onRedo, {
            disabled: !canRedo,
            shortcut: "mod+shift+z",
          })}
        </>
      )}
    </>
  );

  return (
    <LayoutGroup id={id}>
      <motion.div
        layoutId={`${id}-pal`}
        role="toolbar"
        aria-label={t.toolbar}
        onMouseDown={(e) => e.preventDefault()}
        className={cn("glass inline-flex items-end gap-0.5 rounded-[22px] px-2 pt-1", className)}
      >
        {textMode &&
          toolSlot(
            "text",
            t.text,
            value.tool === null,
            () => pick(null),
            <span className="mt-1.5 grid h-9 w-8 place-items-center font-display text-h3 text-fg">
              Aa
            </span>,
          )}
        {tools.map((tool) =>
          toolSlot(
            tool,
            tool === "eraser"
              ? `${t.eraser}: ${value.eraserMode === "stroke" ? t.stroke : t.pixel} (${t.eraserHint})`
              : t[tool],
            value.tool === tool,
            () => pick(tool),
            <PenNib
              tool={tool}
              color={tool === "eraser" || tool === "lasso" ? "" : nibColor(tool)}
            />,
            tool === "eraser" && value.tool === "eraser"
              ? value.eraserMode === "stroke"
                ? t.stroke
                : t.pixel
              : undefined,
          ),
        )}
        <div className="flex h-[60px] items-center gap-0.5 self-end pb-1">
          {drawing && !folded && (
            <>
              {sep}
              {colours}
              {sep}
              {widths}
            </>
          )}
          {folded ? (
            <>
              {sep}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t.more}
                    data-testid="tool-more"
                    className="grid size-8 shrink-0 place-items-center rounded-full outline-none hover:bg-hover focus-visible:focus-ring"
                  >
                    {drawing ? (
                      <span
                        className="rounded-full"
                        style={{
                          width: 8 + value.width * 4,
                          height: 8 + value.width * 4,
                          backgroundColor: current,
                        }}
                      />
                    ) : (
                      <ChevronDown className="size-4 rotate-180 text-fg-secondary" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="flex w-auto flex-col gap-2 rounded-[20px] p-2"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {drawing && (
                    <>
                      {colours}
                      {widths}
                    </>
                  )}
                  <div className="flex items-center">{extras}</div>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <>
              {sep}
              {extras}
            </>
          )}
          {onCollapsedChange &&
            roundBtn("tool-collapse", t.collapse, <ChevronDown />, () => onCollapsedChange(true))}
        </div>
      </motion.div>
    </LayoutGroup>
  );
}
