import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { dateLabel, type DateLabel } from "@datascratch/ui";
import type { TaskState } from "../shared/document";

/** Local calendar date as YYYY-MM-DD (document-model.md §1: "date only" is local). */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return localDate(new Date(y, m - 1, d + days));
}

/** Monday of next week. */
export function nextWeek(from: string = localDate()): string {
  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7;
  return addDays(from, 7 - dow);
}

function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Chip label and tone — the design system's rules, shared with iOS (`DSDateChipModel`). */
export function dateChip(date: string, opts: { deadline?: boolean; completed?: boolean } = {}, now: Date = new Date()): DateLabel {
  return dateLabel(parseLocalDate(date), now, "ru", opts);
}

/** Human chip label: «Сегодня», «Завтра», «Вчера», weekday, «3 ноя», «3 ноя 2027». */
export function dateChipLabel(date: string, today: string = localDate()): string {
  return dateChip(date, {}, parseLocalDate(today)).label;
}

export interface TaskMenuRequest {
  pos: number;
  rect: DOMRect;
  attrs: TaskItemAttrs;
}

export interface TaskItemAttrs {
  blockId: string | null;
  taskId: string | null;
  state: TaskState;
  scheduled: string | null;
  deadline: string | null;
  completedAt: string | null;
}

export const TASK_MENU_EVENT = "ds-task-menu";

export const TaskList = Node.create({
  name: "taskList",
  group: "block list",
  content: "taskItem+",
  parseHTML: () => [{ tag: 'ul[data-type="taskList"]', priority: 60 }],
  renderHTML: ({ HTMLAttributes }) => ["ul", mergeAttributes(HTMLAttributes, { "data-type": "taskList", class: "ds-task-list" }), 0],
  addCommands() {
    return {
      toggleTaskList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, "taskItem"),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-9": () => this.editor.commands.toggleTaskList() };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    taskList: { toggleTaskList: () => ReturnType };
    taskItem: {
      setTaskState: (state: TaskState, pos?: number) => ReturnType;
      setTaskDates: (dates: { scheduled?: string | null; deadline?: string | null }, pos?: number) => ReturnType;
    };
  }
}

function taskAttrsFrom(node: PMNode): TaskItemAttrs {
  return node.attrs as TaskItemAttrs;
}

export const TaskItem = Node.create({
  name: "taskItem",
  content: "paragraph block*",
  defining: true,
  addAttributes() {
    return {
      taskId: { default: null, keepOnSplit: false, parseHTML: (el) => el.getAttribute("data-task-id") },
      state: {
        default: "open",
        keepOnSplit: false,
        parseHTML: (el) => el.getAttribute("data-state") ?? (el.getAttribute("data-checked") === "true" ? "done" : "open"),
      },
      scheduled: { default: null, keepOnSplit: false, parseHTML: (el) => el.getAttribute("data-scheduled") },
      deadline: { default: null, keepOnSplit: false, parseHTML: (el) => el.getAttribute("data-deadline") },
      completedAt: { default: null, keepOnSplit: false, parseHTML: (el) => el.getAttribute("data-completed-at") },
    };
  },
  parseHTML: () => [{ tag: 'li[data-type="taskItem"]', priority: 60 }],
  renderHTML({ node, HTMLAttributes }) {
    const a = taskAttrsFrom(node);
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        "data-type": "taskItem",
        "data-task-id": a.taskId,
        "data-state": a.state,
        "data-scheduled": a.scheduled,
        "data-deadline": a.deadline,
        "data-completed-at": a.completedAt,
      }),
      ["label", { contenteditable: "false" }, ["input", { type: "checkbox", checked: a.state === "done" ? "checked" : null }]],
      ["div", 0],
    ];
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
      "Mod-Enter": () => {
        const { $from } = this.editor.state.selection;
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === this.name) {
            return this.editor.commands.setTaskState(node.attrs.state === "done" ? "open" : "done", $from.before(d));
          }
        }
        return false;
      },
    };
  },
  addCommands() {
    const findTaskPos = (state: import("@tiptap/pm/state").EditorState, pos?: number): number | null => {
      if (pos !== undefined) return pos;
      const { $from } = state.selection;
      for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "taskItem") return $from.before(d);
      return null;
    };
    return {
      setTaskState:
        (taskState, pos) =>
        ({ tr, state, dispatch }) => {
          const p = findTaskPos(state, pos);
          if (p === null) return false;
          if (dispatch) {
            tr.setNodeAttribute(p, "state", taskState);
            tr.setNodeAttribute(p, "completedAt", taskState === "open" ? null : new Date().toISOString());
          }
          return true;
        },
      setTaskDates:
        (dates, pos) =>
        ({ tr, state, dispatch }) => {
          const p = findTaskPos(state, pos);
          if (p === null) return false;
          if (dispatch) {
            if (dates.scheduled !== undefined) tr.setNodeAttribute(p, "scheduled", dates.scheduled);
            if (dates.deadline !== undefined) tr.setNodeAttribute(p, "deadline", dates.deadline);
          }
          return true;
        },
    };
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*(\[([( |x])?\])\s$/,
        type: this.type,
        getAttributes: (match) => ({ state: match[match.length - 1] === "x" ? "done" : "open" }),
      }),
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const li = document.createElement("li");
      li.dataset.type = "taskItem";
      li.className = "ds-task";
      const control = document.createElement("span");
      control.contentEditable = "false";
      control.className = "ds-task-control";
      const box = document.createElement("button");
      box.type = "button";
      box.className = "ds-task-box";
      box.setAttribute("role", "checkbox");
      control.append(box);
      const body = document.createElement("div");
      body.className = "ds-task-body";
      const chips = document.createElement("span");
      chips.contentEditable = "false";
      chips.className = "ds-task-chips";
      li.append(control, body, chips);

      const openMenu = (anchor: HTMLElement) => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const detail: TaskMenuRequest = { pos, rect: anchor.getBoundingClientRect(), attrs: taskAttrsFrom(current) };
        editor.view.dom.dispatchEvent(new CustomEvent(TASK_MENU_EVENT, { detail, bubbles: true }));
      };

      box.addEventListener("mousedown", (e) => e.preventDefault());
      box.addEventListener("click", (e) => {
        e.preventDefault();
        const pos = getPos();
        if (typeof pos !== "number" || !editor.isEditable) return;
        const next: TaskState = current.attrs.state === "open" ? "done" : "open";
        editor.chain().setTaskState(next, pos).run();
      });
      box.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openMenu(box);
      });
      li.addEventListener("contextmenu", (e) => {
        if (!(e.target instanceof HTMLElement) || !body.contains(e.target) || e.target === body) return;
        // Right click on the task text opens the task menu only with Alt; plain right click keeps text editing.
        if (!e.altKey) return;
        e.preventDefault();
        openMenu(box);
      });
      chips.addEventListener("mousedown", (e) => e.preventDefault());
      chips.addEventListener("click", (e) => {
        e.preventDefault();
        openMenu(chips);
      });

      const render = () => {
        const a = taskAttrsFrom(current);
        li.dataset.state = a.state;
        if (a.blockId) li.dataset.blockId = a.blockId;
        box.setAttribute("aria-checked", a.state === "done" ? "true" : a.state === "cancelled" ? "mixed" : "false");
        box.title = a.state === "cancelled" ? "Отменено" : a.state === "done" ? "Выполнено" : "Отметить выполненной";
        chips.replaceChildren();
        const completed = a.state !== "open";
        if (a.scheduled) {
          const { label, tone } = dateChip(a.scheduled, { completed });
          const c = document.createElement("span");
          c.className = "ds-chip ds-chip-scheduled";
          c.dataset.tone = tone;
          c.textContent = label;
          chips.append(c);
        }
        if (a.deadline) {
          const { label, tone } = dateChip(a.deadline, { deadline: true, completed });
          const c = document.createElement("span");
          c.className = "ds-chip ds-chip-deadline";
          c.dataset.tone = tone;
          c.textContent = `⚑ ${label}`;
          chips.append(c);
        }
        chips.hidden = !a.scheduled && !a.deadline;
      };
      render();

      return {
        dom: li,
        contentDOM: body,
        update: (updated) => {
          if (updated.type !== current.type) return false;
          current = updated;
          render();
          return true;
        },
        ignoreMutation: (m) => !body.contains(m.target) && m.target !== body,
        stopEvent: (e) => e.target instanceof globalThis.Node && (control.contains(e.target) || chips.contains(e.target)),
      };
    };
  },
});

/** Opens a task context menu programmatically (used by tests and keyboard shortcuts). */
export function requestTaskMenu(view: EditorView, pos: number, rect: DOMRect): void {
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "taskItem") return;
  const detail: TaskMenuRequest = { pos, rect, attrs: taskAttrsFrom(node) };
  view.dom.dispatchEvent(new CustomEvent(TASK_MENU_EVENT, { detail, bubbles: true }));
}
