import * as Y from "yjs";
import { FORMAT_VERSION, type Folder, type NoteMeta } from "@/lib/shared";
import { readMapOfMaps } from "./ymap";

// Notebook index layout: document-model.md §3.

export const notebookMaps = (doc: Y.Doc) => ({
  meta: doc.getMap<unknown>("meta"),
  folders: doc.getMap<Y.Map<unknown>>("folders"),
  notes: doc.getMap<Y.Map<unknown>>("notes"),
  tags: doc.getMap<Y.Map<unknown>>("tags"),
});

export type TagProps = { color?: string | null; icon?: string | null };

export type NotebookSnapshot = {
  folders: Folder[];
  notes: NoteMeta[];
  tags: Record<string, TagProps>;
};

export function readNotebook(doc: Y.Doc): NotebookSnapshot {
  const m = notebookMaps(doc);
  const tags: Record<string, TagProps> = {};
  m.tags.forEach((v, k) => {
    if (v instanceof Y.Map) tags[k] = v.toJSON() as TagProps;
  });
  return {
    folders: readMapOfMaps<Folder>(m.folders).sort((a, b) => a.order - b.order),
    notes: readMapOfMaps<NoteMeta>(m.notes),
    tags,
  };
}

function plain(v: unknown): unknown {
  if (v && typeof v === "object" && typeof (v as { toJSON?: unknown }).toJSON === "function") return (v as { toJSON(): unknown }).toJSON();
  return v ?? null;
}

function sameMetaValue(key: string, current: unknown, want: unknown): boolean {
  const a = plain(current);
  if (key !== "space") return a === (want ?? null);
  const s = (a ?? null) as { id?: string; name?: string; icon?: string | null } | null;
  const w = want as { id: string; name: string; icon: string | null } | null;
  const empty = !s || !s.id;
  if (!w) return empty;
  return !empty && s.id === w.id && (s.name ?? "") === w.name && (s.icon ?? null) === (w.icon ?? null);
}

export function initNotebookDoc(doc: Y.Doc, notebookId: string) {
  const m = notebookMaps(doc);
  m.meta.set("formatVersion", FORMAT_VERSION);
  m.meta.set("notebookId", notebookId);
}

/**
 * Copy names (and the notebook colour) into the notebook doc's meta (document-model.md §3): the server can't read the
 * account doc, so agents (for-agents notebooks) learn notebook/space names from here.
 */
export function syncNotebookMetaCopy(
  doc: Y.Doc,
  ref: { name: string; icon: string | null; color?: string | null },
  space: { id: string; name: string; icon: string | null } | null,
) {
  const meta = notebookMaps(doc).meta;
  const want: Record<string, unknown> = {
    name: ref.name,
    icon: ref.icon ?? null,
    // The agent consent page paints the notebook icon with it (document-model.md §3).
    color: ref.color ?? null,
    space: space ? { id: space.id, name: space.name, icon: space.icon ?? null } : null,
  };
  // Semantic comparison: another client (iOS) may store the same values differently (key order,
  // a missing field vs null, an empty space object); rewriting those would fight it forever.
  const changed = Object.entries(want).filter(([k, v]) => !sameMetaValue(k, meta.get(k), v));
  if (!changed.length) return;
  doc.transact(() => {
    for (const [k, v] of changed) meta.set(k, v);
  });
}
