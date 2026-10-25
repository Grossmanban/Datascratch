import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, FileText, Flag, MoreHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TaskRow } from "@/data/db";
import { editTaskText, openTab, patchTask } from "@/domain/actions";
import { noteTitle, useWorkspace } from "@/domain/workspace";
import { formatDay, today } from "@/lib/dates";
import { cn, ContextMenu, Dialog, DropdownMenu, IconButton, TaskCheckbox } from "@/ui";
import { create } from "zustand";
import { MonthCalendar } from "./DatePicker";

/** Tasks completed while a list is on screen stay visible (struck through) until the view changes. */
export const useLinger = create<{ keys: Set<string> }>(() => ({ keys: new Set() }));
export const clearLinger = () => useLinger.setState({ keys: new Set() });
import { taskMenuItems } from "./taskMenu";

export function TaskItems({ tasks, showSource = true, emptyText }: { tasks: TaskRow[]; showSource?: boolean; emptyText?: string }) {
  const [picking, setPicking] = useState<{ task: TaskRow; field: "scheduled" | "deadline" } | null>(null);
  const { t } = useTranslation();
  if (!tasks.length && emptyText) return <p className="px-2 py-3 text-[14px] text-ink-2">{emptyText}</p>;
  return (
    <>
      <ul className="flex flex-col" data-testid="task-list">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskLine key={task.key} task={task} showSource={showSource} onPick={(field) => setPicking({ task, field })} />
          ))}
        </AnimatePresence>
      </ul>
      <Dialog
        open={!!picking}
        onOpenChange={(o) => !o && setPicking(null)}
        title={picking?.field === "deadline" ? t("tasks.deadline") : t("tasks.schedule")}
        className="max-w-[320px]"
      >
        {picking && (
          <MonthCalendar
            compact
            value={picking.task[picking.field]}
            onPick={(d) => {
              void patchTask(picking.task.noteId, picking.task.taskId, { [picking.field]: d });
              setPicking(null);
            }}
          />
        )}
      </Dialog>
    </>
  );
}

function TaskLine({ task, showSource, onPick }: { task: TaskRow; showSource: boolean; onPick: (f: "scheduled" | "deadline") => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const note = useWorkspace((s) => s.notes[task.noteId]);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setText(task.text), [task.text]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  const d = today();
  const overdue = task.state === "open" && !!task.deadline && task.deadline < d;
  const commit = () => {
    setEditing(false);
    if (text.trim() && text !== task.text) void editTaskText(task.noteId, task.taskId, text.trim());
    else setText(task.text);
  };
  const items = () => taskMenuItems(task, t, navigate, onPick);
  return (
    <ContextMenu items={items}>
      <motion.li
        layout
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        className="group overflow-hidden"
        data-testid="task-row"
        data-state={task.state}
      >
        <div className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ink/[0.03]">
          <div className="pt-[3px]">
            <TaskCheckbox
              state={task.state}
              label={task.text}
              onToggle={() => {
                if (task.state === "open") useLinger.setState((s) => ({ keys: new Set(s.keys).add(task.key) }));
                void patchTask(task.noteId, task.taskId, { state: task.state === "open" ? "done" : "open" });
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setText(task.text);
                    setEditing(false);
                  }
                }}
                className="w-full bg-transparent text-[15px] text-ink outline-none"
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className={cn(
                  "block w-full truncate text-left text-[15px] leading-[1.4]",
                  task.state === "open" ? "text-ink" : "text-ink-3 line-through decoration-ink-3/50",
                )}
              >
                {task.text || <span className="text-ink-2">{t("app.untitled")}</span>}
              </button>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-2">
              {showSource && note && note.kind !== "inbox" && (
                <button
                  onClick={() => {
                    openTab(task.noteId);
                    void navigate({ to: "/doc/$noteId", params: { noteId: task.noteId } });
                  }}
                  className="inline-flex max-w-[220px] items-center gap-1 truncate hover:text-ink-2"
                >
                  <FileText className="size-3" />
                  <span className="truncate">{noteTitle(note, t("app.untitled"))}</span>
                </button>
              )}
              {task.scheduled && (
                <span className={cn("inline-flex items-center gap-1", task.scheduled <= d && task.state === "open" && "text-accent")}>
                  <CalendarClock className="size-3" />
                  {formatDay(task.scheduled)}
                </span>
              )}
              {task.deadline && (
                <span className={cn("inline-flex items-center gap-1", overdue ? "font-medium text-danger" : task.deadline === d ? "text-warning" : undefined)}>
                  <Flag className="size-3" />
                  {t("tasks.due", { date: formatDay(task.deadline) })}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu
            align="end"
            items={items()}
            trigger={
              <IconButton label={t("common.more")} size="sm" className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
                <MoreHorizontal className="size-4" />
              </IconButton>
            }
          />
        </div>
      </motion.li>
    </ContextMenu>
  );
}
