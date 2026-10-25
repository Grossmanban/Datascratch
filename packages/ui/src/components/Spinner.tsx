import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";

export interface SpinnerProps {
  size?: number;
  className?: string;
  /** Accessible label; pass `null` when a parent already announces loading. */
  label?: string | null;
}

export function Spinner({ size = 16, className, label }: SpinnerProps) {
  const t = useStrings();
  const text = label === undefined ? t.loading : label;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={cn("animate-spin-ds shrink-0 text-current", className)}
      {...(text ? { role: "status", "aria-label": text } : { "aria-hidden": true })}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
