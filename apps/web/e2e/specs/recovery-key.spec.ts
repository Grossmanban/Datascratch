import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectSynced, PASSWORD, signIn, uniqueEmail } from "./helpers";

test("the recovery key check can be skipped; settings remind, show the key again and make a new one", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const email = uniqueEmail("skip");
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await form.locator("input[type=email]").fill(email);
  await form.locator("input[type=password]").nth(0).fill(PASSWORD);
  await form.locator("input[type=password]").nth(1).fill(PASSWORD);
  await form.locator("button[type=submit]").click();
  const key = (await page.getByTestId("recovery-key").getAttribute("data-key", { timeout: 20_000 }))!;

  // Skip → short warning → the app opens; the settings keep a gentle reminder.
  await page.getByTestId("recovery-skip").click();
  await expect(page.getByRole("alertdialog").or(page.getByRole("dialog"))).toContainText(/ключа восстановления|recovery key/);
  await page.getByRole("button", { name: "Пропустить" }).last().click();
  await page.waitForURL("**/all");
  await expect(page.getByTestId("recovery-dot")).toBeVisible();

  // Survives a reload: no forced key screen, still a reminder.
  await page.reload();
  await page.waitForURL("**/all");
  await expect(page.getByTestId("recovery-dot")).toBeVisible();

  await page.goto("/settings/account");
  await expect(page.getByTestId("recovery-card")).toHaveAttribute("data-state", "unconfirmed");
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const axe = await new AxeBuilder({ page }).include("[data-testid=recovery-card]").withRules(["color-contrast"]).analyze();
    expect(axe.violations.flatMap((v) => v.nodes.map((n) => n.failureSummary)), `reminder contrast (${scheme})`).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByTestId("recovery-show").click();
  await expect(page.getByRole("dialog").getByTestId("recovery-key")).toHaveAttribute("data-key", key);
  await page.getByTestId("recovery-confirm").fill(key.replace(/-/g, "").slice(-4));
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await expect(page.getByTestId("recovery-card")).toHaveAttribute("data-state", "confirmed");
  await expect(page.getByTestId("recovery-dot")).toHaveCount(0);

  // Still viewable after confirming.
  await page.getByTestId("recovery-show").click();
  await expect(page.getByRole("dialog").getByTestId("recovery-key")).toHaveAttribute("data-key", key);

  await page.keyboard.press("Escape");
  await expectSynced(page);

  // Another device: the confirmation is in the account doc; the key itself is not here.
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await signIn(p2, email);
  await p2.goto("/settings/account");
  const card2 = p2.getByTestId("recovery-card");
  await expect(card2).toHaveAttribute("data-state", "confirmed", { timeout: 15_000 });
  await expect(card2).toHaveAttribute("data-on-device", "false");
  await expect(p2.getByTestId("recovery-show")).toHaveCount(0);

  // A new key from the second device (password required); the old one stops working.
  await p2.getByTestId("recovery-rotate").click();
  await p2.getByTestId("recovery-rotate-password").fill(PASSWORD);
  await p2.getByRole("dialog").locator("button[type=submit]").click();
  const newKey = (await p2.getByRole("dialog").getByTestId("recovery-key").getAttribute("data-key", { timeout: 20_000 }))!;
  expect(newKey).not.toBe(key);
  await p2.keyboard.press("Escape");
  await expect(card2).toHaveAttribute("data-state", "unconfirmed");
  await expect(card2).toHaveAttribute("data-on-device", "true");
  await p2.reload();
  await expect(p2.getByTestId("security-log")).toContainText(/Новый ключ восстановления/);

  // The first device gets the reminder back and forgets its replaced key.
  await expect(page.getByTestId("recovery-dot")).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByTestId("recovery-card")).toHaveAttribute("data-on-device", "false", { timeout: 15_000 });
  await ctx.close();
});
