import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

test("a notebook key that differs from the server's is replaced: the other device reads what is written next", async ({ page, browser }) => {
  const email = uniqueEmail("nbkey");
  await signUp(page, email);
  await expectSynced(page);
  await expect.poll(() => page.evaluate(() => "__dsTest" in window)).toBe(true);
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));

  // This device ends up holding its own key for the notebook (as after a POST /notebooks that
  // got 409 because another device had registered the notebook first).
  await page.evaluate(async () => {
    type T = { db: () => { kv: { toArray(): Promise<{ key: string }[]> } }; corruptNotebookKey(id: string): Promise<void> };
    const t = (window as unknown as { __dsTest: T }).__dsTest;
    const row = (await t.db().kv.toArray()).find((r) => r.key.startsWith("nbkey:"))!;
    await t.corruptNotebookKey(row.key.slice("nbkey:".length));
  });

  await page.reload();
  await expect.poll(() => warnings.some((w) => w.includes("switching to the server's")), { timeout: 15_000 }).toBe(true);
  await newDoc(page, "После замены ключа", "текст");
  await expectSynced(page);

  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await expect(q.getByTestId("doc-card").filter({ hasText: "После замены ключа" })).toBeVisible({ timeout: 20_000 });
  await other.close();
});

test("a mode change that fails once still reaches the server", async ({ page }) => {
  await signUp(page, uniqueEmail("nbmode"));
  let patches = 0;
  await page.route(/\/v1\/notebooks\/[^/]+\/mode$/, (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    if (patches++ === 0) return route.abort("connectionreset");
    return route.continue();
  });
  await page.goto("/settings/notebooks");
  await page.locator("[data-testid^=mode-]").first().click();
  await page.getByTestId("confirm-mode").click();
  await expect(page.locator("[data-testid^=mode-]").first()).toContainText(/Сделать приватным|Make private/, { timeout: 15_000 });
  expect(patches).toBe(2);
});

test("a mode change the network keeps failing: clear message, mode unchanged, «Повторить» works later", async ({ page }) => {
  await signUp(page, uniqueEmail("nbmode-fail"));
  let blocked = true;
  await page.route(/\/v1\/notebooks\/[^/]+\/mode$/, (route) =>
    route.request().method() === "PATCH" && blocked ? route.abort("connectionreset") : route.continue(),
  );
  await page.goto("/settings/notebooks");
  const button = page.locator("[data-testid^=mode-]").first();
  await button.click();
  await page.getByTestId("confirm-mode").click();
  const toastMsg = page.getByText("Сервер не ответил — режим не изменён. Попробуйте ещё раз.").first();
  await expect(toastMsg).toBeVisible({ timeout: 30_000 });
  await expect(button).toContainText(/Открыть агентам/);
  blocked = false;
  // The confirmation stays open: pressing it again is the retry.
  await page.getByTestId("confirm-mode").click();
  await expect(button).toContainText(/Сделать приватным/, { timeout: 15_000 });
});
