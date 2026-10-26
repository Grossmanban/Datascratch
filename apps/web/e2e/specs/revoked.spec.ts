import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

const MOCK = "http://localhost:8787";

test("a session ended from another device: explained on the login screen, unsent changes kept and sent after signing in", async ({ page, browser, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (it refuses pushes on request)");
  const email = uniqueEmail("revoked");
  await signUp(page, email);
  await newDoc(page, "Сохранится после отзыва", "Первая строка");
  await expectSynced(page);
  const noteUrl = page.url();

  // An edit the server does not take yet: it waits in this browser's outbox.
  await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: true } });
  try {
    await page.keyboard.type(" и неотправленная правка");
    await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "not-sent", { timeout: 15_000 });
  } finally {
    await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: false } });
  }

  // Another device ends this browser's session.
  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto("/settings/account");
  await q.getByRole("button", { name: "Отключить" }).first().click();

  // Not a silent sync status: the login screen says what happened.
  await page.waitForURL("**/login**", { timeout: 20_000 });
  const notice = page.getByTestId("revoked-notice");
  await expect(notice).toContainText("Этот браузер отключён от аккаунта");
  await expect(notice).toContainText("Сеанс завершён с другого устройства");
  await expect(notice).toContainText(/неотправленн/);
  await expect(page.getByTestId("login-form").locator("input[type=email]")).toHaveValue(email);

  // Also after a reload (the explanation is stored, not only in memory).
  await page.reload();
  await expect(page.getByTestId("revoked-notice")).toBeVisible();

  // Signing in again sends what was kept; the other device sees it.
  await page.getByTestId("login-form").locator("input[type=password]").fill("correct horse battery staple");
  await page.getByTestId("login-form").locator("button[type=submit]").click();
  await page.waitForURL("**/all", { timeout: 20_000 });
  await expectSynced(page);
  await q.goto(noteUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(q.locator(".ds-prose")).toContainText("Первая строка и неотправленная правка", { timeout: 20_000 });
  await other.close();
});

test("after a revocation the local data can be deleted from the login screen", async ({ page, browser }) => {
  const email = uniqueEmail("revoked-forget");
  await signUp(page, email);
  await expectSynced(page);
  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto("/settings/account");
  await q.getByRole("button", { name: "Отключить" }).first().click();
  await page.waitForURL("**/login**", { timeout: 20_000 });
  await other.close();

  await page.getByTestId("revoked-notice").getByRole("button", { name: "Удалить данные с этого устройства" }).click();
  await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: "Удалить" }).click();
  await expect(page.getByTestId("revoked-notice")).toHaveCount(0);
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ""));
  expect(dbs.filter((n) => n.startsWith("ds-account-"))).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("login-form")).toBeVisible();
  await expect(page.getByTestId("revoked-notice")).toHaveCount(0);
});
