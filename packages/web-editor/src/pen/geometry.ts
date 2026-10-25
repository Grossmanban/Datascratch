// Pure geometry of the living stroke (D-05, strokes.md §4–5). No DOM, no Yjs: the DOM layer measures
// glyphs and passes them in; everything here is unit-tested.
import { strokeWidthAt, type Stroke, type StrokePoint } from "@datascratch/shared/strokes";

/** A measured character, in layer coordinates (CSS px, y grows down). */
export interface Glyph {
  /** ProseMirror position directly before the character. */
  pos: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  baseline: number;
  fontSize: number;
  /** Identity of the textblock the glyph is in; glyphs of different blocks are never on the same line. */
  block: number;
  rtl?: boolean;
}

export interface Line {
  top: number;
  bottom: number;
  left: number;
  right: number;
  glyphs: Glyph[];
}

/** Leading edge of a glyph ("начало глифа"): left for LTR, right for RTL. */
export function leadingEdge(g: Pick<Glyph, "left" | "right" | "rtl">): number {
  return g.rtl ? g.right : g.left;
}

/** Two glyphs are on the same line fragment when they are in the same block and share a baseline. */
export function sameLine(a: Pick<Glyph, "block" | "baseline" | "fontSize">, b: Pick<Glyph, "block" | "baseline" | "fontSize">): boolean {
  return a.block === b.block && Math.abs(a.baseline - b.baseline) < 0.5 * Math.min(a.fontSize, b.fontSize);
}

/** Groups glyphs (in document order) into visual lines. */
export function groupLines(glyphs: readonly Glyph[]): Line[] {
  const lines: Line[] = [];
  let current: Line | null = null;
  let last: Glyph | null = null;
  for (const g of glyphs) {
    if (!current || !last || !sameLine(last, g)) {
      current = { top: g.top, bottom: g.bottom, left: g.left, right: g.right, glyphs: [] };
      lines.push(current);
    }
    current.glyphs.push(g);
    current.top = Math.min(current.top, g.top);
    current.bottom = Math.max(current.bottom, g.bottom);
    current.left = Math.min(current.left, g.left);
    current.right = Math.max(current.right, g.right);
    last = g;
  }
  return lines;
}

function intervalDistance(v: number, a: number, b: number): number {
  return v < a ? a - v : v > b ? v - b : 0;
}

/**
 * The line a point belongs to: the one whose vertical bounds contain it (closest horizontally if
 * several, e.g. table columns); otherwise the vertically nearest line (strokes.md §4).
 */
export function lineForPoint(lines: readonly Line[], x: number, y: number): Line | null {
  let best: Line | null = null;
  let bestV = Infinity;
  let bestH = Infinity;
  for (const line of lines) {
    const v = intervalDistance(y, line.top, line.bottom);
    const h = intervalDistance(x, line.left, line.right);
    if (v < bestV - 0.01 || (Math.abs(v - bestV) <= 0.01 && h < bestH)) {
      best = line;
      bestV = v;
      bestH = h;
    }
  }
  return best;
}

/**
 * The glyph of a line nearest to x. Glyph intervals are half-open [left, right): a point exactly on
 * the boundary of two characters belongs to the one on the right, so a stroke that starts at a
 * word's first letter is not anchored to the space before it.
 */
export function glyphForX(line: Line, x: number): Glyph {
  let best = line.glyphs[0]!;
  let bestD = Infinity;
  for (const g of line.glyphs) {
    const d = x < g.left ? g.left - x : x >= g.right ? x - g.right + (x === g.right ? 1e-6 : 0) : 0;
    if (d < bestD) {
      best = g;
      bestD = d;
      if (d === 0) break;
    }
  }
  return best;
}

/** A captured input sample in layer coordinates. */
export interface InputPoint {
  x: number;
  y: number;
  pressure: number;
  altitude: number;
  azimuth: number;
  roll: number;
  t: number;
}

export interface TextBinding {
  /** Positions (before the character) of the anchors, in the order of `anchors`. */
  anchorPositions: number[];
  points: StrokePoint[];
  /** Font size of the most used anchor glyph — the reference for the stroke's stored width. */
  referenceFontSize: number;
}

/** Binds every point to the nearest character of its line (strokes.md §4). */
export function bindToText(input: readonly InputPoint[], lines: readonly Line[]): TextBinding | null {
  const usable = lines.filter((l) => l.glyphs.length > 0);
  if (!usable.length) return null;
  const indexByPos = new Map<number, number>();
  const anchorPositions: number[] = [];
  const usage: number[] = [];
  const sizes: number[] = [];
  const points: StrokePoint[] = input.map((p) => {
    const line = lineForPoint(usable, p.x, p.y)!;
    const g = glyphForX(line, p.x);
    let a = indexByPos.get(g.pos);
    if (a === undefined) {
      a = anchorPositions.length;
      indexByPos.set(g.pos, a);
      anchorPositions.push(g.pos);
      usage.push(0);
      sizes.push(g.fontSize);
    }
    usage[a]!++;
    return {
      a,
      x: (p.x - leadingEdge(g)) / g.fontSize,
      y: (p.y - g.baseline) / g.fontSize,
      pressure: p.pressure,
      altitude: p.altitude,
      azimuth: p.azimuth,
      roll: p.roll,
      t: p.t,
    };
  });
  let ref = 0;
  for (let i = 1; i < usage.length; i++) if (usage[i]! > usage[ref]!) ref = i;
  return { anchorPositions, points, referenceFontSize: sizes[ref] ?? 17 };
}

/** Where an anchor currently is, or null when its character is deleted / not rendered (D-35). */
export interface AnchorBox {
  /** Leading edge x of the glyph. */
  x: number;
  baseline: number;
  fontSize: number;
  block: number;
}

/** A point ready for drawing. `i` is the index of the source point in `stroke.points`. */
export interface RenderPoint {
  x: number;
  y: number;
  w: number;
  i: number;
}

/**
 * Turns a text-anchored stroke into drawable segments: drops points on deleted characters (D-35),
 * breaks the stroke where neighbouring points sit on different lines, drops segments of < 2 points.
 */
export function resolveTextSegments(
  stroke: Pick<Stroke, "width" | "tool">,
  points: readonly StrokePoint[],
  anchorBox: (a: number) => AnchorBox | null,
  skip?: ReadonlySet<number>,
): RenderPoint[][] {
  const segments: RenderPoint[][] = [];
  let current: RenderPoint[] = [];
  let currentBox: AnchorBox | null = null;
  const flush = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
    currentBox = null;
  };
  points.forEach((p, i) => {
    const box = skip?.has(i) ? null : anchorBox(p.a);
    if (!box) {
      flush();
      return;
    }
    if (currentBox && !sameLine(currentBox, box)) flush();
    current.push({
      x: box.x + p.x * box.fontSize,
      y: box.baseline + p.y * box.fontSize,
      w: strokeWidthAt(stroke, p, { fontSize: box.fontSize }),
      i,
    });
    currentBox = box;
  });
  flush();
  return segments;
}

/** Strokes in block / image / drawing coordinates (fractions of the surface width). */
export function resolveSurfaceSegments(
  stroke: Pick<Stroke, "width" | "tool">,
  points: readonly StrokePoint[],
  surface: { left: number; top: number; width: number },
  skip?: ReadonlySet<number>,
): RenderPoint[][] {
  const segments: RenderPoint[][] = [];
  let current: RenderPoint[] = [];
  points.forEach((p, i) => {
    if (skip?.has(i)) {
      if (current.length >= 2) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: surface.left + p.x * surface.width, y: surface.top + p.y * surface.width, w: strokeWidthAt(stroke, p, { blockWidth: surface.width }), i });
  });
  if (current.length >= 2) segments.push(current);
  return segments;
}

/** Converts layer-space input to surface fractions (inverse of resolveSurfaceSegments). */
export function bindToSurface(input: readonly InputPoint[], surface: { left: number; top: number; width: number }): StrokePoint[] {
  return input.map((p) => ({
    a: -1,
    x: (p.x - surface.left) / surface.width,
    y: (p.y - surface.top) / surface.width,
    pressure: p.pressure,
    altitude: p.altitude,
    azimuth: p.azimuth,
    roll: p.roll,
    t: p.t,
  }));
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function segmentsBounds(segments: readonly RenderPoint[][]): Bounds | null {
  let b: Bounds | null = null;
  for (const seg of segments) {
    for (const p of seg) {
      const r = p.w / 2;
      if (!b) b = { left: p.x - r, top: p.y - r, right: p.x + r, bottom: p.y + r };
      else {
        b.left = Math.min(b.left, p.x - r);
        b.top = Math.min(b.top, p.y - r);
        b.right = Math.max(b.right, p.x + r);
        b.bottom = Math.max(b.bottom, p.y + r);
      }
    }
  }
  return b;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Whether a circle (eraser) touches the drawn stroke. */
export function hitsSegments(segments: readonly RenderPoint[][], x: number, y: number, radius: number): boolean {
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1]!;
      const b = seg[i]!;
      if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= radius + Math.max(a.w, b.w) / 2) return true;
    }
  }
  return false;
}

/** Indices of source points within `radius` of (x, y) — for the pixel eraser. */
export function pointsWithin(segments: readonly RenderPoint[][], x: number, y: number, radius: number): number[] {
  const out: number[] = [];
  for (const seg of segments) for (const p of seg) if (Math.hypot(p.x - x, p.y - y) <= radius + p.w / 2) out.push(p.i);
  return out;
}

/**
 * Pixel eraser: splits a stroke's points into the runs that survive. Text strokes keep only the
 * anchors their run uses (re-indexed). Runs shorter than 2 points disappear.
 */
export function splitStroke(stroke: Pick<Stroke, "anchorKind" | "anchors">, points: readonly StrokePoint[], erased: ReadonlySet<number>): { anchors: Uint8Array[]; points: StrokePoint[] }[] {
  const runs: StrokePoint[][] = [];
  let run: StrokePoint[] = [];
  points.forEach((p, i) => {
    if (erased.has(i)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(p);
  });
  if (run.length) runs.push(run);
  return runs
    .filter((r) => r.length >= 2)
    .map((r) => {
      if (stroke.anchorKind !== "text") return { anchors: [], points: r.map((p) => ({ ...p })) };
      const remap = new Map<number, number>();
      const anchors: Uint8Array[] = [];
      const t0 = r[0]!.t;
      const pts = r.map((p) => {
        let a = remap.get(p.a);
        if (a === undefined) {
          a = anchors.length;
          remap.set(p.a, a);
          anchors.push(stroke.anchors[p.a]!);
        }
        return { ...p, a, t: p.t - t0 };
      });
      return { anchors, points: pts };
    });
}

/**
 * Filled outline of a variable-width polyline as polygons and discs, all with the same (clockwise)
 * winding so one nonzero fill paints every pixel exactly once (no darkening at joints with opacity).
 */
export function outlineShapes(seg: readonly RenderPoint[]): { quads: [number, number][][]; discs: [number, number, number][] } {
  const quads: [number, number][][] = [];
  const discs: [number, number, number][] = [];
  for (let i = 0; i < seg.length; i++) {
    const p = seg[i]!;
    discs.push([p.x, p.y, p.w / 2]);
    if (i === 0) continue;
    const q = seg[i - 1]!;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const nx = -dy / len;
    const ny = dx / len;
    let poly: [number, number][] = [
      [q.x + (nx * q.w) / 2, q.y + (ny * q.w) / 2],
      [p.x + (nx * p.w) / 2, p.y + (ny * p.w) / 2],
      [p.x - (nx * p.w) / 2, p.y - (ny * p.w) / 2],
      [q.x - (nx * q.w) / 2, q.y - (ny * q.w) / 2],
    ];
    if (signedArea(poly) < 0) poly = poly.reverse();
    quads.push(poly);
  }
  return { quads, discs };
}

/** Shoelace area; positive = clockwise on a y-down canvas (same as ctx.arc with anticlockwise=false). */
export function signedArea(poly: readonly [number, number][]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]!;
    const [x2, y2] = poly[(i + 1) % poly.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** Even-odd point-in-polygon test (lasso). */
export function pointInPolygon(x: number, y: number, poly: readonly { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Share of a stroke's drawn points inside a lasso polygon. */
export function fractionInside(segments: readonly RenderPoint[][], poly: readonly { x: number; y: number }[]): number {
  let total = 0;
  let inside = 0;
  for (const seg of segments)
    for (const p of seg) {
      total++;
      if (pointInPolygon(p.x, p.y, poly)) inside++;
    }
  return total ? inside / total : 0;
}

/** Expands [from, to) to whole words of `text` (offsets within one textblock). */
export function expandToWords(text: string, from: number, to: number): [number, number] {
  const isWord = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}_'’-]/u.test(c);
  let a = from;
  let b = to;
  while (a > 0 && isWord(text[a - 1])) a--;
  while (b < text.length && isWord(text[b])) b++;
  // Swallow one following space so the sentence stays tidy.
  if (b < text.length && text[b] === " " && (a === 0 || text[a - 1] === " ")) b++;
  return [a, b];
}
