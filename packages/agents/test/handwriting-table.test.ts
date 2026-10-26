/**
 * Regression (user review 2026-10-26): words handwritten next to table cells
 * were split across anchors («hello» → «hell» + an empty fragment), strokes
 * were clipped, emoji were missing and a circle around inline code was not drawn.
 */
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { collectHandwriting } from "../src/doc/handwriting.js";
import { childElements, contentOf } from "../src/doc/model.js";
import { writeStroke, type StrokePoint } from "../src/doc/strokes.js";
import { autoScale, renderHandwriting, textSegments, type Layout } from "../src/render/handwriting-png.js";
import { readStrokes } from "../src/doc/strokes.js";
import { makeNoteDoc } from "../src/testing/fixtures.js";

function cellText(doc: Y.Doc, row: number, col: number): Y.XmlText {
  const table = childElements(contentOf(doc)).find((e) => e.nodeName === "table")!;
  const cell = childElements(childElements(table)[row]!)[col]!;
  const p = childElements(cell)[0]!;
  return p.toArray().find((c): c is Y.XmlText => c instanceof Y.XmlText)!;
}

/** A stroke whose points are anchored to given characters (possibly in different cells). */
function strokeAt(doc: Y.Doc, id: string, createdAt: number, pts: { t: Y.XmlText; i: number; x: number; y: number }[], extra: Partial<{ color: string; hint: "free" | "circle" }> = {}) {
  const anchors: Uint8Array[] = [];
  const key = new Map<string, number>();
  const points: StrokePoint[] = pts.map((p, n) => {
    const k = `${p.t.parent && (p.t.parent as Y.XmlElement).getAttribute("blockId")}:${p.i}`;
    let a = key.get(k);
    if (a === undefined) {
      a = anchors.length;
      anchors.push(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(p.t, p.i)));
      key.set(k, a);
    }
    return { a, x: p.x, y: p.y, pressure: 0.6, altitude: Math.PI / 2, azimuth: 0, roll: 0, t: n * 10 };
  });
  doc.transact(() =>
    writeStroke(doc, {
      id,
      v: 1,
      tool: "pen",
      color: extra.color ?? "ink.black",
      width: 2,
      opacity: 1,
      anchorKind: "text",
      blockId: null,
      anchors,
      points,
      hint: extra.hint ?? "free",
      author: { kind: "user", id: "u" },
      createdAt,
    }),
  );
}

function inkPixels(png: Buffer, rgb: [number, number, number], tol = 60): number {
  const img = PNG.sync.read(png);
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const d = Math.abs(img.data[i]! - rgb[0]) + Math.abs(img.data[i + 1]! - rgb[1]) + Math.abs(img.data[i + 2]! - rgb[2]);
    if (d < tol) n++;
  }
  return n;
}

describe("handwriting in tables", () => {
  const md = "| Статус | Описание | Итог |\n| --- | --- | --- |\n| ✅ | по центру `код` | ❓ |";

  it("keeps one handwritten word in one fragment, even across cells, and draws all of it", async () => {
    const doc = makeNoteDoc("Таблица", md);
    const c1 = cellText(doc, 1, 1); // "по центру код"
    const c2 = cellText(doc, 1, 2); // "❓"
    // «hello» written to the right of the middle cell: points are nearest to the end of cell 2 and to cell 3.
    const t0 = 1_760_000_000_000;
    strokeAt(doc, "w1", t0, [
      { t: c1, i: 8, x: 0.6, y: -1.4 },
      { t: c1, i: 8, x: 1.2, y: -0.6 },
      { t: c2, i: 0, x: -1.5, y: -1.2 },
    ]);
    strokeAt(doc, "w2", t0 + 400, [
      { t: c2, i: 0, x: -1.2, y: -0.4 },
      { t: c2, i: 0, x: -0.6, y: -1.3 },
      { t: c2, i: 1, x: 0.4, y: -0.5 },
    ]);
    strokeAt(doc, "w3", t0 + 900, [
      { t: c2, i: 0, x: 1.1, y: -1.5 },
      { t: c2, i: 0, x: 1.6, y: -0.2 },
    ]);
    const items = collectHandwriting(doc);
    expect(items).toHaveLength(1);
    expect(items[0]!.strokeIds).toEqual(["w1", "w2", "w3"]);
    expect(items[0]!.description).toContain("в таблице (строка 2, столбец");
    const img = await renderHandwriting(doc, items[0]!);
    writeFileSync(new URL("./__images__/_last-table-word.png", import.meta.url), img.png);
    // All three strokes are drawn: plenty of ink-black pixels beyond the text of the cells.
    expect(inkPixels(img.png, [0x1d, 0x1c, 0x1a])).toBeGreaterThan(200);
  });

  it("draws a circle around inline code in a cell", async () => {
    const doc = makeNoteDoc("Таблица", md);
    const c1 = cellText(doc, 1, 1); // "по центру код" — `код` starts at 10
    strokeAt(
      doc,
      "c1",
      1_760_000_100_000,
      [
        { t: c1, i: 10, x: -0.2, y: -1.0 },
        { t: c1, i: 12, x: 0.8, y: -1.0 },
        { t: c1, i: 12, x: 0.9, y: 0.3 },
        { t: c1, i: 10, x: -0.3, y: 0.3 },
        { t: c1, i: 10, x: -0.2, y: -1.0 },
      ],
      { color: "ink.red", hint: "circle" },
    );
    const [item] = collectHandwriting(doc);
    expect(item!.description).toContain("обведено от руки: «код»");
    const img = await renderHandwriting(doc, item!);
    writeFileSync(new URL("./__images__/_last-table-circle.png", import.meta.url), img.png);
    expect(inkPixels(img.png, [0xd2, 0x45, 0x3b])).toBeGreaterThan(100);
  });

  it("merges strokes written close together on one line even after a pause («+ O X –»)", () => {
    const doc = makeNoteDoc("Таблица", md);
    const c = cellText(doc, 1, 1); // "по центру код"
    const t0 = 1_760_000_300_000;
    // «+» after the cell text, then — 6 s later — «O X –» right next to it.
    strokeAt(doc, "plus-h", t0, [
      { t: c, i: 12, x: 0.9, y: -0.4 },
      { t: c, i: 12, x: 1.5, y: -0.4 },
    ]);
    strokeAt(doc, "plus-v", t0 + 300, [
      { t: c, i: 12, x: 1.2, y: -0.75 },
      { t: c, i: 12, x: 1.2, y: -0.05 },
    ]);
    strokeAt(doc, "o", t0 + 6300, [
      { t: c, i: 12, x: 2.2, y: -0.7 },
      { t: c, i: 12, x: 2.6, y: -0.1 },
      { t: c, i: 12, x: 2.2, y: -0.7 },
    ]);
    strokeAt(doc, "x", t0 + 7000, [
      { t: c, i: 12, x: 3.0, y: -0.7 },
      { t: c, i: 12, x: 3.5, y: -0.1 },
    ]);
    // Far away in the same cell and much later: a separate fragment.
    strokeAt(doc, "far", t0 + 60_000, [
      { t: c, i: 0, x: -6, y: -0.5 },
      { t: c, i: 0, x: -5.5, y: -0.4 },
    ]);
    const items = collectHandwriting(doc);
    expect(items.map((i) => i.strokeIds)).toEqual([["plus-h", "plus-v", "o", "x"], ["far"]]);
  });

  it("keeps every point and the shape of a handwritten letter across anchor changes («greg»)", () => {
    const doc = makeNoteDoc("Слово", "abcdef");
    const block = childElements(contentOf(doc)).find((e) => e.nodeName === "paragraph")!;
    const t = block.toArray().find((x): x is Y.XmlText => x instanceof Y.XmlText)!;
    // The editor's glyphs are 10 pt wide; a loop drawn in editor coordinates, each point stored
    // relative to the character under it (x in em of 17 pt).
    const fs = 17;
    const editorX = Array.from({ length: 24 }, (_, k) => 5 + 18 * Math.sin((k / 23) * Math.PI * 2) + k);
    const editorY = Array.from({ length: 24 }, (_, k) => -8 * Math.cos((k / 23) * Math.PI * 2));
    const pts = editorX.map((x, k) => {
      const i = Math.max(0, Math.min(5, Math.floor(x / 10)));
      return { t, i, x: (x - i * 10) / fs, y: editorY[k]! / fs };
    });
    strokeAt(doc, "g", 1_760_000_400_000, pts);
    const stroke = readStrokes(doc).find((s) => s.id === "g")!;
    // Our font is narrower: 8 pt per character.
    const layout: Layout = {
      glyphs: Array.from({ length: 6 }, (_, i) => ({ ch: "abcdef"[i]!, x: i * 8, w: 8, line: 0, font: "", marks: {} })),
      lines: [{ top: -20, baseline: 0, bottom: 6 }],
      fontSize: fs,
      height: 26,
      left: 0,
    };
    const [seg, ...rest] = textSegments(doc, stroke, block, layout, 0);
    expect(rest).toHaveLength(0);
    expect(seg).toHaveLength(stroke.points.length);
    // Same shape as in the editor (up to a shift): consecutive steps match within a fraction of a point.
    const steps = (xs: number[]) => xs.slice(1).map((x, k) => x - xs[k]!);
    const ours = steps(seg!.map((p) => p.x));
    const editor = steps(editorX);
    const worst = Math.max(...ours.map((d, k) => Math.abs(d - editor[k]!)));
    expect(worst).toBeLessThan(1.5);
    // The plain contract layout would jump by the advance difference at every anchor change.
    const plain = steps(textSegments(doc, stroke, block, layout, 0, false)[0]!.map((p) => p.x));
    expect(Math.max(...plain.map((d, k) => Math.abs(d - editor[k]!)))).toBeGreaterThan(1.5);
  });

  it("draws small fragments at a higher default scale", () => {
    expect(autoScale(120)).toBe(3);
    expect(autoScale(600)).toBe(2);
  });

  it("never reports a fragment without visible strokes", () => {
    const doc = makeNoteDoc("Таблица", md);
    const c1 = cellText(doc, 1, 1);
    // One point only → nothing can be drawn (D-35).
    strokeAt(doc, "dot", 1_760_000_200_000, [{ t: c1, i: 2, x: 0, y: 0 }]);
    expect(collectHandwriting(doc)).toHaveLength(0);
  });
});
