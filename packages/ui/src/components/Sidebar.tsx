import { ChevronRight, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { spring, tintFg, type TintName } from "../lib/tokens";

/** Sidebar container (Craft-like): warm paper, scrollable, generous rhythm. */
export function Sidebar({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn(
        "flex h-full w-[264px] flex-col gap-4 overflow-y-auto bg-sidebar px-2.5 py-3 text-callout text-fg",
        className,
      )}
      {...rest}
    />
  );
}

export interface SidebarSectionProps {
  title?: ReactNode;
  /** Collapsible sections remember nothing themselves; pass `open` to control. */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hover action next to the title, e.g. "New folder". */
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  children: ReactNode;
  className?: string;
}

export function SidebarSection({
  title,
  collapsible = true,
  open,
  defaultOpen = true,
  onOpenChange,
  action,
  children,
  className,
}: SidebarSectionProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const reduce = useReducedMotion();
  const toggle = () => {
    setInner(!isOpen);
    onOpenChange?.(!isOpen);
  };
  return (
    <section className={cn("flex flex-col", className)}>
      {title && (
        <div className="group/section flex h-7 items-center pl-2 pr-1">
          {collapsible ? (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={isOpen}
              className="-ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1 text-footnote font-semibold text-fg-tertiary outline-none hover:text-fg-secondary focus-visible:focus-ring"
            >
              <span className="truncate">{title}</span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-3 opacity-0 transition-[transform,opacity] duration-base ease-snappy group-hover/section:opacity-100",
                  isOpen && "rotate-90",
                )}
              />
            </button>
          ) : (
            <span className="flex-1 truncate text-footnote font-semibold text-fg-tertiary">
              {title}
            </span>
          )}
          {action && (
            <button
              type="button"
              aria-label={action.label}
              title={action.label}
              onClick={action.onClick}
              className="grid size-6 place-items-center rounded-sm text-fg-tertiary opacity-0 outline-none transition-opacity duration-fast hover:bg-hover hover:text-fg focus-visible:opacity-100 focus-visible:focus-ring group-hover/section:opacity-100 [&_svg]:size-3.5"
            >
              {action.icon ?? <Plus />}
            </button>
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul
            role="list"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={spring("smooth")}
            className="flex flex-col gap-px overflow-hidden"
          >
            {children}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

export interface SidebarItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  label: ReactNode;
  /** Lucide icon element or an emoji string. */
  icon?: ReactNode;
  /** Tint of the icon (folders, tags). */
  tint?: TintName;
  count?: number;
  selected?: boolean;
  /** Nesting depth for folder trees. */
  depth?: number;
  /** Children make the item expandable. */
  children?: ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Trailing element shown on hover (e.g. a "…" menu trigger). */
  accessory?: ReactNode;
}

export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(function SidebarItem(
  {
    label,
    icon,
    tint,
    count,
    selected,
    depth = 0,
    children,
    expanded,
    defaultExpanded = false,
    onExpandedChange,
    accessory,
    className,
    ...rest
  },
  ref,
) {
  const [inner, setInner] = useState(defaultExpanded);
  const isExpanded = expanded ?? inner;
  const reduce = useReducedMotion();
  const expandable = children !== undefined && children !== null && children !== false;
  const setExpanded = (v: boolean) => {
    setInner(v);
    onExpandedChange?.(v);
  };
  return (
    <li className="flex flex-col">
      <div
        className={cn(
          "group/item relative flex h-8 items-center rounded-md transition-colors duration-fast",
          selected ? "bg-selected" : "hover:bg-hover",
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {expandable ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setExpanded(!isExpanded)}
            className="grid size-5 shrink-0 place-items-center rounded-sm text-fg-tertiary hover:text-fg"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-base ease-snappy",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          depth > 0 && <span className="w-5 shrink-0" />
        )}
        <button
          ref={ref}
          type="button"
          aria-current={selected ? "page" : undefined}
          {...(expandable ? { "aria-expanded": isExpanded } : {})}
          onKeyDown={(e) => {
            if (!expandable) return;
            if (e.key === "ArrowRight" && !isExpanded) {
              e.preventDefault();
              setExpanded(true);
            } else if (e.key === "ArrowLeft" && isExpanded) {
              e.preventDefault();
              setExpanded(false);
            }
          }}
          className={cn(
            "flex h-full min-w-0 flex-1 select-none items-center gap-2.5 rounded-md pl-1.5 pr-2 text-left outline-none focus-visible:focus-ring",
            selected ? "font-medium text-fg" : "text-fg",
            className,
          )}
          {...rest}
        >
          {icon !== undefined && (
            <span
              aria-hidden
              className={cn(
                "grid size-[18px] shrink-0 place-items-center text-[15px] leading-none [&_svg]:size-[17px]",
                !tint && (selected ? "text-fg" : "text-fg-secondary"),
              )}
              style={tint ? { color: tintFg(tint) } : undefined}
            >
              {icon}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                "text-footnote tabular-nums text-fg-tertiary",
                accessory && "group-hover/item:hidden",
              )}
            >
              {count}
            </span>
          )}
        </button>
        {accessory && (
          <span className="absolute right-1 hidden group-hover/item:flex group-focus-within/item:flex">
            {accessory}
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {expandable && isExpanded && (
          <motion.ul
            role="list"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={spring("smooth")}
            className="flex flex-col gap-px overflow-hidden pt-px"
          >
            {children}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
});
