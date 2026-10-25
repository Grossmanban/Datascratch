/**
 * Strokes of a note as the agent layer needs them: decoded points and text
 * anchors resolved to offsets inside the current text blocks. Storage, codec
 * and anchor rules come from @datascratch/shared (contracts/strokes.md).
 */
import {
  listStrokes,
  packPoints,
  putStroke,
  resolveAnchor as resolveSharedAnchor,
  unpackPoints,
  type AnchorKind,
  type Stroke as StoredStroke,
  type StrokeHint,
  type StrokePoint,
  type StrokeTool,
} from "@datascratch/shared/strokes";
import type * as Y from "yjs";
import { flatten, textBlockOf, type FlatText } from "./model.js";

export type { AnchorKind, StrokeHint, StrokePoint, StrokeTool };

/** A stored stroke with its id and unpacked points. */
export interface Stroke extends Omit<StoredStroke, "points" | "hidden"> {
  id: string;
  points: StrokePoint[];
  hidden: boolean;
}

export function readStrokes(doc: Y.Doc): Stroke[] {
  return listStrokes(doc)
    .filter(({ stroke }) => !stroke.hidden)
    .map(({ id, stroke }) => ({ ...stroke, id, points: unpackPoints(stroke.points), hidden: false }));
}

/** Writes a stroke in the contract format (test fixtures). */
export function writeStroke(doc: Y.Doc, stroke: Omit<Stroke, "hidden">): void {
  const { id, points, ...rest } = stroke;
  putStroke(doc, id, { ...rest, points: packPoints(points) });
}

export interface ResolvedAnchor {
  ytext: Y.XmlText;
  index: number;
  block: Y.XmlElement;
}

/**
 * Resolves an encoded relative position to the character it was created on.
 * Returns null when that character is deleted (D-35: such points are not drawn).
 */
export function resolveAnchor(doc: Y.Doc, encoded: Uint8Array): ResolvedAnchor | null {
  const r = resolveSharedAnchor(doc, encoded);
  if (!r || r.deleted) return null;
  const block = textBlockOf(r.text);
  return block ? { ytext: r.text, index: r.index, block } : null;
}

/** A text-anchored stroke with every anchor resolved to an offset in its text block. */
export interface AnchoredStroke {
  stroke: Stroke;
  block: Y.XmlElement;
  /** Offset in the flattened block text for each anchor; null = deleted or in another block. */
  offsets: (number | null)[];
}

/**
 * Resolves text strokes against current text. The block of a stroke is the
 * block of its first live anchor (a stroke spanning several paragraphs is
 * attributed to the first one).
 */
export function anchorTextStrokes(doc: Y.Doc, strokes: Stroke[]): AnchoredStroke[] {
  const flatCache = new Map<Y.XmlElement, FlatText>();
  const flatOf = (b: Y.XmlElement) => {
    let f = flatCache.get(b);
    if (!f) flatCache.set(b, (f = flatten(b)));
    return f;
  };
  const out: AnchoredStroke[] = [];
  for (const stroke of strokes) {
    if (stroke.anchorKind !== "text") continue;
    const resolved = stroke.anchors.map((a) => resolveAnchor(doc, a));
    const first = resolved.find((r) => r !== null);
    if (!first) continue; // all anchors deleted → not drawn (D-35)
    const offsets = resolved.map((r) => {
      if (!r || r.block !== first.block) return null;
      const start = flatOf(r.block).runStart.get(r.ytext);
      return start === undefined ? null : start + r.index;
    });
    out.push({ stroke, block: first.block, offsets });
  }
  return out;
}
