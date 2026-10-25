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
