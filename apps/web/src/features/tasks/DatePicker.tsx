import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { addDays, localDate, monthGrid, parseLocalDate, today, weekdayNames, dateFormat } from "@/lib/dates";
import i18n from "@/i18n";
import { cn, IconButton } from "@/ui";

export function MonthCalendar({
  value,
  onPick,
  marks,
  compact,
}: {
  value: string | null;
  onPick: (date: string) => void;
  marks?: Record<string, number>;
  compact?: boolean;
}) {
  const base = parseLocalDate(value ?? today());
  const [cursor, setCursor] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const days = monthGrid(cursor.y, cursor.m);
  const t = today();
  const title = dateFormat({ month: "long", year: "numeric" }, i18n.language === "en" ? "en-US" : "ru-RU").format(
    new Date(cursor.y, cursor.m, 1),
  );
  const shift = (d: number) => setCursor(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  return (
    <div className={cn("select-none", compact ? "w-[252px]" : "w-full")}>
      <div className="mb-2 flex items-center">
        <span className="flex-1 pl-1 text-[14px] font-semibold capitalize text-ink">{title}</span>
        <IconButton size="sm" label="prev" onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton size="sm" label="next" onClick={() => shift(1)}>
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekdayNames().map((w) => (
          <span key={w} className="pb-1 text-[11px] font-medium uppercase text-ink-2">
            {w.slice(0, 2)}
          </span>
        ))}
        {days.map((d) => {
          const inMonth = parseLocalDate(d).getMonth() === cursor.m;
          const selected = d === value;
          const isToday = d === t;
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={cn(
                "relative flex items-center justify-center rounded-md text-[13px] transition-colors",
                compact ? "h-8" : "h-10",
                selected ? "bg-ink font-semibold text-canvas" : isToday ? "font-semibold text-accent hover:bg-ink/5" : "hover:bg-ink/5",
                !inMonth && !selected && "text-ink-3/70",
              )}
            >
              {parseLocalDate(d).getDate()}
              {marks?.[d] ? (
                <span className={cn("absolute bottom-1 size-1 rounded-full", selected ? "bg-canvas" : "bg-accent")} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const quickDates = () => ({ today: today(), tomorrow: addDays(today(), 1) });
export { localDate };
