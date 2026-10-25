import { cn } from "../lib/cn";
import { tintBg, tintFg, type TintName } from "../lib/tokens";

export interface SpaceTileProps {
  /** Emoji or a single letter. */
  icon: string;
  tint?: TintName;
  size?: number;
  className?: string;
}

/** Space (or notebook) badge: emoji on its tint, as in the space switcher. */
export function SpaceTile({ icon, tint = "gray", size = 24, className }: SpaceTileProps) {
  const isLetter = /^\p{L}$/u.test(icon);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center leading-none",
        isLetter && "font-display font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: tintBg(tint),
        color: tintFg(tint),
        fontSize: Math.round(size * (isLetter ? 0.56 : 0.62)),
        boxShadow: "inset 0 0 0 0.5px color-mix(in oklab, currentColor 18%, transparent)",
      }}
    >
      {isLetter ? icon.toUpperCase() : icon}
    </span>
  );
}
