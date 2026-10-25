import { expect, test, type Page } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

type StrokeRow = { anchorKind: unknown; points: number };

/** Strokes of the open note, read from its live Y.Doc (strokes.md). */
async function strokesOf(page: Page, noteId: string): Promise<StrokeRow[]> {
  return page.evaluate((id) => {
    type YMap = { get(k: string): unknown; forEach(f: (v: YMap) => void): void; size: number };
    const rt = (window as unknown as { __ds?: { store: { docs: Map<string, { getMap(n: string): YMap }> } } }).__ds;
    const doc = rt?.store.docs.get(id);
    if (!doc) return [];
    const rows: StrokeRow[] = [];
    doc.getMap("strokes").forEach((s) => {
      const pts = s.get("points") as { length?: number; byteLength?: number } | undefined;
      rows.push({ anchorKind: s.get("anchorKind"), points: pts?.length ?? pts?.byteLength ?? 0 });
    });
    return rows;
  }, noteId);
}

/** Draw one stylus stroke well below the last paragraph (> 3 em from any text line). */
async function drawBelowText(page: Page) {
  const ok = await page.evaluate(() => {
    const prose = document.querySelector(".ds-prose")!;
    const root = document.querySelector(".ds-editor-root")!;
    const last = prose.lastElementChild!.getBoundingClientRect();
    const col = prose.getBoundingClientRect();
    const y0 = last.bottom + 140;
    const x0 = col.left + col.width * 0.2;
    const target = document.elementFromPoint(x0, y0);
    if (!target || !root.contains(target)) return `no drawing room at ${x0},${y0}: ${target?.className}`;
    const ev = (type: string, i: number) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 7,
        pointerType: "pen",
        isPrimary: true,
        pressure: type === "pointerup" ? 0 : 0.6,
        button: type === "pointermove" ? -1 : 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x0 + i * 8,
        clientY: y0 + Math.sin(i / 3) * 30,
      });
    target.dispatchEvent(ev("pointerdown", 0));
    for (let i = 1; i <= 30; i++) target.dispatchEvent(ev("pointermove", i));
    target.dispatchEvent(ev("pointerup", 30));
    return "ok";
  });
  expect(ok).toBe("ok");
}

test("a drawing below the end of a note survives a reload and reaches another device", async ({ page, browser }) => {
  const email = uniqueEmail("pen");
  await signUp(page, email);
  await newDoc(page, "Рисунок под текстом", "Одна строка текста.");
  const noteId = page.url().split("/doc/")[1]!.split(/[?#]/)[0]!;
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);

  await drawBelowText(page);
  // strokes.md §4: far from every text line → a free drawing of the nearest paragraph, never dropped.
  await expect.poll(() => strokesOf(page, noteId)).toEqual([{ anchorKind: "block", points: expect.any(Number) }]);
  expect((await strokesOf(page, noteId))[0]!.points).toBeGreaterThan(0);
  await expectSynced(page);

  await page.reload();
  await expect(page.locator(".ds-prose")).toContainText("Одна строка текста.");
  await expect.poll(() => strokesOf(page, noteId), { timeout: 15_000 }).toHaveLength(1);
  expect((await strokesOf(page, noteId))[0]!.anchorKind).toBe("block");

  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto(`/doc/${noteId}`);
  await expect(q.locator(".ds-prose")).toContainText("Одна строка текста.", { timeout: 20_000 });
  await expect.poll(() => strokesOf(q, noteId), { timeout: 20_000 }).toHaveLength(1);
  expect((await strokesOf(q, noteId))[0]!.anchorKind).toBe("block");
  await other.close();
});
