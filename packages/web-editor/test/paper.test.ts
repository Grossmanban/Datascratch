import { describe, expect, it } from "vitest";
import { baselineShift, pitchFor, snapMargins } from "../src/paper";

describe("paper", () => {
  it("pitch is the body line-height in whole pixels", () => {
    expect(pitchFor(17)).toBe(26);
    expect(pitchFor(18)).toBe(27);
  });

  it("snaps blocks to whole pitches", () => {
    // A 40px image after a 26px paragraph: the image is rounded up to 52px.
    expect(snapMargins([{ height: 26, marginTop: 0, marginBottom: 0 }, { height: 40, marginTop: 26, marginBottom: 26 }], 26)).toEqual([0, 12]);
  });

  it("moves a heading's baseline onto the nearest rule of its line box", () => {
    // One-pitch line (h2/h3): the heading baseline sits 2px lower than the body's → move up 2px.
    expect(baselineShift(19, 21, 26, 26)).toBe(-2);
    // Two-pitch title: rules at 19 and 45 inside the box; a baseline at 38 goes down to 45.
    expect(baselineShift(19, 38, 52, 26)).toBe(7);
    // …and one at 28 goes up to 19.
    expect(baselineShift(19, 28, 52, 26)).toBe(-9);
  });
});
