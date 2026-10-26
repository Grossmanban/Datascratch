import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("the document list filters by title and text as you type; / and ⌘F focus it, Esc and × clear it", async ({ page }) => {
  await signUp(page, uniqueEmail("filter"));
  await newDoc(page, "План запуска", "Бюджет и сроки");
  await newDoc(page, "Список покупок", "Молоко, хлеб");
  await page.getByTestId("sidebar").getByRole("link", { name: "Все документы" }).click();
  const cards = page.getByTestId("doc-card");
  await expect(cards).toHaveCount(3);
  const field = page.getByTestId("list-filter").getByRole("searchbox");

  // «/» focuses the field; by title.
  await page.locator("body").click({ position: { x: 900, y: 120 } });
  await page.keyboard.press("/");
  await expect(field).toBeFocused();
  await page.keyboard.type("план");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("План запуска");

  // By text, several words; and nothing found.
  await field.fill("молоко хлеб");
  await expect(cards).toHaveCount(1, { timeout: 10_000 });
  await expect(cards.first()).toContainText("Список покупок");
  await field.fill("несуществующее слово");
  await expect(cards).toHaveCount(0);
  await expect(page.getByText("Ничего не найдено")).toBeVisible();

  // Esc clears; × clears; ⌘F focuses again.
  await page.keyboard.press("Escape");
  await expect(field).toHaveValue("");
  await expect(cards).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(field).not.toBeFocused();
  await page.keyboard.press("ControlOrMeta+f");
  await expect(field).toBeFocused();
  await page.keyboard.type("покуп");
  await expect(cards).toHaveCount(1);
  await page.getByTestId("list-filter-clear").click();
  await expect(cards).toHaveCount(3);

  // It filters the list on screen: inside a notebook only its documents.
  await page.getByTestId("sidebar").getByRole("link", { name: /Заметки/ }).first().click();
  await expect(field).toHaveValue("");
  await field.fill("бюджет");
  await expect(cards).toHaveCount(1);
});
