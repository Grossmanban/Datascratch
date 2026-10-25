import { expect, test } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

// The server revokes a device when a rotated refresh token is presented again. Tabs of the app
// share one session, so refreshing in two tabs at once must not look like token theft.
test("two tabs refreshing the session at once stay signed in", async ({ page, context }) => {
  await signUp(page, uniqueEmail("tabs"));
  const tab2 = await context.newPage();
  await tab2.goto("/all");
  await expect(tab2.getByTestId("doc-card").first()).toBeVisible();
  for (const p of [page, tab2]) await expect.poll(() => p.evaluate(() => "__dsTest" in window)).toBe(true);

  const refresh = (p: typeof page) =>
    p.evaluate(async () => {
      const s = await (window as unknown as { __dsTest: { refresh(): Promise<{ refreshToken: string } | null> } }).__dsTest.refresh();
      return s?.refreshToken ?? null;
    });
  const [a, b] = await Promise.all([refresh(page), refresh(tab2)]);
  expect(a).not.toBeNull();
  expect(b).toBe(a);

  // Both tabs keep working after a reload (the device was not revoked).
  for (const p of [page, tab2]) {
    await p.reload();
    await expect(p.getByTestId("doc-card").first()).toBeVisible({ timeout: 15_000 });
  }
  expect(page.url()).toContain("/all");
});
