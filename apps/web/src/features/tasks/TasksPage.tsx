import { Link, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarRange, CheckCheck, Inbox, Layers, Plus, Star } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { accountDb, type TaskRow } from "@/data/db";
import { addTask, findInbox, getOrCreateInbox } from "@/domain/actions";
import { noteTitle, useWorkspace } from "@/domain/workspace";
import { PageTitle, TopBar } from "@/features/shell/PageHeader";
import { formatDay, formatLongDate, formatWeekday, today } from "@/lib/dates";
import { cn, EmptyState } from "@/ui";
import { clearLinger, TaskItems, useLinger } from "./TaskList";

export type TaskView = "inbox" | "today" | "upcoming" | "all" | "logbook";

const VIEWS: { id: TaskView; icon: ReactNode }[] = [
  { id: "inbox", icon: <Inbox className="size-4" /> },
  { id: "today", icon: <Star className="size-4" /> },
  { id: "upcoming", icon: <CalendarRange className="size-4" /> },
  { id: "all", icon: <Layers className="size-4" /> },
  { id: "logbook", icon: <CheckCheck className="size-4" /> },
];

const byDate = (a: TaskRow, b: TaskRow) =>
  (a.scheduled ?? a.deadline ?? "9999").localeCompare(b.scheduled ?? b.deadline ?? "9999") || a.order - b.order;

export function TasksPage() {
  const { t } = useTranslation();
  const { view } = useParams({ from: "/app/tasks/$view" });
  const notes = useWorkspace((s) => s.notes);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const all = useLiveQuery(() => accountDb().tasks.toArray(), [], undefined);
  const inboxId = useWorkspace(() => findInbox());
  const linger = useLinger((s) => s.keys);
  useEffect(() => clearLinger, [view]);

  const tasks = useMemo(() => {
    const nbs = new Set(notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
    return (all ?? []).filter((r) => {
      const n = notes[r.noteId];
      return n && !n.trashedAt && (r.noteKind === "inbox" || nbs.has(r.notebookId));
    });
  }, [all, notes, notebooks, spaceId]);
  // A just-completed task keeps its place in the list (shown done) until the view changes.
  const isOpen = (r: TaskRow) => r.state === "open" || (view !== "logbook" && linger.has(r.key));

  const d = today();
  const label = t(`tasks.${view}`);
  let body: ReactNode;
  if (all === undefined) body = null;
  else if (view === "inbox") {
    const list = tasks.filter((r) => r.noteKind === "inbox" && isOpen(r) && !r.scheduled).sort((a, b) => a.order - b.order);
    body = list.length ? <TaskItems tasks={list} showSource={false} /> : <EmptyState icon={<Inbox className="size-7" />} title={label} description={t("tasks.emptyInbox")} />;
  } else if (view === "today") {
    const open = tasks.filter((r) => isOpen(r));
    const overdue = open.filter((r) => r.deadline && r.deadline < d && !(r.scheduled && r.scheduled >= d)).sort(byDate);
    const todays = open.filter((r) => !overdue.includes(r) && ((r.scheduled && r.scheduled <= d) || r.deadline === d)).sort(byDate);
    body =
      overdue.length + todays.length ? (
        <>
          {overdue.length > 0 && (
            <Group title={t("tasks.overdue")} tone="danger">
              <TaskItems tasks={overdue} />
            </Group>
          )}
          <Group title={overdue.length ? t("tasks.today") : undefined}>
            <TaskItems tasks={todays} />
          </Group>
        </>
      ) : (
        <EmptyState icon={<Star className="size-7" />} title={label} description={t("tasks.emptyToday")} />
      );
  } else if (view === "upcoming") {
    const future = tasks.filter((r) => isOpen(r) && ((r.scheduled && r.scheduled > d) || (!r.scheduled && r.deadline && r.deadline > d)));
    const groups = new Map<string, TaskRow[]>();
    for (const r of future.sort(byDate)) {
      const key = r.scheduled && r.scheduled > d ? r.scheduled : r.deadline!;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    body = groups.size ? (
      [...groups.entries()].map(([date, list]) => (
        <Group
          key={date}
          title={
            <Link to="/calendar" search={{ date }} className="hover:text-ink">
              <span className="text-ink">{formatDay(date)}</span> <span className="font-normal capitalize text-ink-2">· {formatWeekday(date)}</span>
            </Link>
          }
        >
          <TaskItems tasks={list} />
        </Group>
      ))
    ) : (
      <EmptyState icon={<CalendarRange className="size-7" />} title={label} description={t("tasks.emptyUpcoming")} />
    );
  } else if (view === "all") {
    const open = tasks.filter((r) => isOpen(r));
    const groups = new Map<string, TaskRow[]>();
    for (const r of open) groups.set(r.noteId, [...(groups.get(r.noteId) ?? []), r]);
    const ordered = [...groups.entries()].sort(([a], [b]) => (notes[a]?.kind === "inbox" ? -1 : notes[b]?.kind === "inbox" ? 1 : (notes[a]?.title ?? "").localeCompare(notes[b]?.title ?? "")));
    body = ordered.length ? (
      ordered.map(([noteId, list]) => (
        <Group
          key={noteId}
          title={
            notes[noteId]?.kind === "inbox" ? (
              t("tasks.inbox")
            ) : (
              <Link to="/doc/$noteId" params={{ noteId }} className="text-ink hover:text-accent">
                {notes[noteId]?.icon} {noteTitle(notes[noteId], t("app.untitled"))}
              </Link>
            )
          }
        >
          <TaskItems tasks={list.sort((a, b) => a.order - b.order)} showSource={false} />
        </Group>
      ))
    ) : (
      <EmptyState icon={<Layers className="size-7" />} title={label} description={t("tasks.emptyAll")} />
    );
  } else {
    const done = tasks
      .filter((r) => r.state !== "open")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 200);
    body = done.length ? <TaskItems tasks={done} /> : <EmptyState icon={<CheckCheck className="size-7" />} title={label} />;
  }

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <TopBar>
        <nav className="flex min-w-0 gap-0.5 overflow-x-auto" aria-label={t("tasks.title")}>
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              to="/tasks/$view"
              params={{ view: v.id }}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                v.id === view ? "bg-ink/[0.07] font-medium text-ink" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
              )}
              aria-current={v.id === view ? "page" : undefined}
              data-testid={`tasks-tab-${v.id}`}
            >
              {v.icon}
              <span className={cn(v.id !== view && "sr-only sm:not-sr-only")}>{t(`tasks.${v.id}`)}</span>
            </Link>
          ))}
        </nav>
      </TopBar>
      <div className="mx-auto max-w-[760px] pb-24">
        <PageTitle title={label} subtitle={view === "today" ? formatLongDate(d) : undefined} />
        <div className="px-3 sm:px-8">
          {(view === "inbox" || view === "today") && <AddTask scheduled={view === "today" ? d : null} inboxId={inboxId} />}
          {body}
        </div>
      </div>
    </div>
  );
}

function Group({ title, children, tone }: { title?: ReactNode; children: ReactNode; tone?: "danger" }) {
  return (
    <section className="mb-6">
      {title && (
        <h2 className={cn("mb-1 border-b border-line px-2 pb-2 text-[13.5px] font-semibold", tone === "danger" ? "text-danger" : "text-ink-2")}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function AddTask({ scheduled, inboxId }: { scheduled: string | null; inboxId: string | null }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const id = inboxId ?? (await getOrCreateInbox(t("tasks.inbox")));
    await addTask(id, value, { scheduled });
  }
  return (
    <form onSubmit={submit} className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-line px-2 py-2 focus-within:border-accent/50 focus-within:bg-surface">
      <Plus className="size-[18px] text-ink-3" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("tasks.addPlaceholder")}
        className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        data-testid="add-task"
      />
    </form>
  );
}
