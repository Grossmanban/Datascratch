import { expect, test, type Page } from "@playwright/test";
import { expectSynced, signUp, uniqueEmail } from "./helpers";

async function newDocHere(page: Page) {
  const before = page.url();
  await page.getByTestId("new-doc").click();
  await page.waitForURL((u) => u.pathname.startsWith("/doc/") && u.href !== before);
  await expect(page.locator(".ds-prose")).toBeVisible();
}
const crumbs = (page: Page) => page.locator("header").first();

test("«Новый документ» goes to the open notebook or folder, else the last used one; the chooser and tag views (spec/05)", async ({ page }) => {
  await signUp(page, uniqueEmail("target"));
  const sidebar = page.getByTestId("sidebar");
  await sidebar.getByRole("button", { name: "Новый блокнот" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").first().fill("Ии");
  await dialog.locator("button[type=submit]").click();
  await expect(dialog).toBeHidden();

  // In an open notebook: there.
  await sidebar.getByRole("link", { name: "Ии" }).click();
  await newDocHere(page);
  await expect(crumbs(page)).toContainText("Ии");

  // On «Все документы»: the notebook last used, shown on the button.
  await sidebar.getByRole("link", { name: "Все документы" }).click();
  await expect(page.getByTestId("new-doc-target")).toContainText("в «Ии»");
  await newDocHere(page);
  await expect(crumbs(page)).toContainText("Ии");

  // The chooser picks another notebook.
  await sidebar.getByRole("link", { name: "Все документы" }).click();
  await page.getByTestId("new-doc-target").click();
  const before = page.url();
  await page.getByRole("menuitem", { name: /Заметки/ }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/doc/") && u.href !== before);
  await expect(crumbs(page)).toContainText("Заметки");

  // In a folder: in that folder.
  await sidebar.getByRole("link", { name: /Заметки/ }).first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Новая папка" }).click();
  await sidebar.getByTestId("folder-node").filter({ hasText: "Новая папка" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/folder\//);
  await newDocHere(page);
  await expect(crumbs(page)).toContainText("Новая папка");

  // In a tag's list: the new note carries the tag.
  await page.keyboard.type("С тегом");
  await page.keyboard.press("Enter");
  await page.keyboard.type("#идея ");
  await expectSynced(page);
  await page.goto(`/tag/${encodeURIComponent("идея")}`);
  await expect(page.getByTestId("doc-card")).toHaveCount(1, { timeout: 15_000 });
  await newDocHere(page);
  await expect(page.locator(".ds-prose")).toContainText("#идея");
});
