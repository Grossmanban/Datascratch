import { expect, test } from "@playwright/test";
import { newDoc, signUp, uniqueEmail } from "./helpers";

test("share link: guest without an account edits live; revoking cuts access", async ({ page, browser }) => {
  await signUp(page, uniqueEmail("share"));
  await newDoc(page, "Общий план", "Набросок");
  await page.getByTestId("share-button").click();
  await page.getByTestId("create-share").click();
  const item = page.getByTestId("share-list").locator("li[data-url]").first();
  await expect(item).toBeVisible();
  const url = (await item.getAttribute("data-url"))!;
  expect(url).toMatch(/\/s\/[0-9a-f-]+#k=[A-Za-z0-9_-]{43}$/);
  await page.keyboard.press("Escape");

  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await guestCtx.newPage();
  await guest.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(guest.getByTestId("guest-doc").locator(".ds-prose")).toContainText("Набросок", { timeout: 20_000 });
  await expect(guest.getByTestId("guest-permission")).toBeVisible();
  await guest.locator(".ds-prose p").first().click();
  await guest.keyboard.press("End");
  await guest.keyboard.type(" — дополнено гостем");
  await expect(page.locator(".ds-prose")).toContainText("дополнено гостем", { timeout: 15_000 });

  // Revoke and reopen: the link stops working.
  await page.getByTestId("share-button").click();
  await page.getByTestId("share-list").getByRole("button", { name: /Отозвать|Revoke/ }).click();
  await expect(page.getByTestId("share-list")).toHaveCount(0);
  const guest2 = await guestCtx.newPage();
  await guest2.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(guest2.getByText(/Ссылка недействительна|This link doesn't work/)).toBeVisible();
  await guestCtx.close();
});
