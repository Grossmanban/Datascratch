import { expect, test, type Page } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

const COUNT = 10_000;

/** Writes COUNT NoteMeta records into the first notebook's index in one transaction. */
async function seedNotes(page: Page, count: number) {
  return page.evaluate((count) => {
    type YMap = { set(k: string, v: unknown): void; get(k: string): unknown; constructor: new () => YMap; size: number; values(): IterableIterator<YMap> };
    type YDoc = { getMap(name: string): YMap; transact(fn: () => void): void };
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, YDoc>; rows: Map<string, { kind: string }> } } }).__ds;
    const [, nb] = [...rt.store.docs].find(([id]) => rt.store.rows.get(id)?.kind === "notebook")!;
    const notes = nb.getMap("notes");
    const sample = notes.values().next().value as YMap;
    const wrappedKey = sample.get("wrappedKey");
    const base = Date.parse("2026-01-01T00:00:00Z");
    const t0 = performance.now();
    nb.transact(() => {
      for (let i = 0; i < count; i++) {
        const id = `01a00000-0000-7000-8000-${String(i).padStart(12, "0")}`;
        const m = new sample.constructor();
        notes.set(id, m);
        const at = new Date(base + i * 60_000).toISOString();
        for (const [k, v] of Object.entries({
          id, folderId: null, parentNoteId: null, title: `Заметка ${i}`, kind: "note", dailyDate: null,
          tags: i % 10 === 0 ? ["perf"] : [], icon: null, coverThumb: null, wrappedKey, createdAt: at, updatedAt: at, trashedAt: null, order: i,
        })) m.set(k, v);
      }
    });
    return performance.now() - t0;
  }, count);
}

/** Time until `fn` is true, polled every animation frame. */
function untilFrame(page: Page, fn: string) {
  return page.evaluate((src) => new Promise<number>((resolve) => {
    const t0 = performance.now();
    const check = new Function(`return (${src})`) as () => boolean;
    const tick = () => (check() ? resolve(performance.now() - t0) : requestAnimationFrame(tick));
    tick();
  }), fn);
}

test("lists stay fast with 10 000 notes", async ({ page }) => {
  // Client rendering only; seeded notes are not registered on a real server.
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only");
  test.setTimeout(180_000);
  await signUp(page, uniqueEmail("perf"));
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);

  const seedMs = await seedNotes(page, COUNT);
  const renderMs = await untilFrame(page, `[...document.querySelectorAll('[data-testid=doc-card] h3')].some((h) => h.textContent === 'Заметка ${COUNT - 1}')`);
  const cards = await page.getByTestId("doc-card").count();

  await page.waitForTimeout(3000); // let background indexing / sync attach settle
  // Editing one note's title must not re-render the whole collection slowly.
  const editMs = await page.evaluate(() => {
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, { getMap(n: string): { get(k: string): { set(k: string, v: unknown): void } } }>; rows: Map<string, { kind: string }> } } }).__ds;
    const [, nb] = [...rt.store.docs].find(([id]) => rt.store.rows.get(id)?.kind === "notebook")!;
    const t0 = performance.now();
    nb.getMap("notes").get("01a00000-0000-7000-8000-000000009999").set("title", "Переименована");
    return new Promise<number>((resolve) => {
      const tick = () => (document.body.textContent?.includes("Переименована") ? resolve(performance.now() - t0) : requestAnimationFrame(tick));
      tick();
    });
  });

  // Scroll to the end: the oldest note must show up.
  const scrollMs = await page.evaluate(() => {
    const scroller = document.querySelector("[data-testid=doc-grid]")!.closest(".overflow-y-auto")!;
    const t0 = performance.now();
    scroller.scrollTop = scroller.scrollHeight;
    return new Promise<number>((resolve) => {
      const tick = () => {
        scroller.scrollTop = scroller.scrollHeight;
        return Array.from(document.querySelectorAll("[data-testid=doc-card] h3")).some((h) => h.textContent === "Заметка 0") ? resolve(performance.now() - t0) : requestAnimationFrame(tick);
      };
      tick();
    });
  });

  // List view.
  await page.getByRole("radio", { name: /Список|List/ }).click();
  const listMs = await untilFrame(page, `document.querySelectorAll('[data-testid=doc-row]').length > 5`);
  const rows = await page.getByTestId("doc-row").count();
  await page.getByRole("radio", { name: /Сетка|Grid/ }).click();

  // Cold start: reload with 10 000 notes stored on the device.
  const t0 = Date.now();
  await page.reload();
  await expect(page.getByTestId("doc-card").filter({ hasText: "Заметка 9998" })).toBeVisible({ timeout: 30_000 });
  const coldMs = Date.now() - t0;

  console.log(`perf: list ${listMs.toFixed(0)} ms (${rows} rows), cold start ${coldMs} ms`);
  console.log(`perf: seed ${seedMs.toFixed(0)} ms, first render ${renderMs.toFixed(0)} ms, cards in DOM ${cards}, edit ${editMs.toFixed(0)} ms, scroll to end ${scrollMs.toFixed(0)} ms`);
  expect(cards).toBeLessThan(300);
  expect(renderMs).toBeLessThan(3000);
  expect(editMs).toBeLessThan(250);
  expect(scrollMs).toBeLessThan(1500);
  expect(rows).toBeLessThan(300);
  expect(coldMs).toBeLessThan(15_000);
});
