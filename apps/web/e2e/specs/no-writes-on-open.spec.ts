import { expect, test } from "@playwright/test";
import { expectSynced, newDoc, signIn, signUp, uniqueEmail } from "./helpers";

const MOCK = "http://localhost:8787";

// 2026-10-26: devices wrote to notes (and notebook indexes) on merely opening them, before or while
// their content arrived — one way to lose an agent's title. Signing in and opening a note made
// elsewhere must send nothing until the user edits.
test("signing in on a new device and opening a note made elsewhere (as an agent writes it) sends nothing", async ({ page, browser, request }) => {
  test.skip(!!process.env.E2E_SERVER_URL, "mock server only (it holds the document back)");
  test.setTimeout(120_000);
  const email = uniqueEmail("nowrite");
  await signUp(page, email);
  await newDoc(page, "Черновик", "x");
  await expectSynced(page);
  const noteId = page.url().split("/doc/")[1]!.split(/[?#]/)[0]!;
  // Rewrite its content the way packages/agents create_note builds it: blockId on every block,
  // the agentEdit mark on the text, the title as the first block.
  await expect.poll(() => page.evaluate(() => "__dsTest" in window)).toBe(true);
  await page.evaluate((id) => {
    type El = { setAttribute(k: string, v: unknown): void; insert(i: number, c: unknown[]): void };
    type T = { insert(i: number, s: string, a?: unknown): void };
    const w = window as unknown as {
      __dsTest: { Y: { XmlElement: new (n: string) => El; XmlText: new () => T } };
      __ds: { store: { docs: Map<string, { getXmlFragment(n: string): { length: number; delete(i: number, n: number): void; insert(i: number, c: unknown[]): void }; transact(f: () => void): void }> } };
    };
    const { Y } = w.__dsTest;
    const doc = w.__ds.store.docs.get(id)!;
    const content = doc.getXmlFragment("content");
    const mark = { agentEdit: { agentId: "agent-claude", at: new Date().toISOString() } };
    const block = (name: string, text: string, attrs: Record<string, unknown> = {}) => {
      const el = new Y.XmlElement(name);
      el.setAttribute("blockId", crypto.randomUUID());
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      const t = new Y.XmlText();
      el.insert(0, [t]);
      t.insert(0, text, mark);
      return el;
    };
    doc.transact(() => {
      content.delete(0, content.length);
      content.insert(0, [block("title", "Стратегия продукта — черновик"), block("paragraph", "Вступление."), block("heading", "Цели", { level: 2 }), block("paragraph", "Текст.")]);
    });
  }, noteId);
  await expect(page.locator(".ds-prose .ds-title")).toContainText("Стратегия продукта — черновик");
  await expectSynced(page);

  const other = await browser.newContext();
  const q = await other.newPage();
  const pushes: string[] = [];
  q.on("websocket", (ws) =>
    ws.on("framesent", (f) => {
      const s = typeof f.payload === "string" ? f.payload : "";
      if (s.includes('"type":"push"') || s.includes('"type":"snapshot"')) pushes.push(s.slice(0, 80));
    }),
  );
  // The note's content arrives late on the new device.
  await request.post(`${MOCK}/v1/__test/hold-doc`, { data: { docId: noteId, on: true } });
  await signIn(q, email);
  await q.goto(`/doc/${noteId}`);
  await q.waitForTimeout(1500);
  await q.mouse.click(700, 300);
  await request.post(`${MOCK}/v1/__test/hold-doc`, { data: { docId: noteId, on: false } });
  await expect(q.locator(".ds-prose .ds-title")).toContainText("Стратегия продукта — черновик", { timeout: 20_000 });
  await q.locator(".ds-prose").click(); // focusing is not editing
  await q.waitForTimeout(3000);
  await q.goto("/all");
  await expect(q.getByTestId("doc-card").filter({ hasText: "Стратегия продукта — черновик" })).toBeVisible();
  await q.waitForTimeout(2000);
  expect(pushes).toEqual([]);
  await other.close();
});
