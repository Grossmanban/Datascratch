/**
 * Shared stroke vectors (packages/test-vectors/vectors/strokes): the renderer's
 * text-stroke path, fed the reference monospace layout instead of our
 * typesetter, must produce exactly the reference segments.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { unpackPoints } from "@datascratch/shared/strokes";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { contentOf } from "../src/doc/model.js";
import type { Stroke } from "../src/doc/strokes.js";
import { textSegments, type Layout } from "../src/render/handwriting-png.js";

const require = createRequire(import.meta.url);
const v = JSON.parse(readFileSync(require.resolve("@datascratch/test-vectors/vectors/strokes/layout.json"), "utf8"));
const b64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

function setup() {
  const doc = new Y.Doc({ gc: false });
  Y.applyUpdate(doc, b64(v.base));
  const block = contentOf(doc).get(0) as Y.XmlElement;
  const stroke = {
    id: "s",
    v: 1,
    tool: v.stroke.tool,
    width: v.stroke.width,
    color: "ink.black",
    opacity: 1,
    anchorKind: "text",
    blockId: null,
    anchors: v.anchors.map(b64),
    points: unpackPoints(b64(v.points)),
    hint: "free",
    author: { kind: "user", id: "u" },
    createdAt: 0,
    hidden: false,
  } as Stroke;
  return { doc, block, stroke };
}

function referenceLayout(length: number, perLine: number): Layout {
  const lines = Math.max(1, Math.ceil(length / perLine));
  return {
    glyphs: Array.from({ length }, (_, i) => ({ ch: "x", x: (i % perLine) * 10, w: 10, line: Math.floor(i / perLine), font: "", marks: {} })),
    lines: Array.from({ length: lines }, (_, l) => ({ top: l * 24, baseline: l * 24 + 17, bottom: l * 24 + 24 })),
    fontSize: 17,
    height: lines * 24,
    left: 0,
  };
}

const round = (segs: { x: number; y: number; w: number }[][]) =>
  segs.map((s) => s.map((p) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4), width: +p.w.toFixed(4) })));

describe("stroke layout vectors", () => {
  for (const c of v.cases as { perLine: number; segments: unknown }[]) {
    it(`matches the reference layout, ${c.perLine} chars per line`, () => {
      const { doc, block, stroke } = setup();
      expect(block.toString()).toContain(v.textBefore);
      const segs = textSegments(doc, stroke, block, referenceLayout(v.textBefore.length, c.perLine), 0, false);
      expect(round(segs)).toEqual(c.segments);
    });
  }

  it("drops points on a deleted character", () => {
    const { doc, block, stroke } = setup();
    (block.get(0) as Y.XmlText).delete(4, 1);
    const segs = textSegments(doc, stroke, block, referenceLayout(v.textBefore.length - 1, 1000), 0, false);
    expect(round(segs)).toEqual(v.afterDeletingIndex4.segments);
  });
});
