import type { Locale } from "./i18n";

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** Whole calendar days from `from` to `to` (DST-safe). */
export function dayDiff(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round(
    (b.getTime() - a.getTime() + (a.getTimezoneOffset() - b.getTimezoneOffset()) * 60_000) / DAY,
  );
}

export type DateTone = "normal" | "today" | "soon" | "overdue" | "done";

export interface DateLabel {
  label: string;
  tone: DateTone;
}

const WORDS = {
  ru: {
    today: "Сегодня",
    tomorrow: "Завтра",
    yesterday: "Вчера",
    months: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    weekdays: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  },
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
} as const;

export interface DateLabelOptions {
  deadline?: boolean;
  completed?: boolean;
}

/**
 * Chip label and tone for a task date. Same rules as `DSDateChipModel` (iOS):
 * Today / Tomorrow / Yesterday; weekday for 2–6 days ahead; "12 ноя" / "Nov 12"
 * otherwise (with the year when it differs). Tone: done if completed, overdue
 * if past, soon for a deadline today or tomorrow, today for a date scheduled today.
 * Strings are fixed (not Intl) so iOS and web render identically.
 */
export function dateLabel(
  date: Date,
  now: Date,
  locale: Locale,
  opts: DateLabelOptions = {},
): DateLabel {
  const offset = dayDiff(now, date);
  const w = WORDS[locale];
  const tone: DateTone = opts.completed
    ? "done"
    : offset < 0
      ? "overdue"
      : opts.deadline && offset <= 1
        ? "soon"
        : offset === 0
          ? "today"
          : "normal";
  let label: string;
  if (offset === 0) label = w.today;
  else if (offset === 1) label = w.tomorrow;
  else if (offset === -1) label = w.yesterday;
  else if (offset >= 2 && offset <= 6) label = w.weekdays[date.getDay()]!;
  else {
    const day = date.getDate();
    const month = w.months[date.getMonth()]!;
    const sameYear = date.getFullYear() === now.getFullYear();
    if (locale === "ru")
      label = sameYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
    else label = sameYear ? `${month} ${day}` : `${month} ${day}, ${date.getFullYear()}`;
  }
  return { label, tone };
}

/** 6×7 grid of days for a month view, starting at `weekStartsOn` (0 = Sunday). */
export function monthGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
