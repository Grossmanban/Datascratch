import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

test.setTimeout(120_000);

test("offline: edits are kept locally, survive reload and sync when back online", async ({ page, context, browser }) => {
  const email = uniqueEmail("offline");
  await signUp(page, email);
  await expectSynced(page);
  // Let the service worker take control so the app shell loads without network.
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
  const swState = () =>
    page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return JSON.stringify(
        regs.map((r) => ({ scope: r.scope, active: r.active?.state, waiting: r.waiting?.state, installing: r.installing?.state })),
      );
    });
  try {
    await expect.poll(swState, { timeout: 45_000 }).toContain('"active":"activated"');
  } catch {
    throw new Error(`Service worker never activated. Registrations: ${await swState()}\nConsole:\n${logs.join("\n")}`);
  }
  await page.reload();
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15_000 });

  await context.setOffline(true);
  await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "offline", { timeout: 15_000 });
  await newDoc(page, "Записано без сети", "Поезд, тоннель, вдохновение");
  await page.waitForTimeout(800);

  await page.reload();
  await expect(page.getByTestId("sidebar")).toContainText("Записано без сети");
  await page.getByTestId("sidebar").getByText("Записано без сети").click();
  await expect(page.locator(".ds-prose")).toContainText("Поезд, тоннель");

  await context.setOffline(false);
  await expectSynced(page);

  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await signIn(p2, email);
  await expect(p2.getByTestId("doc-card").filter({ hasText: "Записано без сети" })).toBeVisible({ timeout: 20_000 });
  await ctx2.close();
});
