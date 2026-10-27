import { expect, test, type Page } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

const MOCK = "http://localhost:8787";

/** Settings → devices → «Завершить сеанс» on the other device, after the D-53 warning. */
async function endOtherSession(q: Page) {
  await q.getByRole("button", { name: "Завершить сеанс" }).first().click();
  const dialog = q.getByRole("alertdialog").or(q.getByRole("dialog"));
  await expect(dialog).toContainText("Все данные на этом устройстве будут удалены, включая неотправленные изменения");
  await dialog.getByRole("button", { name: "Завершить сеанс" }).click();
}

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
  await endOtherSession(q);

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
  await endOtherSession(q);
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

test("signing out with unsent changes warns, keeps them, and sends them after signing in again (spec/07)", async ({ page, browser, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (it refuses pushes on request)");
  const email = uniqueEmail("signout-unsent");
  await signUp(page, email);
  await newDoc(page, "Перед выходом", "Первая строка");
  await expectSynced(page);
  const noteUrl = page.url();

  await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: true } });
  try {
    await page.keyboard.type(" и правка до выхода");
    await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "not-sent", { timeout: 15_000 });
    await page.goto("/settings/account");
    await page.getByTestId("sign-out").click();
    const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(dialog).toContainText(/неотправленн.*отправ.* после входа в этот же аккаунт/);
    // «Сначала отправить» keeps the session.
    await dialog.getByRole("button", { name: "Сначала отправить" }).click();
    await expect(page.getByTestId("sign-out")).toBeVisible();
    await page.getByTestId("sign-out").click();
    await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: "Выйти" }).click();
  } finally {
    await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: false } });
  }

  await page.waitForURL("**/login**", { timeout: 20_000 });
  await expect(page.getByTestId("revoked-notice")).toContainText("Неотправленные изменения сохранены");
  await page.getByTestId("login-form").locator("input[type=password]").fill("correct horse battery staple");
  await page.getByTestId("login-form").locator("button[type=submit]").click();
  await page.waitForURL("**/all", { timeout: 20_000 });
  await expectSynced(page);

  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto(noteUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(q.locator(".ds-prose")).toContainText("Первая строка и правка до выхода", { timeout: 20_000 });
  await other.close();
});

test("D-53: password change and recovery warn that other devices are disconnected and their data deleted", async ({ page, browser }) => {
  await signUp(page, uniqueEmail("d53-warnings"));
  await page.goto("/settings/account");
  await page.getByRole("button", { name: "Сменить пароль" }).first().click();
  await expect(page.getByTestId("password-others-wiped")).toContainText("Другие устройства будут отключены, данные на них удалены");
  await page.keyboard.press("Escape");
  // Recovery is for a signed-out browser.
  const other = await browser.newContext();
  const r = await other.newPage();
  await r.goto("/recover");
  await expect(r.getByTestId("recover-others-wiped")).toContainText("будут отключены, данные на них удалены");
  await other.close();
});
