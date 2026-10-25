import { FileText } from "lucide-react";
import { Slot } from "radix-ui";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import type { BackdropName } from "../lib/tokens";
import { Backdrop } from "./Backdrop";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  asChild?: boolean;
}

const pads = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive, padding = "md", asChild, className, ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-lg border border-hairline bg-surface shadow-card",
        interactive &&
          "cursor-default outline-none transition-[transform,box-shadow] duration-base ease-snappy hover:-translate-y-0.5 hover:shadow-popover focus-visible:focus-ring active:translate-y-0 active:scale-[0.99] motion-reduce:hover:translate-y-0",
        pads[padding],
        className,
      )}
      {...rest}
    />
  );
});

export interface DocCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  subtitle?: ReactNode;
  /**
   * Cover thumbnail (`NoteMeta.coverThumb`). Covers are the user's own images
   * only (spec 12.7); without one the card has no cover strip.
   */
  cover?: string | null;
  /** Vertical focus point of the cover, 0..1 (document-model `cover.offsetY`). */
  coverOffsetY?: number;
  /** Explicit backdrop strip (marketing / templates). Not a default: spec 12.7. */
  backdrop?: BackdropName;
  /** Emoji or icon; without a cover it sits at the top of the card. */
  icon?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Render the card as a link. */
  href?: string;
}

const coverHeights = { sm: "h-20", md: "h-28", lg: "h-40" };
const titleSizes = { sm: "text-h3", md: "text-h2", lg: "text-h1" };

/** Document card: optional cover thumbnail, serif title, excerpt (Craft "card" pages). */
export const DocCard = forwardRef<HTMLElement, DocCardProps>(function DocCard(
  {
    title,
    subtitle,
    cover,
    coverOffsetY = 0.5,
    backdrop,
    icon,
    meta,
    footer,
    size = "md",
    href,
    className,
    children,
    ...rest
  },
  ref,
) {
  const Comp = href ? "a" : "article";
  const body = (
    <>
      {(cover || backdrop) && (
        <div className={cn("relative overflow-hidden", coverHeights[size])}>
          {cover ? (
            <img
              src={cover}
              alt=""
              draggable={false}
              className="size-full object-cover transition-transform duration-slow ease-gentle group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
              style={{ objectPosition: `50% ${coverOffsetY * 100}%` }}
            />
          ) : (
            backdrop && <Backdrop name={backdrop} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)]" />
        </div>
      )}
      <div
        className={cn(
          "relative flex flex-1 flex-col px-4 pb-4",
          cover || backdrop ? "pt-3" : "pt-4",
        )}
      >
        {icon !== undefined && (
          <span
            className={cn(
              "mb-2 grid size-10 place-items-center rounded-md border border-hairline bg-surface text-[22px] [&_svg]:size-5 [&_svg]:text-fg-secondary",
              cover || backdrop
                ? "-mt-8 shadow-card"
                : "bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,var(--ds-bg-surface))]",
            )}
          >
            {icon ?? <FileText />}
          </span>
        )}
        <h3 className={cn("line-clamp-2 font-display text-fg", titleSizes[size])}>{title}</h3>
        {subtitle && (
          <p className="mt-1 line-clamp-2 text-footnote text-fg-secondary">{subtitle}</p>
        )}
        {children}
        {(meta || footer) && (
          <div className="mt-auto flex items-center gap-2 pt-3 text-caption text-fg-tertiary">
            {meta}
            {footer && <span className="ml-auto flex items-center gap-1">{footer}</span>}
          </div>
        )}
      </div>
    </>
  );
  return (
    <Comp
      ref={ref as never}
      {...(href ? { href } : {})}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-card outline-none",
        "transition-[transform,box-shadow] duration-base ease-snappy hover:-translate-y-0.5 hover:shadow-popover",
        "focus-visible:focus-ring active:translate-y-0 active:scale-[0.99] motion-reduce:hover:translate-y-0",
        className,
      )}
      {...rest}
    >
      {body}
    </Comp>
  );
});
