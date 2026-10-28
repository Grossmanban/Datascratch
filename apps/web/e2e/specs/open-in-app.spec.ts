import { expect, test, type Browser } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

// «Открыть в приложении» on iPhone/iPad: invite and guest links hand over to the iOS app by its
// scheme (ds://…?server=<host>), the guest key stays in the fragment; without the app the page stays.

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const iphone = (browser: Browser) =>
  browser.newContext({ userAgent: IPHONE_UA, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("guest link on iPhone: «Открыть в приложении» carries the share and its key; without the app the note stays", async ({ page, browser }) => {
  await signUp(page, uniqueEmail("openapp"));
  await newDoc(page, "Для телефона", "Текст");
  await page.getByTestId("share-button").click();
  await page.getByTestId("create-share").click();
  const url = (await page.getByTestId("share-list").locator("li[data-url]").first().getAttribute("data-url"))!;
  const [, shareId, key] = /\/s\/([0-9a-f-]+)#k=([A-Za-z0-9_-]+)$/.exec(url)!;
  // Not on a desktop.
  await expect(page.getByTestId("open-in-app")).toHaveCount(0);

  const ctx = await iphone(browser);
  const guest = await ctx.newPage();
  await guest.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(guest.getByTestId("guest-doc").locator(".ds-prose")).toContainText("Текст", { timeout: 20_000 });
  const button = guest.getByTestId("open-in-app");
  await expect(button).toHaveText("Открыть в приложении");
  expect(await button.getAttribute("href")).toMatch(new RegExp(`^ds://share/${shareId}\\?server=[^#]+#k=${key}$`));
  // No app here: after a moment a calm note, and the guest page is still there.
  await button.click();
  await expect(guest.getByText("Приложение не открылось").first()).toBeVisible({ timeout: 5_000 });
  await expect(guest.getByTestId("guest-doc").locator(".ds-prose")).toContainText("Текст");
  await ctx.close();
});

test("invite link on iPhone before signing in: the login page offers the app", async ({ browser }) => {
  const ctx = await iphone(browser);
  const q = await ctx.newPage();
  const id = "01a1a1a1-0000-7000-8000-000000000001";
  await q.goto(`/invite/${id}`);
  await expect(q).toHaveURL(/\/login/);
  const button = q.getByTestId("open-in-app");
  await expect(button).toBeVisible();
  expect(await button.getAttribute("href")).toMatch(new RegExp(`^ds://invite/${id}\\?server=.+$`));
  await ctx.close();
});
