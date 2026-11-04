import type * as Y from "yjs";
import { FORMAT_VERSION, type NotebookRef } from "@/lib/shared";
import { readMapOfMaps, toYMap } from "./ymap";

// The `space` document of a shared space (D-62, document-model.md §2.2): its name and icon for
// every member, and its notebooks. Sealed with the space key; the owner and editors write it.

export const spaceMaps = (doc: Y.Doc) => ({
  meta: doc.getMap<unknown>("meta"),
  notebooks: doc.getMap<Y.Map<unknown>>("notebooks"),
});

export type SpaceDocSnapshot = {
  name: string | null;
  icon: string | null;
  color: string | null;
  /** NotebookRefs without `spaceId` in the doc; filled in with this space's id here. */
  notebooks: NotebookRef[];
};

const str = (v: unknown) => (typeof v === "string" ? v : null);

export function readSpaceDoc(doc: Y.Doc, spaceId: string): SpaceDocSnapshot {
  const m = spaceMaps(doc);
  return {
    name: str(m.meta.get("name")),
    icon: str(m.meta.get("icon")),
    color: str(m.meta.get("color")),
    notebooks: readMapOfMaps<NotebookRef>(m.notebooks)
      .map((n) => ({ ...n, spaceId }))
      .sort((a, b) => a.order - b.order),
  };
}

export function initSpaceDoc(doc: Y.Doc, init: { spaceId: string; name: string; icon: string | null; color: string | null; notebooks?: NotebookRef[] }) {
  const m = spaceMaps(doc);
  doc.transact(() => {
    if (!m.meta.has("formatVersion")) m.meta.set("formatVersion", FORMAT_VERSION);
    m.meta.set("spaceId", init.spaceId);
    m.meta.set("name", init.name);
    m.meta.set("icon", init.icon);
    m.meta.set("color", init.color);
    for (const nb of init.notebooks ?? []) m.notebooks.set(nb.id, toYMap(withoutSpace(nb)));
  });
}

/** A NotebookRef as stored in a space doc: the space is implied (document-model.md §2.2). */
export function withoutSpace(nb: NotebookRef): Record<string, unknown> {
  const { spaceId: _spaceId, ...rest } = nb;
  void _spaceId;
  return rest;
}
