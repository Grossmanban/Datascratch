import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { shortcutLabel } from "./Kbd";

// One menu row: leading icon | label (flex 1, truncates) | trailing slot.
// Never wraps: the label is a no-wrap flex row whose children may shrink,
// the trailing slot (check, badge, shortcut) keeps its width.
const label =
  "flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap " +
  "[&>*]:min-w-0 [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0";
const trailingSlot =
  "ml-auto flex min-w-4 shrink-0 items-center justify-end gap-1.5 pl-3 text-footnote text-fg-tertiary " +
  "[&>svg]:size-4 [&>svg]:shrink-0";

export interface MenuRowProps {
  icon?: ReactNode;
  children?: ReactNode;
  /** Trailing element: a badge, a count, an icon. */
  trailing?: ReactNode;
  /** Shows a check mark in the trailing slot (e.g. the current space). */
  checked?: boolean;
  shortcut?: string;
}

export function MenuRow({ icon, children, trailing, checked, shortcut }: MenuRowProps) {
  const hasTrailing = trailing !== undefined || checked !== undefined || shortcut;
  return (
    <>
      {icon}
      <span className={label} data-menu-label="">
        {typeof children === "string" ? <span>{children}</span> : children}
      </span>
      {hasTrailing && (
        <span className={trailingSlot} data-menu-trailing="">
          {trailing}
          {checked !== undefined && (
            <Check aria-hidden className={checked ? "text-accent" : "invisible"} />
          )}
          {shortcut && <span>{shortcutLabel(shortcut)}</span>}
        </span>
      )}
    </>
  );
}
