// Strokes inside a note document: `Y.Map "strokes"`, strokeId → Y.Map (strokes.md §1).
import * as Y from "yjs";
import { NOTE_ROOTS } from "../contracts/document.js";
import {
  ANCHOR_KINDS,
  ORPHAN_STROKE_PURGE_DAYS,
  STROKE_FORMAT_VERSION,
  STROKE_HINTS,
  STROKE_TOOLS,
  type Stroke,
} from "../contracts/strokes.js";
import { allAnchorsDeleted, rebaseRedoneAnchors, resolveAnchors } from "./anchors.js";
import { pointCount } from "./codec.js";

export function strokesMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(NOTE_ROOTS.strokes);
}

/** Validate a stroke before writing it; throws on contract violations. */
export function validateStroke(s: Stroke): void {
  const fail = (m: string) => {
    throw new TypeError(`invalid stroke: ${m}`);
  };
  if (s.v !== STROKE_FORMAT_VERSION) fail(`v must be ${STROKE_FORMAT_VERSION}`);
  if (!(STROKE_TOOLS as readonly string[]).includes(s.tool)) fail(`tool ${s.tool}`);
  if (!(ANCHOR_KINDS as readonly string[]).includes(s.anchorKind))
    fail(`anchorKind ${s.anchorKind}`);
  if (!(STROKE_HINTS as readonly string[]).includes(s.hint)) fail(`hint ${s.hint}`);
  if (!(s.width > 0)) fail("width must be > 0");
  if (!(s.opacity >= 0 && s.opacity <= 1)) fail("opacity must be 0..1");
  if (!(s.points instanceof Uint8Array)) fail("points must be bytes");
  pointCount(s.points);
  if (s.anchorKind === "text") {
    if (s.blockId !== null) fail("text strokes have no blockId");
    if (s.anchors.length === 0) fail("text strokes need anchors");
  } else {
    if (!s.blockId) fail(`${s.anchorKind} strokes need a blockId`);
    if (s.anchors.length !== 0) fail("only text strokes have anchors");
  }
}

/** Write a finished stroke (immutable afterwards, except `hidden`). */
export function putStroke(doc: Y.Doc, strokeId: string, stroke: Stroke): void {
  validateStroke(stroke);
  const m = new Y.Map<unknown>();
  m.set("v", stroke.v);
  m.set("tool", stroke.tool);
  m.set("color", stroke.color);
  m.set("width", stroke.width);
  m.set("opacity", stroke.opacity);
  m.set("anchorKind", stroke.anchorKind);
  m.set("blockId", stroke.blockId);
  m.set(
    "anchors",
    stroke.anchors.map((a) => a.slice()),
  );
  m.set("points", stroke.points.slice());
  m.set("hint", stroke.hint);
  m.set("author", { kind: stroke.author.kind, id: stroke.author.id });
  m.set("createdAt", stroke.createdAt);
  if (stroke.hidden !== undefined) m.set("hidden", stroke.hidden);
  strokesMap(doc).set(strokeId, m);
}

function bytes(v: unknown): Uint8Array {
  return v instanceof Uint8Array ? v : new Uint8Array(0);
}

/** Read a stroke from its Y.Map; returns null for entries of an unknown newer format. */
export function readStroke(map: Y.Map<unknown>): Stroke | null {
  const v = map.get("v");
  if (v !== STROKE_FORMAT_VERSION) return null;
  const author = (map.get("author") ?? {}) as Stroke["author"];
  const stroke: Stroke = {
    v,
    tool: map.get("tool") as Stroke["tool"],
    color: String(map.get("color") ?? "ink.black"),
    width: Number(map.get("width") ?? 1),
    opacity: Number(map.get("opacity") ?? 1),
    anchorKind: map.get("anchorKind") as Stroke["anchorKind"],
    blockId: (map.get("blockId") as string | null | undefined) ?? null,
    anchors: ((map.get("anchors") as unknown[] | undefined) ?? []).map(bytes),
    points: bytes(map.get("points")),
    hint: (map.get("hint") as Stroke["hint"] | undefined) ?? "free",
    author: { kind: author.kind, id: author.id },
    createdAt: Number(map.get("createdAt") ?? 0),
  };
  const hidden = map.get("hidden");
  if (typeof hidden === "boolean") stroke.hidden = hidden;
  return stroke;
}

export function getStroke(doc: Y.Doc, strokeId: string): Stroke | null {
  const m = strokesMap(doc).get(strokeId);
  return m instanceof Y.Map ? readStroke(m) : null;
}

/** All readable strokes, ordered by creation time (draw order). */
export function listStrokes(doc: Y.Doc): { id: string; stroke: Stroke }[] {
  const out: { id: string; stroke: Stroke }[] = [];
  strokesMap(doc).forEach((value, id) => {
    if (!(value instanceof Y.Map)) return;
    const stroke = readStroke(value);
    if (stroke) out.push({ id, stroke });
  });
  return out.sort((a, b) => a.stroke.createdAt - b.stroke.createdAt || (a.id < b.id ? -1 : 1));
}

/** Strokes anchored to a block/image/drawing. */
export function strokesForBlock(doc: Y.Doc, blockId: string) {
  return listStrokes(doc).filter(
    (s) => s.stroke.anchorKind !== "text" && s.stroke.blockId === blockId,
  );
}

/** Whole-stroke eraser. */
export function deleteStroke(doc: Y.Doc, strokeId: string): void {
  strokesMap(doc).delete(strokeId);
}

/** Pixel eraser: replace one stroke by its pieces atomically. */
export function replaceStroke(
  doc: Y.Doc,
  strokeId: string,
  pieces: { id: string; stroke: Stroke }[],
): void {
  doc.transact(() => {
    deleteStroke(doc, strokeId);
    for (const p of pieces) putStroke(doc, p.id, p.stroke);
  });
}

export function setStrokeHidden(doc: Y.Doc, strokeId: string, hidden: boolean): void {
  const m = strokesMap(doc).get(strokeId);
  if (m instanceof Y.Map) m.set("hidden", hidden);
}

/** Text strokes whose anchors are all deleted (not drawn, kept for undo — D-35). */
export function findOrphanedStrokes(doc: Y.Doc): string[] {
  return listStrokes(doc)
    .filter(
      ({ stroke }) =>
        stroke.anchorKind === "text" && allAnchorsDeleted(resolveAnchors(doc, stroke.anchors)),
    )
    .map(({ id }) => id);
}

/**
 * Orphaned strokes eligible for removal during compaction (sync-protocol.md §5):
 * orphaned and created more than 30 days ago. Yjs does not record when text
 * was deleted, so `createdAt` is the age used; callers that track the moment a
 * stroke became orphaned can pass `orphanedAt`.
 */
export function findPurgeableStrokes(
  doc: Y.Doc,
  now: number,
  orphanedAt?: (strokeId: string) => number | null,
): string[] {
  const limit = ORPHAN_STROKE_PURGE_DAYS * 24 * 60 * 60 * 1000;
  return findOrphanedStrokes(doc).filter((id) => {
    const since = orphanedAt?.(id) ?? getStroke(doc, id)?.createdAt ?? now;
    return now - since > limit;
  });
}

export function purgeStrokes(doc: Y.Doc, strokeIds: readonly string[]): void {
  doc.transact(() => {
    for (const id of strokeIds) deleteStroke(doc, id);
  });
}

/**
 * Rewrite the anchors of text strokes whose characters were restored by undo
 * in this replica (see rebaseRedoneAnchors). Call after UndoManager undo/redo.
 * Returns the ids of rewritten strokes.
 */
export function rebaseRedoneStrokes(doc: Y.Doc): string[] {
  const changed: string[] = [];
  doc.transact(() => {
    strokesMap(doc).forEach((value, id) => {
      if (!(value instanceof Y.Map) || value.get("anchorKind") !== "text") return;
      const stroke = readStroke(value);
      if (!stroke) return;
      const next = rebaseRedoneAnchors(doc, stroke.anchors);
      if (next) {
        value.set("anchors", next);
        changed.push(id);
      }
    });
  });
  return changed;
}
