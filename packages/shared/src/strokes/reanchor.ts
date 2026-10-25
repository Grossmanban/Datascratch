// Re-anchoring text strokes when the editor rewrites blocks (split, merge,
// type change, move): y-prosemirror recreates the Y.XmlText items, so old
// anchors point at deleted characters. The editor captures anchor positions as
// global text offsets before the rewrite and, in the same transaction after it,
// replaces affected strokes by copies (new strokeId, same points) anchored to
// the characters at the mapped offsets (strokes.md).
import * as Y from "yjs";
import { NOTE_ROOTS } from "../contracts/document.js";
import { uuidv7 } from "../ids.js";
import { encodeAnchor, resolveAnchor, type TextPosition } from "./anchors.js";
import { deleteStroke, getStroke, listStrokes, putStroke } from "./store.js";

/** All Y.XmlText nodes of `content` in document order. */
function textNodes(doc: Y.Doc): Y.XmlText[] {
  const out: Y.XmlText[] = [];
  const visit = (parent: Y.XmlElement | Y.XmlFragment) => {
    for (const child of parent.toArray()) {
      if (child instanceof Y.XmlText) out.push(child);
      else if (child instanceof Y.XmlElement) visit(child);
    }
  };
  visit(doc.getXmlFragment(NOTE_ROOTS.content));
  return out;
}

/** Global text offset of a character: characters of all text nodes before it, in document order. */
export function textOffsetOf(doc: Y.Doc, position: TextPosition): number | null {
  let offset = 0;
  for (const t of textNodes(doc)) {
    if (t === position.text) return offset + position.index;
    offset += t.length;
  }
  return null;
}

/** The character at a global text offset (inverse of textOffsetOf). */
export function positionAtTextOffset(doc: Y.Doc, offset: number): TextPosition | null {
  if (offset < 0) return null;
  let rest = offset;
  for (const t of textNodes(doc)) {
    if (rest < t.length) return { text: t, index: rest };
    rest -= t.length;
  }
  return null;
}

/** Anchor offsets of text strokes captured before a block rewrite. */
export interface AnchorSnapshot {
  /** strokeId → global offset per anchor (null if already deleted). */
  strokes: Map<string, (number | null)[]>;
}

/** Capture global offsets of text-stroke anchors (optionally only `strokeIds`). */
export function captureAnchorOffsets(doc: Y.Doc, strokeIds?: Iterable<string>): AnchorSnapshot {
  const only = strokeIds ? new Set(strokeIds) : null;
  const strokes = new Map<string, (number | null)[]>();
  for (const { id, stroke } of listStrokes(doc)) {
    if (stroke.anchorKind !== "text" || (only && !only.has(id))) continue;
    strokes.set(
      id,
      stroke.anchors.map((a) => {
        const r = resolveAnchor(doc, a);
        return r && !r.deleted ? textOffsetOf(doc, r) : null;
      }),
    );
  }
  return { strokes };
}

export interface ReanchorOptions {
  /** Offset before → offset after; default identity (split/merge/type change keep text order). */
  mapOffset?: (offset: number) => number | null;
  newId?: () => string;
  /** Transaction origin (e.g. one tracked by the editor's Y.UndoManager). */
  origin?: unknown;
}

/**
 * After the rewrite (same transaction): every captured stroke that lost a
 * live anchor is replaced by a copy with a new strokeId whose anchors point at
 * the characters at the mapped offsets. Returns old → new id pairs.
 */
export function reanchorStrokes(
  doc: Y.Doc,
  snapshot: AnchorSnapshot,
  options: ReanchorOptions = {},
): { from: string; to: string }[] {
  const map = options.mapOffset ?? ((o: number) => o);
  const newId = options.newId ?? (() => uuidv7());
  const replaced: { from: string; to: string }[] = [];
  const current = new Map(listStrokes(doc).map((s) => [s.id, s.stroke]));
  doc.transact(() => {
    for (const [id, offsets] of snapshot.strokes) {
      const stroke = current.get(id);
      if (!stroke) continue;
      const lost = stroke.anchors.some((a, i) => {
        const r = resolveAnchor(doc, a);
        return offsets[i] != null && (!r || r.deleted);
      });
      if (!lost) continue;
      const anchors = stroke.anchors.map((a, i) => {
        const before = offsets[i];
        if (before == null) return a;
        const after = map(before);
        const pos = after == null ? null : positionAtTextOffset(doc, after);
        return pos ? encodeAnchor(pos.text, pos.index) : a;
      });
      const to = newId();
      replaceStrokeWithReanchored(doc, id, anchors, { newId: () => to });
      replaced.push({ from: id, to });
    }
  }, options.origin);
  return replaced;
}

/**
 * Replace one stroke by a copy with a new strokeId, the same points and
 * `anchors` (strokes.md: block rewrites). For editors that compute the new
 * positions themselves. Returns the new strokeId, or null if the stroke is missing.
 */
export function replaceStrokeWithReanchored(
  doc: Y.Doc,
  strokeId: string,
  anchors: Uint8Array[],
  options: { newId?: () => string; origin?: unknown } = {},
): string | null {
  const stroke = getStroke(doc, strokeId);
  if (!stroke) return null;
  const to = (options.newId ?? (() => uuidv7()))();
  doc.transact(() => {
    deleteStroke(doc, strokeId);
    putStroke(doc, to, { ...stroke, anchors });
  }, options.origin);
  return to;
}
