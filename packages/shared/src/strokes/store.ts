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
import { allAnchorsDeleted, encodeAnchor, rebaseAnchorList, resolveAnchors } from "./anchors.js";
import { pmContentToY, yFragmentToPM } from "../document/yjs.js";
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
 * Orphaned strokes eligible for removal during compaction (strokes.md §4.2):
 * all anchors deleted and `orphanedAt` (or, if unknown, `createdAt`) older
 * than 30 days. See updateOrphanedAt for the local bookkeeping.
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

/** Transaction origin of anchor rebasing (not captured by UndoManagers). */
export const STROKE_REBASE_ORIGIN: unique symbol = Symbol("datascratch.strokes.rebase");

/**
 * Rewrite the anchors of text strokes whose characters were restored by undo
 * or redo in this replica (strokes.md §4.1; see rebaseAnchorList). Returns the
 * ids of rewritten strokes.
 */
export function rebaseRedoneAnchors(doc: Y.Doc): string[] {
  const changed: string[] = [];
  doc.transact(() => {
    strokesMap(doc).forEach((value, id) => {
      if (!(value instanceof Y.Map) || value.get("anchorKind") !== "text") return;
      const stroke = readStroke(value);
      if (!stroke) return;
      const next = rebaseAnchorList(doc, stroke.anchors);
      if (next) {
        value.set("anchors", next);
        changed.push(id);
      }
    });
  }, STROKE_REBASE_ORIGIN);
  return changed;
}

/**
 * Rebase anchors after every undo/redo of `undoManager`. Returns a detach function.
 * The rebase runs right after the undo transaction with an untracked origin,
 * so it never lands on the undo stack.
 */
export function attachAnchorRebase(undoManager: Y.UndoManager): () => void {
  const doc = undoManager.doc;
  const handler = () => {
    rebaseRedoneAnchors(doc);
  };
  undoManager.on("stack-item-popped", handler);
  return () => undoManager.off("stack-item-popped", handler);
}

// ---------------------------------------------------------------------------
// Version restore (strokes.md §4.1)
// ---------------------------------------------------------------------------

/** Path of child indices from the `content` fragment to a Y.XmlText. */
function pathOf(text: Y.XmlText, root: Y.XmlFragment): number[] | null {
  const path: number[] = [];
  let node: Y.AbstractType<unknown> = text as unknown as Y.AbstractType<unknown>;
  while (node !== (root as unknown as Y.AbstractType<unknown>)) {
    const parent = node.parent as Y.XmlElement | Y.XmlFragment | null;
    if (!parent) return null;
    const i = parent.toArray().indexOf(node as unknown as Y.XmlElement);
    if (i < 0) return null;
    path.unshift(i);
    node = parent as unknown as Y.AbstractType<unknown>;
  }
  return path;
}

function atPath(root: Y.XmlFragment, path: number[]): Y.XmlText | null {
  let node: Y.XmlElement | Y.XmlFragment | Y.XmlText = root;
  for (const i of path) {
    if (node instanceof Y.XmlText) return null;
    const next = node.get(i) as Y.XmlElement | Y.XmlText | undefined;
    if (!next) return null;
    node = next;
  }
  return node instanceof Y.XmlText ? node : null;
}

/**
 * Restore `content` and `strokes` of a note from a historical state (e.g. the
 * decrypted payload of `GET /docs/:id/versions/:seq`). The content is rewritten
 * as new Yjs items, so text anchors are recomputed by absolute position: the
 * anchor's index in the old version → the same index in the restored text.
 * Anchors already deleted in that version are kept as they are.
 */
export function restoreNoteVersion(doc: Y.Doc, versionState: Uint8Array, origin?: unknown): void {
  const version = new Y.Doc();
  Y.applyUpdate(version, versionState);
  const fromRoot = version.getXmlFragment(NOTE_ROOTS.content);
  const toRoot = doc.getXmlFragment(NOTE_ROOTS.content);
  doc.transact(() => {
    if (toRoot.length > 0) toRoot.delete(0, toRoot.length);
    toRoot.insert(0, pmContentToY(yFragmentToPM(fromRoot).content));
    const strokes = strokesMap(doc);
    for (const key of [...strokes.keys()]) strokes.delete(key);
    for (const { id, stroke } of listStrokes(version)) {
      if (stroke.anchorKind === "text") {
        stroke.anchors = stroke.anchors.map((encoded) => {
          const r = resolveAnchors(version, [encoded])[0];
          if (!r || r.deleted) return encoded;
          const path = pathOf(r.text, fromRoot);
          const target = path ? atPath(toRoot, path) : null;
          return target ? encodeAnchor(target, r.index) : encoded;
        });
      }
      putStroke(doc, id, stroke);
    }
  }, origin);
}

/**
 * Local `orphanedAt` bookkeeping (strokes.md §4.2): records when a stroke was
 * first seen with all anchors deleted and forgets it once an anchor is alive
 * again. `orphanedAt` is device-local state (persist it next to the document).
 * Returns the ids that are orphaned now.
 */
export function updateOrphanedAt(
  doc: Y.Doc,
  orphanedAt: Map<string, number>,
  now: number,
): string[] {
  const orphaned = findOrphanedStrokes(doc);
  const set = new Set(orphaned);
  for (const id of [...orphanedAt.keys()]) if (!set.has(id)) orphanedAt.delete(id);
  for (const id of orphaned) if (!orphanedAt.has(id)) orphanedAt.set(id, now);
  return orphaned;
}
