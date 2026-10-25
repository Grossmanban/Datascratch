import { CalendarDays, Flag } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { dateLabel, type DateTone } from "../lib/date";
import { useLocale } from "../lib/i18n";

export interface DateChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  date: Date;
  /** "scheduled" shows a calendar glyph, "deadline" a flag. */
  kind?: "scheduled" | "deadline";
  /** Reference "now" (tests, previews). */
  now?: Date;
  /** Completed (or cancelled) tasks are never shown as overdue. */
  completed?: boolean;
}

const tones: Record<DateTone, string> = {
  overdue: "text-danger bg-danger-soft",
  today: "text-accent bg-accent-soft",
  soon: "text-warning bg-[color-mix(in_oklab,var(--ds-warning)_14%,transparent)]",
  normal: "text-fg-secondary bg-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)]",
  done: "text-fg-tertiary bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,transparent)]",
};

/** "Сегодня" / "Завтра" / weekday / date. Red when overdue. Clickable when given onClick. */
export const DateChip = forwardRef<HTMLButtonElement, DateChipProps>(function DateChip(
  { date, kind = "scheduled", now, completed, className, onClick, ...rest },
  ref,
) {
  const locale = useLocale();
  const { label, tone } = dateLabel(date, now ?? new Date(), locale, {
    deadline: kind === "deadline",
    completed: !!completed,
  });
  const Icon = kind === "deadline" ? Flag : CalendarDays;
  const content = (
    <>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </>
  );
  const cls = cn(
    "inline-flex h-5 max-w-full items-center gap-1 rounded-full px-2 text-caption font-medium tabular-nums outline-none",
    tones[tone],
    onClick &&
      "cursor-pointer transition-[filter] duration-fast hover:brightness-95 focus-visible:focus-ring",
    className,
  );
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (!onClick) {
    return (
      <time dateTime={iso} className={cls} data-tone={tone}>
        {content}
      </time>
    );
  }
  return (
    <button ref={ref} type="button" onClick={onClick} className={cls} data-tone={tone} {...rest}>
      {content}
    </button>
  );
});
