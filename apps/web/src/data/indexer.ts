import MiniSearch from "minisearch";
import * as Y from "yjs";
import { create } from "zustand";
import { extractNote } from "@/domain/note";
import type { NoteKind } from "@/lib/shared";
import { accountDb, type NoteIndexRow, type TaskRow } from "./db";
import type { DocStore } from "./docStore";

export type SearchHit = { noteId: string; title: string; snippet: string; score: number };

/** Bumps whenever the local index changes (search results, backlinks re-query). */
export const useIndexVersion = create<{ v: number }>(() => ({ v: 0 }));

/**
 * Derived, never-synced data (document-model.md §5): tasks, full-text search, backlinks,
 * tags. Rebuilt from note docs on this device because the server can't read content.
 */
export class Indexer {
  private search = new MiniSearch<NoteIndexRow & { id: string }>({
    fields: ["title", "text", "tagsText"],
    storeFields: ["title", "noteId"],
    idField: "id",
    extractField: (doc, field) =>
      field === "tagsText" ? doc.tags.join(" ") : ((doc as unknown as Record<string, unknown>)[field] as string),
    searchOptions: { boost: { title: 3, tagsText: 2 }, prefix: true, fuzzy: 0.2 },
  });
  private texts = new Map<string, string>();
  private queue = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    private store: DocStore,
    private noteInfo: (noteId: string) => { notebookId: string; kind: NoteKind; trashed: boolean } | null,
    private onExtracted: (noteId: string, title: string, tags: string[]) => void,
  ) {}

  async loadFromDisk() {
    const rows = await accountDb().noteIndex.toArray();
    this.search.removeAll();
    this.search.addAll(rows.map((r) => ({ ...r, id: r.noteId })));
    for (const r of rows) this.texts.set(r.noteId, r.text);
    useIndexVersion.setState((s) => ({ v: s.v + 1 }));
  }

  schedule(noteId: string, delay = 600) {
    this.queue.add(noteId);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.drain(), delay);
  }

  /** Index notes that exist in notebook indexes but not in the local index yet. */
  async reconcile(noteIds: string[]) {
    const have = new Set(await accountDb().noteIndex.toCollection().primaryKeys());
    for (const id of noteIds) if (!have.has(id)) this.queue.add(id);
    if (this.queue.size) this.schedule([...this.queue][0]!, 50);
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.size) {
        const batch = [...this.queue].slice(0, 25);
        for (const id of batch) this.queue.delete(id);
        for (const id of batch) await this.indexNote(id);
        useIndexVersion.setState((s) => ({ v: s.v + 1 }));
      }
    } finally {
      this.running = false;
    }
  }

  async remove(noteId: string) {
    const db = accountDb();
    await db.transaction("rw", db.tasks, db.noteIndex, async () => {
      await db.tasks.where("noteId").equals(noteId).delete();
      await db.noteIndex.delete(noteId);
    });
    if (this.search.has(noteId)) this.search.discard(noteId);
    this.texts.delete(noteId);
    useIndexVersion.setState((s) => ({ v: s.v + 1 }));
  }

  private async indexNote(noteId: string) {
    const info = this.noteInfo(noteId);
    const row = await this.store.row(noteId);
    if (!info || !row) return;
    if (info.trashed) {
      // Trashed notes keep their search entry out and their tasks hidden.
      await this.remove(noteId);
      return;
    }
    // From the saved state on a transient Y.Doc: indexing never keeps notes in memory.
    const state = await this.store.loadState(noteId);
    if (!state) return;
    const doc = new Y.Doc({ gc: true });
    try {
      Y.applyUpdate(doc, state);
      const ex = extractNote(doc);
      const tasks: TaskRow[] = ex.tasks.map((t) => ({
        key: `${noteId}:${t.taskId}`,
        noteId,
        taskId: t.taskId,
        notebookId: info.notebookId,
        text: t.text,
        state: t.state,
        scheduled: t.scheduled,
        deadline: t.deadline,
        completedAt: t.completedAt,
        noteKind: info.kind,
        order: t.order,
      }));
      const entry: NoteIndexRow = {
        noteId,
        notebookId: info.notebookId,
        title: ex.title,
        text: ex.text,
        tags: ex.tags,
        links: ex.links,
        updatedAt: Date.now(),
      };
      const db = accountDb();
      await db.transaction("rw", db.tasks, db.noteIndex, async () => {
        await db.tasks.where("noteId").equals(noteId).delete();
        await db.tasks.bulkPut(tasks);
        await db.noteIndex.put(entry);
      });
      if (this.search.has(noteId)) this.search.replace({ ...entry, id: noteId });
      else this.search.add({ ...entry, id: noteId });
      this.texts.set(noteId, ex.text);
      this.onExtracted(noteId, ex.title, ex.tags);
    } finally {
      doc.destroy();
    }
  }

  query(q: string, limit = 30): SearchHit[] {
    if (!q.trim()) return [];
    return this.search
      .search(q)
      .slice(0, limit)
      .map((r) => ({
        noteId: r.id as string,
        title: (r.title as string) ?? "",
        snippet: snippetAround(this.texts.get(r.id as string) ?? "", r.terms),
        score: r.score,
      }));
  }
}

function snippetAround(text: string, terms: string[]): string {
  const flat = text.replace(/\s+/g, " ");
  const lower = flat.toLowerCase();
  let at = -1;
  for (const t of terms) {
    at = lower.indexOf(t.toLowerCase());
    if (at >= 0) break;
  }
  if (at < 0) return flat.slice(0, 140);
  const start = Math.max(0, at - 50);
  return (start > 0 ? "…" : "") + flat.slice(start, start + 160);
}
