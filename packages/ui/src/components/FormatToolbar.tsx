import { Check, Link2Off, X } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useAnchoredPosition, type AnchorRect } from "../lib/floating";
import { useLocale } from "../lib/i18n";
import { tintNames, type TintName } from "../lib/tokens";
import type { HighlightName } from "@datascratch/design-tokens";
import { HIGHLIGHT_NAMES, penColorNames } from "./PenToolbar";
import { Tooltip } from "./Tooltip";

export interface FormatItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
}

export type FormatElement = FormatItem | "separator" | { id: string; render: ReactNode };

export interface FormatToolbarProps {
  items: FormatElement[];
  /** Expanded panel under the buttons (link input, colours…). */
  panel?: ReactNode;
  /**
   * Viewport rect to float above (e.g. the text selection). When given, the
   * bar is portalled and positioned; when omitted it renders in place.
   */
  anchorRect?: AnchorRect | null;
  className?: string;
  "aria-label"?: string;
}

/**
 * Glass bar for text formatting. Toggle state comes from the editor (`active`).
 * Never takes focus from the text: mousedown is prevented on the whole bar
 * (inputs inside `panel` still focus normally).
 */
export function FormatToolbar({
  items,
  panel,
  anchorRect,
  className,
  ...aria
}: FormatToolbarProps) {
  const { ref, style } = useAnchoredPosition(anchorRect, "above");
  const bar = (
    <div
      ref={anchorRect ? ref : undefined}
      role="toolbar"
      aria-label={aria["aria-label"]}
      style={anchorRect ? { ...style, zIndex: 50 } : undefined}
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
      className={cn(
        "glass inline-flex flex-col rounded-[18px] p-1",
        anchorRect && "animate-pop",
        className,
      )}
      data-state="open"
    >
      <div className="flex items-center gap-0.5">
        {items.map((it, i) => {
          if (it === "separator")
            return <span key={`sep-${i}`} aria-hidden className="mx-1 h-5 w-px bg-separator" />;
          if ("render" in it) return <Fragment key={it.id}>{it.render}</Fragment>;
          return (
            <Tooltip
              key={it.id}
              content={it.label}
              {...(it.shortcut ? { shortcut: it.shortcut } : {})}
            >
              <button
                type="button"
                aria-label={it.label}
                aria-pressed={!!it.active}
                disabled={it.disabled}
                onClick={it.onClick}
                className={cn(
                  "grid size-8 place-items-center rounded-full text-fg-secondary outline-none transition-colors duration-fast",
                  "hover:bg-hover hover:text-fg focus-visible:focus-ring disabled:opacity-40",
                  "aria-pressed:bg-accent-soft aria-pressed:text-accent [&_svg]:size-[17px]",
                )}
              >
                {it.icon}
              </button>
            </Tooltip>
          );
        })}
      </div>
      {panel && <div className="mt-1 border-t border-hairline px-1 pb-1 pt-2">{panel}</div>}
    </div>
  );
  return anchorRect ? createPortal(bar, document.body) : bar;
}

const TEXT_TINTS: TintName[] = tintNames.filter((t) => t !== "gray") as TintName[];

export interface ColorPanelProps {
  /** Text colour: `tint.*.fg`; null = default ink. */
  textColor: TintName | null;
  highlight: HighlightName | null;
  onTextColor: (c: TintName | null) => void;
  onHighlight: (c: HighlightName | null) => void;
}

/** Text colour (tints) and highlight (highlighters) swatches for FormatToolbar.panel. */
export function ColorPanel({ textColor, highlight, onTextColor, onHighlight }: ColorPanelProps) {
  const locale = useLocale();
  const L =
    locale === "ru"
      ? { text: "Цвет текста", mark: "Выделение", none: "Без цвета" }
      : { text: "Text color", mark: "Highlight", none: "None" };
  const swatch = (
    key: string,
    label: string,
    selected: boolean,
    onClick: () => void,
    content: ReactNode,
  ) => (
    <button
      key={key}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-full outline-none transition-transform duration-fast hover:scale-110 focus-visible:focus-ring",
        selected &&
          "ring-2 ring-[color-mix(in_oklab,var(--ds-text-primary)_35%,transparent)] ring-offset-1 ring-offset-[var(--ds-bg-surface)]",
      )}
    >
      {content}
    </button>
  );
  return (
    <div className="flex flex-col gap-2 px-1">
      <div role="radiogroup" aria-label={L.text} className="flex items-center gap-0.5">
        {swatch(
          "none",
          L.none,
          textColor === null,
          () => onTextColor(null),
          <span className="font-display text-callout font-semibold text-fg">A</span>,
        )}
        {TEXT_TINTS.map((c) =>
          swatch(
            c,
            c,
            textColor === c,
            () => onTextColor(c),
            <span
              className="font-display text-callout font-semibold"
              style={{ color: `var(--ds-tint-${c}-fg)` }}
            >
              A
            </span>,
          ),
        )}
      </div>
      <div role="radiogroup" aria-label={L.mark} className="flex items-center gap-0.5">
        {swatch(
          "none",
          L.none,
          highlight === null,
          () => onHighlight(null),
          <X className="size-3.5 text-fg-tertiary" />,
        )}
        {HIGHLIGHT_NAMES.map((c) =>
          swatch(
            c,
            penColorNames[locale][c],
            highlight === c,
            () => onHighlight(c),
            <span
              className="size-5 rounded-full"
              style={{ background: `var(--ds-highlight-${c})` }}
            />,
          ),
        )}
      </div>
    </div>
  );
}

export interface LinkPanelProps {
  href: string;
  onApply: (href: string) => void;
  onRemove?: () => void;
  autoFocus?: boolean;
}

/** URL input for FormatToolbar.panel. Enter applies, Escape is left to the editor. */
export function LinkPanel({ href, onApply, onRemove, autoFocus = true }: LinkPanelProps) {
  const [value, setValue] = useState(href);
  const locale = useLocale();
  const L =
    locale === "ru"
      ? { placeholder: "Вставьте ссылку", apply: "Применить", remove: "Убрать ссылку" }
      : { placeholder: "Paste a link", apply: "Apply", remove: "Remove link" };
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(value.trim());
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        type="url"
        inputMode="url"
        placeholder={L.placeholder}
        className="h-8 w-60 rounded-full bg-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)] px-3 text-footnote text-fg outline-none placeholder:text-fg-tertiary focus:shadow-[0_0_0_2px_color-mix(in_oklab,var(--ds-accent)_35%,transparent)]"
      />
      <button
        type="submit"
        aria-label={L.apply}
        className="grid size-8 place-items-center rounded-full text-accent outline-none hover:bg-accent-soft focus-visible:focus-ring"
      >
        <Check className="size-4" />
      </button>
      {onRemove && href && (
        <button
          type="button"
          aria-label={L.remove}
          onClick={onRemove}
          className="grid size-8 place-items-center rounded-full text-fg-secondary outline-none hover:bg-hover focus-visible:focus-ring"
        >
          <Link2Off className="size-4" />
        </button>
      )}
    </form>
  );
}
