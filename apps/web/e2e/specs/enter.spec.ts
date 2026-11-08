import { expect, test } from "@playwright/test";
import { expectSynced, signUp, uniqueEmail } from "./helpers";

// Bug 2026-11-05: Enter at the end of a paragraph did nothing (the editor made an empty title that
// the title repair deleted). Shared-space notes: shared-spaces.spec.ts.
test("Enter at the end of a paragraph makes a new paragraph, and the note syncs", async ({ page }) => {
  await signUp(page, uniqueEmail("enter"));
  await page.getByTestId("new-doc").click();
  await page.waitForURL(/\/doc\//);
  await expect(page.locator(".ds-prose")).toBeVisible();
  await page.keyboard.type("Абзацы");
  await page.keyboard.press("Enter");
  await page.keyboard.type("первый");
  await page.keyboard.press("Enter");
  await page.keyboard.type("второй");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("после пустого");
  const paras = page.locator(".ds-prose p");
  await expect(paras).toHaveText(["первый", "второй", "", "после пустого"]);
  await expect(page.locator(".ds-prose .ds-title")).toHaveCount(1);
  await expectSynced(page);
  // After a reload (from the device's copy) the paragraphs are still there.
  await page.reload();
  await expect(page.locator(".ds-prose p")).toHaveText(["первый", "второй", "", "после пустого"], { timeout: 20_000 });
});
