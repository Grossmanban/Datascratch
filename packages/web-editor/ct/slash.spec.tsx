import { expect, test } from "@playwright/experimental-ct-react";
import { TestEditor } from "./TestEditor";

const LONG = "<h1 data-type=title>T</h1>" + Array.from({ length: 40 }, (_, i) => `<p>Paragraph ${i} with some text.</p>`).join("");

test("the / menu stays attached to the caret while scrolling and hides when it leaves the screen", async ({ mount, page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await mount(<TestEditor width={700} html={LONG} />);
  await page.waitForFunction(() => window.__ct?.ready === true);
  await page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: null }));
  // Caret in a paragraph in the middle of the page, then type "/".
  await page.locator(".ds-prose p", { hasText: "Paragraph 8 " }).click();
  await page.keyboard.press("End");
  await page.keyboard.type(" /");
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  const caretTop = () => page.evaluate(() => window.getSelection()!.getRangeAt(0).getBoundingClientRect().top);
  const gap = async () => (await menu.boundingBox())!.y - (await caretTop());
  const before = await gap();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(150);
  expect(Math.abs((await gap()) - before)).toBeLessThan(3);
  // Scroll the caret off the screen: the menu hides.
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(150);
  await expect(menu).toHaveCount(0);
});
