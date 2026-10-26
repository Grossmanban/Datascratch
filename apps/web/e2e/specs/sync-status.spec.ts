import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signUp, uniqueEmail } from "./helpers";

const MOCK = "http://localhost:8787";

test("refused changes show «Не отправлено» and are sent again with «Повторить»", async ({ page, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (it refuses pushes on request)");
  await signUp(page, uniqueEmail("notsent"));
  await newDoc(page, "Отказ сервера", "Первая строка");
  await expectSynced(page);

  await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: true } });
  try {
    await page.keyboard.type(" — правка");
    const status = page.getByTestId("sync-status");
    await expect(status).toHaveAttribute("data-status", "not-sent", { timeout: 15_000 });
    // The note and its notebook index (updatedAt) are both refused.
    await expect(status).toHaveAttribute("aria-label", /^Не отправлено: [12]\./);
    await expect(status).toBeVisible();
    // Still refused: retrying keeps the notice.
    await page.getByTestId("sync-retry").click();
    await expect(status).toHaveAttribute("data-status", "not-sent", { timeout: 15_000 });
  } finally {
    await request.post(`${MOCK}/v1/__test/refuse-pushes`, { data: { on: false } });
  }
  await page.getByTestId("sync-retry").click();
  await expectSynced(page);
  await expect(page.getByTestId("sync-retry")).toHaveCount(0);

  // Nothing waits any more, and the edit is still there after a reload.
  await page.reload();
  await expect(page.locator(".ds-prose")).toContainText("Первая строка — правка");
  await expectSynced(page);
});
