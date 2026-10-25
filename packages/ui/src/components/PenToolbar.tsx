import { Eraser, Highlighter, Lasso, PenLine } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useLocale } from "../lib/i18n";
import { spring, type InkName } from "../lib/tokens";
import type { HighlightName } from "@datascratch/design-tokens";
import { Tooltip } from "./Tooltip";

export type PenTool = "pen" | "highlighter" | "eraser" | "lasso";
export type PenWidth = 1 | 2 | 3;

export interface PenSelection {
  tool: PenTool;
  ink: InkName;
  highlight: HighlightName;
  width: PenWidth;
}

export const defaultPenSelection: PenSelection = { tool: "pen", ink: "black", highlight: "yellow", width: 2 };

/** Stroke width in CSS px per tool and preset (same numbers as DSPenWidth on iOS). */
export const penWidthPx: Record<"pen" | "highlighter" | "eraser", Record<PenWidth, number>> = {
  pen: { 1: 1.5, 2: 2.5, 3: 4 },
  highlighter: { 1: 10, 2: 16, 3: 24 },
  eraser: { 1: 8, 2: 16, 3: 32 },
};

const INKS: InkName[] = ["black", "blue", "red", "green", "purple", "brown"];
const HIGHLIGHTS: HighlightName[] = ["yellow", "green", "pink", "blue"];

const L = {
  ru: { pen: "Перо", highlighter: "Маркер", eraser: "Ластик", lasso: "Лассо", tools: "Инструмент", color: "Цвет", width: "Толщина", widths: ["Тонкая", "Средняя", "Толстая"] },
  en: { pen: "Pen", highlighter: "Highlighter", eraser: "Eraser", lasso: "Lasso", tools: "Tool", color: "Color", width: "Width", widths: ["Fine", "Medium", "Bold"] },
} as const;

const COLOR_NAMES = {
  ru: { black: "Чёрный", blue: "Синий", red: "Красный", green: "Зелёный", purple: "Фиолетовый", brown: "Коричневый", yellow: "Жёлтый", pink: "Розовый" },
  en: { black: "Black", blue: "Blue", red: "Red", green: "Green", purple: "Purple", brown: "Brown", yellow: "Yellow", pink: "Pink" },
} as const;

const icons: Record<PenTool, ReactNode> = {
  pen: <PenLine />,
  highlighter: <Highlighter />,
  eraser: <Eraser />,
  lasso: <Lasso />,
};

const shortcuts: Record<PenTool, string> = { pen: "p", highlighter: "h", eraser: "e", lasso: "l" };

export interface PenToolbarProps {
  value: PenSelection;
  onChange: (value: PenSelection) => void;
  orientation?: "horizontal" | "vertical";
  /** Tools to show (e.g. no lasso for guests). */
  tools?: PenTool[];
  className?: string;
}

/** Floating glass palette for handwriting: tools, inks from tokens, widths. */
export function PenToolbar({ value, onChange, orientation = "horizontal", tools = ["pen", "highlighter", "eraser", "lasso"], className }: PenToolbarProps) {
  const t = L[useLocale()];
  const names = COLOR_NAMES[useLocale()];
  const reduce = useReducedMotion();
  const id = useId();
  const vertical = orientation === "vertical";
  const showColors = value.tool === "pen" || value.tool === "highlighter";
  const showWidth = value.tool !== "lasso";
  const transition = reduce ? { duration: 0 } : spring("snappy");
  const sep = <span aria-hidden className={cn("shrink-0 bg-separator", vertical ? "mx-auto my-1 h-px w-6" : "mx-1 h-6 w-px")} />;
  const group = cn("flex items-center gap-0.5", vertical && "flex-col");

  return (
    <LayoutGroup id={id}>
      <div
        role="toolbar"
        aria-orientation={orientation}
        className={cn("glass inline-flex items-center rounded-full p-1", vertical && "flex-col", className)}
      >
        <ToggleGroup.Root
          type="single"
          aria-label={t.tools}
          orientation={orientation}
          value={value.tool}
          onValueChange={(v) => v && onChange({ ...value, tool: v as PenTool })}
          className={group}
        >
          {tools.map((tool) => (
            <Tooltip key={tool} content={t[tool]} shortcut={shortcuts[tool]} side={vertical ? "right" : "top"}>
              <ToggleGroup.Item
                value={tool}
                aria-label={t[tool]}
                className="relative grid size-9 place-items-center rounded-full text-fg-secondary outline-none transition-colors duration-fast hover:text-fg focus-visible:focus-ring aria-checked:text-fg [&_svg]:relative [&_svg]:size-[19px]"
              >
                {value.tool === tool && (
                  <motion.span layoutId="pen-tool" transition={transition} className="absolute inset-0 rounded-full bg-selected" />
                )}
                {icons[tool]}
              </ToggleGroup.Item>
            </Tooltip>
          ))}
        </ToggleGroup.Root>

        {showColors && (
          <>
            {sep}
            <ToggleGroup.Root
              type="single"
              aria-label={t.color}
              orientation={orientation}
              value={value.tool === "pen" ? value.ink : value.highlight}
              onValueChange={(v) => {
                if (!v) return;
                onChange(value.tool === "pen" ? { ...value, ink: v as InkName } : { ...value, highlight: v as HighlightName });
              }}
              className={group}
            >
              {(value.tool === "pen" ? INKS : HIGHLIGHTS).map((c) => {
                const selected = (value.tool === "pen" ? value.ink : value.highlight) === c;
                const color = value.tool === "pen" ? `var(--ds-ink-${c})` : `var(--ds-highlight-${c})`;
                return (
                  <ToggleGroup.Item
                    key={c}
                    value={c}
                    aria-label={names[c]}
                    className="relative grid size-8 place-items-center rounded-full outline-none focus-visible:focus-ring"
                  >
                    {selected && (
                      <motion.span
                        layoutId="pen-color"
                        transition={transition}
                        className="absolute inset-[3px] rounded-full border-2"
                        style={{ borderColor: value.tool === "pen" ? color : `color-mix(in oklab, ${color}, var(--ds-text-primary) 25%)` }}
                      />
                    )}
                    <span
                      className={cn("rounded-full transition-transform duration-fast ease-snappy", selected ? "size-4" : "size-5 hover:scale-110")}
                      style={{ backgroundColor: color, boxShadow: "inset 0 0 0 0.5px color-mix(in oklab, var(--ds-text-primary) 20%, transparent)" }}
                    />
                  </ToggleGroup.Item>
                );
              })}
            </ToggleGroup.Root>
          </>
        )}

        {showWidth && (
          <>
            {sep}
            <ToggleGroup.Root
              type="single"
              aria-label={t.width}
              orientation={orientation}
              value={String(value.width)}
              onValueChange={(v) => v && onChange({ ...value, width: Number(v) as PenWidth })}
              className={group}
            >
              {([1, 2, 3] as const).map((w, i) => (
                <ToggleGroup.Item
                  key={w}
                  value={String(w)}
                  aria-label={t.widths[i]}
                  className="relative grid size-8 place-items-center rounded-full text-fg-tertiary outline-none hover:text-fg-secondary focus-visible:focus-ring data-[state=on]:text-fg"
                >
                  {value.width === w && (
                    <motion.span layoutId="pen-width" transition={transition} className="absolute inset-0 rounded-full bg-selected" />
                  )}
                  <span className="relative rounded-full bg-current" style={{ width: 4 + w * 3, height: 4 + w * 3 }} />
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </>
        )}
      </div>
    </LayoutGroup>
  );
}
