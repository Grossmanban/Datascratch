import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("tasks: inbox, today, complete, schedule, tasks from documents", async ({ page }) => {
  await signUp(page, uniqueEmail("tasks"));

  await page.goto("/tasks/inbox");
  await page.getByTestId("add-task").fill("Купить бумагу");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("task-row").filter({ hasText: "Купить бумагу" })).toBeVisible();

  // Schedule for tomorrow via the context menu → moves to Upcoming.
  await page.getByTestId("task-row").filter({ hasText: "Купить бумагу" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: /Перенести|Schedule/ }).hover();
  await page.getByRole("menuitem", { name: /Завтра|Tomorrow/ }).click();
  await page.getByTestId("tasks-tab-upcoming").click();
  await expect(page.getByTestId("task-row").filter({ hasText: "Купить бумагу" })).toBeVisible();

  // Today: add and complete.
  await page.getByTestId("tasks-tab-today").click();
  await page.getByTestId("add-task").fill("Позвонить в типографию");
  await page.keyboard.press("Enter");
  const row = page.getByTestId("task-row").filter({ hasText: "Позвонить в типографию" });
  await row.getByRole("checkbox").click();
  await expect(row).toHaveAttribute("data-state", "done");
  await page.getByTestId("tasks-tab-logbook").click();
  await expect(page.getByTestId("task-row").filter({ hasText: "Позвонить в типографию" })).toBeVisible();

  // A checkbox written inside a document shows up in "All".
  await newDoc(page, "План недели", "");
  await page.keyboard.type("[ ] Сдать макет");
  await page.waitForTimeout(1200);
  await page.goto("/tasks/all");
  await expect(page.getByTestId("task-row").filter({ hasText: "Сдать макет" })).toBeVisible();
});
