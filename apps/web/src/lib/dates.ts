import i18n from "@/i18n";

/** Local calendar date as YYYY-MM-DD (document-model.md: dates in the user's calendar). */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export const today = () => localDate();
export const tomorrow = () => addDays(today(), 1);
/** Next Monday (Things-style "next week"). */
export function nextWeek(): string {
  const d = new Date();
  const delta = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + delta);
  return localDate(d);
}

const locale = () => (i18n.language === "en" ? "en-US" : "ru-RU");

// Intl formatters are expensive to build (lists format thousands of dates): one per locale + options.
const formatters = new Map<string, Intl.DateTimeFormat | Intl.RelativeTimeFormat>();
export function dateFormat(opts: Intl.DateTimeFormatOptions, loc = locale()): Intl.DateTimeFormat {
  const key = `d|${loc}|${JSON.stringify(opts)}`;
  let f = formatters.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(loc, opts)));
  return f;
}
function relativeFormat(): Intl.RelativeTimeFormat {
  const key = `r|${locale()}`;
  let f = formatters.get(key) as Intl.RelativeTimeFormat | undefined;
  if (!f) formatters.set(key, (f = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" })));
  return f;
}

export function formatDay(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string {
  const t = today();
  if (s === t) return i18n.t("common.today");
  if (s === addDays(t, 1)) return i18n.t("common.tomorrow");
  if (s === addDays(t, -1)) return i18n.t("common.yesterday");
  const d = parseLocalDate(s);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return dateFormat({ ...opts, ...(sameYear ? {} : { year: "numeric" }) }).format(d);
}

export function formatWeekday(s: string): string {
  return dateFormat({ weekday: "long" }).format(parseLocalDate(s));
}

/** Only the first letter capitalised (not every word), without the Russian year suffix «г.». */
export function sentenceCase(text: string): string {
  const t = text.replace(/\s?г\.$/, "");
  return t.charAt(0).toLocaleUpperCase(locale()) + t.slice(1);
}

/** «Воскресенье, 25 октября 2026» / "Sunday, October 25, 2026". */
export function formatLongDate(s: string): string {
  return sentenceCase(dateFormat({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parseLocalDate(s)));
}

/** «Октябрь 2026» / "October 2026". */
export function formatMonthYear(d: Date, loc?: string): string {
  return sentenceCase(dateFormat({ month: "long", year: "numeric" }, loc).format(d));
}

export function formatRelative(iso: string | number): string {
  const ts = typeof iso === "number" ? iso : Date.parse(iso);
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const rtf = relativeFormat();
  if (abs < 60_000) return rtf.format(0, "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 7 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  return dateFormat({ day: "numeric", month: "short", year: "numeric" }).format(ts);
}

export function formatDateTime(iso: string): string {
  return dateFormat({ day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    Date.parse(iso),
  );
}

export function monthGrid(year: number, month: number): string[] {
  // Weeks start on Monday.
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => localDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

export function weekdayNames(): string[] {
  const base = new Date(2024, 0, 1); // Monday
  return Array.from({ length: 7 }, (_, i) =>
    dateFormat({ weekday: "short" }).format(new Date(base.getFullYear(), 0, 1 + i)),
  );
}
