import { expect, test, type Page } from "@playwright/test";
import { expectSynced, newDoc, signUp, uniqueEmail } from "./helpers";

// spec/08 «История версий» (D-54): who changed it, this version against the previous one, restore.

async function leaveForSnapshot(page: Page) {
  // A version is saved when leaving a document after many own edits.
  await page.getByTestId("close-tab").click();
  await expectSynced(page);
}

async function openHistory(page: Page) {
  await page.getByRole("button", { name: "Ещё", exact: true }).click();
  await page.getByRole("menuitem", { name: "История версий" }).click();
}

test("history: authors, changes against the previous version, restore", async ({ page }) => {
  await signUp(page, uniqueEmail("history"));
  await newDoc(page, "История", "Первая версия этого текста, довольно длинная строка");
  await expectSynced(page);
  const url = page.url();
  await leaveForSnapshot(page);

  await page.goto(url);
  await page.locator(".ds-prose p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" и вторая правка, тоже достаточно длинная");
  await expectSynced(page);
  await leaveForSnapshot(page);

  await page.goto(url);
  await openHistory(page);
  const versions = page.getByRole("dialog").getByTestId("version-authors");
  await expect(versions).toHaveCount(2, { timeout: 20_000 });
  await expect(versions.first()).toHaveText("Вы");
  await versions.first().click();
  await page.getByTestId("history-changes").click();
  const diff = page.getByTestId("version-diff");
  await expect(diff.locator("ins")).toContainText("вторая правка");
  await expect(diff.locator("del")).toHaveCount(0);
  await expect(diff).toContainText("Первая версия");

  // Restore the first version: the second edit is gone.
  await versions.last().click();
  await page.getByRole("button", { name: "Восстановить эту версию" }).click();
  await expect(page.getByText("Версия восстановлена").first()).toBeVisible();
  await expect(page.locator(".ds-prose")).not.toContainText("вторая правка");
  await expect(page.locator(".ds-prose")).toContainText("Первая версия этого текста");
});
