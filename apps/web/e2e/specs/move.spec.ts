import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

test("move a note to another notebook and open it on another device", async ({ page, browser }) => {
  const email = uniqueEmail("move");
  await signUp(page, email);
  await newDoc(page, "Переезд", "Ключ заметки переобёрнут");
  await expectSynced(page);

  await page.getByRole("button", { name: "Новый блокнот" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").first().fill("Архив");
  await dialog.locator("button[type=submit]").click();
  await expect(dialog).toBeHidden();
  const archive = page.getByTestId("sidebar").getByRole("link", { name: "Архив" });
  await expect(archive).toBeVisible();
  await expectSynced(page);

  await page.goto("/all");
  await page.getByTestId("doc-card").filter({ hasText: "Переезд" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Переместить в блокнот…" }).click();
  await page.getByRole("menuitem", { name: "Архив" }).click();
  await page.getByRole("menuitem", { name: "Корень блокнота" }).click();
  await expect(page.getByText("Перемещено в «Архив»", { exact: true })).toBeVisible();
  await expectSynced(page);

  await archive.click();
  await expect(page.getByRole("main").getByRole("link", { name: /Переезд/ })).toBeVisible();

  // Another device decrypts the note with the key wrapped by the new notebook.
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await signIn(page2, email);
  await page2.getByTestId("sidebar").getByRole("link", { name: "Архив" }).click();
  await page2.getByRole("main").getByRole("link", { name: /Переезд/ }).click({ timeout: 20_000 });
  await expect(page2.locator(".ds-prose")).toContainText("Ключ заметки переобёрнут");

  // Edits after the move still reach the first device.
  await page2.locator(".ds-prose").click();
  await page2.keyboard.press("Control+End");
  await page2.keyboard.type(" и доехал");
  await page.getByRole("main").getByRole("link", { name: /Переезд/ }).click();
  await expect(page.locator(".ds-prose")).toContainText("и доехал", { timeout: 15_000 });
  await other.close();
});
