import { Hash, X } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";
import { tintBg, tintFg, type TintName } from "../lib/tokens";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tint?: TintName;
  tone?: "neutral" | "accent" | "danger" | "success" | "warning";
  icon?: ReactNode;
}

const tones = {
  neutral: "bg-[color-mix(in_oklab,var(--ds-text-primary)_7%,transparent)] text-fg-secondary",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  success: "bg-[color-mix(in_oklab,var(--ds-success)_14%,transparent)] text-success",
  warning: "bg-[color-mix(in_oklab,var(--ds-warning)_16%,transparent)] text-warning",
};

/** Small pill: counts, statuses ("Для агентов", "Общий"). */
export function Badge({
  tint,
  tone = "neutral",
  icon,
  className,
  style,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-caption font-medium tabular-nums [&_svg]:size-3",
        !tint && tones[tone],
        className,
      )}
      style={tint ? { color: tintFg(tint), backgroundColor: tintBg(tint), ...style } : style}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

export interface TagChipProps {
  name: string;
  tint?: TintName;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

/** `#tag` chip. Nested tags show their path ("work/clients"). */
export function TagChip({
  name,
  tint = "gray",
  onRemove,
  onClick,
  size = "md",
  className,
}: TagChipProps) {
  const t = useStrings();
  const Comp = onClick ? "button" : "span";
  return (
    <span
      className={cn(
        "group inline-flex max-w-full items-center rounded-full font-medium",
        size === "md" ? "h-6 text-footnote" : "h-5 text-caption",
        className,
      )}
      style={{ color: tintFg(tint), backgroundColor: tintBg(tint) }}
    >
      <Comp
        {...(onClick ? { type: "button" as const, onClick } : {})}
        className={cn(
          "inline-flex min-w-0 items-center gap-0.5 rounded-full outline-none focus-visible:focus-ring",
          size === "md" ? "pl-2 pr-2.5" : "pl-1.5 pr-2",
          onRemove && "pr-1",
        )}
      >
        <Hash
          className={cn("shrink-0 opacity-70", size === "md" ? "size-3" : "size-2.5")}
          aria-hidden
        />
        <span className="truncate">{name}</span>
      </Comp>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${t.remove} #${name}`}
          className="mr-1 grid size-4 place-items-center rounded-full opacity-60 outline-none hover:bg-[color-mix(in_oklab,currentColor_15%,transparent)] hover:opacity-100 focus-visible:focus-ring"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
