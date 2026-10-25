/**
 * Reference images for the handwriting renderer. Images are compared with a
 * small tolerance (anti-aliasing differs slightly between CPUs).
 * Update after an intended change: UPDATE_PNG=1 pnpm test
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { applyEdits } from "../src/doc/edits.js";
import { collectHandwriting } from "../src/doc/handwriting.js";
import { findBlock } from "../src/doc/model.js";
import { renderHandwriting, pressureCurve } from "../src/render/handwriting-png.js";
import { addBlockStroke, addTextStroke, blockIdAt, makeNoteDoc } from "../src/testing/fixtures.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "__images__");

function compare(name: string, png: Buffer): void {
  const file = join(DIR, `${name}.png`);
  if (process.env.UPDATE_PNG || !existsSync(file)) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, png);
    if (!process.env.UPDATE_PNG && process.env.CI) throw new Error(`missing reference image ${name}.png`);
    return;
  }
  const a = PNG.sync.read(readFileSync(file));
  const b = PNG.sync.read(png);
  expect([b.width, b.height]).toEqual([a.width, a.height]);
  const diff = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.2 });
  expect(diff / (a.width * a.height)).toBeLessThan(0.005);
}

const TEXT =
  "Встреча с командой в четверг. Нужно обсудить сроки запуска и бюджет на дизайн, а также решить, кто отвечает за тестирование на iPad. Это очень важная часть плана, без неё дальше идти нельзя.";

describe("handwriting PNG", () => {
  it("uses the shared pressure curve", () => {
    expect(pressureCurve(0)).toBeCloseTo(0.35);
    expect(pressureCurve(1)).toBeCloseTo(1);
  });

  it("underline and circle on text", async () => {
    const doc = makeNoteDoc("Тест", TEXT);
    const p = blockIdAt(doc, 0);
    addTextStroke(doc, { id: "s1", blockId: p, start: 45, end: 58, hint: "underline", createdAt: 1 });
    addTextStroke(doc, { id: "s2", blockId: p, start: 61, end: 67, hint: "circle", color: "ink.red", createdAt: 2 });
    const [item] = collectHandwriting(doc);
    expect(item!.description).toBe("подчёркнуто от руки: «сроки запуска»; обведено от руки: «бюджет»");
    compare("text-underline-circle", (await renderHandwriting(doc, item!)).png);
  });

  it("highlighter under text and a stroke split across lines", async () => {
    const doc = makeNoteDoc("Тест", TEXT);
    const p = blockIdAt(doc, 0);
    addTextStroke(doc, { id: "s3", blockId: p, start: 101, end: 136, hint: "underline", color: "ink.green", createdAt: 1 });
    addTextStroke(doc, { id: "s4", blockId: p, start: 140, end: 158, hint: "highlight", createdAt: 2 });
    const items = collectHandwriting(doc);
    expect(items).toHaveLength(1);
    compare("text-highlight-multiline", (await renderHandwriting(doc, items[0]!)).png);
  });

  it("skips points on deleted text (D-35)", async () => {
    const doc = makeNoteDoc("Тест", "Подчёркнута вся фраза целиком.");
    const p = blockIdAt(doc, 0);
    addTextStroke(doc, { id: "s5", blockId: p, start: 0, end: 29, hint: "underline", createdAt: 1 });
    applyEdits(doc, [{ op: "replace_text", blockId: p, find: " вся фраза", replace: "" }], { agentEdit: null });
    const [item] = collectHandwriting(doc);
    expect(item!.description).toBe("подчёркнуто от руки: «Подчёркнута целиком»");
    compare("text-deleted-anchors", (await renderHandwriting(doc, item!)).png);
    applyEdits(doc, [{ op: "delete", blockId: p }], { agentEdit: null });
    expect(collectHandwriting(doc)).toHaveLength(0);
  });

  it("margin note and drawing block", async () => {
    const doc = makeNoteDoc("Тест", "Короткий абзац с заметкой на полях.\n\nТекст.");
    const p = blockIdAt(doc, 0);
    addBlockStroke(doc, p, "block", [[0.78, 0.02], [0.82, 0.0], [0.9, 0.01], [0.95, 0.05], [0.9, 0.08], [0.8, 0.07]], "m1");
    doc.transact(() => {
      const el = new Y.XmlElement("drawing");
      const root = doc.getXmlFragment("content");
      root.insert(root.length, [el]);
      el.setAttribute("blockId", "0192f3c4-0000-7000-8000-00000000d0d0");
      el.setAttribute("height", 160);
    });
    const spiral: [number, number][] = Array.from({ length: 60 }, (_, i) => [0.5 + 0.004 * i * Math.cos(i / 4), 0.13 + 0.004 * i * Math.sin(i / 4)]);
    addBlockStroke(doc, "0192f3c4-0000-7000-8000-00000000d0d0", "drawing", spiral, "d1");
    const items = collectHandwriting(doc);
    expect(items.map((i) => i.description)).toEqual(["заметка от руки на полях: «Короткий абзац с заметкой на полях.»", "рисунок от руки"]);
    expect(findBlock(doc, "0192f3c4-0000-7000-8000-00000000d0d0")).not.toBeNull();
    compare("margin-note", (await renderHandwriting(doc, items[0]!)).png);
    compare("drawing", (await renderHandwriting(doc, items[1]!)).png);
  });
});
