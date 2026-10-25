import { expect, type Page } from "@playwright/test";

export const PASSWORD = "correct horse battery staple";

export function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Sign up and confirm the recovery key. Returns the recovery key text. */
export async function signUp(page: Page, email: string, password = PASSWORD): Promise<string> {
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await form.locator("input[type=email]").fill(email);
  await form.locator("input[type=password]").nth(0).fill(password);
  await form.locator("input[type=password]").nth(1).fill(password);
  await form.locator("button[type=submit]").click();
  const keyBox = page.getByTestId("recovery-key");
  await expect(keyBox).toBeVisible({ timeout: 20_000 });
  const key = (await keyBox.getAttribute("data-key"))!;
  const step = page.getByTestId("recovery-step");
  await step.locator("input").fill(key.replace(/-/g, "").slice(-4));
  await step.locator("button[type=submit]").click();
  await page.waitForURL("**/all");
  await expect(page.getByTestId("doc-card").first()).toBeVisible();
  return key;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  const form = page.getByTestId("login-form");
  await form.locator("input[type=email]").fill(email);
  await form.locator("input[type=password]").fill(password);
  await form.locator("button[type=submit]").click();
  await page.waitForURL("**/all", { timeout: 20_000 });
}

export async function expectSynced(page: Page) {
  await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "online", { timeout: 15_000 });
  await expect(page.getByTestId("sync-status")).not.toHaveAttribute("aria-label", /ждут|ждёт|waiting/, { timeout: 15_000 });
}

/** Create a document from the sidebar and type a title and body. */
export async function newDoc(page: Page, title: string, body?: string) {
  await page.getByTestId("new-doc").click();
  await page.waitForURL("**/doc/**");
  const editor = page.locator(".ds-prose");
  await expect(editor).toBeVisible();
  await page.keyboard.type(title);
  if (body !== undefined) {
    await page.keyboard.press("Enter");
    await page.keyboard.type(body);
  }
}
