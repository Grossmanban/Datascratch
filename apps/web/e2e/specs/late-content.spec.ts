import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

const MOCK = "http://localhost:8787";

// 2026-10-26: notes made elsewhere (by an agent) lost their title on the web. The editor was mounted
// on the still-empty document, wrote an empty title of its own, and when the content arrived the
// real title became a paragraph. The editor now waits for the content.
test("a note whose content arrives late keeps its title: the editor waits for it", async ({ page, browser, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (it holds the document back)");
  const email = uniqueEmail("late");
  await signUp(page, email);
  await newDoc(page, "Стратегия продукта — черновик", "Тело заметки");
  await expectSynced(page);
  const noteId = page.url().split("/doc/")[1]!.split(/[?#]/)[0]!;

  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await request.post(`${MOCK}/v1/__test/hold-doc`, { data: { docId: noteId, on: true } });
  await q.goto(`/doc/${noteId}`);
  // No editor while the content has not arrived (a click cannot reach it).
  await q.waitForTimeout(1500);
  await expect(q.locator(".ds-prose")).toHaveCount(0);
  await q.mouse.click(700, 300);
  await q.keyboard.type("x");
  await request.post(`${MOCK}/v1/__test/hold-doc`, { data: { docId: noteId, on: false } });
  await expect(q.locator(".ds-prose .ds-title")).toHaveText("Стратегия продукта — черновик", { timeout: 20_000 });
  await expect(q.locator(".ds-prose")).toContainText("Тело заметки");
  await q.locator(".ds-prose p").last().click();
  await q.keyboard.type(" и правка");
  await expectSynced(q);

  // The first device still has its title, and the edit.
  await page.reload();
  await expect(page.locator(".ds-prose .ds-title")).toHaveText("Стратегия продукта — черновик");
  await expect(page.locator(".ds-prose")).toContainText("и правка", { timeout: 20_000 });
  await expect(page.locator(".ds-prose .ds-title")).toHaveCount(1);
  await other.close();
});
