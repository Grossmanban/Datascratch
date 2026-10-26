import { expect, test } from "@playwright/experimental-ct-react";
import { AgentCreatedEditor, AgentNoteEditor } from "./AgentNoteEditor";
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

test("D-45: an agent-created note shows «Создано агентом» until acknowledged", async ({ mount, page }) => {
  await mount(<AgentCreatedEditor />);
  const strip = page.getByRole("status").filter({ hasText: "Создано агентом Claude" });
  await expect(strip).toBeVisible();
  await strip.getByRole("button", { name: "Понятно" }).click();
  await expect(strip).toHaveCount(0);
});

test("agent code blocks, lists and inline math render (and code survives an edit)", async ({ mount, page }) => {
  // The design system's Tailwind preflight resets list markers; the editor must restore them.
  await page.addStyleTag({ content: "ul, ol { list-style: none; }" });
  await mount(<AgentNoteEditor />);
  await page.waitForFunction(() => window.__fx?.ready === true);
  await expect(page.locator(".ds-prose pre")).toHaveCount(3);
  const styles = await page.evaluate(() => [...document.querySelectorAll(".ds-prose ul:not([data-type=taskList]), .ds-prose ol")].map((l) => getComputedStyle(l).listStyleType));
  expect(styles).toEqual(["disc", "decimal"]);
  await expect(page.locator(".ds-inline-math .katex")).toHaveCount(1);
  await expect(page.locator(".ds-inline-math-src")).toBeHidden();
  // An edit elsewhere must not drop the agent's code blocks from the document.
  await page.evaluate(() => {
    const e = window.__fx!.api.editor;
    e.chain().focus().setTextSelection(e.state.doc.content.size - 2).insertContent(" ok").run();
  });
  await page.waitForTimeout(100);
  const codeInY = await page.evaluate(() => (window.__fx!.doc.getXmlFragment("content").toArray() as { nodeName?: string }[]).filter((e) => e.nodeName === "codeBlock").length);
  expect(codeInY).toBe(3);
  // No drawing room below the note unless drawing is possible (no stylus, finger drawing off).
  expect(await page.evaluate(() => document.querySelector(".ds-pen-room"))).toBeNull();
});

test("table column alignment (paragraph.textAlign in cells) is shown and kept on edit", async ({ mount, page }) => {
  await mount(<AgentNoteEditor />);
  await page.waitForFunction(() => window.__fx?.ready === true);
  const cell = page.locator(".ds-prose td p", { hasText: "42" });
  await expect(cell).toHaveCSS("text-align", "right");
  await cell.click();
  await page.keyboard.press("End");
  await page.keyboard.type("0");
  await expect(page.locator(".ds-prose td p", { hasText: "420" })).toHaveCSS("text-align", "right");
  // The alignment stays on the cell paragraph in the Y.Doc after the edit (agent-marked "42" + typed "0").
  const y = await page.evaluate(() => window.__fx!.doc.getXmlFragment("content").toString());
  expect(y).toMatch(/<paragraph[^>]*textAlign="right"[^>]*>(?:(?!<\/paragraph>).)*42(?:(?!<\/paragraph>).)*0<\/paragraph>/);
});
