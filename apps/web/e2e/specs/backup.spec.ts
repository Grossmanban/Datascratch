import { expect, test, type Page } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";

// spec/06 «Резервные копии»: the server admin sees the last good backup in «Синхронизация»
// (GET /v1/admin/backup), red when it is stale, neutral when the server can't see it.

const MOCK = "http://localhost:8787";
const setBackup = (page: Page, state: "ok" | "failed" | "unavailable") => page.request.post(`${MOCK}/__mock/backup`, { data: { state } });

test.describe.configure({ mode: "serial" });
test.skip(!!process.env.E2E_SERVER_URL, "mock server only (who is admin is a server setting)");

test.afterAll(async ({ request }) => {
  await request.post(`${MOCK}/__mock/backup`, { data: { state: "ok" } });
});

test("backups: the admin sees how long ago, how big and how many; red when stale; neutral when unknown", async ({ page }) => {
  await setBackup(page, "ok");
  await signUp(page, uniqueEmail("voiceadmin-backup"));
  await page.goto("/settings/sync");
  const status = page.getByTestId("backup-status");
  await expect(status).toHaveText("Резервная копия: 5 ч назад · 12 МБ · 14 копий");
  await expect(status).toHaveAttribute("data-state", "ok");

  // The last run failed and the last good copy is two days old: red, with the reason.
  await setBackup(page, "failed");
  await page.reload();
  await expect(status).toHaveText("Резервная копия: 2 дн. назад · 9 МБ · 13 копий · последний запуск не удался (db)");
  await expect(status).toHaveAttribute("data-state", "stale");

  // A server without the backup setup: said calmly, not as an error.
  await setBackup(page, "unavailable");
  await page.reload();
  await expect(status).toHaveText("Состояние копий не видно на этом сервере");
  await expect(status).toHaveAttribute("data-state", "unknown");
});

test("backups: an ordinary account sees no backup card", async ({ page }) => {
  await signUp(page, uniqueEmail("backup-user"));
  await page.goto("/settings/sync");
  await expect(page.getByTestId("settings-sync")).toBeVisible();
  await expect(page.getByTestId("diag-status")).toBeVisible();
  await expect(page.getByTestId("backup-card")).toHaveCount(0);
});
