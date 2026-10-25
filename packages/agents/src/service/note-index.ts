/**
 * Derived data of a note (search text, tags, links, tasks) — what clients
 * build locally (document-model.md §5). The plugin builds it on the fly from
 * decrypted agent-mode notes and caches it by (noteId, seq).
 */
import * as Y from "yjs";
import { attr, blockIdOf, childElements, contentOf, noteTitle, plainText, walkAtoms, walkBlocks } from "../doc/model.js";

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
  const title = noteTitle(doc);
  const bodyBlocks = childElements(contentOf(doc)).filter((e) => e.nodeName !== "title");
  const text = bodyBlocks
    .map((b) => plainText(b))
    .filter(Boolean)
    .join("\n");
  const tags = new Set<string>();
  const links: NoteIndex["links"] = [];
  walkAtoms(doc, (atom, block) => {
    if (atom.nodeName === "tag") {
      const name = attr<string>(atom, "name");
      if (name) tags.add(name);
    } else if (atom.nodeName === "noteLink") {
      const target = attr<string>(atom, "noteId");
      if (target) links.push({ noteId: target, label: String(attr(atom, "label") ?? ""), context: plainText(block).slice(0, 240) });
    }
  });
  const tasks: TaskInfo[] = [];
  walkBlocks(doc, (el) => {
    if (el.nodeName === "pageCard") {
      const target = attr<string>(el, "noteId");
      if (target) links.push({ noteId: target, label: "", context: "(вложенный документ)" });
    }
    if (el.nodeName !== "taskItem") return;
    const first = childElements(el)[0];
    tasks.push({
      taskId: String(attr(el, "taskId") ?? ""),
      blockId: blockIdOf(el),
      text: first ? plainText(first) : "",
      state: (attr<TaskInfo["state"]>(el, "state") ?? "open") as TaskInfo["state"],
      scheduled: attr<string | null>(el, "scheduled") ?? null,
      deadline: attr<string | null>(el, "deadline") ?? null,
      completedAt: attr<string | null>(el, "completedAt") ?? null,
    });
  });
  return {
    noteId,
    seq,
    title,
    text,
    haystack: `${title}\n${text}`.toLowerCase(),
    tags: [...tags],
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
