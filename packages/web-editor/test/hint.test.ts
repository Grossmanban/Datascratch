import { describe, expect, it } from "vitest";
import { recognizeHint } from "../src/pen/hint";
import { groupLines, type Glyph } from "../src/pen/geometry";

const glyphs: Glyph[] = Array.from({ length: 20 }, (_, i) => ({
  pos: i + 1,
  left: i * 10,
  right: i * 10 + 10,
  top: 6,
  bottom: 24,
  baseline: 20,
  fontSize: 17,
  block: 1,
}));
const lines = groupLines(glyphs);

describe("recognizeHint", () => {
  it("underline below the baseline", () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 8, y: 23 + (i % 2) * 0.5 }));
    expect(recognizeHint(pts, "pen", lines)).toBe("underline");
  });

  it("strike through the middle of the letters", () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 8, y: 15 }));
    expect(recognizeHint(pts, "pen", lines)).toBe("strike");
  });

  it("circle around a word", () => {
    const pts = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 39) * Math.PI * 2.05;
      return { x: 60 + 40 * Math.cos(a), y: 15 + 14 * Math.sin(a) };
    });
    expect(recognizeHint(pts, "pen", lines)).toBe("circle");
  });

  it("scribble over a word", () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: 50 + (i % 2 ? 40 : 0) + i * 0.3, y: 12 + i * 0.2 }));
    expect(recognizeHint(pts, "pen", lines)).toBe("scribble");
  });

  it("arrow with a head", () => {
    const shaft = Array.from({ length: 20 }, (_, i) => ({ x: i * 6, y: 50 }));
    const head = [
      { x: 108, y: 44 },
      { x: 104, y: 40 },
    ];
    expect(recognizeHint([...shaft, { x: 114, y: 50 }, ...head], "pen")).toBe("arrow");
  });

  it("highlighter is always highlight", () => {
    expect(recognizeHint([{ x: 0, y: 0 }, { x: 50, y: 0 }], "highlighter")).toBe("highlight");
  });

  it("free form otherwise", () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({ x: i * 3, y: Math.sin(i / 3) * 30 + i * 2 }));
    expect(recognizeHint(pts, "pen", lines)).toBe("free");
  });
});
