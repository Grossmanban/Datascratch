import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("long sidebar sections stay calm: «Ещё N», the open notebook stays visible, sections fold per space (§12.6)", async ({ page }) => {
  await signUp(page, uniqueEmail("sidebar"));
  const sidebar = page.getByTestId("sidebar");
  // 1 default notebook + 8 new ones = 9: seven rows and «Ещё 2».
  for (let i = 1; i <= 8; i++) {
    await sidebar.getByRole("button", { name: "Новый блокнот" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").first().fill(`Блокнот ${i}`);
    await dialog.locator("button[type=submit]").click();
    await expect(dialog).toBeHidden();
  }
  const more = sidebar.getByTestId("notebooks-more");
  await expect(more).toHaveText(/Ещё 2/);
  await expect(sidebar.getByRole("link", { name: "Блокнот 8" })).toHaveCount(0);

  // «Ещё» unfolds in place and ends with «Свернуть».
  await more.click();
  await expect(sidebar.getByRole("link", { name: "Блокнот 8" })).toBeVisible();
  await sidebar.getByRole("link", { name: "Блокнот 8" }).click();
  await expect(page).toHaveURL(/\/notebook\//);
  await expect(more).toHaveText(/Свернуть/);
  await more.click();
  // The open notebook stays visible while the rest is folded.
  await expect(sidebar.getByRole("link", { name: "Блокнот 8" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Блокнот 7" })).toHaveCount(0);
  await expect(more).toHaveText(/Ещё 1/);

  // A section folds from its header and stays folded after a reload.
  await sidebar.getByRole("button", { name: "Блокноты", exact: true }).click();
  await expect(sidebar.getByRole("link", { name: "Заметки" })).toHaveCount(0);
  await page.reload();
  await expect(sidebar.getByRole("button", { name: "Блокноты", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar.getByRole("link", { name: "Заметки" })).toHaveCount(0);
  await sidebar.getByRole("button", { name: "Блокноты", exact: true }).click();
  await expect(sidebar.getByRole("link", { name: "Заметки" })).toBeVisible();
});

test("tags form a «/» tree, and «Все теги» lists them with search and counts (§12.6)", async ({ page }) => {
  await signUp(page, uniqueEmail("tags"));
  await newDoc(page, "Встреча", "#работа/клиенты #идеи ");
  await newDoc(page, "План", "#работа/отчёты ");
  await expect(page.locator(".ds-prose")).toContainText("План");
  const sidebar = page.getByTestId("sidebar");
  const work = sidebar.getByTestId("tag-row").filter({ hasText: "работа" }).first();
  await expect(work).toBeVisible({ timeout: 15_000 });
  await expect(work).toContainText("2", { timeout: 15_000 });
  // Levels start folded.
  await expect(sidebar.getByTestId("tag-row").filter({ hasText: "клиенты" })).toHaveCount(0);
  await work.getByRole("button", { name: /Развернуть «#работа»/ }).click();
  await expect(sidebar.getByTestId("tag-row").filter({ hasText: "клиенты" })).toBeVisible();
  await expect(sidebar.getByTestId("tag-row").filter({ hasText: "отчёты" })).toBeVisible();

  await sidebar.getByTestId("all-tags-open").click();
  const sheet = page.getByTestId("all-tags");
  await expect(sheet.getByRole("link")).toHaveCount(4);
  await sheet.getByRole("textbox").fill("клиен");
  await expect(sheet.getByRole("link")).toHaveCount(1);
  await sheet.getByRole("link", { name: /работа\/клиенты/ }).click();
  await expect(page).toHaveURL(/\/tag\//);
  await expect(page.getByTestId("doc-card").filter({ hasText: "Встреча" })).toBeVisible();
});
