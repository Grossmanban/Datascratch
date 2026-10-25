import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { tintBg, tintFg, type TintName } from "../lib/tokens";

export interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tint?: TintName;
  size?: "sm" | "md";
  className?: string;
}

/** Calm, centred empty state: tinted glyph, serif title, one action. */
export function EmptyState({ icon, title, description, action, tint = "gray", size = "md", className }: EmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-[360px] flex-col items-center text-center", size === "md" ? "py-16" : "py-8", className)}>
      <span
        aria-hidden
        className={cn(
          "mb-4 grid place-items-center rounded-[22px] shadow-[inset_0_0_0_1px_color-mix(in_oklab,currentColor_14%,transparent)]",
          size === "md" ? "size-16 [&_svg]:size-7" : "size-12 rounded-2xl [&_svg]:size-5",
        )}
        style={{ color: tintFg(tint), backgroundColor: tintBg(tint) }}
      >
        {icon}
      </span>
      <h3 className={cn("font-display text-fg", size === "md" ? "text-h2" : "text-h3")}>{title}</h3>
      {description && <p className="mt-1.5 text-callout text-fg-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
