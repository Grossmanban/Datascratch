import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { spring } from "../lib/tokens";

export interface SegmentOption<V extends string> {
  value: V;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}

export interface SegmentedControlProps<V extends string> {
  value: V;
  onValueChange: (value: V) => void;
  options: SegmentOption<V>[];
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/** iOS-style segmented control with a sliding pill. Always has one value. */
export function SegmentedControl<V extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps<V>) {
  const group = useId();
  const reduce = useReducedMotion();
  return (
    <LayoutGroup id={group}>
      <ToggleGroup.Root
        type="single"
        value={value}
        onValueChange={(v) => v && onValueChange(v as V)}
        aria-label={aria["aria-label"]}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md bg-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)] p-0.5",
          className,
        )}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <ToggleGroup.Item
              key={o.value}
              value={o.value}
              disabled={o.disabled}
              aria-label={o["aria-label"]}
              className={cn(
                "relative inline-flex select-none items-center justify-center gap-1.5 rounded-[8px] font-medium outline-none",
                "text-fg-secondary transition-colors duration-fast hover:text-fg data-[state=on]:text-fg",
                "focus-visible:focus-ring disabled:opacity-40 [&_svg]:size-4",
                size === "md" ? "h-7 px-3 text-footnote" : "h-6 px-2.5 text-caption",
              )}
            >
              {active && (
                <motion.span
                  layoutId="segment-pill"
                  transition={reduce ? { duration: 0 } : spring("snappy")}
                  className="absolute inset-0 rounded-[8px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.08),0_2px_6px_rgb(0_0_0/0.04)] dark:bg-[color-mix(in_oklab,var(--ds-bg-surface),white_8%)]"
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {o.icon}
                {o.label}
              </span>
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup.Root>
    </LayoutGroup>
  );
}
