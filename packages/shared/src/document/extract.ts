// Derived data built locally from note documents (document-model.md §5):
// plain text for search, task index, backlinks, tags.
import * as Y from "yjs";
import type { NoteLinkRef, TaskIndexEntry, TaskState } from "../contracts/document.js";
import { TASK_STATES } from "../contracts/document.js";
import { noteRoots } from "./factories.js";
import type { YChild } from "./yjs.js";

const INLINE_TEXT_BLOCKS = new Set(["title", "paragraph", "heading", "codeBlock"]);
const ATTR_TEXT_BLOCKS = new Set(["mathBlock", "mermaid", "image", "file"]);

/** Text of an element's inline content (noteLink → label, tag → #name, hardBreak → newline). */
export function inlineText(el: Y.XmlElement): string {
  let out = "";
  for (const child of el.toArray() as YChild[]) {
    if (child instanceof Y.XmlText) out += deltaText(child);
    else if (child.nodeName === "noteLink") out += String(child.getAttribute("label") ?? "");
    else if (child.nodeName === "tag") out += `#${String(child.getAttribute("name") ?? "")}`;
    else if (child.nodeName === "hardBreak") out += "\n";
    else if (child.nodeName === "mention") out += String(child.getAttribute("label") ?? "");
  }
  return out;
}

function deltaText(text: Y.XmlText): string {
  let s = "";
  for (const d of text.toDelta() as { insert: unknown }[])
    if (typeof d.insert === "string") s += d.insert;
  return s;
}

function attrText(el: Y.XmlElement): string {
  switch (el.nodeName) {
    case "mathBlock":
      return String(el.getAttribute("latex") ?? "");
    case "mermaid":
      return String(el.getAttribute("source") ?? "");
    case "image":
      return [el.getAttribute("alt"), el.getAttribute("caption")].filter(Boolean).join(" ");
    case "file":
      return String(el.getAttribute("name") ?? "");
    default:
      return "";
  }
}

/** Visit every element of `content` depth-first with its nearest ancestor blockId. */
export function walkElements(
  doc: Y.Doc,
  visit: (el: Y.XmlElement, blockId: string | null, depth: number) => void | "skip",
): void {
  const rec = (parent: Y.XmlElement | Y.XmlFragment, blockId: string | null, depth: number) => {
    for (const child of parent.toArray() as YChild[]) {
      if (!(child instanceof Y.XmlElement)) continue;
      const own = child.getAttribute("blockId");
      const id = typeof own === "string" ? own : blockId;
      if (visit(child, id, depth) === "skip") continue;
      rec(child, id, depth + 1);
    }
  };
  rec(noteRoots(doc).content, null, 0);
}

/** Title text of a note. */
export function getTitle(doc: Y.Doc): string {
  const first = noteRoots(doc).content.length > 0 ? noteRoots(doc).content.get(0) : null;
  return first instanceof Y.XmlElement && first.nodeName === "title" ? inlineText(first) : "";
}

/** Plain text of the whole note for full-text search; one line per text block. */
export function getPlainText(doc: Y.Doc): string {
  const lines: string[] = [];
  walkElements(doc, (el) => {
    const text = INLINE_TEXT_BLOCKS.has(el.nodeName)
      ? inlineText(el)
      : ATTR_TEXT_BLOCKS.has(el.nodeName)
        ? attrText(el)
        : "";
    if (text) lines.push(text);
  });
  return lines.join("\n");
}

function firstParagraphText(el: Y.XmlElement): string {
  for (const child of el.toArray() as YChild[]) {
    if (child instanceof Y.XmlElement && child.nodeName === "paragraph") return inlineText(child);
  }
  return "";
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** All task items of a note for the cross-note task index. */
export function extractTasks(doc: Y.Doc, noteId: string): TaskIndexEntry[] {
  const out: TaskIndexEntry[] = [];
  walkElements(doc, (el) => {
    if (el.nodeName !== "taskItem") return;
    const taskId = str(el.getAttribute("taskId"));
    const blockId = str(el.getAttribute("blockId"));
    if (!taskId || !blockId) return;
    const rawState = el.getAttribute("state");
    const state: TaskState = (TASK_STATES as readonly unknown[]).includes(rawState)
      ? (rawState as TaskState)
      : "open";
    out.push({
      noteId,
      taskId,
      blockId,
      text: firstParagraphText(el),
      state,
      scheduled: str(el.getAttribute("scheduled")),
      deadline: str(el.getAttribute("deadline")),
    });
  });
  return out;
}

/** Outgoing `[[links]]` of a note (input for backlinks). */
export function extractNoteLinks(doc: Y.Doc, noteId: string): NoteLinkRef[] {
  const out: NoteLinkRef[] = [];
  walkElements(doc, (el, blockId) => {
    if (el.nodeName === "noteLink") {
      const to = str(el.getAttribute("noteId"));
      if (to)
        out.push({
          fromNoteId: noteId,
          toNoteId: to,
          blockId,
          label: String(el.getAttribute("label") ?? ""),
        });
    } else if (el.nodeName === "pageCard") {
      const to = str(el.getAttribute("noteId"));
      if (to) out.push({ fromNoteId: noteId, toNoteId: to, blockId, label: "" });
    }
  });
  return out;
}

/** Backlinks index: target noteId → links pointing at it. */
export function buildBacklinks(links: Iterable<NoteLinkRef>): Map<string, NoteLinkRef[]> {
  const index = new Map<string, NoteLinkRef[]>();
  for (const link of links) {
    const list = index.get(link.toNoteId);
    if (list) list.push(link);
    else index.set(link.toNoteId, [link]);
  }
  return index;
}

/** Unique tag names used in a note, in first-use order. */
export function extractTags(doc: Y.Doc): string[] {
  const seen = new Set<string>();
  walkElements(doc, (el) => {
    if (el.nodeName !== "tag") return;
    const name = str(el.getAttribute("name"));
    if (name) seen.add(name);
  });
  return [...seen];
}

/** `a/b/c` → [`a`, `a/b`, `a/b/c`] (tag hierarchy for the tag tree). */
export function tagAncestors(name: string): string[] {
  const parts = name.split("/").filter(Boolean);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}
