import MiniSearch from "minisearch";
import { create } from "zustand";
import { createNoteIndexer, type NoteIndex } from "@datascratch/shared";
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
  /** Debounced, batched re-indexing from saved note state (shared `createNoteIndexer`). */
  private core: ReturnType<typeof createNoteIndexer>;

  constructor(
    private store: DocStore,
    private noteInfo: (noteId: string) => { notebookId: string; kind: NoteKind; trashed: boolean } | null,
    private onExtracted: (noteId: string, title: string, tags: string[]) => void,
  ) {
    this.core = createNoteIndexer({
      loadState: async (noteId) => {
        const info = this.noteInfo(noteId);
        if (!info) return null;
        // Trashed: drop it from the index without reading its content.
        if (info.trashed) {
          await this.remove(noteId);
          return null;
        }
        return this.store.loadState(noteId);
      },
      onIndex: (batch) => this.write(batch),
      delayMs: 400,
      batchSize: 100,
    });
  }

  async loadFromDisk() {
    const rows = await accountDb().noteIndex.toArray();
    this.search.removeAll();
    this.search.addAll(rows.map((r) => ({ ...r, id: r.noteId })));
    for (const r of rows) this.texts.set(r.noteId, r.text);
    useIndexVersion.setState((s) => ({ v: s.v + 1 }));
  }

  /** Re-index a note soon (its saved state or live doc changed). */
  schedule(noteId: string, _delay?: number) {
    this.core.schedule(noteId);
  }

  /** Index notes that exist in notebook indexes but not in the local index yet. */
  async reconcile(noteIds: string[]) {
    const have = new Set(await accountDb().noteIndex.toCollection().primaryKeys());
    for (const id of noteIds) if (!have.has(id)) this.core.schedule(id);
  }

  /** Index everything scheduled now (tests, before a search). */
  flush() {
    return this.core.flush();
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

  /** One batch of fresh note indexes → tasks, search, backlinks, tags (one Dexie transaction). */
  private async write(batch: NoteIndex[]) {
    const entries: NoteIndexRow[] = [];
    const tasks: TaskRow[] = [];
    const trashed: string[] = [];
    for (const ix of batch) {
      const info = this.noteInfo(ix.noteId);
      if (!info) continue;
      // Trashed meanwhile: keep its search entry out and its tasks hidden.
      if (info.trashed) {
        trashed.push(ix.noteId);
        continue;
      }
      for (const t of ix.tasks)
        tasks.push({
          key: `${ix.noteId}:${t.taskId}`,
          noteId: ix.noteId,
          taskId: t.taskId,
          notebookId: info.notebookId,
          text: t.text,
          state: t.state,
          scheduled: t.scheduled,
          deadline: t.deadline,
          completedAt: t.completedAt,
          noteKind: info.kind,
          order: t.order,
        });
      entries.push({
        noteId: ix.noteId,
        notebookId: info.notebookId,
        title: ix.title,
        text: withoutTitle(ix.plainText, ix.title),
        tags: ix.tags,
        links: [...new Set(ix.links.map((l) => l.toNoteId))],
        updatedAt: Date.now(),
      });
    }
    const ids = [...entries.map((e) => e.noteId), ...trashed];
    const db = accountDb();
    await db.transaction("rw", db.tasks, db.noteIndex, async () => {
      await db.tasks.where("noteId").anyOf(ids).delete();
      await db.noteIndex.bulkDelete(trashed);
      await db.tasks.bulkPut(tasks);
      await db.noteIndex.bulkPut(entries);
    });
    for (const id of trashed) {
      if (this.search.has(id)) this.search.discard(id);
      this.texts.delete(id);
    }
    for (const e of entries) {
      if (this.search.has(e.noteId)) this.search.replace({ ...e, id: e.noteId });
      else this.search.add({ ...e, id: e.noteId });
      this.texts.set(e.noteId, e.text);
      this.onExtracted(e.noteId, e.title, e.tags);
    }
    useIndexVersion.setState((s) => ({ v: s.v + 1 }));
  }

  /**
   * Notes whose text (title included) contains every word of `q` — what a list filter needs: all
   * matches, as you type, case-insensitive; plus the full-text hits (stems, fuzzy) on top.
   */
  matching(q: string): Set<string> {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = new Set<string>();
    if (!words.length) return out;
    for (const [id, text] of this.texts) {
      const lower = text.toLowerCase();
      if (words.every((w) => lower.includes(w))) out.add(id);
    }
    for (const hit of this.query(q, 1000)) out.add(hit.noteId);
    return out;
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

/** The shared plain text starts with the title; lists and snippets show it separately. */
function withoutTitle(text: string, title: string): string {
  const t = title.trim();
  if (t && text.startsWith(t)) return text.slice(t.length).replace(/^\s+/, "");
  return text;
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
