import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useAnchoredPosition, type AnchorRect } from "../lib/floating";
import { useStrings } from "../lib/i18n";
import { shortcutLabel } from "./Kbd";

export interface SuggestionItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  /** Shortcut or markdown hint shown on the right ("mod+alt+1", "#", "[]"). */
  hint?: string;
  disabled?: boolean;
}

export interface SuggestionGroup {
  heading?: ReactNode;
  items: SuggestionItem[];
}

export interface SuggestionMenuProps {
  groups: SuggestionGroup[];
  /** Index across all groups (the editor drives it with arrow keys). */
  selectedIndex: number;
  onPick: (item: SuggestionItem) => void;
  /** Caret rect in viewport coordinates. */
  anchorRect: AnchorRect | null;
  empty?: ReactNode;
  className?: string;
  /** id prefix for options, so the editor can set aria-activedescendant. */
  idPrefix?: string;
}

/** DOM id of an option, for `aria-activedescendant` on the editor. */
export const suggestionOptionId = (prefix: string, id: string) => `${prefix}-${id}`;

/**
 * "/" block menu and [[ ]] link menu. Purely presentational: keyboard and
 * focus stay with the editor (TipTap suggestion plugin); clicks never blur it.
 */
export function SuggestionMenu({
  groups,
  selectedIndex,
  onPick,
  anchorRect,
  empty,
  className,
  idPrefix = "ds-suggest",
}: SuggestionMenuProps) {
  const t = useStrings();
  const { ref, style } = useAnchoredPosition(anchorRect, "below", 6);
  const list = useRef<HTMLDivElement>(null);
  const flat = groups.flatMap((g) => g.items);
  const active = flat[selectedIndex];

  useEffect(() => {
    if (!active) return;
    list.current
      ?.querySelector(`[data-id="${CSS.escape(active.id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!anchorRect) return null;
  let index = -1;
  return createPortal(
    <div
      ref={ref}
      style={{ ...style, zIndex: 50 }}
      data-state="open"
      onMouseDown={(e) => e.preventDefault()}
      className={cn("glass animate-pop w-[300px] overflow-hidden rounded-lg", className)}
    >
      <div
        ref={list}
        role="listbox"
        className="max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain p-1"
      >
        {flat.length === 0 && (
          <div className="px-3 py-4 text-center text-footnote text-fg-tertiary">
            {empty ?? t.commandEmpty}
          </div>
        )}
        {groups.map((g, gi) =>
          g.items.length === 0 ? null : (
            <div key={gi} role="group">
              {g.heading && (
                <div className="px-2.5 pb-1 pt-2 text-caption font-medium text-fg-tertiary">
                  {g.heading}
                </div>
              )}
              {g.items.map((it) => {
                index += 1;
                const selected = index === selectedIndex;
                return (
                  <div
                    key={it.id}
                    id={suggestionOptionId(idPrefix, it.id)}
                    data-id={it.id}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={it.disabled || undefined}
                    onClick={() => !it.disabled && onPick(it)}
                    className={cn(
                      "flex cursor-default select-none items-center gap-3 rounded-md px-2 py-1.5",
                      selected && "bg-hover",
                      it.disabled && "opacity-40",
                    )}
                  >
                    {it.icon && (
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-hairline bg-surface text-fg-secondary [&_svg]:size-4">
                        {it.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-callout text-fg">{it.label}</span>
                      {it.description && (
                        <span className="block truncate text-caption text-fg-tertiary">
                          {it.description}
                        </span>
                      )}
                    </span>
                    {it.hint && (
                      <span className="shrink-0 font-mono text-caption text-fg-tertiary">
                        {it.hint.includes("+") ? shortcutLabel(it.hint) : it.hint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>
    </div>,
    document.body,
  );
}
