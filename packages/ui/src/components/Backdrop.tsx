import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import type { BackdropName } from "../lib/tokens";

export interface BackdropProps extends HTMLAttributes<HTMLDivElement> {
  name: BackdropName;
  /** Paper grain on top of the gradient (default on). */
  grain?: boolean;
  /** Fill the nearest positioned parent. */
  fill?: boolean;
}

/** Soft Craft-like gradient (base + colour blobs) with paper grain. Themes via tokens. */
export function Backdrop({
  name,
  grain = true,
  fill = true,
  className,
  style,
  children,
  ...rest
}: BackdropProps) {
  const bg: CSSProperties = { backgroundImage: `var(--ds-backdrop-${name})`, ...style };
  return (
    <div
      aria-hidden={children ? undefined : true}
      data-backdrop={name}
      className={cn(fill && "absolute inset-0", "overflow-hidden", className)}
      style={bg}
      {...rest}
    >
      {grain && (
        <div
          className="paper-noise pointer-events-none absolute inset-0"
          style={{ opacity: `calc(var(--ds-backdrop-${name}-noise) * 3)` }}
        />
      )}
      {children && <div className="relative h-full">{children}</div>}
    </div>
  );
}
