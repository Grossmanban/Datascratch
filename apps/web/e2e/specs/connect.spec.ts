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
