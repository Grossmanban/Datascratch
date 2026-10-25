import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Tooltip } from "./Tooltip";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name; also shown as a tooltip unless `tooltip={false}`. */
  label: string;
  icon: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "secondary" | "glass";
  shape?: "square" | "round";
  shortcut?: string;
  tooltip?: boolean;
  active?: boolean;
}

const sizes = {
  sm: "size-7 [&_svg]:size-4",
  md: "size-8 [&_svg]:size-[18px]",
  lg: "size-10 [&_svg]:size-5",
};
const variants = {
  ghost: "text-fg-secondary hover:bg-hover hover:text-fg active:bg-pressed",
  secondary:
    "border border-hairline bg-surface text-fg shadow-[0_1px_2px_0_rgb(29_28_26/0.05)] hover:bg-hover",
  glass: "glass text-fg hover:brightness-[1.03]",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    size = "md",
    variant = "ghost",
    shape = "square",
    shortcut,
    tooltip = true,
    active,
    className,
    type,
    ...rest
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      data-active={active || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center outline-none",
        "transition-[background-color,color,transform] duration-fast ease-snappy active:scale-95",
        "focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-40",
        "data-[active]:bg-selected data-[active]:text-fg",
        shape === "round" ? "rounded-full" : "rounded-md",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
  return tooltip ? (
    <Tooltip content={label} {...(shortcut ? { shortcut } : {})}>
      {button}
    </Tooltip>
  ) : (
    button
  );
});
