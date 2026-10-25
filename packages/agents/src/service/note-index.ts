/**
 * Derived data of a note (search text, tags, links, tasks) — what clients
 * build locally (document-model.md §5). The plugin builds it on the fly from
 * decrypted agent-mode notes and caches it by (noteId, seq).
 */
import { extractNoteLinks, extractTags, extractTasks, getTitle } from "@datascratch/shared/document";
import type * as Y from "yjs";
import { attr, childElements, contentOf, findBlock, plainText } from "../doc/model.js";

export interface TaskInfo {
  taskId: string;
  blockId: string | null;
  text: string;
  state: "open" | "done" | "cancelled";
  scheduled: string | null;
  deadline: string | null;
  completedAt: string | null;
}

export interface NoteIndex {
  noteId: string;
  seq: number;
  title: string;
  /** Plain text of the body, blocks separated by newlines. */
  text: string;
  /** Lowercased title + text for matching. */
  haystack: string;
  tags: string[];
  /** Outgoing links: noteLink atoms and pageCard blocks. */
  links: { noteId: string; label: string; context: string }[];
  tasks: TaskInfo[];
  strokeCount: number;
}

export function buildNoteIndex(noteId: string, seq: number, doc: Y.Doc): NoteIndex {
  const title = getTitle(doc);
  const text = childElements(contentOf(doc))
    .filter((e) => e.nodeName !== "title")
    .map((b) => plainText(b))
    .filter(Boolean)
    .join("\n");
  const links = extractNoteLinks(doc, noteId).map((l) => {
    const loc = l.blockId ? findBlock(doc, l.blockId) : null;
    const isCard = loc?.el.nodeName === "pageCard";
    return { noteId: l.toNoteId, label: l.label, context: isCard ? "(вложенный документ)" : loc ? plainText(loc.el).slice(0, 240) : "" };
  });
  const tasks: TaskInfo[] = extractTasks(doc, noteId).map((t) => ({
    taskId: t.taskId,
    blockId: t.blockId,
    text: t.text,
    state: t.state,
    scheduled: t.scheduled,
    deadline: t.deadline,
    completedAt: attr<string | null>(findBlock(doc, t.blockId)!.el, "completedAt") ?? null,
  }));
  return {
    noteId,
    seq,
    title,
    text,
    haystack: `${title}\n${text}`.toLowerCase(),
    tags: extractTags(doc),
    links,
    tasks,
    strokeCount: doc.getMap("strokes").size,
  };
}

/** Small LRU keyed by noteId; an entry is valid only for the seq it was built at. */
export class NoteIndexCache {
  private readonly map = new Map<string, NoteIndex>();
  constructor(private readonly max = 5000) {}

  get(key: string, seq: number): NoteIndex | undefined {
    const hit = this.map.get(key);
    if (!hit || hit.seq !== seq) return undefined;
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key: string, value: NoteIndex): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

export interface SearchHit {
  score: number;
  snippet: string;
}

/** All terms must match (case-insensitive substring); title hits weigh more. */
export function matchNote(index: NoteIndex, terms: string[]): SearchHit | null {
  if (terms.length === 0) return { score: 0, snippet: index.text.slice(0, 200) };
  let score = 0;
  const title = index.title.toLowerCase();
  const tagText = index.tags.map((t) => `#${t.toLowerCase()}`).join(" ");
  for (const term of terms) {
    let n = 0;
    for (let i = index.haystack.indexOf(term); i !== -1; i = index.haystack.indexOf(term, i + term.length)) n++;
    const inTags = tagText.includes(term);
    if (n === 0 && !inTags) return null;
    score += Math.min(n, 20) + (title.includes(term) ? 10 : 0) + (inTags ? 5 : 0);
  }
  return { score, snippet: snippet(index.text, terms[0]!) };
}

function snippet(text: string, term: string, radius = 90): string {
  const i = text.toLowerCase().indexOf(term);
  if (i === -1) return text.slice(0, radius * 2).replace(/\s+/g, " ").trim();
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + term.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
}

export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
