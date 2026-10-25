import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

test("the recovery key check can be skipped; settings remind and show the key again", async ({ page }) => {
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await form.locator("input[type=email]").fill(uniqueEmail("skip"));
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
});
