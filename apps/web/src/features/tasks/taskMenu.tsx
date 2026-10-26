import type { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { Ban, CalendarClock, CalendarDays, CircleCheck, FileText, Flag, FolderInput, RotateCcw, Trash2 } from "lucide-react";
import type { TaskRow } from "@/data/db";
import { deleteTask, findInbox, getOrCreateInbox, moveTask, openTab, patchTask } from "@/domain/actions";
import { noteTitle, spaceOfNote, spaceOfNotebook, useWorkspace } from "@/domain/workspace";
import { nextWeek, today, tomorrow } from "@/lib/dates";
import type { MenuItem } from "@/ui";
import { iconGlyph } from "@/lib/glyph";

type Nav = ReturnType<typeof useNavigate>;

export function dateItems(t: TFunction, current: string | null, set: (d: string | null) => void, pick: () => void): MenuItem[] {
  return [
    { label: t("common.today"), checked: current === today(), onSelect: () => set(today()) },
    { label: t("common.tomorrow"), checked: current === tomorrow(), onSelect: () => set(tomorrow()) },
    { label: t("common.nextWeek"), checked: current === nextWeek(), onSelect: () => set(nextWeek()) },
    { label: t("common.pickDate"), icon: <CalendarDays className="size-3.5" />, onSelect: pick },
    ...(current ? [{ kind: "separator" as const }, { label: t("common.clear"), onSelect: () => set(null) }] : []),
  ];
}

export function taskMenuItems(
  task: TaskRow,
  t: TFunction,
  nav: Nav,
  pickDate: (field: "scheduled" | "deadline") => void,
): MenuItem[] {
  const st = useWorkspace.getState();
  const space = spaceOfNote(st, task.noteId);
  const recent = Object.values(st.notes)
    .filter((n) => !n.trashedAt && n.id !== task.noteId && n.kind !== "inbox" && spaceOfNotebook(st, n.notebookId) === space)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 8);
  const inboxId = findInbox();
  return [
    {
      kind: "sub",
      label: t("tasks.schedule"),
      icon: <CalendarClock className="size-3.5" />,
      items: dateItems(t, task.scheduled, (d) => void patchTask(task.noteId, task.taskId, { scheduled: d }), () => pickDate("scheduled")),
    },
    {
      kind: "sub",
      label: t("tasks.deadline"),
      icon: <Flag className="size-3.5" />,
      items: dateItems(t, task.deadline, (d) => void patchTask(task.noteId, task.taskId, { deadline: d }), () => pickDate("deadline")),
    },
    { kind: "separator" },
    task.state === "open"
      ? { label: t("tasks.complete"), icon: <CircleCheck className="size-3.5" />, shortcut: "⌘↵", onSelect: () => void patchTask(task.noteId, task.taskId, { state: "done" }) }
      : { label: t("tasks.reopen"), icon: <RotateCcw className="size-3.5" />, onSelect: () => void patchTask(task.noteId, task.taskId, { state: "open" }) },
    ...(task.state !== "cancelled"
      ? [{ label: t("tasks.cancel"), icon: <Ban className="size-3.5" />, onSelect: () => void patchTask(task.noteId, task.taskId, { state: "cancelled" }) }]
      : []),
    { kind: "separator" },
    {
      label: t("tasks.openDoc"),
      icon: <FileText className="size-3.5" />,
      onSelect: () => {
        openTab(task.noteId);
        void nav({ to: "/doc/$noteId", params: { noteId: task.noteId } });
      },
    },
    {
      kind: "sub",
      label: t("tasks.move"),
      icon: <FolderInput className="size-3.5" />,
      items: [
        ...(task.noteKind !== "inbox"
          ? [
              {
                label: t("tasks.inbox"),
                onSelect: async () => {
                  const id = inboxId ?? (await getOrCreateInbox(t("tasks.inbox")));
                  await moveTask(task.noteId, task.taskId, id);
                },
              },
              { kind: "separator" as const },
            ]
          : []),
        ...recent.map((n) => ({
          label: noteTitle(n, t("app.untitled")),
          icon: iconGlyph(n.icon) ? <span>{iconGlyph(n.icon)}</span> : <FileText className="size-3.5" />,
          onSelect: () => void moveTask(task.noteId, task.taskId, n.id),
        })),
      ],
    },
    { kind: "separator" },
    { label: t("tasks.deleteTask"), icon: <Trash2 className="size-3.5" />, danger: true, onSelect: () => void deleteTask(task.noteId, task.taskId) },
  ];
}
