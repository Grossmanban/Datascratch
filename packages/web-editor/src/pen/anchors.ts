// Character anchors as Yjs relative positions inside `content` (strokes.md §2, §4), bridged to
// ProseMirror positions through y-prosemirror's mapping.
import { resolveAnchor } from "@datascratch/shared/strokes";
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition } from "y-prosemirror";
import * as Y from "yjs";

/** y-prosemirror's mapping between Y types and ProseMirror nodes. */
export type ProsemirrorMapping = Map<Y.AbstractType<unknown>, unknown>;

/** Encoded relative position of the character that starts at ProseMirror position `pos`. */
export function encodeCharAnchor(pos: number, fragment: Y.XmlFragment, mapping: ProsemirrorMapping): Uint8Array {
  const rel = absolutePositionToRelativePosition(pos, fragment, mapping as never);
  return Y.encodeRelativePosition(rel);
}

/**
 * ProseMirror position of an anchored character, or null when the character is deleted (D-35:
 * checked on the Yjs item itself, following undo/redo copies) or not resolvable.
 * `rel` is the decoded form of `encoded`, cached by the caller.
 */
export function resolveCharAnchor(
  encoded: Uint8Array,
  rel: Y.RelativePosition,
  doc: Y.Doc,
  fragment: Y.XmlFragment,
  mapping: ProsemirrorMapping,
): number | null {
  const r = resolveAnchor(doc, encoded);
  if (!r || r.deleted) return null;
  return relativePositionToAbsolutePosition(doc, fragment, rel, mapping as never) ?? null;
}

export function decodeAnchor(bytes: Uint8Array): Y.RelativePosition | null {
  try {
    return Y.decodeRelativePosition(bytes);
  } catch {
    return null;
  }
}
