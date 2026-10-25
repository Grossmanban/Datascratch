import { ArrowRight, CalendarCheck, CalendarX2, ChevronLeft, ChevronRight, Sun, Sunrise } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { addDays, addMonths, isSameDay, monthGrid, startOfDay } from "../lib/date";
import { useLocale, useStrings } from "../lib/i18n";
import { IconButton } from "./IconButton";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export interface CalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  /** Month shown initially (defaults to value or today). */
  defaultMonth?: Date;
  now?: Date;
  weekStartsOn?: 0 | 1;
  /** Days with something on them (dot under the number). */
  marked?: (date: Date) => boolean;
  className?: string;
}

/** Month grid with full keyboard support (arrows, Home/End, PageUp/PageDown). */
export function Calendar({ value, onChange, defaultMonth, now, weekStartsOn, marked, className }: CalendarProps) {
  const locale = useLocale();
  const t = useStrings();
  const today = startOfDay(now ?? new Date());
  const start = weekStartsOn ?? (locale === "ru" ? 1 : 0);
  const [month, setMonth] = useState(() => startOfDay(defaultMonth ?? value ?? today));
  const [focus, setFocus] = useState<Date>(() => startOfDay(value ?? today));
  const grid = useMemo(() => monthGrid(month, start), [month, start]);
  const gridRef = useRef<HTMLDivElement>(null);
  const keyboard = useRef(false);
  const tag = locale === "ru" ? "ru-RU" : "en-US";

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(tag, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(grid[0]!, i)).replace(".", ""));
  }, [grid, tag]);
  const title = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(month).replace(" г.", "");

  useEffect(() => {
    if (!keyboard.current) return;
    keyboard.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('[data-focus="true"]')?.focus();
  }, [focus]);

  const move = (d: Date) => {
    keyboard.current = true;
    setFocus(d);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -((focus.getDay() - start + 7) % 7)),
      End: () => addDays(focus, 6 - ((focus.getDay() - start + 7) % 7)),
      PageUp: () => new Date(focus.getFullYear(), focus.getMonth() - 1, focus.getDate()),
      PageDown: () => new Date(focus.getFullYear(), focus.getMonth() + 1, focus.getDate()),
    };
    const f = map[e.key];
    if (f) {
      e.preventDefault();
      move(f());
    }
  };

  return (
    <div className={cn("w-[252px] select-none", className)}>
      <div className="mb-2 flex items-center justify-between pl-1">
        <span className="font-display text-h3 capitalize text-fg" aria-live="polite">
          {title}
        </span>
        <div className="flex">
          <IconButton size="sm" label={t.previousMonth} tooltip={false} icon={<ChevronLeft />} onClick={() => setMonth(addMonths(month, -1))} />
          <IconButton size="sm" label={t.nextMonth} tooltip={false} icon={<ChevronRight />} onClick={() => setMonth(addMonths(month, 1))} />
        </div>
      </div>
      <div role="grid" aria-label={title} ref={gridRef} onKeyDown={onKey}>
        <div role="row" className="grid grid-cols-7">
          {weekdays.map((w) => (
            <span role="columnheader" key={w} className="grid h-7 place-items-center text-caption text-fg-tertiary">
              {w}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div role="row" key={row} className="grid grid-cols-7">
            {grid.slice(row * 7, row * 7 + 7).map((d) => {
              const selected = value ? isSameDay(d, value) : false;
              const isToday = isSameDay(d, today);
              const outside = d.getMonth() !== month.getMonth();
              const focused = isSameDay(d, focus);
              return (
                <span role="gridcell" key={d.toISOString()} aria-selected={selected} className="grid place-items-center p-px">
                  <button
                    type="button"
                    tabIndex={focused ? 0 : -1}
                    data-focus={focused}
                    aria-label={new Intl.DateTimeFormat(tag, { dateStyle: "full" }).format(d)}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => {
                      setFocus(d);
                      onChange(d);
                    }}
                    className={cn(
                      "relative grid size-8 place-items-center rounded-full text-footnote tabular-nums outline-none",
                      "transition-colors duration-fast hover:bg-hover focus-visible:focus-ring",
                      outside ? "text-fg-tertiary" : "text-fg",
                      isToday && !selected && "font-semibold text-danger",
                      selected && "bg-fg font-semibold text-canvas hover:bg-fg",
                    )}
                  >
                    {d.getDate()}
                    {marked?.(d) && (
                      <span aria-hidden className={cn("absolute bottom-1 size-1 rounded-full", selected ? "bg-canvas" : "bg-fg-tertiary")} />
                    )}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  children: ReactNode;
  now?: Date;
  /** Hide "No date". */
  required?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Popover with quick picks (Today / Tomorrow / Next week) and a calendar — as in Craft's task menu. */
export function DatePicker({ value, onChange, children, now, required, open, onOpenChange }: DatePickerProps) {
  const t = useStrings();
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (o: boolean) => {
    setInnerOpen(o);
    onOpenChange?.(o);
  };
  const today = startOfDay(now ?? new Date());
  const nextMonday = addDays(today, ((8 - today.getDay()) % 7) || 7);
  const pick = (d: Date | null) => {
    onChange(d);
    setOpen(false);
  };
  const quick = [
    { label: t.today, icon: <Sun />, date: today },
    { label: t.tomorrow, icon: <Sunrise />, date: addDays(today, 1) },
    { label: t.nextWeek, icon: <ArrowRight />, date: nextMonday },
  ];
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-2" aria-label={t.pickDate}>
        <div className="mb-2 flex flex-col">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => pick(q.date)}
              className="flex h-8 items-center gap-2.5 rounded-[7px] px-2 text-callout text-fg outline-none hover:bg-hover focus-visible:bg-hover [&_svg]:size-4 [&_svg]:text-fg-secondary"
            >
              {q.icon}
              <span className="flex-1 text-left">{q.label}</span>
              {value && isSameDay(value, q.date) && <CalendarCheck className="!text-accent" />}
            </button>
          ))}
          {!required && value && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex h-8 items-center gap-2.5 rounded-[7px] px-2 text-callout text-fg-secondary outline-none hover:bg-hover focus-visible:bg-hover [&_svg]:size-4"
            >
              <CalendarX2 />
              <span>{t.noDate}</span>
            </button>
          )}
        </div>
        <div className="border-t border-hairline px-1 pt-2">
          <Calendar value={value} onChange={(d) => pick(d)} {...(now ? { now } : {})} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
