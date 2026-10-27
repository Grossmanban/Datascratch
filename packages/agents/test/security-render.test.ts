/**
 * Exploit-style regressions from the security audit of 2026-10-27: handwriting
 * images must never allocate unbounded canvases or decode huge pictures.
 */
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { collectHandwriting } from "../src/doc/handwriting.js";
import { contentOf } from "../src/doc/model.js";
import { imagePixels, MAX_PIXELS, renderHandwriting } from "../src/render/handwriting-png.js";
import { addBlockStroke, blockIdAt, makeNoteDoc } from "../src/testing/fixtures.js";

function rawNote(text: string): Y.Doc {
  const doc = new Y.Doc();
  const title = new Y.XmlElement("title");
  title.setAttribute("blockId", "0192f3c4-0000-7000-8000-000000000001");
  const p = new Y.XmlElement("paragraph");
  p.setAttribute("blockId", "0192f3c4-0000-7000-8000-000000000002");
  contentOf(doc).insert(0, [title, p]);
  const t = new Y.XmlText();
  p.insert(0, [t]);
  t.insert(0, text);
  return doc;
}

describe("handwriting PNG size is bounded", () => {
  const area = (png: Buffer) => {
    const img = PNG.sync.read(png);
    return img.width * img.height;
  };

  it("a margin note on a 200 000-character block at scale 4 (was ~2560×125800 px)", async () => {
    const doc = rawNote("слово ".repeat(33_000));
    const id = blockIdAt(doc, 0);
    addBlockStroke(doc, id, "block", [
      [0.1, 0.1],
      [0.2, 0.15],
      [0.3, 0.1],
    ]);
    const [item] = collectHandwriting(doc);
    const t0 = performance.now();
    const img = await renderHandwriting(doc, item!, { scale: 4 });
    expect(performance.now() - t0).toBeLessThan(5000);
    expect(img.width * img.height).toBeLessThanOrEqual(MAX_PIXELS);
    expect(area(img.png)).toBe(img.width * img.height);
  });

  it("strokes far apart on a drawing and a huge drawing height", async () => {
    const doc = makeNoteDoc("Рисунок", "Текст");
    const drawing = new Y.XmlElement("drawing");
    drawing.setAttribute("blockId", "0192f3c4-0000-7000-8000-00000000d001");
    drawing.setAttribute("height", 10_000_000 as never);
    contentOf(doc).insert(2, [drawing]);
    addBlockStroke(doc, "0192f3c4-0000-7000-8000-00000000d001", "drawing", [
      [0.1, 0.1],
      [0.2, 0.2],
      [0.9, 5000],
      [0.95, 5000.1],
    ]);
    const item = collectHandwriting(doc).find((i) => i.kind === "drawing")!;
    const img = await renderHandwriting(doc, item, { scale: 4 });
    expect(img.width * img.height).toBeLessThanOrEqual(MAX_PIXELS);
  });

  it("does not decode pictures larger than the pixel cap (reads the header only)", () => {
    const header = new Uint8Array(33);
    header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const dv = new DataView(header.buffer);
    dv.setUint32(16, 30_000);
    dv.setUint32(20, 30_000);
    expect(imagePixels(header)).toBe(900_000_000);
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x75, 0x30, 0x75, 0x30, 0x03]);
    expect(imagePixels(jpeg)).toBe(30_000 * 30_000);
  });
});
