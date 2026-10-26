import * as Y from "yjs";
import { FORMAT_VERSION, uuidv7, type NoteBackdrop, type NoteCover, type NoteStyle, type TaskState } from "@/lib/shared";

// Note doc layout: document-model.md §4. `content` is exactly what y-prosemirror writes:
// nodes are Y.XmlElement (attrs = node attrs; null attrs are absent), text is Y.XmlText,
// inline atoms (noteLink, tag) are Y.XmlElement siblings of Y.XmlText.

export const DEFAULT_STYLE: NoteStyle = { font: "serif", width: "normal", paper: "plain", textColor: null };

export const noteMaps = (doc: Y.Doc) => ({
  content: doc.getXmlFragment("content"),
  meta: doc.getMap<unknown>("meta"),
  strokes: doc.getMap<Y.Map<unknown>>("strokes"),
  comments: doc.getMap<Y.Map<unknown>>("comments"),
});

function el(name: string, attrs: Record<string, unknown> = {}, children: (Y.XmlElement | Y.XmlText)[] = []) {
  const e = new Y.XmlElement(name);
  e.setAttribute("blockId", uuidv7() as never);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, v as never);
  if (children.length) e.insert(0, children);
  return e;
}

function text(s: string) {
  const t = new Y.XmlText();
  if (s) t.insert(0, s);
  return t;
}

export function initNoteDoc(doc: Y.Doc, opts: { title?: string; body?: string[] } = {}) {
  const { content, meta } = noteMaps(doc);
  meta.set("formatVersion", FORMAT_VERSION);
  meta.set("style", DEFAULT_STYLE);
  meta.set("cover", null);
  meta.set("backdrop", null);
  const blocks: Y.XmlElement[] = [el("title", {}, [text(opts.title ?? "")])];
  const body = opts.body?.length ? opts.body : [""];
  for (const p of body) blocks.push(el("paragraph", {}, [text(p)]));
  content.insert(0, blocks);
}

// ---------- reading ----------

export type ExtractedTask = {
  taskId: string;
  text: string;
  state: TaskState;
  scheduled: string | null;
  deadline: string | null;
  completedAt: string | null;
  order: number;
};

export type Extracted = {
  title: string;
  text: string;
  tasks: ExtractedTask[];
  links: string[];
  tags: string[];
  snippet: string;
};

function inlineText(node: Y.XmlElement | Y.XmlFragment, sink: { links: Set<string>; tags: Set<string> }): string {
  let out = "";
  for (const child of node.toArray()) {
    if (child instanceof Y.XmlText) {
      for (const op of child.toDelta() as { insert: unknown }[]) if (typeof op.insert === "string") out += op.insert;
    } else if (child instanceof Y.XmlElement) {
      const name = child.nodeName;
      if (name === "noteLink") {
        const id = child.getAttribute("noteId") as string | undefined;
        if (id) sink.links.add(id);
        out += (child.getAttribute("label") as string | undefined) ?? "";
      } else if (name === "tag") {
        const t = child.getAttribute("name") as string | undefined;
        if (t) {
          sink.tags.add(t);
          out += `#${t}`;
        }
      } else if (name === "hardBreak") out += "\n";
    }
  }
  return out;
}

const INLINE_CONTAINERS = new Set(["title", "paragraph", "heading", "codeBlock"]);

export function extractNote(doc: Y.Doc): Extracted {
  const { content } = noteMaps(doc);
  const sink = { links: new Set<string>(), tags: new Set<string>() };
  const lines: string[] = [];
  const tasks: ExtractedTask[] = [];
  let title = "";

  const walk = (nodes: unknown[]) => {
    for (const child of nodes) {
      if (!(child instanceof Y.XmlElement)) continue;
      const name = child.nodeName;
      if (name === "title") {
        title = inlineText(child, sink).trim();
        continue;
      }
      if (INLINE_CONTAINERS.has(name)) {
        const t = inlineText(child, sink);
        if (t.trim()) lines.push(t);
        continue;
      }
      if (name === "taskItem") {
        const first = child.toArray().find((c): c is Y.XmlElement => c instanceof Y.XmlElement && c.nodeName === "paragraph");
        const t = first ? inlineText(first, sink) : "";
        const a = child.getAttributes() as Record<string, unknown>;
        tasks.push({
          taskId: (a.taskId as string) ?? (a.blockId as string) ?? "",
          text: t.trim(),
          state: ((a.state as TaskState) ?? "open") as TaskState,
          scheduled: (a.scheduled as string) ?? null,
          deadline: (a.deadline as string) ?? null,
          completedAt: (a.completedAt as string) ?? null,
          order: tasks.length,
        });
        if (t.trim()) lines.push(t);
        // nested blocks of the task
        walk(child.toArray().filter((c) => c !== first));
        continue;
      }
      if (name === "mathBlock") lines.push(String(child.getAttribute("latex") ?? ""));
      else if (name === "mermaid") lines.push(String(child.getAttribute("source") ?? ""));
      else if (name === "image") lines.push(String(child.getAttribute("caption") ?? child.getAttribute("alt") ?? ""));
      else if (name === "file") lines.push(String(child.getAttribute("name") ?? ""));
      walk(child.toArray());
    }
  };
  walk(content.toArray());
  const body = lines.join("\n");
  return {
    title,
    text: body,
    tasks: tasks.filter((t) => t.taskId),
    links: [...sink.links],
    tags: [...sink.tags],
    snippet: body.replace(/\s+/g, " ").slice(0, 220),
  };
}

export function readNoteMeta(doc: Y.Doc): {
  formatVersion: number;
  style: NoteStyle;
  cover: NoteCover;
  backdrop: NoteBackdrop;
} {
  const { meta } = noteMaps(doc);
  return {
    formatVersion: (meta.get("formatVersion") as number | undefined) ?? FORMAT_VERSION,
    style: { ...DEFAULT_STYLE, ...((meta.get("style") as Partial<NoteStyle> | undefined) ?? {}) },
    cover: (meta.get("cover") as NoteCover | undefined) ?? null,
    backdrop: (meta.get("backdrop") as NoteBackdrop | undefined) ?? null,
  };
}

// ---------- tasks ----------

function findTask(node: Y.XmlFragment | Y.XmlElement, taskId: string): Y.XmlElement | null {
  for (const child of node.toArray()) {
    if (!(child instanceof Y.XmlElement)) continue;
    if (child.nodeName === "taskItem" && (child.getAttribute("taskId") === taskId || child.getAttribute("blockId") === taskId))
      return child;
    const found = findTask(child, taskId);
    if (found) return found;
  }
  return null;
}

export type TaskPatch = Partial<{
  state: TaskState;
  scheduled: string | null;
  deadline: string | null;
}>;

export function updateTask(doc: Y.Doc, taskId: string, patch: TaskPatch): boolean {
  const item = findTask(noteMaps(doc).content, taskId);
  if (!item) return false;
  doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (v === null) item.removeAttribute(k);
      else item.setAttribute(k, v as never);
    }
    if (patch.state) {
      if (patch.state === "done") item.setAttribute("completedAt", new Date().toISOString() as never);
      else item.removeAttribute("completedAt");
    }
  });
  return true;
}

export function setTaskText(doc: Y.Doc, taskId: string, value: string): boolean {
  const item = findTask(noteMaps(doc).content, taskId);
  if (!item) return false;
  doc.transact(() => {
    let para = item.toArray().find((c): c is Y.XmlElement => c instanceof Y.XmlElement && c.nodeName === "paragraph");
    if (!para) {
      para = el("paragraph", {}, []);
      item.insert(0, [para]);
    }
    para.delete(0, para.length);
    para.insert(0, [text(value)]);
  });
  return true;
}

export function removeTask(doc: Y.Doc, taskId: string): { text: string; attrs: Record<string, unknown> } | null {
  const item = findTask(noteMaps(doc).content, taskId);
  if (!item) return null;
  const parent = item.parent as Y.XmlElement | null;
  if (!parent) return null;
  const sink = { links: new Set<string>(), tags: new Set<string>() };
  const first = item.toArray().find((c): c is Y.XmlElement => c instanceof Y.XmlElement && c.nodeName === "paragraph");
  const result = { text: first ? inlineText(first, sink) : "", attrs: item.getAttributes() as Record<string, unknown> };
  doc.transact(() => {
    const idx = parent.toArray().indexOf(item);
    parent.delete(idx, 1);
    if (parent.length === 0 && parent.parent) {
      const gp = parent.parent as Y.XmlElement | Y.XmlFragment;
      gp.delete(gp.toArray().indexOf(parent), 1);
    }
  });
  return result;
}

/** Append a task at the end of the note (into its last top-level task list, or a new one). */
export function appendTask(
  doc: Y.Doc,
  textValue: string,
  attrs: { taskId?: string; state?: TaskState; scheduled?: string | null; deadline?: string | null } = {},
): string {
  const { content } = noteMaps(doc);
  const taskId = attrs.taskId ?? uuidv7();
  doc.transact(() => {
    const item = el(
      "taskItem",
      {
        taskId,
        state: attrs.state ?? "open",
        scheduled: attrs.scheduled ?? null,
        deadline: attrs.deadline ?? null,
      },
      [el("paragraph", {}, [text(textValue)])],
    );
    const children = content.toArray();
    const last = children[children.length - 1];
    let list: Y.XmlElement | null = null;
    if (last instanceof Y.XmlElement && last.nodeName === "taskList") list = last;
    else if (
      last instanceof Y.XmlElement &&
      last.nodeName === "paragraph" &&
      last.length <= 1 &&
      inlineText(last, { links: new Set(), tags: new Set() }) === "" &&
      children.length > 1
    ) {
      const prev = children[children.length - 2];
      if (prev instanceof Y.XmlElement && prev.nodeName === "taskList") list = prev;
    }
    if (list) list.insert(list.length, [item]);
    else content.insert(content.length, [el("taskList", {}, [item])]);
  });
  return taskId;
}

export function setTitle(doc: Y.Doc, title: string) {
  const { content } = noteMaps(doc);
  doc.transact(() => {
    let first = content.get(0);
    if (!(first instanceof Y.XmlElement) || first.nodeName !== "title") {
      first = el("title", {}, [text("")]);
      content.insert(0, [first as Y.XmlElement]);
    }
    const t = first as Y.XmlElement;
    t.delete(0, t.length);
    t.insert(0, [text(title)]);
  });
}

export function setNoteMeta(doc: Y.Doc, patch: Partial<{ style: NoteStyle; cover: NoteCover; backdrop: NoteBackdrop }>) {
  const { meta } = noteMaps(doc);
  doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) meta.set(k, v);
  });
}

// ---------- version restore ----------

function cloneNode(node: Y.XmlElement | Y.XmlText): Y.XmlElement | Y.XmlText {
  if (node instanceof Y.XmlText) {
    const t = new Y.XmlText();
    t.applyDelta(node.toDelta());
    return t;
  }
  const e = new Y.XmlElement(node.nodeName);
  for (const [k, v] of Object.entries(node.getAttributes())) e.setAttribute(k, v as never);
  e.insert(
    0,
    node.toArray().filter((c): c is Y.XmlElement | Y.XmlText => c instanceof Y.XmlElement || c instanceof Y.XmlText).map(cloneNode),
  );
  return e;
}

/** Replace the current content/meta/strokes with those of `source` as a new local edit (history restore). */
export function restoreFrom(target: Y.Doc, source: Y.Doc) {
  const t = noteMaps(target);
  const s = noteMaps(source);
  target.transact(() => {
    t.content.delete(0, t.content.length);
    t.content.insert(
      0,
      s.content.toArray().filter((c): c is Y.XmlElement | Y.XmlText => c instanceof Y.XmlElement || c instanceof Y.XmlText).map(cloneNode),
    );
    for (const k of ["style", "cover", "backdrop"]) t.meta.set(k, s.meta.get(k) ?? null);
    const keep = new Set<string>();
    s.strokes.forEach((v, k) => {
      keep.add(k);
      if (!t.strokes.has(k)) {
        const m = new Y.Map<unknown>();
        for (const [kk, vv] of Object.entries(v.toJSON())) m.set(kk, vv);
        t.strokes.set(k, m);
      }
    });
    for (const k of [...t.strokes.keys()]) if (!keep.has(k)) t.strokes.delete(k);
  });
}

/** Plain text of a block (and its children). */
function blockText(node: Y.XmlElement | Y.XmlText): string {
  if (node instanceof Y.XmlText) return node.toString().replace(/<[^>]*>/g, "");
  return node.toArray().map((c) => blockText(c as Y.XmlElement | Y.XmlText)).join("");
}

/**
 * Nothing but an empty title and empty paragraphs, and no drawing (spec/04 «Название новой
 * заметки»: such a note is not kept when it is closed).
 */
export function isNoteEmpty(doc: Y.Doc): boolean {
  const { content, strokes } = noteMaps(doc);
  if (strokes.size > 0) return false;
  return content.toArray().every((n) => n instanceof Y.XmlElement && (n.nodeName === "title" || n.nodeName === "paragraph") && !blockText(n).trim());
}

/** Body of a note (everything after the title) has text or anything else but empty paragraphs. */
export function hasBody(doc: Y.Doc): boolean {
  const { content, strokes } = noteMaps(doc);
  if (strokes.size > 0) return true;
  return content
    .toArray()
    .some((n) => !(n instanceof Y.XmlElement) || (n.nodeName !== "title" && (n.nodeName !== "paragraph" || !!blockText(n).trim())));
}

/**
 * The title an untitled note gets (spec/04): «Заметка 26 октября 2026» / «Note Oct 26, 2026» —
 * the word and the date format follow the interface language, the date is the note's creation day.
 */
export function defaultNoteTitle(createdAt: string | Date, lang: string): string {
  const d = new Date(createdAt);
  if (lang.startsWith("en")) return `Note ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d)}`;
  // Russian Intl adds « г.» after the year; the title is without it.
  const date = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(d).replace(/\s*г\.?$/, "");
  return `Заметка ${date}`;
}

