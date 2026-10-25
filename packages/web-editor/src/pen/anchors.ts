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

/** Follows undo/redo copies of an item (an undone deletion re-creates characters as new items). */
function followRedone(store: Y.Doc["store"], id: Y.ID): Y.Item | null {
  let next: Y.ID | null = id;
  let diff = 0;
  let item: Y.Item | Y.GC | null = null;
  do {
    if (diff > 0) next = Y.createID(next!.client, next!.clock + diff);
    try {
      item = Y.getItem(store, next!) as Y.Item | Y.GC;
    } catch {
      return null;
    }
    diff = next!.clock - item.id.clock;
    next = item instanceof Y.Item ? item.redone : null;
  } while (next !== null && item instanceof Y.Item);
  return item instanceof Y.Item ? item : null;
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
