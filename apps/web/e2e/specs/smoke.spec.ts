import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, PASSWORD, signIn, signUp, uniqueEmail } from "./helpers";

test("sign up, write a note, sign in on another device and see it", async ({ page, browser }) => {
  const email = uniqueEmail("smoke");
  await signUp(page, email);
  await newDoc(page, "Первая заметка", "Чернила на тёплой бумаге");
  await expect(page.getByTestId("tab-strip")).toContainText("Первая заметка");
  await expectSynced(page);

  const other = await browser.newContext();
  const page2 = await other.newPage();
  await signIn(page2, email);
  await expect(page2.getByTestId("doc-card").filter({ hasText: "Первая заметка" })).toBeVisible({ timeout: 20_000 });
  await page2.getByTestId("doc-card").filter({ hasText: "Первая заметка" }).click();
  await expect(page2.locator(".ds-prose")).toContainText("Чернила на тёплой бумаге");

  // Live sync between the two devices.
  await page.locator(".ds-prose").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" и живой штрих");
  await expect(page2.locator(".ds-prose")).toContainText("и живой штрих", { timeout: 15_000 });
  await other.close();
});

test("search finds a note by its text via the command palette", async ({ page }) => {
  await signUp(page, uniqueEmail("search"));
  await newDoc(page, "Рецепт хлеба", "Мука, вода, закваска и терпение");
  await page.waitForTimeout(1200); // index debounce
  await page.keyboard.press("Control+k");
  await page.getByTestId("palette-input").fill("закваска");
  await expect(page.getByRole("option", { name: /Рецепт хлеба/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ds-prose")).toContainText("Мука, вода");
});

test("recover access with the recovery key", async ({ page, browser }) => {
  const email = uniqueEmail("recover");
  const key = await signUp(page, email);
  await newDoc(page, "Важное", "Не потерять");
  await expectSynced(page);

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto("/recover");
  await p2.locator("input[type=email]").fill(email);
  await p2.getByPlaceholder("DS1-XXXX-XXXX-…").fill(key);
  await p2.locator("input[type=password]").fill("a brand new password");
  await p2.locator("button[type=submit]").click();
  await p2.waitForURL("**/all", { timeout: 20_000 });
  await expect(p2.getByTestId("doc-card").filter({ hasText: "Важное" })).toBeVisible({ timeout: 20_000 });

  // The old password no longer works, the new one does.
  const ctx3 = await browser.newContext();
  const p3 = await ctx3.newPage();
  await p3.goto("/login");
  await p3.getByTestId("login-form").locator("input[type=email]").fill(email);
  await p3.getByTestId("login-form").locator("input[type=password]").fill(PASSWORD);
  await p3.getByTestId("login-form").locator("button[type=submit]").click();
  await expect(p3.getByTestId("login-form")).toContainText(/Неверная почта или пароль|Wrong email/);
  await signIn(p3, email, "a brand new password");
  await ctx.close();
  await ctx3.close();
});
