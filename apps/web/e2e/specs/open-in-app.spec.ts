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

test("shared notebook on iPhone: «Открыть в приложении» lines up with the title and the list", async ({ page, browser }) => {
  // Owner report 2026-11-02: on a phone the button sat on the screen edge, without the page's side padding.
  test.setTimeout(120_000);
  const friend = uniqueEmail("openappnb");
  // An iPhone browser at a desktop size first: the sidebar is where invitations are accepted.
  const ctx = await browser.newContext({ userAgent: IPHONE_UA, viewport: { width: 1360, height: 860 } });
  const q = await ctx.newPage();
  await signUp(q, friend);
  await signUp(page, uniqueEmail("openappowner"));
  await newDoc(page, "Общая заметка", "текст");
  await page.getByTestId("sidebar").getByRole("link", { name: /Заметки/ }).first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Поделиться…" }).click();
  await page.getByTestId("invite-email").fill(friend);
  await page.getByTestId("invite-submit").click();
  await expect(page.getByTestId("invitation").filter({ hasText: friend })).toBeVisible();
  await q.reload();
  await q.getByTestId("invitations-row").click();
  await q.getByTestId("invitation-in").getByTestId("accept-invitation").click();
  await q.getByRole("dialog").getByRole("button", { name: /Закрыть|Close/ }).click();
  const row = q.getByTestId("shared-row").filter({ hasText: "Заметки" });
  await expect(row).not.toHaveAttribute("data-waiting", "", { timeout: 30_000 });
  const id = (await row.getAttribute("data-shared-id"))!;

  for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await q.setViewportSize(viewport);
    await q.goto(`/notebook/${id}`);
    const button = q.getByTestId("open-in-app");
    await expect(button).toBeVisible({ timeout: 20_000 });
    const [b, title, filter] = await Promise.all([button.boundingBox(), q.getByRole("heading", { level: 1 }).boundingBox(), q.getByTestId("list-filter").boundingBox()]);
    expect(b!.x).toBeGreaterThanOrEqual(16);
    expect(Math.abs(b!.x - title!.x)).toBeLessThan(1);
    expect(Math.abs(b!.x - filter!.x)).toBeLessThan(1);
  }
  await ctx.close();
});
