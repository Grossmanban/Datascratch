import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { AgentTitleEditor, type AgentTitleVariant } from "./AgentTitleEditor";

// Data bug 2026-10-26 (note 01a17993…): opening an agent's note rewrote its title — the title became
// a paragraph, a new empty title appeared and got the default name. Real packages/agents output.

async function open(page: Page) {
  await page.waitForFunction(() => window.__at?.ready === true);
  await page.waitForTimeout(500);
}

const state = (page: Page) => page.evaluate(() => ({ updates: window.__at!.updates, blocks: window.__at!.blocks(), before: window.__at!.before }));

for (const variant of ["agent", "paragraphBefore", "twoTitles"] as AgentTitleVariant[]) {
  test(`${variant}: opening writes nothing, typing in the text keeps the title as it is`, async ({ mount, page }) => {
    await mount(<AgentTitleEditor variant={variant} />);
    await open(page);
    let s = await state(page);
    if (variant === "twoTitles") {
      // The stray empty title (seeded by another client) is removed on open; nothing else changes.
      expect(s.blocks).toEqual(s.before.slice(1));
      s = { ...s, before: s.before.slice(1) };
    } else {
      expect(s.updates, "zero Y updates on open").toBe(0);
      expect(s.blocks).toEqual(s.before);
    }
    // The user clicks into the last paragraph and types.
    const p = page.locator(".ds-prose > p").last();
    await p.click();
    await page.keyboard.press("End");
    await page.keyboard.type("!");
    await page.locator(".ds-prose").evaluate((e) => (e as HTMLElement).blur());
    await page.waitForTimeout(200);
    s = { ...(await state(page)), before: s.before };
    // Same blocks, same ids, same title text; only the edited paragraph changed.
    expect(s.blocks.length).toBe(s.before.length);
    const changed = s.blocks.filter((b, i) => b !== s.before[i]);
    expect(changed.length).toBe(1);
    expect(changed[0]!.endsWith("!")).toBe(true);
    expect(s.blocks.filter((b) => b.startsWith("title#"))).toEqual(s.before.filter((b) => b.startsWith("title#")));
    expect(s.blocks.join("\n")).not.toContain("Заметка 26 октября 2026");
  });
}

test("an existing note's empty title is never named automatically (no focusTitle)", async ({ mount, page }) => {
  await mount(<AgentTitleEditor variant="emptyTitle" />);
  await open(page);
  // Click into the empty title, then into the text, then away: nothing is named.
  await page.locator(".ds-prose .ds-title").click();
  await page.keyboard.press("Enter");
  await page.locator(".ds-prose > p").first().click();
  await page.locator(".ds-prose").evaluate((e) => (e as HTMLElement).blur());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__at!.api.fillEmptyTitleIfNeeded())).toBe(false);
  const s = await state(page);
  expect(s.blocks[0]).toBe(s.before[0]);
  expect(s.blocks.join("\n")).not.toContain("Заметка 26 октября 2026");
});
