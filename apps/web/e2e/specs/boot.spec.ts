import { expect, test } from "@playwright/test";

// From some networks a share of new connections hangs (TLS handshake): a module of the app shell
// fails to arrive. The page must still load, or at least say so calmly instead of a bare logo.

test("a module that fails to load once: the page reloads itself and opens", async ({ page }) => {
  let failed = 0;
  await page.route(/\/assets\/react-[^/]+\.js$/, (route) => {
    if (failed++ === 0) return route.abort("connectionreset");
    return route.continue();
  });
  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 20_000 });
  expect(failed).toBeGreaterThan(1);
});

test("a module that keeps failing: «Не удалось загрузить» with «Повторить», which works once the network is back", async ({ page }) => {
  let blocked = true;
  await page.route(/\/assets\/react-[^/]+\.js$/, (route) => (blocked ? route.abort("connectionreset") : route.continue()));
  await page.goto("/login");
  const notice = page.locator("#ds-boot-fail");
  await expect(notice).toContainText("Не удалось загрузить приложение", { timeout: 20_000 });
  blocked = false;
  await notice.getByRole("button", { name: "Повторить" }).click();
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 20_000 });
  await expect(notice).toHaveCount(0);
});

test("a hung module request: the stall is noticed and the page reloads", async ({ page }) => {
  test.setTimeout(60_000);
  let hung = false;
  await page.route(/\/assets\/react-[^/]+\.js$/, async (route) => {
    if (!hung) {
      hung = true;
      return; // never answered, like a connection stuck in the handshake
    }
    await route.continue();
  });
  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 30_000 });
});
