import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ink";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_1px_2px_0_rgb(0_0_0/0.12)] hover:brightness-[1.06] active:brightness-95",
  ink: "bg-fg text-canvas shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12),0_1px_2px_0_rgb(0_0_0/0.16)] hover:opacity-90 active:opacity-85",
  secondary:
    "bg-surface text-fg border border-hairline shadow-[0_1px_2px_0_rgb(29_28_26/0.05)] hover:bg-[color-mix(in_oklab,var(--ds-bg-surface),var(--ds-text-primary)_4%)] active:bg-[color-mix(in_oklab,var(--ds-bg-surface),var(--ds-text-primary)_8%)]",
  ghost: "text-fg hover:bg-hover active:bg-pressed",
  danger: "text-danger hover:bg-danger-soft active:bg-[color-mix(in_oklab,var(--ds-danger)_18%,transparent)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 rounded-sm px-2.5 text-footnote font-medium [&_svg]:size-3.5",
  md: "h-9 gap-2 rounded-md px-3.5 text-callout font-medium [&_svg]:size-4",
  lg: "h-11 gap-2 rounded-lg px-5 text-body font-medium [&_svg]:size-[18px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Render the child element instead of <button> (e.g. a link). */
  asChild?: boolean;
}

export const buttonClasses = (variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) =>
  cn(
    "relative inline-flex select-none items-center justify-center whitespace-nowrap outline-none",
    "transition-[background-color,box-shadow,opacity,filter,transform] duration-fast ease-snappy",
    "active:scale-[0.98] focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, leading, trailing, asChild, className, children, disabled, type, ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={buttonClasses(variant, size, className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner size={size === "lg" ? 18 : 14} label={null} /> : leading}
          {children}
          {trailing}
        </>
      )}
    </Comp>
  );
});
