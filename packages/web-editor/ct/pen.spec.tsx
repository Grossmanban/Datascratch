import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { TestEditor } from "./TestEditor";

const TEXT =
  "<h1 data-type=title>Перо</h1><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Second paragraph with more words to reflow when the column gets narrower.</p>";

/** Client rect of the n-th occurrence of `word` in the editor text. */
async function wordRect(page: Page, word: string) {
  return page.evaluate((w) => {
    const root = document.querySelector(".ds-prose")!;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.textContent!.indexOf(w);
      if (i >= 0) {
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + w.length);
        const rects = [...r.getClientRects()].map((x) => ({ left: x.left, right: x.right, top: x.top, bottom: x.bottom }));
        return { rects, box: (({ left, right, top, bottom }) => ({ left, right, top, bottom }))(r.getBoundingClientRect()) };
      }
    }
    throw new Error("word not found " + w);
  }, word);
}

async function ready(page: Page) {
  await page.waitForFunction(() => window.__ct?.ready === true);
  await page.evaluate(() => document.fonts.ready);
}

async function drawLine(page: Page, x1: number, y1: number, x2: number, y2: number, steps = 24) {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps);
  await page.mouse.up();
}

/** Drawn segments of all strokes, in client coordinates. */
async function segments(page: Page) {
  return page.evaluate(() => {
    const api = window.__ct!.api;
    const root = api.pen.root.getBoundingClientRect();
    const all = api.pen.debugSegments();
    return Object.values(all).map((segs) => segs.map((seg) => seg.map((p) => ({ x: p.x + root.left, y: p.y + root.top }))));
  });
}

async function strokeCount(page: Page) {
  return page.evaluate(() => window.__ct!.doc.getMap("strokes").size);
}

test("a stroke drawn over text is bound to its characters", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TEXT} />);
  await ready(page);
  const { box } = await wordRect(page, "consectetur");
  await drawLine(page, box.left, box.bottom + 2, box.right, box.bottom + 2);
  await expect.poll(() => strokeCount(page)).toBe(1);
  const stroke = await page.evaluate(() => {
    const m = [...window.__ct!.doc.getMap<any>("strokes").values()][0];
    return { kind: m.get("anchorKind"), anchors: m.get("anchors").length, hint: m.get("hint"), bytes: m.get("points").byteLength };
  });
  expect(stroke.kind).toBe("text");
  expect(stroke.anchors).toBeGreaterThan(3);
  expect(stroke.hint).toBe("underline");
  expect(stroke.bytes % 32).toBe(0);
  const segs = await segments(page);
  expect(segs[0]).toHaveLength(1);
  const first = segs[0]![0]![0]!;
  expect(Math.abs(first.x - box.left)).toBeLessThan(4);
  expect(Math.abs(first.y - (box.bottom + 2))).toBeLessThan(4);
  // The ink is really on the canvas.
  const painted = await page.evaluate(({ x, y }) => {
    const c = document.querySelector<HTMLCanvasElement>(".ds-pen-over")!;
    const r = c.getBoundingClientRect();
    const dpr = c.width / r.width;
    const d = c.getContext("2d")!.getImageData(Math.round((x - r.left) * dpr) - 3, Math.round((y - r.top) * dpr) - 3, 7, 7).data;
    let alpha = 0;
    for (let i = 3; i < d.length; i += 4) alpha = Math.max(alpha, d[i]!);
    return alpha;
  }, { x: (box.left + box.right) / 2, y: box.bottom + 2 });
  expect(painted).toBeGreaterThan(100);
});

test("strokes follow the text when the column width changes and break across lines", async ({ mount, page }) => {
  const component = await mount(<TestEditor width={900} html={TEXT} />);
  await ready(page);
  const phrase = "magna aliqua";
  const before = await wordRect(page, phrase);
  expect(before.rects).toHaveLength(1);
  await drawLine(page, before.box.left, before.box.bottom + 2, before.box.right, before.box.bottom + 2);
  await expect.poll(() => strokeCount(page)).toBe(1);

  // Narrow until the phrase wraps onto two lines.
  let after = before;
  for (let width = 840; width >= 300; width -= 9) {
    await component.update(<TestEditor width={width} html={TEXT} />);
    await page.waitForTimeout(50);
    after = await wordRect(page, phrase);
    if (after.rects.length > 1) break;
  }
  expect(after.rects.length).toBeGreaterThan(1);
  await page.waitForTimeout(100);
  const segs = (await segments(page))[0]!;
  expect(segs.length).toBeGreaterThanOrEqual(2);
  // First segment starts under the first glyph of the phrase on its new line; the last ends under the wrapped part.
  const firstRect = after.rects[0]!;
  const lastRect = after.rects[after.rects.length - 1]!;
  expect(Math.abs(segs[0]![0]!.x - firstRect.left)).toBeLessThan(4);
  expect(Math.abs(segs[0]![0]!.y - (firstRect.bottom + 2))).toBeLessThan(5);
  const tail = segs[segs.length - 1]!;
  expect(Math.abs(tail[tail.length - 1]!.y - (lastRect.bottom + 2))).toBeLessThan(5);
  expect(tail[tail.length - 1]!.x).toBeLessThanOrEqual(lastRect.right + 4);
});

test("D-35: the mark disappears with its text and comes back on undo", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TEXT} />);
  await ready(page);
  const { box } = await wordRect(page, "tempor");
  await drawLine(page, box.left, (box.top + box.bottom) / 2, box.right, (box.top + box.bottom) / 2);
  await expect.poll(() => strokeCount(page)).toBe(1);
  expect((await segments(page))[0]!.length).toBe(1);
  await page.evaluate(() => {
    const { editor } = window.__ct!.api;
    const text = editor.state.doc.textContent;
    let from = -1;
    editor.state.doc.descendants((n, pos) => {
      if (from < 0 && n.isText && n.text!.includes("tempor ")) from = pos + n.text!.indexOf("tempor ");
    });
    editor.chain().deleteRange({ from, to: from + "tempor ".length }).run();
    return text;
  });
  await expect.poll(async () => (await segments(page))[0]!.length).toBe(0);
  expect(await strokeCount(page)).toBe(1); // not deleted from the document
  await page.evaluate(() => window.__ct!.api.undoManager.undo());
  await expect.poll(async () => (await segments(page))[0]!.length).toBe(1);
});

test("strokes are undoable and the stroke eraser removes them", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TEXT} />);
  await ready(page);
  const { box } = await wordRect(page, "Second");
  const y = box.bottom + 2;
  await drawLine(page, box.left, y, box.right, y);
  await expect.poll(() => strokeCount(page)).toBe(1);
  await page.evaluate(() => window.__ct!.api.undoManager.undo());
  await expect.poll(() => strokeCount(page)).toBe(0);
  await page.evaluate(() => window.__ct!.api.undoManager.redo());
  await expect.poll(() => strokeCount(page)).toBe(1);
  await page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: "eraser", eraserMode: "stroke" }));
  await drawLine(page, (box.left + box.right) / 2, y - 15, (box.left + box.right) / 2, y + 15, 8);
  await expect.poll(() => strokeCount(page)).toBe(0);
});

test("pixel eraser splits a stroke into pieces", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TEXT} />);
  await ready(page);
  const { box } = await wordRect(page, "paragraph with more");
  const y = box.bottom + 2;
  await drawLine(page, box.left, y, box.right, y, 40);
  await expect.poll(() => strokeCount(page)).toBe(1);
  await page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: "eraser", eraserMode: "pixel", eraserSize: 8 }));
  await drawLine(page, (box.left + box.right) / 2, y - 12, (box.left + box.right) / 2, y + 12, 8);
  await expect.poll(() => strokeCount(page)).toBe(2);
});

test("drawing block keeps strokes in block coordinates", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TEXT + '<div data-type="drawing" data-height="300"></div><p>after</p>'} />);
  await ready(page);
  const r = await page.locator(".ds-drawing").boundingBox();
  expect(r).not.toBeNull();
  await drawLine(page, r!.x + 20, r!.y + 20, r!.x + r!.width / 2, r!.y + 120);
  await expect.poll(() => strokeCount(page)).toBe(1);
  const s = await page.evaluate(() => {
    const m = [...window.__ct!.doc.getMap<any>("strokes").values()][0];
    return { kind: m.get("anchorKind"), blockId: m.get("blockId") };
  });
  expect(s.kind).toBe("drawing");
  expect(s.blockId).toMatch(/^[0-9a-f-]{36}$/);
});
