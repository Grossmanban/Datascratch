import { Slot } from "radix-ui";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Corner style: toolbar pill or rounded panel. */
  shape?: "panel" | "pill";
  padding?: "none" | "sm" | "md";
  asChild?: boolean;
}

/** Floating translucent panel: toolbars, inspectors, the format bar above the pen. */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { shape = "panel", padding = "sm", asChild, className, ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      ref={ref}
      className={cn(
        "glass text-fg",
        shape === "pill" ? "rounded-full" : "rounded-xl",
        padding === "sm" && (shape === "pill" ? "px-1.5 py-1" : "p-2"),
        padding === "md" && "p-4",
        className,
      )}
      {...rest}
    />
  );
});
