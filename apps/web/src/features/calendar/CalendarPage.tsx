import { useNavigate, useSearch } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, NotebookPen, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { accountDb } from "@/data/db";
import { addTask, findDaily, findInbox, getOrCreateDaily, getOrCreateInbox, openTab } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { ownerEditorHost } from "@/editor/hosts";
import { DocView } from "@/features/doc/DocView";
import { TopBar } from "@/features/shell/PageHeader";
import { MonthCalendar } from "@/features/tasks/DatePicker";
import { TaskItems } from "@/features/tasks/TaskList";
import { useNoteDoc, useNoteMeta } from "@/hooks/useNoteDoc";
import { addDays, formatLongDate, formatMonthYear, parseLocalDate, today, dateFormat } from "@/lib/dates";
import i18n from "@/i18n";
import { Button, cn, IconButton, Popover, Spinner } from "@/ui";

function weekOf(date: string): string[] {
  const d = parseLocalDate(date);
  const monday = addDays(date, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function CalendarPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/app/calendar" });
  const navigate = useNavigate();
  const date = search.date ?? today();
  const setDate = (d: string) => void navigate({ to: "/calendar", search: { date: d === today() ? undefined : d }, replace: true });
  const week = weekOf(date);
  const tasks = useLiveQuery(() => accountDb().tasks.toArray(), [], []);
  const allNotes = useWorkspace((s) => s.notes);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  // Days show the tasks and notes of the current space only (D-48).
  const notes = useMemo(() => {
    const nbs = new Set(notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
    return Object.fromEntries(Object.entries(allNotes).filter(([, n]) => nbs.has(n.notebookId)));
  }, [allNotes, notebooks, spaceId]);
  const dailyId = useWorkspace(() => findDaily(date));

  const marks = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of tasks) {
      if (r.state !== "open" || !notes[r.noteId] || notes[r.noteId]!.trashedAt) continue;
      const key = r.scheduled ?? r.deadline;
      if (key) m[key] = (m[key] ?? 0) + 1;
    }
    for (const n of Object.values(notes)) if (n.kind === "daily" && n.dailyDate && !n.trashedAt) m[n.dailyDate] = (m[n.dailyDate] ?? 0) + 1;
    return m;
  }, [tasks, notes]);

  const dayTasks = useMemo(() => {
    const t0 = today();
    return tasks
      .filter((r) => notes[r.noteId] && !notes[r.noteId]!.trashedAt)
      .filter(
        (r) =>
          r.scheduled === date ||
          r.deadline === date ||
          (date === t0 && r.state === "open" && ((r.scheduled && r.scheduled < t0) || (r.deadline && r.deadline < t0))),
      )
      .sort((a, b) => (a.state === b.state ? a.order - b.order : a.state === "open" ? -1 : 1));
  }, [tasks, notes, date]);

  const locale = i18n.language === "en" ? "en-US" : "ru-RU";
  const monthTitle = formatMonthYear(parseLocalDate(date), locale);

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <TopBar
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setDate(today())}>
              {t("calendar.todayBtn")}
            </Button>
            <Popover
              align="end"
              trigger={
                <IconButton label={t("calendar.month")}>
                  <CalendarDays className="size-4" />
                </IconButton>
              }
            >
              <MonthCalendar compact value={date} onPick={setDate} marks={marks} />
            </Popover>
          </>
        }
      >
        <span className="font-medium text-ink">{monthTitle}</span>
      </TopBar>

      <div className="mx-auto max-w-[860px] px-3 pb-24 sm:px-8">
        <div className="mt-4 flex items-center gap-1 sm:mt-6">
          <IconButton label="prev" onClick={() => setDate(addDays(date, -7))}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <div className="grid flex-1 grid-cols-7 gap-1" data-testid="week-strip">
            {week.map((d) => {
              const dd = parseLocalDate(d);
              const sel = d === date;
              const isToday = d === today();
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  aria-pressed={sel}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "relative flex flex-col items-center rounded-xl py-2 transition-colors",
                    // A quiet selection (design review): a soft ink wash, not a filled pill; today is the red digit.
                    sel ? "bg-ink/[0.07]" : "hover:bg-ink/[0.04]",
                  )}
                >
                  <span className="text-[11px] font-medium uppercase text-ink-2">
                    {dateFormat({ weekday: "short" }, locale).format(dd)}
                  </span>
                  <span className={cn("mt-0.5 text-[19px] font-bold", isToday ? "text-danger" : "text-ink")}>{dd.getDate()}</span>
                  <span className={cn("mt-1 size-1 rounded-full", marks[d] ? "bg-accent" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
          <IconButton label="next" onClick={() => setDate(addDays(date, 7))}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <h1 className="mt-8 px-2 font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[34px]">
              {formatLongDate(date)}
            </h1>

            <section className="mt-6">
              <h2 className="mb-1 border-b border-line px-2 pb-2 text-[13.5px] font-semibold text-ink-2">{t("calendar.tasksForDay")}</h2>
              <DayAddTask date={date} />
              <TaskItems tasks={dayTasks} emptyText={t("calendar.noTasks")} />
            </section>

            <section className="mt-8">
              <div className="mb-2 flex items-center border-b border-line px-2 pb-2">
                <h2 className="flex-1 text-[13.5px] font-semibold text-ink-2">{t("calendar.dailyNote")}</h2>
                {dailyId && (
                  <IconButton
                    size="sm"
                    label={t("common.open")}
                    onClick={() => {
                      openTab(dailyId);
                      void navigate({ to: "/doc/$noteId", params: { noteId: dailyId } });
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                  </IconButton>
                )}
              </div>
              {dailyId ? (
                <InlineDaily noteId={dailyId} />
              ) : (
                <button
                  onClick={() => void getOrCreateDaily(date)}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line px-4 py-5 text-left text-[14px] text-ink-2 transition hover:border-accent/40 hover:bg-surface hover:text-ink"
                  data-testid="create-daily"
                >
                  <NotebookPen className="size-5 text-ink-3" />
                  {t("calendar.createDaily")}
                </button>
              )}
            </section>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function InlineDaily({ noteId }: { noteId: string }) {
  const navigate = useNavigate();
  const host = useMemo(() => ownerEditorHost(noteId, navigate), [noteId, navigate]);
  const doc = useNoteDoc(noteId);
  const meta = useNoteMeta(doc);
  if (!doc || !meta)
    return (
      <div className="flex h-32 items-center justify-center text-ink-2">
        <Spinner className="size-5" />
      </div>
    );
  return (
    <div className="-mx-4 rounded-xl sm:-mx-6">
      <DocView doc={doc} backdrop={null} editable compact showPalette={false} host={host} />
    </div>
  );
}

function DayAddTask({ date }: { date: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const inboxId = useWorkspace(() => findInbox());
  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const id = inboxId ?? (await getOrCreateInbox(t("tasks.inbox")));
    await addTask(id, value, { scheduled: date });
  }
  return (
    <form onSubmit={submit} className="my-2 flex items-center gap-3 px-2 py-1">
      <Plus className="size-[18px] text-ink-3" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("tasks.addPlaceholder")}
        className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
      />
    </form>
  );
}
