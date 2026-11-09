import { expect, test, type Page } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

// Mobile web check (2026-11-08): at 360 px the pen palette touched the screen edges and its ⋯ / ⌄
// buttons (and the palette toggle) were 32 px targets. Now: a margin from the edges, and every one of
// them takes a 44 × 44 px touch target of its own (they still look small).

/** The element a tap at (x, y) lands on is `target` or inside it. */
const hits = (page: Page, testId: string, x: number, y: number) =>
  page.evaluate(
    ([id, x, y]) => {
      const t = document.querySelector(`[data-testid="${id}"]`);
      const e = document.elementFromPoint(x as number, y as number);
      return !!t && !!e && (t === e || t.contains(e));
    },
    [testId, x, y] as const,
  );

async function targetIs44(page: Page, testId: string) {
  const b = (await page.getByTestId(testId).boundingBox())!;
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  // 21 px from the centre in each direction is still the button: a 42+ px square, i.e. ≥ 44 px with the edge pixels.
  for (const [dx, dy] of [[-21, 0], [21, 0], [0, -21], [0, 21], [-21, -21], [21, 21]] as const) {
    expect(await hits(page, testId, cx + dx, cy + dy), `${testId} at ${dx},${dy}`).toBe(true);
  }
}

for (const width of [360, 390]) {
  test(`pen palette at ${width} px: off the screen edges, 44 px touch targets`, async ({ browser }) => {
    // A phone browser: touch, overlay scrollbars (a desktop scrollbar would cover the screen edge).
    const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 1360, height: 860 }, locale: "ru-RU" });
    const page = await context.newPage();
    await signUp(page, uniqueEmail(`palette${width}`));
    await newDoc(page, "Палитра", "Текст");
    // A phone: the note open, the palette docked at the bottom.
    await page.setViewportSize({ width, height: 760 });
    const palette = page.locator(".ds-palette [role=toolbar]");
    await expect(palette).toBeVisible();
    const box = (await palette.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(12);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 12);
    // The phone's «Диктовать» stands above the palette in the same corner, not over its ⌄.
    // (A CI server has no voice keys: `available: false` hides the button altogether.)
    const paletteTop = box.y;
    if (process.env.E2E_SERVER_URL) await expect(page.getByTestId("mic-button")).toHaveCount(0);
    else
      await expect
        .poll(async () => {
          const m = await page.getByTestId("mic-button").boundingBox();
          return m ? m.y + m.height <= paletteTop : false;
        })
        .toBe(true);
    // The small buttons look 32 px but take 44 px.
    expect((await page.getByTestId("tool-more").boundingBox())!.width).toBeLessThanOrEqual(34);
    await targetIs44(page, "tool-more");
    await targetIs44(page, "tool-collapse");
    // The toggle sits where notifications appear: wait out the sign-up ones (a toast covers anything).
    await expect(page.locator("li.glass")).toHaveCount(0, { timeout: 10_000 });
    await targetIs44(page, "pen-palette-toggle");
    // They still work.
    await page.getByTestId("tool-more").click();
    await expect(page.getByTestId("tool-finger")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("tool-collapse").click();
    await expect(page.locator(".ds-palette [role=toolbar]")).toHaveCount(0);
    await context.close();
  });
}
