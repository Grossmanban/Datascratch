import { expect, test } from "@playwright/test";
import { expectSynced, signUp, uniqueEmail } from "./helpers";

// spec/04 «Название новой заметки»: as in Apple Notes.
const today = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date()).replace(/\s*г\.?$/, "");

test("a new note: the cursor is in the title, Enter fills an empty title with the date, an empty note is not kept", async ({ page }) => {
  await signUp(page, uniqueEmail("title"));
  const cards = page.getByTestId("doc-card");
  await expect(cards).toHaveCount(1); // the welcome note

  // Enter in an empty title: the title becomes «Заметка <today>» and the cursor goes to the text.
  await page.getByTestId("new-doc").click();
  await page.waitForURL("**/doc/**");
  const title = page.locator(".ds-prose .ds-title");
  await expect(title).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(title).toHaveText(`Заметка ${today}`);
  await page.keyboard.type("Текст после Enter");
  await expect(page.locator(".ds-prose")).toContainText("Текст после Enter");
  await expect(title).toHaveText(`Заметка ${today}`);

  // Closed fully empty: not kept.
  await page.getByTestId("new-doc").click();
  await page.waitForURL((u) => u.pathname.startsWith("/doc/"));
  const emptyUrl = page.url();
  await expect(title).toHaveText("");
  await page.getByTestId("sidebar").getByRole("link", { name: "Все документы" }).click();
  await expect(cards).toHaveCount(2);
  // Deleted for good, not moved to the trash; and still gone after a reload.
  await expectSynced(page);
  await page.goto("/trash");
  await expect(cards).toHaveCount(0);
  await page.goto(emptyUrl);
  await expect(page.getByText("Документ не найден")).toBeVisible();

  // A typed title stays as typed.
  await page.goto("/all");
  await page.getByTestId("new-doc").click();
  await page.waitForURL("**/doc/**");
  await expect(title).toBeVisible();
  await page.keyboard.type("Своё название");
  await page.keyboard.press("Enter");
  await page.keyboard.type("текст");
  await expect(title).toHaveText("Своё название");
});
