import { motion, useReducedMotion } from "motion/react";
import { Checkbox as C } from "radix-ui";
import { forwardRef, useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";
import { spring } from "../lib/tokens";

export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/** Square checkbox for settings and forms. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, onCheckedChange, disabled, label, id, className, ...aria },
  ref,
) {
  const auto = useId();
  const cid = id ?? auto;
  const box = (
    <C.Root
      ref={ref}
      id={cid}
      {...(checked !== undefined ? { checked } : {})}
      {...(defaultChecked !== undefined ? { defaultChecked } : {})}
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      disabled={disabled}
      aria-label={aria["aria-label"]}
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-[color-mix(in_oklab,var(--ds-text-tertiary)_55%,transparent)] bg-surface outline-none",
        "transition-[background-color,border-color,transform] duration-fast ease-snappy active:scale-90",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent",
        "focus-visible:focus-ring disabled:opacity-45",
        !label && className,
      )}
    >
      <C.Indicator className="text-on-accent" forceMount>
        <svg
          viewBox="0 0 14 14"
          className="size-3 opacity-0 transition-opacity duration-fast [[data-state=checked]_&]:opacity-100 [[data-state=indeterminate]_&]:opacity-100"
          fill="none"
        >
          {checked === "indeterminate" ? (
            <path d="M3.5 7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path
              d="M3 7.4 5.8 10 11 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </C.Indicator>
    </C.Root>
  );
  if (!label) return box;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {box}
      <label
        htmlFor={cid}
        className="cursor-pointer select-none text-callout text-fg peer-disabled:cursor-default peer-disabled:opacity-50"
      >
        {label}
      </label>
    </div>
  );
});

export type TaskState = "open" | "done" | "cancelled";

export interface TaskCheckboxProps {
  state: TaskState;
  /** Toggles open ⇄ done. Cancelling happens from the task's context menu. */
  onStateChange?: (state: TaskState) => void;
  size?: number;
  disabled?: boolean;
  className?: string;
  /** Task title for screen readers ("Buy paper"). */
  "aria-label"?: string;
}

/**
 * Round task checkbox (Craft / Things 3): an ink ring that fills with a
 * spring and draws the check mark. Cancelled tasks show a muted cross.
 */
export const TaskCheckbox = forwardRef<HTMLButtonElement, TaskCheckboxProps>(function TaskCheckbox(
  { state, onStateChange, size = 20, disabled, className, ...aria },
  ref,
) {
  const t = useStrings();
  const reduce = useReducedMotion();
  const done = state === "done";
  const cancelled = state === "cancelled";
  const pop = reduce ? { duration: 0 } : spring("snappy");
  const draw = reduce ? { duration: 0 } : { ...spring("smooth"), delay: 0.05 };
  return (
    <C.Root
      ref={ref}
      checked={done}
      disabled={disabled}
      onCheckedChange={(v) => onStateChange?.(v === true ? "done" : "open")}
      aria-label={aria["aria-label"] ?? t.taskOpen}
      aria-description={cancelled ? t.taskCancelled : undefined}
      data-task-state={state}
      className={cn(
        "group relative grid shrink-0 place-items-center rounded-full outline-none",
        "focus-visible:focus-ring disabled:opacity-45",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-full border-[1.5px] transition-colors duration-base",
          cancelled
            ? "border-fg-tertiary/45"
            : "border-[color-mix(in_oklab,var(--ds-text-tertiary)_55%,transparent)] group-hover:border-accent",
        )}
      />
      {/* fill */}
      <motion.span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full",
          cancelled ? "bg-fg-tertiary/25" : "bg-accent",
        )}
        initial={false}
        animate={{ scale: done || cancelled ? 1 : 0, opacity: done || cancelled ? 1 : 0 }}
        transition={pop}
      />
      {/* hover hint */}
      {!done && !cancelled && (
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="absolute inset-0 opacity-0 transition-opacity duration-fast group-hover:opacity-40"
          fill="none"
        >
          <path
            d="M6 10.3 8.7 13 14 7.3"
            stroke="var(--ds-accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="relative"
        width={size}
        height={size}
        fill="none"
      >
        {cancelled ? (
          <path
            d="M7 7l6 6M13 7l-6 6"
            stroke="var(--ds-text-secondary)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : (
          <motion.path
            d="M6 10.3 8.7 13 14 7.3"
            stroke="var(--ds-text-on-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={draw}
          />
        )}
      </svg>
      {/* completion burst */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
          initial={false}
          animate={done ? { scale: [1, 1.7], opacity: [0.45, 0] } : { scale: 1, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      )}
    </C.Root>
  );
});
