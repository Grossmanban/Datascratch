import type { Editor } from "@tiptap/core";
import { Calendar } from "@datascratch/ui";
import { useState } from "react";
import type { EditorHost } from "../host";
import { addDays, dateChipLabel, localDate, nextWeek, type TaskMenuRequest } from "../schema/tasks";
import { Floating } from "./Popups";

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Context menu of a task (spec/12 §12.1): reschedule, deadline, complete, cancel, open, move, delete. */
export function TaskMenu({ editor, request, host, dates = true, onClose }: { editor: Editor; request: TaskMenuRequest; host: EditorHost; dates?: boolean; onClose: () => void }) {
  const [picker, setPicker] = useState<null | "scheduled" | "deadline">(null);
  const node = editor.state.doc.nodeAt(request.pos);
  if (!node || node.type.name !== "taskItem") return null;
  const a = node.attrs;
  const today = localDate();
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };
  const setDates = (dates: { scheduled?: string | null; deadline?: string | null }) => editor.chain().setTaskDates(dates, request.pos).run();
  const item = (label: string, onClick: () => void, opts: { hint?: string; danger?: boolean; active?: boolean } = {}) => (
    <button type="button" className={`ds-menu-item${opts.danger ? " is-danger" : ""}${opts.active ? " is-checked" : ""}`} onClick={onClick}>
      <span className="ds-menu-title">{label}</span>
      {opts.hint && <span className="ds-menu-hint-right">{opts.hint}</span>}
    </button>
  );
  if (picker) {
    const current = (picker === "scheduled" ? a.scheduled : a.deadline) as string | null;
    return (
      <Floating rect={request.rect} className="ds-menu ds-task-menu" onDismiss={onClose}>
        <div className="ds-menu-list">
          <div className="ds-menu-group">{picker === "scheduled" ? "Запланировать на" : "Дедлайн"}</div>
          <div className="ds-calendar" onMouseDown={(e) => e.stopPropagation()}>
            <Calendar
              value={current ? parseDate(current) : null}
              onChange={(d) => {
                setDates({ [picker]: localDate(d) });
                onClose();
              }}
            />
          </div>
          {current && item("Убрать дату", run(() => setDates({ [picker]: null })), { danger: true })}
        </div>
      </Floating>
    );
  }
  return (
    <Floating rect={request.rect} className="ds-menu ds-task-menu" onDismiss={onClose}>
      <div className="ds-menu-list">
        {/* D-51: dates belong to the extended mode. */}
        {dates && (
          <>
            <div className="ds-menu-group">Перенести</div>
            {item("Сегодня", run(() => setDates({ scheduled: today })), { active: a.scheduled === today })}
            {item("Завтра", run(() => setDates({ scheduled: addDays(today, 1) })), { active: a.scheduled === addDays(today, 1) })}
            {item("След. неделя", run(() => setDates({ scheduled: nextWeek(today) })), { hint: dateChipLabel(nextWeek(today), today) })}
            {item("Дата…", () => setPicker("scheduled"), { hint: a.scheduled ? dateChipLabel(a.scheduled, today) : undefined })}
            {a.scheduled && item("Без даты", run(() => setDates({ scheduled: null })))}
            <div className="ds-menu-sep" />
            {item("Дедлайн…", () => setPicker("deadline"), { hint: a.deadline ? dateChipLabel(a.deadline, today) : undefined })}
            <div className="ds-menu-sep" />
          </>
        )}
        {a.state !== "done" ? item("Выполнить", run(() => editor.chain().setTaskState("done", request.pos).run())) : item("Вернуть в работу", run(() => editor.chain().setTaskState("open", request.pos).run()))}
        {a.state !== "cancelled" ? item("Отменить", run(() => editor.chain().setTaskState("cancelled", request.pos).run())) : item("Вернуть в работу", run(() => editor.chain().setTaskState("open", request.pos).run()))}
        {host.onTaskAction && (
          <>
            <div className="ds-menu-sep" />
            {item("Открыть документ", run(() => host.onTaskAction!("open", { taskId: a.taskId, blockId: a.blockId })))}
            {/* Moving a task (to the Inbox, another note) is part of the extended mode too. */}
            {dates && item("Переместить…", run(() => host.onTaskAction!("move", { taskId: a.taskId, blockId: a.blockId })))}
          </>
        )}
        <div className="ds-menu-sep" />
        {item(
          "Удалить",
          run(() => {
            const n = editor.state.doc.nodeAt(request.pos);
            if (!n) return;
            const $pos = editor.state.doc.resolve(request.pos);
            const list = $pos.parent;
            // The last task of a list removes the whole list.
            if (list.childCount === 1) editor.chain().deleteRange({ from: $pos.before(), to: $pos.after() }).run();
            else editor.chain().deleteRange({ from: request.pos, to: request.pos + n.nodeSize }).run();
          }),
          { danger: true },
        )}
      </div>
    </Floating>
  );
}
