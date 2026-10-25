import { Switch as S } from "radix-ui";
import { forwardRef, useId, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md";
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    label,
    description,
    size = "md",
    id,
    className,
    ...aria
  },
  ref,
) {
  const auto = useId();
  const sid = id ?? auto;
  const sw = (
    <S.Root
      ref={ref}
      id={sid}
      {...(checked !== undefined ? { checked } : {})}
      {...(defaultChecked !== undefined ? { defaultChecked } : {})}
      {...(onCheckedChange ? { onCheckedChange } : {})}
      disabled={disabled}
      aria-label={aria["aria-label"]}
      className={cn(
        "group relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-[2px] outline-none",
        "bg-[color-mix(in_oklab,var(--ds-text-primary)_14%,transparent)] transition-colors duration-base ease-snappy",
        "data-[state=checked]:bg-success focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-45",
        size === "md" ? "h-[26px] w-[44px]" : "h-[20px] w-[34px]",
        !label && className,
      )}
    >
      <S.Thumb
        className={cn(
          "block rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.18),0_2px_8px_rgb(0_0_0/0.08)]",
          "transition-[transform,width] duration-(--ds-motion-snappy-duration) ease-snappy",
          size === "md"
            ? "size-[22px] data-[state=checked]:translate-x-[18px] group-active:w-[26px] group-active:data-[state=checked]:translate-x-[14px]"
            : "size-[16px] data-[state=checked]:translate-x-[14px] group-active:w-[19px] group-active:data-[state=checked]:translate-x-[11px]",
        )}
      />
    </S.Root>
  );
  if (!label) return sw;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={sid} className="min-w-0 cursor-pointer select-none">
        <span className="block text-callout text-fg">{label}</span>
        {description && (
          <span className="block text-footnote text-fg-secondary">{description}</span>
        )}
      </label>
      {sw}
    </div>
  );
});
