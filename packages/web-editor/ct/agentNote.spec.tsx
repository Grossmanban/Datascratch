import { expect, test } from "@playwright/experimental-ct-react";
import { AgentNoteEditor } from "./AgentNoteEditor";
import { EXISTING_NOTE_ID } from "./agentFixture";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
});

test("every block of the agent-created note renders, including Cyrillic Mermaid diagrams", async ({ mount, page }) => {
  await mount(<AgentNoteEditor />);
  await page.waitForFunction(() => window.__fx?.ready === true);
  await expect(page.locator(".ds-callout")).toHaveCount(4);
  await expect(page.locator(".ds-prose table")).toHaveCount(1);
  await expect(page.locator(".ds-math .katex")).toHaveCount(1);
  // Both diagrams become SVG with their Cyrillic labels (lazy-loaded Mermaid).
  await expect(page.locator(".ds-mermaid svg")).toHaveCount(2, { timeout: 20_000 });
  const labels = await page.locator(".ds-mermaid").allInnerTexts();
  expect(labels.join(" ")).toContain("Начало");
  expect(labels.join(" ")).toContain("Агент");
  await expect(page.locator(".ds-mermaid .is-error")).toHaveCount(0);
  await expect(page.locator(".ds-task")).toHaveCount(2);
});

test("wiki links: an existing link opens on a single click, a missing one creates the note", async ({ mount, page }) => {
  await mount(<AgentNoteEditor />);
  await page.waitForFunction(() => window.__fx?.ready === true);
  await page.locator(".ds-note-link").first().click();
  await expect.poll(() => page.evaluate(() => window.__fx!.opened)).toEqual([EXISTING_NOTE_ID]);

  const missing = page.locator("[data-missing-link]");
  await expect(missing).toHaveCount(1);
  await missing.click();
  await expect.poll(() => page.evaluate(() => window.__fx!.created)).toEqual(["Несуществующая"]);
  await expect(page.locator("[data-missing-link]")).toHaveCount(0);
  await expect(page.locator(".ds-note-link")).toHaveCount(2);
});

test("agent edits: quiet highlight, per-block accept and accept all", async ({ mount, page }) => {
  await mount(<AgentNoteEditor />);
  await page.waitForFunction(() => window.__fx?.ready === true);
  const banner = page.getByRole("status").filter({ hasText: "Правки агента" });
  await expect(banner).toBeVisible();
  const before = await page.locator(".ds-agent-accept").count();
  expect(before).toBeGreaterThan(5);
  // Accept one block.
  await page.locator(".ds-agent-accept").first().click();
  await expect(page.locator(".ds-agent-accept")).toHaveCount(before - 1);
  // Accept the rest.
  await banner.getByRole("button", { name: "Принять все" }).click();
  await expect(page.locator(".ds-agent-edit")).toHaveCount(0);
  await expect(page.locator(".ds-agent-accept")).toHaveCount(0);
  await expect(banner).toHaveCount(0);
  // Text stays; only the marks are gone (in the Y document too).
  const stillMarked = await page.evaluate(() => JSON.stringify(window.__fx!.doc.getXmlFragment("content").toJSON()).includes("agentEdit"));
  expect(stillMarked).toBe(false);
  expect(await page.locator(".ds-prose").innerText()).toContain("Тест форматирования");
});
