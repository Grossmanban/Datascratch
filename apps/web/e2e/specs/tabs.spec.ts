import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("many tabs: the strip folds into «+N», the overview opens, closes tabs and brings them back (§12.6)", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await signUp(page, uniqueEmail("tabs"));
  for (let i = 1; i <= 9; i++) await newDoc(page, `Вкладка ${i}`);
  const strip = page.getByTestId("tab-strip");
  await expect(strip.getByTestId("tab").filter({ hasText: "Вкладка 9" })).toHaveAttribute("data-active", "true");
  // Not all fit: a «+N» pill, and the active tab is still in the strip.
  const more = strip.getByTestId("tab-more");
  await expect(more).toBeVisible();
  const shown = await strip.getByTestId("tab").count();
  await expect(more).toHaveText(`+${9 - shown}`);

  // «+N» opens the overview with every tab; search narrows it.
  await more.click();
  const overview = page.getByTestId("tab-overview");
  await expect(overview.getByTestId("tab-card")).toHaveCount(9);
  await overview.getByRole("textbox").fill("Вкладка 3");
  await expect(overview.getByTestId("tab-card")).toHaveCount(1);
  await overview.getByRole("textbox").fill("");

  // Close one from the overview; it goes to «Недавно закрытые» and comes back from there.
  const card = overview.getByTestId("tab-card").filter({ hasText: "Вкладка 2" });
  await card.hover();
  await card.getByTestId("tab-card-close").click();
  await expect(overview.getByTestId("tab-card")).toHaveCount(8);
  const recent = overview.getByTestId("tab-recently-closed");
  await expect(recent).toContainText("Вкладка 2");
  await recent.getByRole("button", { name: /Вкладка 2/ }).click();
  await expect(overview).toBeHidden();
  await expect(page.locator(".ds-prose")).toContainText("Вкладка 2");
  await expect(strip.getByTestId("tab").filter({ hasText: "Вкладка 2" })).toHaveAttribute("data-active", "true");

  // Pin a tab: it moves to the left, compact, and survives «Закрыть остальные».
  await strip.getByTestId("tab").filter({ hasText: "Вкладка 1" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Закрепить вкладку" }).click();
  const pinned = strip.locator('[data-testid=tab][data-pinned=true]');
  await expect(pinned).toHaveCount(1);
  await expect(pinned.getByRole("link")).toHaveAttribute("aria-label", /Вкладка 1/);

  // ⌘⇧\ opens it too; «Закрыть остальные» leaves the active tab and the pinned one.
  await page.keyboard.press("ControlOrMeta+Shift+Backslash");
  await expect(overview).toBeVisible();
  await overview.getByTestId("tab-close-others").click();
  await expect(overview.getByTestId("tab-card")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(strip.getByTestId("tab")).toHaveCount(2);
  await expect(pinned).toHaveCount(1);
  await expect(strip.getByTestId("tab-more")).toHaveCount(0);

  // Closing the active tab from the strip moves to the pinned one, the only tab left.
  await strip.getByTestId("tab-close").click();
  await expect(page.locator(".ds-prose")).toContainText("Вкладка 1");
  await expect(strip.getByTestId("tab")).toHaveCount(1);
});
