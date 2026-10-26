import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("the pen palette folds into a round button with the current tool, and stays folded", async ({ page }) => {
  await signUp(page, uniqueEmail("palette"));
  await newDoc(page, "Палитра", "Текст");
  const palette = page.locator(".ds-palette");
  const toggle = page.getByTestId("pen-palette-toggle");
  await expect(palette).toBeVisible();
  await expect(toggle).toHaveAttribute("data-state", "open");

  await toggle.click();
  await expect(palette).toHaveCount(0);
  await expect(toggle).toHaveAttribute("data-state", "collapsed");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  // Shows the current tool (the editor's default is the pen).
  await expect(toggle).toHaveAccessibleName(/ручка/);

  // Remembered across a reload and other documents.
  await page.reload();
  await expect(page.locator(".ds-prose")).toContainText("Текст");
  await expect(page.getByTestId("pen-palette-toggle")).toHaveAttribute("data-state", "collapsed");
  await expect(palette).toHaveCount(0);

  await page.getByTestId("pen-palette-toggle").click();
  await expect(palette).toBeVisible();
  await expect(page.getByTestId("pen-palette-toggle")).toHaveAttribute("data-state", "open");
});
