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

export function initNotebookDoc(doc: Y.Doc, notebookId: string) {
  const m = notebookMaps(doc);
  m.meta.set("formatVersion", FORMAT_VERSION);
  m.meta.set("notebookId", notebookId);
}

/**
 * Copy names into the notebook doc's meta (document-model.md §3): the server can't read the
 * account doc, so agents (for-agents notebooks) learn notebook/space names from here.
 */
export function syncNotebookMetaCopy(
  doc: Y.Doc,
  ref: { name: string; icon: string | null },
  space: { id: string; name: string; icon: string | null } | null,
) {
  const meta = notebookMaps(doc).meta;
  const want: Record<string, unknown> = {
    name: ref.name,
    icon: ref.icon ?? null,
    space: space ? { id: space.id, name: space.name, icon: space.icon ?? null } : null,
  };
  const changed = Object.entries(want).filter(([k, v]) => JSON.stringify(meta.get(k) ?? null) !== JSON.stringify(v));
  if (!changed.length) return;
  doc.transact(() => {
    for (const [k, v] of changed) meta.set(k, v);
  });
}
