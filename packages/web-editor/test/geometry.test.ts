import { describe, expect, it } from "vitest";
import {
  bindToSurface,
  bindToText,
  groupLines,
  hitsSegments,
  outlineShapes,
  resolveSurfaceSegments,
  resolveTextSegments,
  signedArea,
  splitStroke,
  type AnchorBox,
  type Glyph,
  type InputPoint,
} from "../src/pen/geometry";
import { strokeWidthAt, type StrokePoint } from "@datascratch/shared/strokes";

/** A monospace line of text: glyph i spans [x0 + i*cw, x0 + (i+1)*cw]. */
function line(text: string, opts: { x0?: number; baseline?: number; block?: number; pos0?: number; cw?: number; fontSize?: number } = {}): Glyph[] {
  const { x0 = 0, baseline = 20, block = 1, pos0 = 1, cw = 10, fontSize = 17 } = opts;
  return [...text].map((_, i) => ({
    pos: pos0 + i,
    left: x0 + i * cw,
    right: x0 + (i + 1) * cw,
    top: baseline - fontSize * 0.8,
    bottom: baseline + fontSize * 0.25,
    baseline,
    fontSize,
    block,
  }));
}

const pt = (x: number, y: number, t = 0): InputPoint => ({ x, y, pressure: 1, altitude: Math.PI / 2, azimuth: 0, roll: 0, t });

describe("groupLines", () => {
  it("splits wrapped text and different blocks into lines", () => {
    const glyphs = [...line("hello", { baseline: 20 }), ...line("world", { baseline: 45, pos0: 6 }), ...line("next", { baseline: 80, block: 2, pos0: 13 })];
    const lines = groupLines(glyphs);
    expect(lines.map((l) => l.glyphs.length)).toEqual([5, 5, 4]);
  });

  it("keeps glyphs with slightly different baselines (inline code) on one line", () => {
    const a = line("ab", { baseline: 20 });
    const b = line("cd", { baseline: 21.5, x0: 20, pos0: 3, fontSize: 15 });
    expect(groupLines([...a, ...b])).toHaveLength(1);
  });
});

describe("bindToText", () => {
  it("anchors each point to the nearest character of its line, offsets in em", () => {
    const lines = groupLines(line("hello"));
    const b = bindToText([pt(5, 22), pt(25, 22), pt(26, 23)], lines)!;
    expect(b.anchorPositions).toEqual([1, 3]);
    expect(b.points.map((p) => p.a)).toEqual([0, 1, 1]);
    expect(b.points[0]!.x).toBeCloseTo(5 / 17);
    expect(b.points[0]!.y).toBeCloseTo(2 / 17);
    expect(b.points[2]!.x).toBeCloseTo(6 / 17);
  });

  it("uses the vertically nearest line for points between lines", () => {
    const lines = groupLines([...line("aaaa", { baseline: 20 }), ...line("bbbb", { baseline: 60, pos0: 10 })]);
    const b = bindToText([pt(15, 27), pt(15, 44)], lines)!;
    expect(b.anchorPositions).toEqual([2, 11]);
  });

  it("returns null without text", () => {
    expect(bindToText([pt(1, 1)], [])).toBeNull();
  });
});

describe("resolveTextSegments (strokes.md §4)", () => {
  const stroke = { width: 2, tool: "pen" as const };
  const sp = (a: number, x = 0, y = 0.2): StrokePoint => ({ a, x, y, pressure: 1, altitude: Math.PI / 2, azimuth: 0, roll: 0, t: 0 });

  it("places points at glyph start + offset × font size", () => {
    const boxes: AnchorBox[] = [{ x: 100, baseline: 50, fontSize: 20, block: 1 }];
    const segs = resolveTextSegments(stroke, [sp(0, 0.5, 0.1), sp(0, 1, 0.1)], (a) => boxes[a] ?? null);
    expect(segs).toHaveLength(1);
    expect(segs[0]![0]).toMatchObject({ x: 110, y: 52 });
    expect(segs[0]![0]!.w).toBeCloseTo(strokeWidthAt(stroke, { pressure: 1, altitude: Math.PI / 2 }, { fontSize: 20 }));
  });

  it("breaks the stroke where neighbouring points are on different lines", () => {
    const boxes: AnchorBox[] = [
      { x: 0, baseline: 20, fontSize: 17, block: 1 },
      { x: 50, baseline: 20, fontSize: 17, block: 1 },
      { x: 0, baseline: 45, fontSize: 17, block: 1 },
      { x: 50, baseline: 45, fontSize: 17, block: 1 },
    ];
    const segs = resolveTextSegments(stroke, [sp(0), sp(1), sp(2), sp(3)], (a) => boxes[a] ?? null);
    expect(segs.map((s) => s.map((p) => p.i))).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("D-35: hides points on deleted characters and drops segments shorter than 2 points", () => {
    const boxes: (AnchorBox | null)[] = [
      { x: 0, baseline: 20, fontSize: 17, block: 1 },
      null,
      { x: 20, baseline: 20, fontSize: 17, block: 1 },
      { x: 30, baseline: 20, fontSize: 17, block: 1 },
    ];
    const segs = resolveTextSegments(stroke, [sp(0), sp(1), sp(2), sp(3)], (a) => boxes[a] ?? null);
    expect(segs.map((s) => s.map((p) => p.i))).toEqual([[2, 3]]);
  });

  it("D-35: a stroke whose anchors are all deleted draws nothing", () => {
    expect(resolveTextSegments(stroke, [sp(0), sp(0)], () => null)).toEqual([]);
  });
});

describe("surface strokes", () => {
  it("round-trips through width fractions and scales with the surface", () => {
    const surface = { left: 10, top: 100, width: 300 };
    const pts = bindToSurface([pt(10, 100), pt(160, 175)], surface);
    expect(pts[1]).toMatchObject({ a: -1, x: 0.5, y: 0.25 });
    const segs = resolveSurfaceSegments({ width: 3, tool: "pen" }, pts, { left: 0, top: 0, width: 600 });
    expect(segs[0]![1]).toMatchObject({ x: 300, y: 150 });
  });
});

describe("eraser", () => {
  it("hit-tests drawn segments", () => {
    const seg = [
      { x: 0, y: 0, w: 2, i: 0 },
      { x: 100, y: 0, w: 2, i: 1 },
    ];
    expect(hitsSegments([seg], 50, 3, 2)).toBe(true);
    expect(hitsSegments([seg], 50, 10, 2)).toBe(false);
  });

  it("pixel eraser splits a text stroke and re-indexes anchors", () => {
    const anchors = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];
    const p = (a: number, t: number): StrokePoint => ({ a, x: 0, y: 0, pressure: 1, altitude: 1, azimuth: 0, roll: 0, t });
    const pieces = splitStroke({ anchorKind: "text", anchors }, [p(0, 0), p(0, 1), p(1, 2), p(2, 3), p(2, 4)], new Set([2]));
    expect(pieces).toHaveLength(2);
    expect(pieces[0]!.anchors).toEqual([anchors[0]]);
    expect(pieces[1]!.anchors).toEqual([anchors[2]]);
    expect(pieces[1]!.points.map((q) => [q.a, q.t])).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });
});

describe("outlineShapes", () => {
  it("emits clockwise quads regardless of direction", () => {
    for (const [x1, y1] of [
      [10, 0],
      [-10, 0],
      [0, 10],
      [0, -10],
    ] as const) {
      const { quads } = outlineShapes([
        { x: 0, y: 0, w: 2, i: 0 },
        { x: x1, y: y1, w: 2, i: 1 },
      ]);
      expect(signedArea(quads[0]!)).toBeGreaterThan(0);
    }
  });
});

import { expandToWords, fractionInside, pointInPolygon } from "../src/pen/geometry";

describe("lasso and gestures", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it("point in polygon", () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(15, 5, square)).toBe(false);
  });
  it("fraction of a stroke inside the lasso", () => {
    const seg = [0, 4, 8, 12].map((x, i) => ({ x, y: 5, w: 1, i }));
    expect(fractionInside([seg], square)).toBe(0.75);
  });
  it("scribble deletion expands to whole words", () => {
    const text = "one two three";
    expect(expandToWords(text, 5, 6)).toEqual([4, 8]);
    expect(text.slice(...expandToWords(text, 0, 1))).toBe("one ");
  });
});
