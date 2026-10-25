import { Popover as P, Switch as S, Tooltip as T } from "radix-ui";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Tooltip({ content, children, side = "bottom" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root delayDuration={500}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[60] rounded-md bg-ink px-2 py-1 text-[12px] font-medium text-canvas shadow-popover data-[state=delayed-open]:animate-[ds-fade_120ms_ease-out]"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export const TooltipProvider = T.Provider;

export function Switch({ checked, onCheckedChange, disabled, id, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; id?: string; label?: string }) {
  return (
    <S.Root
      id={id}
      aria-label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative h-[22px] w-[38px] shrink-0 rounded-full bg-ink/15 transition-colors duration-200 data-[state=checked]:bg-accent disabled:opacity-50"
    >
      <S.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  );
}

export function Popover({
  trigger,
  children,
  align = "start",
  open,
  onOpenChange,
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
}) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn("z-50 rounded-lg border border-line glass p-3 shadow-popover outline-none data-[state=open]:animate-[ds-pop_140ms_ease-out]", className)}
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("relative inline-flex rounded-md bg-ink/[0.06] p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 flex h-7 min-w-8 items-center justify-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors",
            value === o.value ? "text-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={undefined}
              className="absolute inset-0 -z-10 rounded-[7px] bg-surface shadow-[0_1px_2px_rgb(40_30_10/0.12)]"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-surface px-1 font-sans text-[11px] font-medium text-ink-2">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="mx-auto flex max-w-sm flex-col items-center px-6 py-20 text-center"
    >
      {icon ? (
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-surface text-ink-3 shadow-card">{icon}</div>
      ) : null}
      <h3 className="font-display text-[22px] font-medium tracking-[-0.01em] text-ink">{title}</h3>
      {description ? <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </motion.div>
  );
}

export function TaskCheckbox({
  state,
  onToggle,
  label,
  size = 18,
}: {
  state: "open" | "done" | "cancelled";
  onToggle: () => void;
  label: string;
  size?: number;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={state === "done"}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{ width: size, height: size }}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-[background,border,transform] duration-150 active:scale-90",
        state === "done" && "border-accent bg-accent",
        state === "open" && "border-ink-3 hover:border-accent",
        state === "cancelled" && "border-ink-3/60 bg-ink/5",
      )}
    >
      {state === "done" && (
        <motion.svg viewBox="0 0 16 16" className="size-[70%] text-white" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}>
          <motion.path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2 }} />
        </motion.svg>
      )}
      {state === "cancelled" && <span className="h-[1.5px] w-[60%] rounded bg-ink-3" />}
    </button>
  );
}
