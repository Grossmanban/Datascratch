/**
 * Reading handwriting strokes (contracts/strokes.md) and resolving their
 * text anchors to characters of the current document.
 *
 * TODO(core): switch to the @datascratch/shared stroke codec once published.
 */
import * as Y from "yjs";
import { flatten, textBlockOf, type FlatText } from "./model.js";

export type StrokeTool = "pen" | "pencil" | "marker" | "highlighter";
export type StrokeHint = "free" | "underline" | "strike" | "circle" | "highlight" | "arrow" | "scribble";
export type AnchorKind = "text" | "block" | "image" | "drawing";

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

export interface Stroke {
  id: string;
  v: number;
  tool: StrokeTool;
  color: string;
  width: number;
  opacity: number;
  anchorKind: AnchorKind;
  blockId: string | null;
  anchors: Uint8Array[];
  points: StrokePoint[];
  hint: StrokeHint;
  author: { kind: "user" | "guest" | "agent"; id: string };
  createdAt: number;
  hidden: boolean;
}

export const POINT_FLOATS = 8;
export const POINT_BYTES = POINT_FLOATS * 4;

export function decodePoints(bytes: Uint8Array): StrokePoint[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: StrokePoint[] = [];
  for (let off = 0; off + POINT_BYTES <= bytes.byteLength; off += POINT_BYTES) {
    const f = (i: number) => view.getFloat32(off + i * 4, true);
    out.push({ a: f(0), x: f(1), y: f(2), pressure: f(3), altitude: f(4), azimuth: f(5), roll: f(6), t: f(7) });
  }
  return out;
}

export function encodePoints(points: StrokePoint[]): Uint8Array {
  const bytes = new Uint8Array(points.length * POINT_BYTES);
  const view = new DataView(bytes.buffer);
  points.forEach((p, i) => {
    const vals = [p.a, p.x, p.y, p.pressure, p.altitude, p.azimuth, p.roll, p.t];
    vals.forEach((v, j) => view.setFloat32(i * POINT_BYTES + j * 4, v, true));
  });
  return bytes;
}

function field(map: Y.Map<unknown> | Record<string, unknown>, key: string): unknown {
  return map instanceof Y.Map ? map.get(key) : map[key];
}

function toBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return new Uint8Array(Buffer.from(value, "base64url"));
  return null;
}

export function readStroke(id: string, raw: unknown): Stroke | null {
  if (!(raw instanceof Y.Map) && (typeof raw !== "object" || raw === null)) return null;
  const m = raw as Y.Map<unknown> | Record<string, unknown>;
  const anchorsRaw = field(m, "anchors");
  const anchorList = anchorsRaw instanceof Y.Array ? anchorsRaw.toArray() : Array.isArray(anchorsRaw) ? anchorsRaw : [];
  const anchors = anchorList.map(toBytes).filter((b): b is Uint8Array => b !== null);
  const pointsBytes = toBytes(field(m, "points"));
  return {
    id,
    v: Number(field(m, "v") ?? 1),
    tool: (field(m, "tool") as StrokeTool) ?? "pen",
    color: String(field(m, "color") ?? "ink.black"),
    width: Number(field(m, "width") ?? 2),
    opacity: Number(field(m, "opacity") ?? 1),
    anchorKind: (field(m, "anchorKind") as AnchorKind) ?? "text",
    blockId: (field(m, "blockId") as string | null) ?? null,
    anchors,
    points: pointsBytes ? decodePoints(pointsBytes) : [],
    hint: (field(m, "hint") as StrokeHint) ?? "free",
    author: (field(m, "author") as Stroke["author"]) ?? { kind: "user", id: "" },
    createdAt: Number(field(m, "createdAt") ?? 0),
    hidden: field(m, "hidden") === true,
  };
}

export function readStrokes(doc: Y.Doc): Stroke[] {
  const out: Stroke[] = [];
  doc.getMap("strokes").forEach((raw, id) => {
    const s = readStroke(id, raw);
    if (s && !s.hidden) out.push(s);
  });
  return out.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

/** Writes a stroke in the contract format (used for re-anchoring and test fixtures). */
export function writeStroke(doc: Y.Doc, stroke: Omit<Stroke, "hidden">): void {
  const m = new Y.Map<unknown>();
  doc.getMap("strokes").set(stroke.id, m);
  m.set("v", stroke.v);
  m.set("tool", stroke.tool);
  m.set("color", stroke.color);
  m.set("width", stroke.width);
  m.set("opacity", stroke.opacity);
  m.set("anchorKind", stroke.anchorKind);
  m.set("blockId", stroke.blockId);
  m.set("anchors", stroke.anchors);
  m.set("points", encodePoints(stroke.points));
  m.set("hint", stroke.hint);
  m.set("author", stroke.author);
  m.set("createdAt", stroke.createdAt);
}

/** Follows the `redone` chain of an item (undo of a deletion restores text as new items). */
function followRedone(store: Y.Doc["store"], id: Y.ID): { item: Y.AbstractStruct; diff: number } | null {
  let nextId: Y.ID | null = id;
  let diff = 0;
  let item: Y.AbstractStruct | undefined;
  do {
    if (diff > 0) nextId = Y.createID(nextId!.client, nextId!.clock + diff);
    try {
      item = Y.getItem(store, nextId!);
    } catch {
      return null;
    }
    diff = nextId!.clock - item.id.clock;
    nextId = item instanceof Y.Item ? item.redone : null;
  } while (nextId !== null && item instanceof Y.Item);
  return { item: item!, diff };
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
  let rel: Y.RelativePosition;
  try {
    rel = Y.decodeRelativePosition(encoded);
  } catch {
    return null;
  }
  if (!rel.item) return null;
  const found = followRedone(doc.store, rel.item);
  if (!found || !(found.item instanceof Y.Item) || found.item.deleted) return null;
  const abs = Y.createAbsolutePositionFromRelativePosition(rel, doc);
  if (!abs || !(abs.type instanceof Y.XmlText)) return null;
  const block = textBlockOf(abs.type);
  if (!block) return null;
  return { ytext: abs.type, index: abs.index, block };
}

/** A text-anchored stroke with every anchor resolved to an offset in its text block. */
export interface AnchoredStroke {
  stroke: Stroke;
  block: Y.XmlElement;
  /** Offset in the flattened block text for each anchor; null = deleted. */
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
