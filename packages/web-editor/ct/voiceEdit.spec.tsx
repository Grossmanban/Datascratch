import { expect, test } from "@playwright/experimental-ct-react";
import { VoiceEditEditor } from "./VoiceEditEditor";

// Voice on the web (D-65): text from voice is an agent edit by "voice", shown as «Голос»; the app
// adds «Оформить» to the selection toolbar.

const edit = (agentId: string, text: string) => ({ type: "text", text, marks: [{ type: "agentEdit", attrs: { agentId, at: "2026-11-09T00:00:00.000Z" } }] });

test("a voice edit is signed «Голос»: tooltip, banner and the accept button", async ({ mount, page }) => {
  await mount(<VoiceEditEditor />);
  await page.waitForFunction(() => window.__voice?.ready === true);
  await page.evaluate((content) => window.__voice!.api.editor.commands.setContent({ type: "doc", content }), [
    { type: "title", content: [{ type: "text", text: "Заметка" }] },
    { type: "paragraph", content: [edit("voice", "Расшифровка голоса")] },
    { type: "paragraph", content: [{ type: "text", text: "Своё" }] },
  ]);
  await expect(page.locator(".ds-agent-edit")).toHaveAttribute("title", "Голос");
  await expect(page.locator(".ds-agent-banner-text")).toHaveText("Правки: Голос · 1 блок");
  await page.locator(".ds-agent-edit").dblclick();
  await expect(page.getByRole("button", { name: "Принять правку: Голос" })).toBeVisible();

  // An edit by another agent too: the banner and its tooltip are the agents' again.
  await page.evaluate((node) => {
    const ed = window.__voice!.api.editor;
    ed.commands.insertContentAt(ed.state.doc.content.size, node);
  }, { type: "paragraph", content: [edit("claude", "От агента")] });
  await expect(page.locator(".ds-agent-banner-text")).toHaveText("Правки агента · 2 блока");
  await expect(page.locator(".ds-agent-edit", { hasText: "От агента" })).toHaveAttribute("title", "Изменено агентом");
});

test("the app's selection action gets the selected text", async ({ mount, page }) => {
  await mount(<VoiceEditEditor />);
  await page.waitForFunction(() => window.__voice?.ready === true);
  await page.evaluate(() => {
    const ed = window.__voice!.api.editor;
    ed.commands.setContent("<h1 data-type=title>Т</h1><p>первая строка</p><p>вторая строка</p>");
  });
  // No selection: no toolbar.
  await expect(page.getByRole("button", { name: "Оформить" })).toHaveCount(0);
  await page.locator(".ds-prose p", { hasText: "первая" }).click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+End");
  await page.getByRole("button", { name: "Оформить" }).click();
  const picked = await page.evaluate(() => window.__voice!.picked);
  expect(picked).toHaveLength(1);
  expect(picked[0]!.text).toBe("первая строка\nвторая строка");
  expect(picked[0]!.to).toBeGreaterThan(picked[0]!.from);
});
