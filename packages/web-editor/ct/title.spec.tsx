import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { TestEditor } from "./TestEditor";

// spec/04 «Название новой заметки» (Apple Notes style, same API as the iOS editor).
const NAME = "Заметка 26 октября 2026";

async function ready(page: Page) {
  await page.waitForFunction(() => window.__ct?.ready === true);
  await page.evaluate(() => window.__ct!.api.pen.setSettings({ tool: null }));
}

const blocks = (page: Page) =>
  page.evaluate(() => {
    const doc = window.__ct!.api.editor.state.doc;
    const out: string[] = [];
    doc.forEach((n) => out.push(`${n.type.name}:${n.textContent}`));
    return out;
  });

/** api.focusTitle(), then wait until the editor has focus with the caret in the title. */
async function focusTitle(page: Page) {
  await page.evaluate(() => window.__ct!.api.focusTitle());
  await expect
    .poll(() => page.evaluate(() => window.__ct!.api.editor.isFocused && window.__ct!.api.editor.state.selection.$from.parent.type.name === "title"))
    .toBe(true);
}

/** The caret's block index (top level) and offset in it. */
const caret = (page: Page) =>
  page.evaluate(() => {
    const { $from } = window.__ct!.api.editor.state.selection;
    return { block: $from.index(0), offset: $from.parentOffset, text: $from.parent.textContent };
  });

test("focusTitle puts the caret at the end of the title", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title>Черновик</h1><p>текст</p>" defaultTitle={NAME} />);
  await ready(page);
  await focusTitle(page);
  expect(await caret(page)).toEqual({ block: 0, offset: "Черновик".length, text: "Черновик" });
  // Typing goes into the title.
  await page.keyboard.type("!");
  expect((await blocks(page))[0]).toBe("title:Черновик!");
});

test("Enter in an empty title names the note and moves to the start of the text", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title></h1><p>Первый абзац</p>" defaultTitle={NAME} />);
  await ready(page);
  await focusTitle(page);
  await page.keyboard.press("Enter");
  expect(await blocks(page)).toEqual([`title:${NAME}`, "paragraph:Первый абзац"]);
  expect(await caret(page)).toEqual({ block: 1, offset: 0, text: "Первый абзац" });
});

test("Enter in a named title never splits it and creates the text paragraph if missing", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title>Идеи</h1><ul><li><p>пункт</p></li></ul>" defaultTitle="не нужно" />);
  await ready(page);
  await focusTitle(page);
  // Caret in the middle of the title.
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  // The body starts with a list, not text: an empty paragraph is inserted for the caret.
  expect(await blocks(page)).toEqual(["title:Идеи", "paragraph:", "bulletList:пункт"]);
  expect(await caret(page)).toEqual({ block: 1, offset: 0, text: "" });
  await page.keyboard.type("Текст");
  expect((await blocks(page)).slice(0, 2)).toEqual(["title:Идеи", "paragraph:Текст"]);
});

test("leaving an empty title (click into the text) names the note and keeps the caret on the text", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title></h1><p>текст заметки</p>" defaultTitle="Заметка" />);
  await ready(page);
  await focusTitle(page);
  await page.locator(".ds-prose p", { hasText: "текст заметки" }).click();
  await expect.poll(async () => (await blocks(page))[0]).toBe("title:Заметка");
  const c = await caret(page);
  expect(c.block).toBe(1);
  expect(c.text).toBe("текст заметки");
  // A named title is not touched again.
  expect(await page.evaluate(() => window.__ct!.api.fillEmptyTitleIfNeeded())).toBe(false);
});

test("clicking straight into the text of a note with an empty title does not name it", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title></h1><p>текст агента</p>" defaultTitle="Заметка" />);
  await ready(page);
  await page.locator(".ds-prose p", { hasText: "текст агента" }).click();
  await page.keyboard.type("!");
  await page.waitForTimeout(150);
  expect((await blocks(page))[0]).toBe("title:");
});

test("blurring an empty title names the note", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title></h1><p>текст</p>" defaultTitle="Заметка" />);
  await ready(page);
  await focusTitle(page);
  await page.evaluate(() => window.__ct!.api.editor.commands.blur());
  await expect.poll(async () => (await blocks(page))[0]).toBe("title:Заметка");
});

test("fillEmptyTitleIfNeeded (on close) fills only a new note's empty title, once, as one undo step", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title></h1><p>текст</p>" defaultTitle={NAME} />);
  await ready(page);
  // Not a new note yet (the app did not call focusTitle): nothing is named.
  expect(await page.evaluate(() => window.__ct!.api.fillEmptyTitleIfNeeded())).toBe(false);
  await focusTitle(page);
  await page.evaluate(() => window.__ct!.api.undoManager.stopCapturing());
  expect(await page.evaluate(() => window.__ct!.api.fillEmptyTitleIfNeeded())).toBe(true);
  expect((await blocks(page))[0]).toBe(`title:${NAME}`);
  expect(await page.evaluate(() => window.__ct!.api.fillEmptyTitleIfNeeded())).toBe(false);
  // In the Y.Doc, and undoable on its own.
  expect(await page.evaluate(() => window.__ct!.doc.getXmlFragment("content").toString())).toContain(NAME);
  await page.evaluate(() => window.__ct!.api.undoManager.undo());
  expect((await blocks(page))[0]).toBe("title:");
});

test("without defaultTitle an empty title stays empty", async ({ mount, page }) => {
  await mount(<TestEditor width={700} html="<h1 data-type=title></h1><p>текст</p>" />);
  await ready(page);
  await focusTitle(page);
  await page.keyboard.press("Enter");
  expect(await blocks(page)).toEqual(["title:", "paragraph:текст"]);
  expect(await page.evaluate(() => window.__ct!.api.fillEmptyTitleIfNeeded())).toBe(false);
});
