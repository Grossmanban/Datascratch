import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

// D-51: the default build has no Tasks or Calendar; tabs are on since the 2026-11-02 amendment.
test("the default build has no tasks or calendar, and has tabs (D-51)", async ({ page }) => {
  await signUp(page, uniqueEmail("minimal"));
  const sidebar = page.getByTestId("sidebar");
  await expect(sidebar.getByRole("link", { name: "Все документы" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Задачи" })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Календарь" })).toHaveCount(0);

  await newDoc(page, "Просто заметка", "- [ ] пункт чек-листа остаётся");
  await newDoc(page, "Вторая заметка");
  // Tabs are on in every build (D-51 amendment 2026-11-02).
  await expect(page.getByTestId("tab-strip")).toBeVisible();

  // Their screens are not reachable: the addresses land on the documents.
  for (const path of ["/tasks", "/tasks/inbox", "/calendar"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/all$/);
  }
  // ⌘K has no tasks, calendar or «today» commands.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByTestId("palette-input").fill("");
  await expect(page.getByRole("option", { name: /Задачи|Календарь|Сегодня/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
});
