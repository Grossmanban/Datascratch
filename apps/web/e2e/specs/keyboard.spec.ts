import { expect, test } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

test("a document can be reached and opened with the keyboard alone, with a visible focus ring", async ({ page }) => {
  await signUp(page, uniqueEmail("kbd"));
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  let onCard = false;
  for (let i = 0; i < 60 && !onCard; i++) {
    await page.keyboard.press("Tab");
    onCard = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "doc-card");
    // Every stop shows where focus is.
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return true;
      const cs = getComputedStyle(el);
      return (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
    });
    expect(ring, `focus ring on ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120))}`).toBe(true);
  }
  expect(onCard).toBe(true);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/doc/**");
  await expect(page.locator(".ds-prose")).toBeVisible();

  // ⌘K / Ctrl+K opens the palette; Escape closes it and focus returns to the page.
  await page.keyboard.press("Control+k");
  await expect(page.getByTestId("palette-input")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("palette-input")).toBeHidden();
});
