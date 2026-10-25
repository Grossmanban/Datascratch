// Character anchors as Yjs relative positions inside `content` (strokes.md §2, §4).
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition } from "y-prosemirror";
import * as Y from "yjs";

/** y-prosemirror's mapping between Y types and ProseMirror nodes. */
export type ProsemirrorMapping = Map<Y.AbstractType<unknown>, unknown>;

/** Encoded relative position of the character that starts at ProseMirror position `pos`. */
export function encodeCharAnchor(pos: number, fragment: Y.XmlFragment, mapping: ProsemirrorMapping): Uint8Array {
  const rel = absolutePositionToRelativePosition(pos, fragment, mapping as never);
  return Y.encodeRelativePosition(rel);
}

/** Follows undo/redo copies of a character (an undone deletion re-creates characters as new items). */
function followRedoneId(store: Y.Doc["store"], id: Y.ID): { item: Y.Item; id: Y.ID } | null {
  let next: Y.ID | null = id;
  let current: Y.ID = id;
  let item: Y.Item | Y.GC | null = null;
  while (next !== null) {
    current = next;
    try {
      item = Y.getItem(store, current) as Y.Item | Y.GC;
    } catch {
      return null;
    }
    if (!(item instanceof Y.Item) || item.redone === null) break;
    const diff = current.clock - item.id.clock;
    next = Y.createID(item.redone.client, item.redone.clock + diff);
  }
  return item instanceof Y.Item ? { item, id: current } : null;
}

function followRedone(store: Y.Doc["store"], id: Y.ID): Y.Item | null {
  return followRedoneId(store, id)?.item ?? null;
}

/** True when the anchored character no longer exists in the document (D-35: the mark is not drawn). */
export function isAnchorDeleted(rel: Y.RelativePosition, doc: Y.Doc): boolean {
  if (!rel.item) return false;
  const store = doc.store;
  const clientStructs = store.clients.get(rel.item.client);
  if (!clientStructs) return true; // not yet received from that client
  const lastStruct = clientStructs[clientStructs.length - 1]!;
  if (rel.item.clock >= lastStruct.id.clock + lastStruct.length) return true;
  const item = followRedone(store, rel.item);
  return !item || item.deleted;
}

/**
 * ProseMirror position of an anchored character, or null when deleted (D-35) or not resolvable.
 * Decoded relative positions should be cached by the caller.
 */
export function resolveCharAnchor(rel: Y.RelativePosition, doc: Y.Doc, fragment: Y.XmlFragment, mapping: ProsemirrorMapping): number | null {
  if (isAnchorDeleted(rel, doc)) return null;
  const pos = relativePositionToAbsolutePosition(doc, fragment, rel, mapping as never);
  return pos ?? null;
}

export function decodeAnchor(bytes: Uint8Array): Y.RelativePosition | null {
  try {
    return Y.decodeRelativePosition(bytes);
  } catch {
    return null;
  }
}

/**
 * After an undo/redo, characters restored by Y.UndoManager are new items; the `redone` link from the
 * old item is local to this client. Rewrites stroke anchors to the restored items so other devices
 * resolve them too (strokes.md: `anchors` is mutable for this). Temporary stand-in for
 * `rebaseRedoneAnchors` from @datascratch/shared.
 */
export function rebaseRedoneAnchors(doc: Y.Doc, origin: unknown): number {
  const strokes = doc.getMap<Y.Map<unknown>>("strokes");
  const updates: [Y.Map<unknown>, Uint8Array[]][] = [];
  strokes.forEach((map) => {
    if (map.get("anchorKind") !== "text") return;
    const anchors = (map.get("anchors") as Uint8Array[] | undefined) ?? [];
    let changed = false;
    const next = anchors.map((bytes) => {
      const rel = decodeAnchor(bytes);
      if (!rel?.item) return bytes;
      let original: Y.Item | Y.GC;
      try {
        original = Y.getItem(doc.store, rel.item) as Y.Item | Y.GC;
      } catch {
        return bytes;
      }
      if (!(original instanceof Y.Item) || !original.deleted || original.redone === null) return bytes;
      const live = followRedoneId(doc.store, rel.item);
      if (!live || live.item.deleted) return bytes;
      changed = true;
      return Y.encodeRelativePosition(new Y.RelativePosition(null, null, live.id, rel.assoc));
    });
    if (changed) updates.push([map, next]);
  });
  if (updates.length) doc.transact(() => updates.forEach(([map, a]) => map.set("anchors", a)), origin);
  return updates.length;
}
