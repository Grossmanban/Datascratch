import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { TestEditor } from "./TestEditor";

// D-51: by default the app is notes-only; task dates are the extended mode (EditorHost.taskDates).
const TASKS = `<h1 data-type=title>Задачи</h1>
<ul data-type="taskList"><li data-type="taskItem" data-state="open" data-scheduled="2026-10-27" data-deadline="2026-10-30"><p>Задача с датами</p></li><li data-type="taskItem" data-state="open"><p>Без дат</p></li></ul>
<p>Текст</p>`;

async function ready(page: Page) {
  await page.waitForFunction(() => window.__ct?.ready === true);
  await page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: null }));
}

const firstTask = (page: Page) => page.locator("li.ds-task").first();

async function slashHint(page: Page) {
  await page.locator(".ds-prose p", { hasText: "Текст" }).click();
  await page.keyboard.press("End");
  await page.keyboard.type(" /зада");
  const option = page.getByRole("option", { name: /Задача/ });
  await expect(option).toBeVisible();
  const text = await option.textContent();
  await page.keyboard.press("Escape");
  return text ?? "";
}

test("taskDates inert: chips are inert labels, the task menu has no dates, checkboxes still toggle", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TASKS} taskDates="inert" taskActions />);
  await ready(page);
  const task = firstTask(page);
  // The dates stay in the document and are still shown as quiet labels.
  await expect(task.locator(".ds-chip")).toHaveCount(2);
  await expect(page.locator(".ds-editor")).toHaveAttribute("data-task-dates", "off");
  await expect(task.locator(".ds-chip").first()).toHaveCSS("pointer-events", "none");
  // A click on the chips does not open the reschedule menu.
  await task.locator(".ds-task-chips").click({ force: true });
  await page.waitForTimeout(150);
  await expect(page.locator(".ds-task-menu")).toHaveCount(0);
  // Checkbox toggles.
  await task.locator(".ds-task-check").click();
  await expect(task).toHaveAttribute("data-state", "done");
  await task.locator(".ds-task-check").click();
  await expect(task).toHaveAttribute("data-state", "open");
  // The task menu (right click on the checkbox) keeps state actions but no date entries.
  await task.locator(".ds-task-check").click({ button: "right" });
  const menu = page.locator(".ds-task-menu");
  await expect(menu).toBeVisible();
  await expect(menu).toContainText("Выполнить");
  await expect(menu).toContainText("Открыть документ");
  for (const t of ["Перенести", "Сегодня", "Дата…", "Дедлайн…", "Переместить…"]) await expect(menu).not.toContainText(t);
  await page.keyboard.press("Escape");
  // The / menu does not advertise dates.
  expect(await slashHint(page)).not.toContain("дат");
  // Nothing was removed from the data.
  const y = await page.evaluate(() => window.__ct!.doc.getXmlFragment("content").toString());
  expect(y).toContain('scheduled="2026-10-27"');
  expect(y).toContain('deadline="2026-10-30"');
});

test("taskDates full (default): chips open the reschedule menu with date entries", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html={TASKS} taskActions />);
  await ready(page);
  const task = firstTask(page);
  await expect(page.locator(".ds-editor")).not.toHaveAttribute("data-task-dates", "off");
  await task.locator(".ds-chip").first().click();
  const menu = page.locator(".ds-task-menu");
  await expect(menu).toBeVisible();
  for (const t of ["Перенести", "Сегодня", "Дата…", "Дедлайн…", "Выполнить", "Переместить…"]) await expect(menu).toContainText(t);
  await menu.locator(".ds-menu-item", { hasText: "Без даты" }).click();
  await expect(menu).toHaveCount(0);
  const y = await page.evaluate(() => window.__ct!.doc.getXmlFragment("content").toString());
  expect(y).not.toContain('scheduled="2026-10-27"');
  expect(y).toContain('deadline="2026-10-30"');
  expect(await slashHint(page)).toContain("Чек-бокс с датами");
});

test("taskDates can be switched on a live editor", async ({ mount, page }) => {
  const c = await mount(<TestEditor width={700} html={TASKS} taskActions />);
  await ready(page);
  // Re-rendering the test editor re-applies its pen settings: keep the pen off so clicks are clicks.
  const penOff = () => page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: null }));
  await c.update(<TestEditor width={700} html={TASKS} taskDates="inert" taskActions />);
  await penOff();
  await expect(page.locator(".ds-editor")).toHaveAttribute("data-task-dates", "off");
  await firstTask(page).locator(".ds-task-chips").click({ force: true });
  await page.waitForTimeout(150);
  await expect(page.locator(".ds-task-menu")).toHaveCount(0);
  await c.update(<TestEditor width={700} html={TASKS} taskDates="full" taskActions />);
  await penOff();
  await firstTask(page).locator(".ds-chip").first().click();
  await expect(page.locator(".ds-task-menu")).toContainText("Перенести");
});
