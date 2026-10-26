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
import { textBlockOf } from "./model.js";

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
