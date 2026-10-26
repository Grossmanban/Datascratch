import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

// D-51: the default build is notes only — no Tasks, Calendar or tabs, and it writes no tab keys.
test("the default build is notes only: no tasks, calendar or tabs (D-51)", async ({ page }) => {
  await signUp(page, uniqueEmail("minimal"));
  const sidebar = page.getByTestId("sidebar");
  await expect(sidebar.getByRole("link", { name: "Все документы" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Задачи" })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Календарь" })).toHaveCount(0);

  await newDoc(page, "Просто заметка", "- [ ] пункт чек-листа остаётся");
  await expect(page.getByTestId("tab-strip")).toHaveCount(0);
  await newDoc(page, "Вторая заметка");
  await expect(page.getByTestId("tab-strip")).toHaveCount(0);
  // The minimal mode never writes tabs or the active tab of a space into the account document.
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);
  const keys = await page.evaluate(() => {
    type YMap = { get(k: string): unknown };
    type YArr = { length: number };
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, { getMap(n: string): YMap; getArray(n: string): YArr }>; rows: Map<string, { kind: string }> } } }).__ds;
    const [, account] = [...rt.store.docs].find(([id]) => rt.store.rows.get(id)?.kind === "account")!;
    const settings = account.getMap("settings");
    return { tabs: account.getArray("tabs").length, active: settings.get("activeTabBySpace") ?? null, daily: settings.get("dailyNotebookBySpace") ?? null };
  });
  expect(keys).toEqual({ tabs: 0, active: null, daily: null });

  // Their screens are not reachable: the addresses land on the documents.
  for (const path of ["/tasks", "/tasks/inbox", "/calendar"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/all$/);
  }
  // ⌘K has no tasks, calendar or «today» commands; the tab overview key does nothing.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByTestId("palette-input").fill("");
  await expect(page.getByRole("option", { name: /Задачи|Календарь|Сегодня/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+Shift+Backslash");
  await expect(page.getByTestId("tab-overview")).toHaveCount(0);
  // A document's menu has no «open in a tab».
  await page.getByTestId("doc-card").first().click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: /вкладке/ })).toHaveCount(0);
});
