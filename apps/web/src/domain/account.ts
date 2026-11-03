import * as Y from "yjs";
import type { SharedRef } from "@datascratch/shared";
import { FORMAT_VERSION, type NotebookRef, type Space, type StarredRef } from "@/lib/shared";
import { readMapOfMaps } from "./ymap";

// Account doc layout: document-model.md §2.

/** An open tab (document-model.md §2): `openedAt` is written at most once an hour per tab. */
export type TabEntry = { noteId: string; pinned?: boolean; openedAt?: string };

export const accountMaps = (doc: Y.Doc) => ({
  meta: doc.getMap<unknown>("meta"),
  spaces: doc.getMap<Y.Map<unknown>>("spaces"),
  notebooks: doc.getMap<Y.Map<unknown>>("notebooks"),
  settings: doc.getMap<unknown>("settings"),
  starred: doc.getArray<StarredRef>("starred"),
  tabs: doc.getArray<TabEntry>("tabs"),
  /** «Общие со мной» placement (D-54): "<kind>:<id>" -> SharedRef. */
  shared: doc.getMap<Y.Map<unknown>>("shared"),
});

export type AccountSnapshot = {
  formatVersion: number;
  spaces: Space[];
  notebooks: NotebookRef[];
  settings: Record<string, unknown>;
  starred: StarredRef[];
  tabs: TabEntry[];
  /** Notebooks and notes shared with this account and the space showing them (D-54). */
  shared: SharedRef[];
};

export function readAccount(doc: Y.Doc): AccountSnapshot {
  const m = accountMaps(doc);
  return {
    formatVersion: (m.meta.get("formatVersion") as number | undefined) ?? FORMAT_VERSION,
    spaces: readMapOfMaps<Space>(m.spaces).sort((a, b) => a.order - b.order),
    notebooks: readMapOfMaps<NotebookRef>(m.notebooks).sort((a, b) => a.order - b.order),
    settings: m.settings.toJSON() as Record<string, unknown>,
    starred: m.starred.toArray(),
    tabs: m.tabs.toArray(),
    shared: readMapOfMaps<SharedRef>(m.shared).sort((a, b) => a.order - b.order),
  };
}

export function initAccountDoc(doc: Y.Doc) {
  const m = accountMaps(doc);
  if (!m.meta.has("formatVersion")) m.meta.set("formatVersion", FORMAT_VERSION);
}
