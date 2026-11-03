import { expect, test } from "@playwright/test";
import { PASSWORD, signUp, uniqueEmail } from "./helpers";

// crypto.md §2 (audit 2026-10-27): a server that answers prelogin with weakened KDF parameters
// (cheap to brute-force) is refused before the password is used; the login request is never sent.
test("sign-in refuses weakened KDF parameters from the server", async ({ page, browser }) => {
  const email = uniqueEmail("kdf");
  await signUp(page, email);

  const other = await browser.newContext();
  const q = await other.newPage();
  let loginSent = false;
  await q.route("**/v1/auth/prelogin", async (route) => {
    const res = await route.fetch();
    const body = (await res.json()) as { salt: string; kdf: Record<string, unknown> };
    await route.fulfill({ response: res, json: { ...body, kdf: { ...body.kdf, ops: 1, mem: 8 * 1024 * 1024 } } });
  });
  q.on("request", (r) => {
    if (r.url().endsWith("/v1/auth/login")) loginSent = true;
  });
  await q.goto("/login");
  const form = q.getByTestId("login-form");
  await form.locator("input[type=email]").fill(email);
  await form.locator("input[type=password]").fill(PASSWORD);
  await form.locator("button[type=submit]").click();
  await expect(q.getByText(/небезопасные параметры/)).toBeVisible();
  await expect(q).toHaveURL(/\/login/);
  expect(loginSent).toBe(false);
  await other.close();
});
