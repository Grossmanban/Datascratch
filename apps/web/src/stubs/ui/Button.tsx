import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-canvas shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_1px_2px_rgb(0_0_0/0.18)] hover:bg-ink/90 active:bg-ink/80",
  secondary: "bg-surface text-ink border border-line shadow-[0_1px_2px_rgb(40_30_10/0.05)] hover:bg-canvas active:bg-line/40",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink active:bg-ink/10",
  subtle: "bg-ink/5 text-ink hover:bg-ink/10 active:bg-ink/15",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
};
const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px] gap-1.5 rounded-sm",
  md: "h-9 px-3.5 text-[14px] gap-2 rounded-md",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(function IconButton(
  { label, className, size = "md", variant = "ghost", children, ...rest },
  ref,
) {
  const dim = size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-8";
  return (
    <Button ref={ref} aria-label={label} title={label} variant={variant} size={size} className={cn("!px-0", dim, className)} {...rest}>
      {children}
    </Button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
