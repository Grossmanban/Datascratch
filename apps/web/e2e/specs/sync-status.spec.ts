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

test("an item nobody can read is skipped: sync settles (no endless spinner), a calm note, no re-read loop", async ({ page, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (it injects an unreadable item)");
  await signUp(page, uniqueEmail("unreadable"));
  await expectSynced(page);
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);
  const notebookId = await page.evaluate(() => {
    const rt = (window as unknown as { __ds: { store: { rows: Map<string, { kind: string }> } } }).__ds;
    return [...rt.store.rows].find(([, r]) => r.kind === "notebook")![0];
  });
  await request.post(`${MOCK}/v1/__test/inject-unreadable`, { data: { docId: notebookId } });
  await request.post(`${MOCK}/v1/__test/inject-unreadable`, { data: { docId: notebookId } });

  const status = page.getByTestId("sync-status");
  await expect(status).toHaveAttribute("aria-label", /не читаются/, { timeout: 15_000 });
  await expectSynced(page);
  // Still settled a while later: no re-read loop keeps it busy.
  await page.waitForTimeout(6000);
  await expect(status).toHaveAttribute("data-status", "online");
  const debug = (await page.evaluate(() => (window as unknown as { __dsSyncDebug: () => Promise<unknown> }).__dsSyncDebug())) as {
    notSynced: unknown[];
    skipped: { docId: string }[];
  };
  expect(debug.notSynced).toEqual([]);
  expect(debug.skipped.filter((s) => s.docId === notebookId).length).toBe(2);

  // The notebook says so calmly, can be dismissed, stays dismissed, and returns only for new items.
  await page.goto(`/notebook/${notebookId}`);
  const note = page.getByTestId("unreadable-note");
  await expect(note).toContainText("Часть изменений здесь пока не читается");
  await page.getByTestId("unreadable-dismiss").click();
  await expect(note).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("folder-strip").or(page.getByText("В папке нет документов")).or(page.getByTestId("doc-card")).first()).toBeVisible();
  await expect(note).toHaveCount(0);
  // Still reachable from the notebook's menu.
  await page.getByTestId("sidebar").getByRole("link", { name: /Заметки/ }).first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Нечитаемые изменения" }).click();
  await expect(note).toBeVisible();
  await page.getByTestId("unreadable-dismiss").click();
  await expect(note).toHaveCount(0);
  await request.post(`${MOCK}/v1/__test/inject-unreadable`, { data: { docId: notebookId } });
  await expect(note).toBeVisible({ timeout: 15_000 });
});
