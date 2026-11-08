import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { CoAuthorEditors } from "./CoAuthorEditors";

// Bug 2026-11-08 (web-app, real server): with a co-author's caret at the end of the last paragraph,
// Enter right after End put the new paragraph ABOVE that paragraph, for both people: next to the
// caret widget the browser reports End's new DOM selection late, and Enter used the old one (the
// start of the line). Keys now read the pending DOM selection first (schema/keySelection.ts).

const HTML = "<h1 data-type=title>Общая</h1><p>первый</p><p>последний</p>";

const blocks = (page: Page, who: "a" | "b") =>
  page.evaluate((who) => {
    const out: string[] = [];
    window.__co![who]!.editor.state.doc.forEach((n) => out.push(`${n.type.name}:${n.textContent}`));
    return out;
  }, who);

async function setup(page: Page, caretAt: "end" | "start") {
  await page.waitForFunction(() => window.__co?.ready() === true);
  await expect.poll(() => blocks(page, "b")).toEqual(["title:Общая", "paragraph:первый", "paragraph:последний"]);
  // A third co-author (another device) has the caret at the start or the end of the last paragraph.
  await page.evaluate((at) => {
    const doc = window.__co!.a!.editor.state.doc;
    const end = doc.content.size - 1;
    window.__co!.remoteCaretA(at === "end" ? end : end - doc.lastChild!.content.size);
  }, caretAt);
  await expect(page.getByTestId("b").locator(".ds-collab-caret")).toHaveCount(1);
  return page.getByTestId("b").locator(".ds-prose p").last();
}

const lineEnd = (browserName: string) => (browserName === "webkit" ? "Meta+ArrowRight" : "End");
const lineStart = (browserName: string) => (browserName === "webkit" ? "Meta+ArrowLeft" : "Home");
const WANT = ["title:Общая", "paragraph:первый", "paragraph:последний", "paragraph:новый"];

test("click in the line, End, Enter at a co-author's caret: the new paragraph is below, for both", async ({ mount, page, browserName }) => {
  await mount(<CoAuthorEditors html={HTML} />);
  const last = await setup(page, "end");
  await last.click({ position: { x: 5, y: 8 } });
  await page.keyboard.press(lineEnd(browserName));
  await page.keyboard.press("Enter");
  await page.keyboard.type("новый");
  await expect.poll(() => blocks(page, "b")).toEqual(WANT);
  await expect.poll(() => blocks(page, "a")).toEqual(WANT);
});

test("click right of the text (next to a co-author's caret), Enter: below", async ({ mount, page }) => {
  await mount(<CoAuthorEditors html={HTML} />);
  const last = await setup(page, "end");
  const box = (await last.boundingBox())!;
  await last.click({ position: { x: box.width - 4, y: box.height / 2 } });
  await page.keyboard.press("Enter");
  await page.keyboard.type("новый");
  await expect.poll(() => blocks(page, "b")).toEqual(WANT);
});

test("Home to a co-author's caret at the start of the line types at the start", async ({ mount, page, browserName }) => {
  await mount(<CoAuthorEditors html={HTML} />);
  const last = await setup(page, "start");
  const box = (await last.boundingBox())!;
  await last.click({ position: { x: box.width - 4, y: box.height / 2 } });
  await page.keyboard.press(lineStart(browserName));
  await page.keyboard.type("X");
  await expect.poll(() => blocks(page, "b")).toEqual(["title:Общая", "paragraph:первый", "paragraph:Xпоследний"]);
});
