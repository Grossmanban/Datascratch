import { FileText } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { tintFg, type TintName } from "../lib/tokens";

export interface DocRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  title: string;
  /** First line of the document or a subtitle. */
  excerpt?: ReactNode;
  /** Emoji string or icon element. */
  icon?: ReactNode;
  /** Folder colour shown as a dot. */
  tint?: TintName;
  detail?: ReactNode;
  selected?: boolean;
  /** Trailing element shown on hover (e.g. "…" menu trigger). */
  accessory?: ReactNode;
}

/** Document line for list view: icon, serif title, one-line excerpt, date. */
export const DocRow = forwardRef<HTMLButtonElement, DocRowProps>(function DocRow(
  { title, excerpt, icon, tint, detail, selected, accessory, className, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        "group/doc relative flex items-center rounded-md transition-colors duration-fast",
        selected ? "bg-selected" : "hover:bg-hover",
      )}
    >
      <button
        ref={ref}
        type="button"
        aria-current={selected ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none focus-visible:focus-ring",
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-surface text-[18px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] [&_svg]:size-[18px] [&_svg]:text-fg-secondary"
        >
          {icon ?? <FileText />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {tint && (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tintFg(tint) }}
              />
            )}
            <span className="truncate font-display text-h3 leading-[1.25] text-fg">{title}</span>
          </span>
          {excerpt && (
            <span className="mt-0.5 block truncate text-footnote text-fg-secondary">{excerpt}</span>
          )}
        </span>
        {detail && (
          <span
            className={cn(
              "shrink-0 text-footnote tabular-nums text-fg-tertiary",
              accessory && "group-hover/doc:invisible",
            )}
          >
            {detail}
          </span>
        )}
      </button>
      {accessory && (
        <span className="absolute right-2 hidden group-hover/doc:flex group-focus-within/doc:flex">
          {accessory}
        </span>
      )}
    </div>
  );
});

export interface DocListProps extends HTMLAttributes<HTMLUListElement> {
  /** Hairlines between rows (list view) or airy rows (sidebar-like). */
  dividers?: boolean;
}

export function DocList({ dividers = true, className, children, ...rest }: DocListProps) {
  return (
    <ul
      role="list"
      className={cn(
        "flex flex-col",
        dividers && "[&>li+li]:border-t [&>li+li]:border-hairline",
        className,
      )}
      {...rest}
    >
      {children}
    </ul>
  );
}

export interface DocGridProps extends HTMLAttributes<HTMLUListElement> {
  /** Minimum card width in px (cards stretch to fill). */
  minWidth?: number;
}

/** Responsive grid for DocCard (gallery view). Wrap each card in <li>. */
export function DocGrid({ minWidth = 210, className, style, ...rest }: DocGridProps) {
  return (
    <ul
      role="list"
      className={cn("grid gap-4", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${minWidth}px, 100%), 1fr))`,
        ...style,
      }}
      {...rest}
    />
  );
}
