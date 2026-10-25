import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: "line" | "block" | "circle";
  /** Text lines for shape="line". */
  lines?: number;
}

/** Shimmering placeholder (static under reduced motion). */
export function Skeleton({ shape = "block", lines = 1, className, ...rest }: SkeletonProps) {
  const base = "animate-shimmer bg-[color-mix(in_oklab,var(--ds-text-primary)_7%,transparent)]";
  if (shape === "line") {
    return (
      <div aria-hidden className={cn("flex flex-col gap-2", className)} {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(base, "h-3 rounded-full")}
            style={{ width: i === lines - 1 && lines > 1 ? "62%" : "100%" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn(base, shape === "circle" ? "rounded-full" : "rounded-md", className)}
      {...rest}
    />
  );
}
