import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { packPoints, POINT_BYTES, pressureCurve, strokeFromYMap, strokeToYMap, unpackPoints, type Stroke } from "../src/shared/strokes";

describe("stroke codec (strokes.md §3)", () => {
  it("packs 8 little-endian float32 per point", () => {
    const bytes = packPoints([{ a: 2, x: 0.5, y: -0.25, pressure: 0.75, altitude: 1, azimuth: 2, roll: 0, t: 16 }]);
    expect(bytes.byteLength).toBe(POINT_BYTES);
    const view = new DataView(bytes.buffer);
    expect(view.getFloat32(0, true)).toBe(2);
    expect(view.getFloat32(8, true)).toBe(-0.25);
    expect(unpackPoints(bytes)[0]).toEqual({ a: 2, x: 0.5, y: -0.25, pressure: 0.75, altitude: 1, azimuth: 2, roll: 0, t: 16 });
  });

  it("pressure curve f(p) = 0.35 + 0.65·p^0.8", () => {
    expect(pressureCurve(0)).toBeCloseTo(0.35);
    expect(pressureCurve(1)).toBeCloseTo(1);
  });

  it("stores a stroke as a Y.Map and reads it back after sync", () => {
    const stroke: Stroke = {
      v: 1,
      tool: "pen",
      color: "ink.blue",
      width: 2,
      opacity: 1,
      anchorKind: "text",
      blockId: null,
      anchors: [new Uint8Array([1, 2, 3])],
      points: packPoints([{ a: 0, x: 0, y: 0, pressure: 1, altitude: 1, azimuth: 0, roll: 0, t: 0 }]),
      hint: "underline",
      author: { kind: "user", id: "u1" },
      createdAt: 1,
    };
    const a = new Y.Doc();
    a.getMap("strokes").set("s1", strokeToYMap(stroke));
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    const read = strokeFromYMap(b.getMap<Y.Map<unknown>>("strokes").get("s1")!)!;
    expect(read.anchors[0]).toEqual(new Uint8Array([1, 2, 3]));
    expect(read.points).toEqual(stroke.points);
    expect(read.hint).toBe("underline");
  });
});
