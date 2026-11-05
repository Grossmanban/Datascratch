import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { TestEditor } from "./TestEditor";

// Bug 2026-11-05 (owner, Safari): after title → Enter, Enter in the text did not split the paragraph
// (the default block was a title, deleted at once by the title repair). Runs in Chromium and WebKit.

async function ready(page: Page) {
  await page.waitForFunction(() => window.__ct?.ready === true);
  await page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: null }));
}

const blocks = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    window.__ct!.api.editor.state.doc.forEach((n) => out.push(`${n.type.name}:${n.textContent}`));
    return out;
  });

for (const start of [
  { name: "a new note (empty title seeded)", html: "<h1 data-type=title></h1><p></p>" },
  { name: "a note with text", html: "<h1 data-type=title>Есть</h1><p>текст</p>" },
]) {
  test(`${start.name}: title → Enter → text → Enter splits, again and again`, async ({ mount, page }) => {
    await mount(<TestEditor width={700} html={start.html} defaultTitle="Заметка" />);
    await ready(page);
    await page.evaluate(() => window.__ct!.api.focusTitle());
    await expect.poll(() => page.evaluate(() => window.__ct!.api.editor.isFocused)).toBe(true);
    await page.keyboard.type(" Заголовок");
    await page.keyboard.press("Enter");
    // Text that arrives without key presses (an input method / dictation) before Enter, too.
    await page.keyboard.press("End");
    await page.keyboard.insertText("первый");
    await page.keyboard.press("Enter");
    await page.keyboard.type("второй");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("третий");
    const out = await blocks(page);
    expect(out.filter((b) => b.startsWith("title"))).toHaveLength(1);
    expect(out.slice(-4)).toEqual([expect.stringMatching(/^paragraph:.*первый$/), "paragraph:второй", "paragraph:", "paragraph:третий"]);
    await expect(page.locator(".ds-prose p")).toHaveCount(out.filter((b) => b.startsWith("paragraph")).length);
  });
}
