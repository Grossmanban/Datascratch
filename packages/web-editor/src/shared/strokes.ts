// Temporary stand-in for @datascratch/shared (contracts/strokes.ts + strokes codec).
// Mirrors docs/architecture/contracts/strokes.md v1 exactly. Replace with imports from
// @datascratch/shared once the core stream lands in main.
import * as Y from "yjs";

export type StrokeTool = "pen" | "pencil" | "marker" | "highlighter";
export type StrokeAnchorKind = "text" | "block" | "image" | "drawing";
export type StrokeHint = "free" | "underline" | "strike" | "circle" | "highlight" | "arrow" | "scribble";
export interface StrokeAuthor {
  kind: "user" | "guest" | "agent";
  id: string;
}

export interface Stroke {
  v: 1;
  tool: StrokeTool;
  color: string;
  width: number;
  opacity: number;
  anchorKind: StrokeAnchorKind;
  blockId: string | null;
  anchors: Uint8Array[];
  points: Uint8Array;
  hint: StrokeHint;
  author: StrokeAuthor;
  createdAt: number;
  hidden?: boolean;
}

/** One decoded point record: [a, x, y, pressure, altitude, azimuth, roll, t]. */
export interface StrokePoint {
  a: number;
  x: number;
  y: number;
  pressure: number;
  altitude: number;
  azimuth: number;
  roll: number;
  t: number;
}

export const POINT_FLOATS = 8;
export const POINT_BYTES = POINT_FLOATS * 4;

export function packPoints(points: readonly StrokePoint[]): Uint8Array {
  const buf = new ArrayBuffer(points.length * POINT_BYTES);
  const view = new DataView(buf);
  points.forEach((p, i) => {
    const o = i * POINT_BYTES;
    view.setFloat32(o, p.a, true);
    view.setFloat32(o + 4, p.x, true);
    view.setFloat32(o + 8, p.y, true);
    view.setFloat32(o + 12, p.pressure, true);
    view.setFloat32(o + 16, p.altitude, true);
    view.setFloat32(o + 20, p.azimuth, true);
    view.setFloat32(o + 24, p.roll, true);
    view.setFloat32(o + 28, p.t, true);
  });
  return new Uint8Array(buf);
}

export function unpackPoints(bytes: Uint8Array): StrokePoint[] {
  if (bytes.byteLength % POINT_BYTES !== 0) {
    throw new Error(`points: length ${bytes.byteLength} is not a multiple of ${POINT_BYTES}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: StrokePoint[] = [];
  for (let o = 0; o < bytes.byteLength; o += POINT_BYTES) {
    out.push({
      a: view.getFloat32(o, true),
      x: view.getFloat32(o + 4, true),
      y: view.getFloat32(o + 8, true),
      pressure: view.getFloat32(o + 12, true),
      altitude: view.getFloat32(o + 16, true),
      azimuth: view.getFloat32(o + 20, true),
      roll: view.getFloat32(o + 24, true),
      t: view.getFloat32(o + 28, true),
    });
  }
  return out;
}

/** Pressure curve shared by all platforms (strokes.md §5). */
export function pressureCurve(p: number): number {
  return 0.35 + 0.65 * Math.pow(Math.max(0, Math.min(1, p)), 0.8);
}

/** Tilt factor: only pencil and marker react to altitude (strokes.md §5). */
export function tiltFactor(tool: StrokeTool, altitude: number): number {
  if (tool !== "pencil" && tool !== "marker") return 1;
  return 1 + 1.5 * (1 - altitude / (Math.PI / 2));
}

/** Rendered thickness at a point. `scale` is fontSize/17 for text, blockWidth/600 otherwise. */
export function strokeThickness(stroke: Pick<Stroke, "width" | "tool">, p: Pick<StrokePoint, "pressure" | "altitude">, scale: number): number {
  return stroke.width * pressureCurve(p.pressure) * tiltFactor(stroke.tool, p.altitude) * scale;
}

const FIELDS = ["v", "tool", "color", "width", "opacity", "anchorKind", "blockId", "anchors", "points", "hint", "author", "createdAt"] as const;

/** Writes a stroke as a Y.Map (strokes.md §1). Must be called inside a transaction for atomicity. */
export function strokeToYMap(stroke: Stroke): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const key of FIELDS) map.set(key, stroke[key] as unknown);
  if (stroke.hidden) map.set("hidden", true);
  return map;
}

/** Reads a stroke from its Y.Map. Returns null for malformed or newer-version strokes. */
export function strokeFromYMap(map: Y.Map<unknown>): Stroke | null {
  const v = map.get("v");
  if (v !== 1) return null;
  const points = map.get("points");
  if (!(points instanceof Uint8Array)) return null;
  const anchors = (map.get("anchors") as unknown[] | undefined) ?? [];
  return {
    v: 1,
    tool: (map.get("tool") as StrokeTool) ?? "pen",
    color: (map.get("color") as string) ?? "ink.black",
    width: (map.get("width") as number) ?? 2,
    opacity: (map.get("opacity") as number) ?? 1,
    anchorKind: (map.get("anchorKind") as StrokeAnchorKind) ?? "text",
    blockId: (map.get("blockId") as string | null) ?? null,
    anchors: anchors.filter((a): a is Uint8Array => a instanceof Uint8Array),
    points,
    hint: (map.get("hint") as StrokeHint) ?? "free",
    author: (map.get("author") as StrokeAuthor) ?? { kind: "user", id: "" },
    createdAt: (map.get("createdAt") as number) ?? 0,
    hidden: map.get("hidden") === true,
  };
}
