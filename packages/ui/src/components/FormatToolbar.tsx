import { ToggleGroup } from "radix-ui";
import { Fragment, type ReactNode } from "react";
import { cn } from "../lib/cn";
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
  className?: string;
  "aria-label"?: string;
}

/**
 * Floating glass bar for text formatting (above a selection or pinned).
 * Toggle state comes from the editor (`active`); the bar only renders it.
 */
export function FormatToolbar({ items, className, ...aria }: FormatToolbarProps) {
  const active = items
    .filter((i): i is FormatItem => typeof i === "object" && "onClick" in i && !!i.active)
    .map((i) => i.id);
  return (
    <ToggleGroup.Root
      type="multiple"
      value={active}
      onValueChange={() => {}}
      aria-label={aria["aria-label"]}
      // Keep the editor selection: toolbar clicks must not steal focus from the text.
      onMouseDown={(e) => e.preventDefault()}
      className={cn("glass inline-flex items-center gap-0.5 rounded-full p-1", className)}
    >
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
            <ToggleGroup.Item
              value={it.id}
              aria-label={it.label}
              disabled={it.disabled}
              onClick={it.onClick}
              className={cn(
                "grid size-8 place-items-center rounded-full text-fg-secondary outline-none transition-colors duration-fast",
                "hover:bg-hover hover:text-fg focus-visible:focus-ring disabled:opacity-40",
                "aria-pressed:bg-accent-soft aria-pressed:text-accent [&_svg]:size-[17px]",
              )}
            >
              {it.icon}
            </ToggleGroup.Item>
          </Tooltip>
        );
      })}
    </ToggleGroup.Root>
  );
}
