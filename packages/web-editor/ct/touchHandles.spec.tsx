import { expect, test } from "@playwright/experimental-ct-react";
import type { CDPSession, Page } from "@playwright/test";
import { HandleEditor } from "./HandleEditor";

test.use({ hasTouch: true, viewport: { width: 820, height: 700 } });

async function touch(cdp: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
}

async function paragraphBox(page: Page, n: number) {
  const box = await page.locator(".ds-prose p", { hasText: new RegExp(`^Абзац ${n} `) }).boundingBox();
  if (!box) throw new Error(`no paragraph ${n}`);
  return box;
}

const order = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll(".ds-prose > p")].slice(0, 6).map((p) => /Абзац (\d+)/.exec(p.textContent ?? "")?.[1]));

test.beforeEach(async ({ mount, page }) => {
  await mount(<HandleEditor />);
  await page.waitForFunction(() => window.__ct?.ready === true);
});

test("touch: scrolling a note never shows block handles", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const b = await paragraphBox(page, 5);
  const x = b.x + 120;
  let seen = 0;
  await touch(cdp, "touchStart", x, b.y + 300);
  // A finger resting on the text jitters a little before the scroll starts (Safari sends these
  // as touch pointermoves): the old hover logic popped handles up right here.
  for (const dy of [1, -1, 2, 0]) {
    await touch(cdp, "touchMove", x + dy, b.y + 300 + dy);
    await page.waitForTimeout(40);
    seen += await page.locator(".ds-block-handle").count();
  }
  for (let i = 1; i <= 12; i++) {
    await touch(cdp, "touchMove", x, b.y + 300 - i * 20);
    seen += await page.locator(".ds-block-handle").count();
  }
  await touch(cdp, "touchEnd");
  await page.waitForTimeout(250);
  seen += await page.locator(".ds-block-handle").count();
  expect(seen).toBe(0);
});

test("touch: a tap that places the caret shows one quiet handle at that block", async ({ page }) => {
  const b = await paragraphBox(page, 3);
  await page.touchscreen.tap(b.x + 80, b.y + b.height / 2);
  const handle = page.locator(".ds-block-handle");
  await expect(handle).toHaveCount(1);
  await expect(handle).toHaveClass(/is-touch/);
  // Quiet: only the grip, no "+".
  await expect(handle.locator("button")).toHaveCount(0);
  const h = (await handle.boundingBox())!;
  expect(h.x + h.width).toBeLessThanOrEqual(b.x + 2);
  expect(Math.abs(h.y + h.height / 2 - (b.y + Math.min(b.height, 27) / 2))).toBeLessThan(14);
  // Typing hides it; the next tap brings it back.
  await page.keyboard.type("x");
  await expect(handle).toHaveCount(0);
  await page.touchscreen.tap(b.x + 80, b.y + b.height / 2);
  await expect(handle).toHaveCount(1);
});

test("touch: tapping the handle opens the block menu with «Добавить блок ниже»", async ({ page }) => {
  const b = await paragraphBox(page, 2);
  await page.touchscreen.tap(b.x + 80, b.y + b.height / 2);
  const grip = page.locator(".ds-block-handle .ds-handle-grip");
  await expect(grip).toBeVisible();
  const g = (await grip.boundingBox())!;
  await page.touchscreen.tap(g.x + g.width / 2, g.y + g.height / 2);
  await expect(page.locator(".ds-block-menu")).toContainText("Добавить блок ниже");
});

test("touch: long-press on the handle lifts the block and dragging reorders it", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const b = await paragraphBox(page, 1);
  await page.touchscreen.tap(b.x + 80, b.y + b.height / 2);
  const grip = page.locator(".ds-block-handle .ds-handle-grip");
  await expect(grip).toBeVisible();
  const g = (await grip.boundingBox())!;
  const gx = g.x + g.width / 2;
  const gy = g.y + g.height / 2;
  expect(await order(page)).toEqual(["1", "2", "3", "4", "5", "6"]);

  await touch(cdp, "touchStart", gx, gy);
  await page.waitForTimeout(550);
  await expect(page.locator(".ds-block-ghost")).toHaveCount(1);
  await expect(page.locator(".ds-block-lifted-source")).toHaveCount(1);
  // Drop into the lower half of paragraph 3: the block lands after it.
  const p3 = await paragraphBox(page, 3);
  const target = p3.y + p3.height * 0.75;
  for (let i = 1; i <= 8; i++) await touch(cdp, "touchMove", gx, gy + ((target - gy) * i) / 8);
  await expect(page.locator(".ds-drop-indicator")).toBeVisible();
  await touch(cdp, "touchEnd");

  await expect(page.locator(".ds-block-ghost")).toHaveCount(0);
  await expect(page.locator(".ds-block-lifted-source")).toHaveCount(0);
  expect(await order(page)).toEqual(["2", "3", "1", "4", "5", "6"]);
  // The move is one undo step and it is in the Y.Doc.
  const inY = await page.evaluate(() => /Абзац 3[^<]*<\/paragraph><paragraph[^>]*>Абзац 1 /.test(window.__ct!.doc.getXmlFragment("content").toString()));
  expect(inY).toBe(true);
});

test("touch: a short move on the handle cancels the long-press (no lift)", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const b = await paragraphBox(page, 2);
  await page.touchscreen.tap(b.x + 80, b.y + b.height / 2);
  const g = (await page.locator(".ds-block-handle .ds-handle-grip").boundingBox())!;
  await touch(cdp, "touchStart", g.x + g.width / 2, g.y + g.height / 2);
  await touch(cdp, "touchMove", g.x + g.width / 2, g.y + g.height / 2 + 30);
  await page.waitForTimeout(550);
  await expect(page.locator(".ds-block-ghost")).toHaveCount(0);
  await touch(cdp, "touchEnd");
  expect(await order(page)).toEqual(["1", "2", "3", "4", "5", "6"]);
});

test("mouse hover still shows «+» and the grip", async ({ page }) => {
  const b = await paragraphBox(page, 4);
  await page.mouse.move(b.x + 100, b.y + b.height / 2);
  await page.mouse.move(b.x + 110, b.y + b.height / 2);
  const handle = page.locator(".ds-block-handle");
  await expect(handle).toHaveCount(1);
  await expect(handle).not.toHaveClass(/is-touch/);
  await expect(handle.locator("button", { hasText: "+" })).toHaveCount(1);
});

test("Apple Pencil (pointerType pen) never shows handles", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const b = await paragraphBox(page, 4);
  const y = b.y + b.height / 2;
  let seen = 0;
  for (let i = 0; i < 6; i++) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: b.x + 60 + i * 20, y, pointerType: "pen" });
    await page.waitForTimeout(30);
    seen += await page.locator(".ds-block-handle").count();
  }
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: b.x + 80, y, button: "left", clickCount: 1, pointerType: "pen" });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: b.x + 80, y, button: "left", clickCount: 1, pointerType: "pen" });
  await page.waitForTimeout(250);
  seen += await page.locator(".ds-block-handle").count();
  expect(seen).toBe(0);
});
