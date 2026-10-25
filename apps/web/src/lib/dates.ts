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

export function formatDay(s: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string {
  const t = today();
  if (s === t) return i18n.t("common.today");
  if (s === addDays(t, 1)) return i18n.t("common.tomorrow");
  if (s === addDays(t, -1)) return i18n.t("common.yesterday");
  const d = parseLocalDate(s);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(locale(), { ...opts, ...(sameYear ? {} : { year: "numeric" }) }).format(d);
}

export function formatWeekday(s: string): string {
  return new Intl.DateTimeFormat(locale(), { weekday: "long" }).format(parseLocalDate(s));
}

export function formatLongDate(s: string): string {
  return new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parseLocalDate(s));
}

export function formatRelative(iso: string | number): string {
  const ts = typeof iso === "number" ? iso : Date.parse(iso);
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
  if (abs < 60_000) return rtf.format(0, "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 7 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric" }).format(ts);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
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
    new Intl.DateTimeFormat(locale(), { weekday: "short" }).format(new Date(base.getFullYear(), 0, 1 + i)),
  );
}
