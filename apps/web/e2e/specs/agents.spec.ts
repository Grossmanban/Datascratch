import { expect, test } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

test("agents: open a notebook to agents with a warning, create a token shown once", async ({ page }) => {
  await signUp(page, uniqueEmail("agents"));
  await page.goto("/settings/notebooks");
  await page.locator("[data-testid^=mode-]").first().click();
  await expect(page.getByRole("alert")).toContainText(/сервер технически может прочитать|server can technically read/);
  await page.getByTestId("confirm-mode").click();
  await expect(page.locator("[data-testid^=mode-]").first()).toContainText(/Сделать приватным|Make private/);

  await page.goto("/settings/agents");
  await expect(page.getByTestId("mcp-url")).toContainText("/mcp");
  await page.getByRole("button", { name: /Новый токен|New token/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /📓/ }).first().click();
  await dialog.getByRole("button", { name: /Создать|Create/ }).click();
  await expect(dialog.locator("code")).toHaveText(/\S{20,}/);
  await dialog.getByRole("button", { name: /Готово|Done/ }).click();
  await expect(page.getByText("Claude").first()).toBeVisible();
});
