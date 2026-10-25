// Turning stored strokes into drawable segments, independent of any UI
// toolkit (strokes.md §4–5). The platform supplies the glyph geometry.
import type { AnchorKind, Stroke, StrokePoint } from "../contracts/strokes.js";
import { MIN_SEGMENT_POINTS } from "../contracts/strokes.js";
import type { ResolvedAnchor, TextPosition } from "./anchors.js";
import { encodeAnchor } from "./anchors.js";
import { strokeWidthAt } from "./width.js";

/** Current geometry of one character, from the platform's text layout. */
export interface GlyphBox {
  /** Leading edge of the glyph (x of the glyph origin). */
  x: number;
  /** Baseline y; y grows downwards. */
  baseline: number;
  /** Font size of this character in the same units as x/y. */
  fontSize: number;
  /** Identifier of the line fragment the glyph is on (strokes break between lines). */
  line: number | string;
}

/** A drawable point in layout coordinates with its rendered width. */
export interface LayoutPoint {
  x: number;
  y: number;
  width: number;
  pressure: number;
  altitude: number;
  azimuth: number;
  roll: number;
  t: number;
}

export type Segment = LayoutPoint[];

/** Split a list into runs, starting a new run where `breakBetween` is true or an item is null. */
function runs<T>(items: (T | null)[], breakBetween: (a: T, b: T) => boolean): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let prev: T | null = null;
  for (const item of items) {
    if (item === null) {
      if (cur.length) out.push(cur);
      cur = [];
      prev = null;
      continue;
    }
    if (prev !== null && breakBetween(prev, item)) {
      out.push(cur);
      cur = [];
    }
    cur.push(item);
    prev = item;
  }
  if (cur.length) out.push(cur);
  return out.filter((r) => r.length >= MIN_SEGMENT_POINTS);
}

/**
 * Segments of a `text` stroke. `glyph` returns the box of a resolved anchor's
 * character, or null if it is not laid out (e.g. scrolled away or folded).
 * Points on deleted characters are dropped, lines break the stroke, segments
 * shorter than 2 points are dropped (D-35).
 */
export function layoutTextStroke(
  stroke: Pick<Stroke, "tool" | "width">,
  points: readonly StrokePoint[],
  anchors: readonly (ResolvedAnchor | null)[],
  glyph: (anchor: ResolvedAnchor) => GlyphBox | null,
): Segment[] {
  const boxes = new Map<number, GlyphBox | null>();
  const boxOf = (a: number): GlyphBox | null => {
    if (!boxes.has(a)) {
      const anchor = anchors[a];
      boxes.set(a, anchor && !anchor.deleted ? glyph(anchor) : null);
    }
    return boxes.get(a)!;
  };
  const placed = points.map((p) => {
    const box = Number.isInteger(p.a) && p.a >= 0 ? boxOf(p.a) : null;
    if (!box) return null;
    return {
      line: box.line,
      point: {
        x: box.x + p.x * box.fontSize,
        y: box.baseline + p.y * box.fontSize,
        width: strokeWidthAt(stroke, p, { fontSize: box.fontSize }),
        pressure: p.pressure,
        altitude: p.altitude,
        azimuth: p.azimuth,
        roll: p.roll,
        t: p.t,
      },
    };
  });
  return runs(placed, (a, b) => a.line !== b.line).map((r) => r.map((e) => e.point));
}

/** Rectangle of the block / image / drawing a non-text stroke belongs to. */
export interface BlockBox {
  x: number;
  y: number;
  width: number;
}

/** Segments of a `block`/`image`/`drawing` stroke: coordinates are fractions of the block width. */
export function layoutBlockStroke(
  stroke: Pick<Stroke, "tool" | "width">,
  points: readonly StrokePoint[],
  box: BlockBox,
): Segment[] {
  const pts = points.map((p) => ({
    x: box.x + p.x * box.width,
    y: box.y + p.y * box.width,
    width: strokeWidthAt(stroke, p, { blockWidth: box.width }),
    pressure: p.pressure,
    altitude: p.altitude,
    azimuth: p.azimuth,
    roll: p.roll,
    t: p.t,
  }));
  return pts.length >= MIN_SEGMENT_POINTS ? [pts] : [];
}

// ---------------------------------------------------------------------------
// Building a text stroke from raw input
// ---------------------------------------------------------------------------

/** Raw input point in layout coordinates. */
export interface InputPoint {
  x: number;
  y: number;
  pressure?: number;
  altitude?: number;
  azimuth?: number;
  roll?: number;
  /** ms since stroke start. */
  t: number;
}

/** Result of hit-testing a point against the text layout. */
export interface TextHit extends TextPosition {
  box: GlyphBox;
}

/**
 * Anchor every input point to its nearest character (strokes.md §4). `hitTest`
 * implements the platform rule: the line whose bounds contain the point (else
 * the nearest line), then the nearest character on it. Returns null if no
 * point hits text.
 */
export function anchorTextStroke(
  input: readonly InputPoint[],
  hitTest: (x: number, y: number) => TextHit | null,
): { anchors: Uint8Array[]; points: StrokePoint[] } | null {
  const anchors: Uint8Array[] = [];
  const indexOf = new Map<TextPosition["text"], Map<number, number>>();
  const points: StrokePoint[] = [];
  for (const p of input) {
    const hit = hitTest(p.x, p.y);
    if (!hit) continue;
    let byIndex = indexOf.get(hit.text);
    if (!byIndex) indexOf.set(hit.text, (byIndex = new Map()));
    let a = byIndex.get(hit.index);
    if (a === undefined) {
      a = anchors.length;
      anchors.push(encodeAnchor(hit.text, hit.index));
      byIndex.set(hit.index, a);
    }
    points.push({
      a,
      x: (p.x - hit.box.x) / hit.box.fontSize,
      y: (p.y - hit.box.baseline) / hit.box.fontSize,
      pressure: p.pressure ?? 1,
      altitude: p.altitude ?? Math.PI / 2,
      azimuth: p.azimuth ?? 0,
      roll: p.roll ?? 0,
      t: p.t,
    });
  }
  return points.length > 0 ? { anchors, points } : null;
}

/** Points of a block-anchored stroke from layout coordinates. */
export function blockStrokePoints(input: readonly InputPoint[], box: BlockBox): StrokePoint[] {
  return input.map((p) => ({
    a: -1,
    x: (p.x - box.x) / box.width,
    y: (p.y - box.y) / box.width,
    pressure: p.pressure ?? 1,
    altitude: p.altitude ?? Math.PI / 2,
    azimuth: p.azimuth ?? 0,
    roll: p.roll ?? 0,
    t: p.t,
  }));
}

export function isTextAnchored(kind: AnchorKind): kind is "text" {
  return kind === "text";
}
