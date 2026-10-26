import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

test("D-45: a note created by an agent shows «Создано агентом», and «Понятно» clears it on every device", async ({ page, browser }) => {
  const email = uniqueEmail("agent-created");
  await signUp(page, email);
  await newDoc(page, "От агента", "Текст агента");
  const noteId = page.url().split("/doc/")[1]!.split(/[?#]/)[0]!;
  await expect.poll(() => page.evaluate(() => "__ds" in window)).toBe(true);
  // What create_note writes into the notebook index (NoteMeta.createdByAgent).
  await page.evaluate((id) => {
    type YMap = { get(k: string): unknown; set(k: string, v: unknown): void };
    const rt = (window as unknown as { __ds: { store: { docs: Map<string, { getMap(n: string): { get(k: string): YMap | undefined } }>; rows: Map<string, { kind: string }> } } }).__ds;
    for (const [docId, doc] of rt.store.docs) {
      if (rt.store.rows.get(docId)?.kind !== "notebook") continue;
      doc.getMap("notes").get(id)?.set("createdByAgent", { agentId: "grant-1", agentName: "Claude", at: new Date().toISOString() });
    }
  }, noteId);

  const strip = page.locator(".ds-agent-created");
  await expect(strip).toContainText("Создано агентом Claude");
  await expectSynced(page);

  // Another device sees it too, and «Понятно» there clears it here.
  const other = await browser.newContext();
  const q = await other.newPage();
  await signIn(q, email);
  await q.goto(`/doc/${noteId}`);
  await expect(q.locator(".ds-agent-created")).toContainText("Создано агентом Claude", { timeout: 20_000 });
  await q.locator(".ds-agent-created").getByRole("button", { name: "Понятно" }).click();
  await expect(q.locator(".ds-agent-created")).toHaveCount(0);
  await expect(strip).toHaveCount(0, { timeout: 20_000 });
  await other.close();

  await page.reload();
  await expect(page.locator(".ds-prose")).toContainText("Текст агента");
  await expect(page.locator(".ds-agent-created")).toHaveCount(0);
});
