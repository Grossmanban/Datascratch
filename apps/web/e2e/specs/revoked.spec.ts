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

test("D-53: a device disconnected from another one wipes all its data (unsent changes too) and says so", async ({ page, browser, request }) => {
  const mock = !process.env.E2E_SERVER_URL;
  const email = uniqueEmail("revoked");
  await signUp(page, email);
  await newDoc(page, "На сервере", "Первая строка");
  await expectSynced(page);
  const noteUrl = page.url();

  // An edit the server does not take yet (mock only): it is lost with the device's data (D-53).
  if (mock) {
    await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: true } });
    await page.keyboard.type(" и неотправленная правка");
    await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "not-sent", { timeout: 15_000 });
    await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: false } });
  }

  // Another device ends this browser's session, after the warning.
  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto("/settings/account");
  await endOtherSession(q);

  // The server says device_revoked (socket 4410): everything of the account is gone from here.
  await page.waitForURL("**/login**", { timeout: 20_000 });
  const notice = page.getByTestId("wiped-notice");
  await expect(notice).toContainText("Это устройство отключено от аккаунта с другого устройства");
  await expect(notice).toContainText("Данные на нём удалены. Войдите снова — заметки загрузятся с сервера");
  await expect(page.getByTestId("revoked-notice")).toHaveCount(0);
  await expect(page.getByTestId("login-form").locator("input[type=email]")).toHaveValue(email);
  const left = await page.evaluate(async () => ({
    dbs: (await indexedDB.databases()).map((d) => d.name ?? "").filter((n) => n.startsWith("ds-account-")),
    tails: Object.keys(localStorage).filter((k) => k.startsWith("ds.unsaved.")),
  }));
  expect(left).toEqual({ dbs: [], tails: [] });

  // The message survives a reload.
  await page.reload();
  await expect(page.getByTestId("wiped-notice")).toBeVisible();

  // Signing in again loads the notes from the server; the unsent edit is gone.
  await page.getByTestId("login-form").locator("input[type=password]").fill("correct horse battery staple");
  await page.getByTestId("login-form").locator("button[type=submit]").click();
  await page.waitForURL("**/all", { timeout: 20_000 });
  await page.goto(noteUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page.locator(".ds-prose")).toContainText("Первая строка", { timeout: 20_000 });
  await expect(page.locator(".ds-prose")).not.toContainText("неотправленная правка");
  await other.close();
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
