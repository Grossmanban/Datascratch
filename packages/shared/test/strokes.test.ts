import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import {
  anchorTextStroke,
  createNoteDoc,
  encodeAnchor,
  findOrphanedStrokes,
  findPurgeableStrokes,
  getStroke,
  layoutBlockStroke,
  layoutTextStroke,
  listStrokes,
  noteRoots,
  packPoints,
  pressureCurve,
  putStroke,
  resolveAnchor,
  resolveAnchors,
  strokeWidthAt,
  tiltFactor,
  unpackPoints,
  type GlyphBox,
  type ResolvedAnchor,
  type Stroke,
  type StrokePoint,
} from "../src/index.js";

const pt = (a: number, x: number, y = 0.1, t = 0): StrokePoint => ({
  a,
  x,
  y,
  pressure: 0.5,
  altitude: 1,
  azimuth: 2,
  roll: 0,
  t,
});

function noteWithText(text: string) {
  const doc = createNoteDoc({ blocks: [{ type: "paragraph", content: [{ type: "text", text }] }] });
  const para = noteRoots(doc).content.get(1) as Y.XmlElement;
  return { doc, text: para.get(0) as Y.XmlText, para };
}

/** Fixed-width fake layout: each character 10 units wide, `perLine` characters per line. */
function monoLayout(perLine: number, fontSize = 17) {
  return (anchor: ResolvedAnchor): GlyphBox => ({
    x: (anchor.index % perLine) * 10,
    baseline: Math.floor(anchor.index / perLine) * 24 + 17,
    fontSize,
    line: Math.floor(anchor.index / perLine),
  });
}

const base = (anchors: Uint8Array[], points: StrokePoint[]): Stroke => ({
  v: 1,
  tool: "pen",
  color: "ink.black",
  width: 2,
  opacity: 1,
  anchorKind: "text",
  blockId: null,
  anchors,
  points: packPoints(points),
  hint: "underline",
  author: { kind: "user", id: "u" },
  createdAt: 1_000,
});

describe("point codec", () => {
  it("packs 32-byte little-endian float32 records", () => {
    const points = [pt(0, 0.25, -0.5, 0), pt(1, 1.5, 0.125, 16)];
    const packed = packPoints(points);
    expect(packed.length).toBe(64);
    expect(new DataView(packed.buffer).getFloat32(4, true)).toBe(0.25);
    const back = unpackPoints(packed);
    expect(back[1]!.t).toBe(16);
    expect(back[0]!.x).toBe(0.25);
    expect(back[0]!.altitude).toBeCloseTo(1, 6);
  });
  it("rejects truncated data", () => {
    expect(() => unpackPoints(new Uint8Array(33))).toThrow(RangeError);
  });
});

describe("anchors", () => {
  it("follow their character through inserts", () => {
    const { doc, text } = noteWithText("hello world");
    const a = encodeAnchor(text, 6); // "w"
    text.insert(0, ">> ");
    const r = resolveAnchor(doc, a)!;
    expect(r.index).toBe(9);
    expect(r.deleted).toBe(false);
    expect(r.text.toString()).toContain("world");
  });
  it("mark deleted characters (D-35) and come back on undo", () => {
    const { doc, text } = noteWithText("hello world");
    const undo = new Y.UndoManager(noteRoots(doc).content, { captureTimeout: 0 });
    const a = encodeAnchor(text, 7); // "o" in world
    text.delete(6, 5);
    expect(resolveAnchor(doc, a)!.deleted).toBe(true);
    undo.undo();
    const r = resolveAnchor(doc, a)!;
    expect(r.deleted).toBe(false);
    expect(text.toString().charAt(r.index)).toBe("o");
  });
  it("treat a deleted paragraph as deleted", () => {
    const { doc, text } = noteWithText("abc");
    const a = encodeAnchor(text, 1);
    noteRoots(doc).content.delete(1, 1);
    expect(resolveAnchor(doc, a)?.deleted ?? true).toBe(true);
  });
  it("resolve on another replica after sync", () => {
    const { doc, text } = noteWithText("abc");
    const a = encodeAnchor(text, 2);
    const other = new Y.Doc();
    expect(resolveAnchor(other, a)).toBeNull();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(doc));
    expect(resolveAnchor(other, a)!.index).toBe(2);
  });
});

describe("layout", () => {
  it("places points at glyph origin + em offset", () => {
    const { doc, text } = noteWithText("abcdef");
    const anchors = [encodeAnchor(text, 1), encodeAnchor(text, 2)];
    const segs = layoutTextStroke(
      base(anchors, []),
      [pt(0, 0, 0.2), pt(1, 0.5, 0.2)],
      resolveAnchors(doc, anchors),
      monoLayout(100),
    );
    expect(segs).toHaveLength(1);
    expect(segs[0]![0]!.x).toBeCloseTo(10);
    expect(segs[0]![1]!.x).toBeCloseTo(20 + 0.5 * 17);
    expect(segs[0]![0]!.y).toBeCloseTo(17 + 0.2 * 17);
  });
  it("breaks at line changes and after relayout", () => {
    const { doc, text } = noteWithText("abcdefgh");
    const anchors = [0, 1, 2, 3].map((i) => encodeAnchor(text, i + 2)); // c d e f
    const points = [0, 1, 2, 3].map((i) => pt(i, 0.1));
    const stroke = base(anchors, points);
    // Wide layout: one line.
    expect(
      layoutTextStroke(stroke, points, resolveAnchors(doc, anchors), monoLayout(100)),
    ).toHaveLength(1);
    // Narrow layout (4 per line): c d | e f → two segments.
    const segs = layoutTextStroke(stroke, points, resolveAnchors(doc, anchors), monoLayout(4));
    expect(segs.map((s) => s.length)).toEqual([2, 2]);
  });
  it("drops deleted points and short segments (D-35)", () => {
    const { doc, text } = noteWithText("abcdefgh");
    const anchors = [0, 1, 2, 3, 4].map((i) => encodeAnchor(text, i));
    const points = [0, 1, 2, 3, 4].map((i) => pt(i, 0.1));
    text.delete(1, 1); // "b" gone: a | c d e
    let segs = layoutTextStroke(
      base(anchors, points),
      points,
      resolveAnchors(doc, anchors),
      monoLayout(100),
    );
    expect(segs.map((s) => s.length)).toEqual([3]);
    text.delete(0, 7);
    segs = layoutTextStroke(
      base(anchors, points),
      points,
      resolveAnchors(doc, anchors),
      monoLayout(100),
    );
    expect(segs).toEqual([]);
  });
  it("lays out block strokes in block-width units", () => {
    const segs = layoutBlockStroke({ tool: "pen", width: 2 }, [pt(-1, 0, 0), pt(-1, 1, 0.5)], {
      x: 10,
      y: 100,
      width: 300,
    });
    expect(segs[0]![1]).toMatchObject({ x: 310, y: 250 });
    expect(segs[0]![0]!.width).toBeCloseTo(2 * pressureCurve(0.5) * 0.5);
  });
  it("anchors raw input to the nearest characters", () => {
    const { doc, text } = noteWithText("abcdef");
    const layout = monoLayout(100);
    const hit = (x: number) => {
      const index = Math.min(Math.max(Math.floor(x / 10), 0), 5);
      return { text, index, box: layout({ text, index, deleted: false }) };
    };
    const res = anchorTextStroke(
      [
        { x: 12, y: 20, t: 0 },
        { x: 18, y: 20, t: 8 },
        { x: 31, y: 21, t: 16 },
      ],
      (x) => hit(x),
    )!;
    expect(res.anchors).toHaveLength(2);
    expect(res.points.map((p) => p.a)).toEqual([0, 0, 1]);
    expect(res.points[0]!.x).toBeCloseTo(2 / 17);
    expect(res.points[0]!.y).toBeCloseTo(3 / 17);
    // Round trip: laying out again reproduces the input positions.
    const segs = layoutTextStroke(
      base(res.anchors, res.points),
      res.points,
      resolveAnchors(doc, res.anchors),
      layout,
    );
    expect(segs[0]!.map((p) => Math.round(p.x))).toEqual([12, 18, 31]);
  });
});

describe("width", () => {
  it("follows the shared curve", () => {
    expect(pressureCurve(0)).toBeCloseTo(0.35);
    expect(pressureCurve(1)).toBeCloseTo(1);
    expect(tiltFactor("pen", 0)).toBe(1);
    expect(tiltFactor("pencil", 0)).toBeCloseTo(2.5);
    expect(tiltFactor("marker", Math.PI / 2)).toBeCloseTo(1);
    expect(
      strokeWidthAt({ tool: "pen", width: 2 }, { pressure: 1, altitude: 1 }, { fontSize: 34 }),
    ).toBeCloseTo(4);
  });
});

describe("store", () => {
  it("round-trips strokes through Yjs and finds orphans", () => {
    const { doc, text } = noteWithText("hello");
    const anchors = [encodeAnchor(text, 0), encodeAnchor(text, 1)];
    putStroke(doc, "s1", base(anchors, [pt(0, 0), pt(1, 0)]));
    putStroke(doc, "s2", {
      ...base([], [pt(-1, 0.1), pt(-1, 0.2)]),
      anchorKind: "drawing",
      blockId: "b1",
      createdAt: 500,
    });
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(doc));
    const s1 = getStroke(other, "s1")!;
    expect(s1.anchors).toEqual(anchors);
    expect(unpackPoints(s1.points)).toHaveLength(2);
    expect(listStrokes(other).map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(findOrphanedStrokes(doc)).toEqual([]);
    text.delete(0, 5);
    expect(findOrphanedStrokes(doc)).toEqual(["s1"]);
    expect(findPurgeableStrokes(doc, 1_000 + 31 * 86_400_000)).toEqual(["s1"]);
    expect(findPurgeableStrokes(doc, 1_000 + 29 * 86_400_000)).toEqual([]);
  });
  it("validates", () => {
    const { doc } = noteWithText("x");
    expect(() => putStroke(doc, "s", base([], []))).toThrow(/anchors/);
    expect(() =>
      putStroke(doc, "s", { ...base([], []), anchorKind: "block", blockId: null }),
    ).toThrow(/blockId/);
  });
});

describe("undo across replicas", () => {
  it("rebaseRedoneAnchors makes restored anchors visible on other devices", async () => {
    const { rebaseRedoneAnchors } = await import("../src/index.js");
    const { doc, text } = noteWithText("hello world");
    const undo = new Y.UndoManager(noteRoots(doc).content, { captureTimeout: 0 });
    const anchors = [encodeAnchor(text, 6), encodeAnchor(text, 7)];
    putStroke(doc, "s", base(anchors, [pt(0, 0), pt(1, 0)]));
    text.delete(6, 5);
    undo.undo();
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc));
    // Without rebasing the remote replica cannot see the restored characters.
    expect(findOrphanedStrokes(remote)).toEqual(["s"]);
    expect(rebaseRedoneAnchors(doc)).toEqual(["s"]);
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc));
    expect(findOrphanedStrokes(remote)).toEqual([]);
    const r = resolveAnchor(remote, getStroke(remote, "s")!.anchors[0]!)!;
    expect(r.text.toString().charAt(r.index)).toBe("w");
    expect(rebaseRedoneAnchors(doc)).toEqual([]);
  });
});

describe("anchor rebase hooks and version restore", () => {
  it("attachAnchorRebase rebases after undo without touching the redo stack", async () => {
    const { attachAnchorRebase } = await import("../src/index.js");
    const { doc, text } = noteWithText("hello world");
    const undo = new Y.UndoManager([noteRoots(doc).content, noteRoots(doc).strokes], {
      captureTimeout: 0,
    });
    attachAnchorRebase(undo);
    putStroke(doc, "s", base([encodeAnchor(text, 6), encodeAnchor(text, 7)], [pt(0, 0), pt(1, 0)]));
    undo.stopCapturing();
    text.delete(6, 5);
    undo.undo();
    expect(undo.redoStack.length).toBe(1);
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc));
    expect(findOrphanedStrokes(remote)).toEqual([]);
  });
  it("restoreNoteVersion recomputes anchors by index", async () => {
    const { restoreNoteVersion } = await import("../src/index.js");
    const { doc, text } = noteWithText("hello world");
    putStroke(
      doc,
      "s",
      base([encodeAnchor(text, 6), encodeAnchor(text, 10)], [pt(0, 0), pt(1, 0)]),
    );
    const v1 = Y.encodeStateAsUpdate(doc);
    text.delete(0, text.length);
    text.insert(0, "something else");
    restoreNoteVersion(doc, v1);
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc));
    const s = getStroke(remote, "s")!;
    const r = resolveAnchors(remote, s.anchors);
    expect(r.map((a) => a && !a.deleted && a.text.toString().charAt(a.index))).toEqual(["w", "d"]);
  });
});

describe("orphanedAt bookkeeping", () => {
  it("records first orphaned time and clears it when anchors come back", async () => {
    const { updateOrphanedAt } = await import("../src/index.js");
    const { doc, text } = noteWithText("abc");
    const undo = new Y.UndoManager(noteRoots(doc).content, { captureTimeout: 0 });
    putStroke(doc, "s", base([encodeAnchor(text, 1)], [pt(0, 0), pt(0, 0.5)]));
    const seen = new Map<string, number>();
    expect(updateOrphanedAt(doc, seen, 10)).toEqual([]);
    text.delete(0, 3);
    updateOrphanedAt(doc, seen, 20);
    updateOrphanedAt(doc, seen, 30);
    expect(seen.get("s")).toBe(20);
    const day = 86_400_000;
    expect(findPurgeableStrokes(doc, 20 + 31 * day, (id) => seen.get(id) ?? null)).toEqual(["s"]);
    expect(findPurgeableStrokes(doc, 20 + 29 * day, (id) => seen.get(id) ?? null)).toEqual([]);
    undo.undo();
    expect(updateOrphanedAt(doc, seen, 40)).toEqual([]);
    expect(seen.has("s")).toBe(false);
  });
});

describe("re-anchoring after block rewrites", () => {
  it("replaces strokes whose text was recreated by a split", async () => {
    const { captureAnchorOffsets, reanchorStrokes, textOffsetOf } = await import("../src/index.js");
    const { doc, text } = noteWithText("hello world");
    putStroke(doc, "s", base([encodeAnchor(text, 1), encodeAnchor(text, 7)], [pt(0, 0), pt(1, 0)]));
    const snap = captureAnchorOffsets(doc);
    let ids: { from: string; to: string }[] = [];
    doc.transact(() => {
      // Emulate y-prosemirror splitting "hello world" into "hello " + "world".
      const content = noteRoots(doc).content;
      content.delete(1, 1);
      const mk = (s: string) => {
        const p = new Y.XmlElement("paragraph");
        const t = new Y.XmlText();
        t.insert(0, s);
        p.insert(0, [t]);
        return p;
      };
      content.insert(1, [mk("hello "), mk("world")]);
      ids = reanchorStrokes(doc, snap, { newId: () => "s2" });
    });
    expect(ids).toEqual([{ from: "s", to: "s2" }]);
    expect(getStroke(doc, "s")).toBeNull();
    const s2 = getStroke(doc, "s2")!;
    expect(unpackPoints(s2.points)).toHaveLength(2);
    const r = resolveAnchors(doc, s2.anchors).map(
      (a) => a && !a.deleted && a.text.toString().charAt(a.index),
    );
    expect(r).toEqual(["e", "o"]);
    expect(textOffsetOf(doc, resolveAnchors(doc, s2.anchors)[1]!)).toBe(7);
  });
  it("leaves untouched strokes alone", async () => {
    const { captureAnchorOffsets, reanchorStrokes } = await import("../src/index.js");
    const { doc, text } = noteWithText("abc");
    putStroke(doc, "s", base([encodeAnchor(text, 1)], [pt(0, 0), pt(0, 1)]));
    const snap = captureAnchorOffsets(doc);
    expect(reanchorStrokes(doc, snap)).toEqual([]);
  });
});
