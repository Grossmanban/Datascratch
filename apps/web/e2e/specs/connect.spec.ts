import { expect, test } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

const SERVER = process.env.E2E_SERVER_URL ?? "http://localhost:8787";

test("/connect hands the server a browser session and returns to its consent screen", async ({ page }) => {
  await signUp(page, uniqueEmail("connect"));
  const returnTo = `${SERVER}/oauth/authorize?client_id=test`;
  await page.goto(`/connect?returnTo=${encodeURIComponent(returnTo)}`);
  await page.waitForURL((u) => u.toString().startsWith(`${SERVER}/oauth/authorize`), { timeout: 15_000 });
  const cookies = await page.context().cookies(SERVER);
  expect(cookies.some((c) => c.name === "ds_web")).toBe(true);
});

test("/connect refuses foreign return targets", async ({ page }) => {
  await signUp(page, uniqueEmail("connect-bad"));
  await page.goto(`/connect?returnTo=${encodeURIComponent("https://evil.example.com/oauth/authorize")}`);
  await expect(page.getByTestId("connect-page")).toContainText(/недействительна|invalid/);
});

test("/connect when device storage hangs (in-app browser): no endless logo — sign in, then on to the consent screen", async ({ page }) => {
  const email = uniqueEmail("connect-idb");
  await signUp(page, email);
  // From now on opening the device database never answers, as seen in an in-app browser.
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((name: string, version?: number) =>
      name === "ds-device" ? ({} as IDBOpenDBRequest) : open(name, version)) as typeof indexedDB.open;
  });
  const returnTo = `${SERVER}/oauth/authorize?client_id=test`;
  await page.goto(`/connect?returnTo=${encodeURIComponent(returnTo)}`);
  const form = page.getByTestId("login-form");
  await expect(form).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("restore-failed")).toBeVisible();
  await form.locator("input[type=email]").fill(email);
  await form.locator("input[type=password]").fill("correct horse battery staple");
  await form.locator("button[type=submit]").click();
  await page.waitForURL((u) => u.toString().startsWith(`${SERVER}/oauth/authorize`), { timeout: 30_000 });
});
