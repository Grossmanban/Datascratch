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
  /** Shared spaces of other accounts in the space switcher (D-62): spaceId -> { order, addedAt }. */
  sharedSpaces: doc.getMap<Y.Map<unknown>>("sharedSpaces"),
});

/** Placement of another account's shared space in this one's switcher (document-model.md §2.1). */
export type SharedSpaceRef = { spaceId: string; order: number; addedAt: string };

/**
 * A space as the app shows it (D-62): an own one (`shared` once it is made shared) or another
 * account's shared space this one is a member of (`memberOf`), with this account's role there.
 */
export type SpaceEntry = Space & { shared?: boolean; memberOf?: boolean; role?: "owner" | "editor" | "viewer" };

export type AccountSnapshot = {
  formatVersion: number;
  spaces: SpaceEntry[];
  notebooks: NotebookRef[];
  settings: Record<string, unknown>;
  starred: StarredRef[];
  tabs: TabEntry[];
  /** Notebooks and notes shared with this account and the space showing them (D-54). */
  shared: SharedRef[];
  sharedSpaces: SharedSpaceRef[];
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
    sharedSpaces: [...m.sharedSpaces.entries()]
      .map(([spaceId, v]) => ({ spaceId, ...((v instanceof Y.Map ? v.toJSON() : v) as { order: number; addedAt: string }) }))
      .sort((a, b) => a.order - b.order),
  };
}

export function initAccountDoc(doc: Y.Doc) {
  const m = accountMaps(doc);
  if (!m.meta.has("formatVersion")) m.meta.set("formatVersion", FORMAT_VERSION);
}
