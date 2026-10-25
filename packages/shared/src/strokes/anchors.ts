// Live-stroke anchors (strokes.md §4): Yjs relative positions of characters
// inside the note's `content`, resolved after any edit or relayout.
import * as Y from "yjs";

/** A character position: index inside a Y.XmlText. */
export interface TextPosition {
  text: Y.XmlText;
  index: number;
}

export interface ResolvedAnchor extends TextPosition {
  /** The anchored character no longer exists (D-35): its points are not drawn. */
  deleted: boolean;
}

/** Encode the relative position of the character at `index` of `text`. */
export function encodeAnchor(text: Y.XmlText, index: number): Uint8Array {
  return Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, index, 0));
}

/** Is the item holding `id` deleted, following undo/redo (`redone`) links? */
function isCharDeleted(store: Y.Doc["store"], id: Y.ID): boolean {
  let client = id.client;
  let clock = id.clock;
  for (let guard = 0; guard < 1000; guard++) {
    if (Y.getState(store, client) <= clock) return true;
    const struct = Y.getItem(store, Y.createID(client, clock));
    if (!(struct instanceof Y.Item)) return true; // garbage-collected
    if (struct.redone !== null) {
      const diff = clock - struct.id.clock;
      client = struct.redone.client;
      clock = struct.redone.clock + diff;
      continue;
    }
    if (struct.deleted) return true;
    // A deleted ancestor (e.g. the whole paragraph removed) deletes the character too.
    let parent = (struct.parent as Y.AbstractType<unknown> | null)?._item ?? null;
    while (parent) {
      if (parent.deleted) return true;
      parent = (parent.parent as Y.AbstractType<unknown> | null)?._item ?? null;
    }
    return false;
  }
  return true;
}

/**
 * Resolve an encoded anchor. Returns null when it cannot be resolved (refers
 * to content this replica has not received yet, or garbage-collected content).
 */
export function resolveAnchor(doc: Y.Doc, encoded: Uint8Array): ResolvedAnchor | null {
  let rpos: Y.RelativePosition;
  try {
    rpos = Y.decodeRelativePosition(encoded);
  } catch {
    return null;
  }
  const abs = Y.createAbsolutePositionFromRelativePosition(rpos, doc);
  if (!abs || !(abs.type instanceof Y.XmlText)) return null;
  const deleted = rpos.item ? isCharDeleted(doc.store, rpos.item) : true;
  return { text: abs.type, index: abs.index, deleted };
}

export function resolveAnchors(
  doc: Y.Doc,
  anchors: readonly Uint8Array[],
): (ResolvedAnchor | null)[] {
  return anchors.map((a) => resolveAnchor(doc, a));
}

/** True when every anchor is deleted or unresolvable — the stroke is not drawn (D-35). */
export function allAnchorsDeleted(resolved: readonly (ResolvedAnchor | null)[]): boolean {
  return resolved.every((r) => r === null || r.deleted);
}

/**
 * After an undo restores deleted text, Yjs links the old characters to the
 * restored ones (`redone`) only in this replica's memory. Re-encode such
 * anchors to the restored characters so every device sees the stroke again.
 * Returns the new anchor list, or null when nothing changed.
 */
export function rebaseAnchorList(doc: Y.Doc, anchors: readonly Uint8Array[]): Uint8Array[] | null {
  let changed = false;
  const out = anchors.map((encoded) => {
    let rpos: Y.RelativePosition;
    try {
      rpos = Y.decodeRelativePosition(encoded);
    } catch {
      return encoded;
    }
    if (!rpos.item || Y.getState(doc.store, rpos.item.client) <= rpos.item.clock) return encoded;
    const original = Y.getItem(doc.store, rpos.item);
    if (!(original instanceof Y.Item) || original.redone === null) return encoded;
    const resolved = resolveAnchor(doc, encoded);
    if (!resolved || resolved.deleted) return encoded;
    changed = true;
    return encodeAnchor(resolved.text, resolved.index);
  });
  return changed ? out : null;
}
