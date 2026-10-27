import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { PasteEditor } from "./PasteEditor";
import { GOOGLE_DOCS, MARKDOWN, WEB_PAGE, WORD } from "./pasteFixtures";

type J = { type: string; attrs?: Record<string, unknown>; content?: J[]; marks?: { type: string; attrs?: Record<string, unknown> }[]; text?: string };

async function ready(page: Page) {
  await page.waitForFunction(() => window.__paste?.ready === true);
}

/** Puts the caret at the start of the (empty) body paragraph or into the title. */
async function caret(page: Page, where: "body" | "title") {
  await page.evaluate((where) => {
    const ed = window.__paste!.api.editor;
    const titleSize = ed.state.doc.firstChild!.nodeSize;
    ed.commands.focus(where === "title" ? titleSize - 1 : titleSize + 1);
  }, where);
}

/** Fires a real paste event with the given clipboard flavours. */
async function paste(page: Page, data: { html?: string; text?: string }) {
  await page.evaluate((data) => {
    const dt = new DataTransfer();
    if (data.html !== undefined) dt.setData("text/html", data.html);
    dt.setData("text/plain", data.text ?? "");
    document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, data);
}

const body = (page: Page) => page.evaluate(() => (window.__paste!.api.editor.getJSON().content ?? []).slice(1) as J[]);
const text = (n: J): string => (n.text ?? "") + (n.content ?? []).map(text).join("");
const marksOf = (n: J, out = new Set<string>()): Set<string> => {
  n.marks?.forEach((m) => out.add(m.type));
  n.content?.forEach((c) => marksOf(c, out));
  return out;
};
const find = (nodes: J[], type: string): J[] => nodes.flatMap((n) => [...(n.type === type ? [n] : []), ...find(n.content ?? [], type)]);

test("Google Docs: heading, marks, link, nested list, table with column alignment, image; colours and fonts dropped", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await paste(page, { html: GOOGLE_DOCS, text: "План проекта" });
  const nodes = await body(page);
  expect(nodes[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
  expect(text(nodes[0]!)).toBe("План проекта");
  const para = nodes.find((n) => n.type === "paragraph" && text(n).includes("жирный"))!;
  const runs = para.content!;
  expect(runs.find((r) => r.text === "жирный")!.marks!.map((m) => m.type)).toEqual(["bold"]);
  expect(runs.find((r) => r.text === " курсив")!.marks!.map((m) => m.type)).toEqual(["italic"]);
  expect(runs.find((r) => r.text === "ссылка")!.marks!.find((m) => m.type === "link")!.attrs!.href).toBe("https://example.com/doc");
  expect(runs.find((r) => r.text?.startsWith("Обычный"))!.marks).toBeUndefined();
  // No colour/highlight from the styles; the Docs wrapper did not make everything bold.
  expect([...marksOf({ type: "doc", content: nodes })].sort()).toEqual(["bold", "italic", "link", "underline"].filter((m) => marksOf({ type: "doc", content: nodes }).has(m)).sort());
  expect(marksOf({ type: "doc", content: nodes }).has("textColor")).toBe(false);
  expect(marksOf({ type: "doc", content: nodes }).has("highlight")).toBe(false);
  expect(text(nodes[0]!)).toBe("План проекта");
  // Nested list: «Вложенный пункт» inside «Пункт один».
  const list = nodes.find((n) => n.type === "bulletList")!;
  expect(list.content!.map((li) => text(li.content![0]!))).toEqual(["Пункт один", "Пункт два"]);
  expect(text(find(list.content![0]!.content ?? [], "bulletList")[0]!)).toBe("Вложенный пункт");
  // Table: the second column is centred on the cells, not on the paragraphs.
  const cells = find(nodes, "tableCell").concat(find(nodes, "tableHeader"));
  expect(cells.filter((c) => c.attrs!.align === "center").map(text).sort()).toEqual(["готово", "Статус"].sort());
  expect(find(nodes, "paragraph").some((p) => p.attrs?.textAlign)).toBe(false);
  // The image: fetched through the host and stored.
  await expect.poll(() => page.evaluate(() => window.__paste!.fetched)).toEqual(["https://lh7-rt.googleusercontent.com/docsz/AD_4nXexample"]);
  await expect.poll(async () => find(await body(page), "image")[0]?.attrs?.attachmentId).toBe("att-1");
});

test("Word: heading, marks, bulleted list with a nested level, numbered list, right-aligned column; local images dropped", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await paste(page, { html: WORD, text: "Отчёт за неделю" });
  const nodes = await body(page);
  expect(nodes[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
  expect(text(nodes[0]!)).toBe("Отчёт за неделю");
  const para = nodes[1]!;
  expect(para.content!.find((r) => r.text === "Жирный")!.marks!.map((m) => m.type)).toEqual(["bold"]);
  expect(para.content!.find((r) => r.text === "курсив")!.marks!.map((m) => m.type)).toEqual(["italic"]);
  expect(para.content!.find((r) => r.text === "подчёркнутый")!.marks!.map((m) => m.type)).toEqual(["underline"]);
  const bullets = nodes.find((n) => n.type === "bulletList")!;
  expect(bullets.content!.map((li) => text(li.content![0]!))).toEqual(["Первый пункт", "Второй пункт"]);
  expect(text(find(bullets.content![0]!.content ?? [], "bulletList")[0]!)).toBe("Вложенный");
  const numbered = nodes.find((n) => n.type === "orderedList")!;
  expect(numbered.content!.map((li) => text(li))).toEqual(["Первый шаг", "Второй шаг"]);
  // Markers (·, o, 1.) are gone from the text.
  expect(JSON.stringify(nodes)).not.toMatch(/"·|"o\\u00a0|1\.\s/);
  const cells = find(nodes, "tableCell");
  expect(cells.filter((c) => c.attrs!.align === "right").map(text)).toEqual(["Сумма", "120"]);
  expect(find(nodes, "image")).toHaveLength(0);
  expect(text(nodes[nodes.length - 1]!)).toContain("Конец");
});

test("web page: two images keep their order and place in the text and are stored; quote, code, nested numbered list, rule, table; one undo removes the paste", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await paste(page, { html: WEB_PAGE, text: "Как это устроено" });
  let nodes = await body(page);
  const order = nodes.map((n) => (n.type === "image" ? `image:${n.attrs!.alt}` : n.type === "paragraph" ? `p:${text(n).slice(0, 12)}` : n.type));
  expect(order.slice(0, 5)).toEqual(["heading", "p:Текст до кар", "image:Первая", "p:Текст между ", "image:Кот"]);
  // The page's figcaption became the image caption, not a stray paragraph.
  expect(nodes[4]!.attrs!.caption).toBe("Подпись");
  expect(nodes[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
  expect([...marksOf(nodes[1]!)].sort()).toEqual(["bold", "code", "italic", "link", "strike"]);
  expect(nodes.some((n) => n.type === "blockquote")).toBe(true);
  expect(find(nodes, "codeBlock")[0]).toMatchObject({ attrs: { language: "js" } });
  expect(text(find(nodes, "codeBlock")[0]!)).toBe("const x = 1;\nconsole.log(x);");
  const ol = nodes.find((n) => n.type === "orderedList")!;
  expect(find(ol.content![0]!.content ?? [], "orderedList")).toHaveLength(1);
  expect(nodes.some((n) => n.type === "horizontalRule")).toBe(true);
  expect(find(nodes, "tableHeader").find((c) => text(c) === "Цена")!.attrs!.align).toBe("right");
  expect(find(nodes, "tableCell").find((c) => text(c) === "120")!.attrs!.align).toBe("right");
  expect(nodes.find((n) => n.type === "heading" && text(n) === "Мелкий заголовок")).toMatchObject({ attrs: { level: 3 } });
  // Both images get stored (data: decoded locally, https fetched by the host) in their places.
  await expect.poll(async () => find(await body(page), "image").map((i) => i.attrs!.attachmentId)).toEqual(["att-1", "att-2"]);
  expect(await page.evaluate(() => window.__paste!.fetched)).toEqual(["https://example.com/cat.png"]);
  // The whole paste is one undo step (the attachment swaps are not steps).
  await page.evaluate(() => window.__paste!.api.undoManager.undo());
  nodes = await body(page);
  expect(nodes.map((n) => n.type)).toEqual(["paragraph"]);
});

test("a remote image never goes into an <img>: ring only until the bytes are local (blob:)", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await paste(page, { html: `<p>до</p><img src="https://example.com/slow.png" alt="Медленная"><p>после</p>`, text: "до после" });
  await expect(page.locator(".ds-upload-ring")).toBeVisible();
  const srcs = () => page.evaluate(() => Array.from(document.querySelectorAll(".ds-prose img")).map((i) => i.getAttribute("src") ?? ""));
  expect((await srcs()).filter((s) => /^https?:/.test(s))).toEqual([]);
  await expect.poll(async () => find(await body(page), "image")[0]?.attrs?.attachmentId, { timeout: 5000 }).toBe("att-1");
  expect((await srcs()).filter((s) => /^https?:/.test(s))).toEqual([]);
});

test("an https image that cannot be fetched stays as a link to its URL", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await paste(page, { html: `<p>до</p><img src="https://blocked.example/x.png" alt="Схема"><p>после</p>`, text: "до после" });
  await expect.poll(async () => find(await body(page), "image").length).toBe(0);
  const nodes = await body(page);
  const link = nodes.flatMap((n) => n.content ?? []).find((r) => r.marks?.some((m) => m.type === "link"))!;
  expect(link.text).toBe("Схема");
  expect(link.marks!.find((m) => m.type === "link")!.attrs!.href).toBe("https://blocked.example/x.png");
});

test("Markdown text is pasted as Markdown; Shift+paste keeps it as plain text", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await paste(page, { text: MARKDOWN });
  const nodes = await body(page);
  expect(nodes[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
  expect([...marksOf(nodes[1]!)].sort()).toEqual(["bold", "code", "italic", "link"]);
  const bullets = nodes.find((n) => n.type === "bulletList")!;
  expect(find(bullets.content![0]!.content ?? [], "bulletList")).toHaveLength(1);
  expect(nodes.some((n) => n.type === "orderedList")).toBe(true);
  const tasks = nodes.find((n) => n.type === "taskList")!;
  expect(tasks.content!.map((t) => [t.attrs!.state, text(t)])).toEqual([["open", "задача"], ["done", "сделано"]]);
  expect(nodes.some((n) => n.type === "blockquote")).toBe(true);
  expect(find(nodes, "tableCell").find((c) => text(c) === "1")!.attrs!.align).toBe("right");

  // Shift+Cmd/Ctrl+V: the same text stays plain (no heading, the # is kept).
  await page.evaluate(() => {
    // A fresh paragraph after the table (the last block) for the plain paste.
    const ed = window.__paste!.api.editor;
    const end = ed.state.doc.content.size;
    ed.chain().insertContentAt(end, { type: "paragraph" }).focus(end + 1).run();
  });
  await page.keyboard.down("Shift");
  await paste(page, { text: "# не заголовок\n\n**не жирный**" });
  await page.keyboard.up("Shift");
  const after = await body(page);
  const plain = after.filter((n) => text(n).includes("не заголовок") || text(n).includes("не жирный"));
  expect(plain.every((n) => n.type === "paragraph")).toBe(true);
  expect(plain.map(text).join("\n")).toContain("# не заголовок");
  expect(plain.some((n) => marksOf(n).has("bold"))).toBe(false);
});

test("pasting into the title takes plain text only", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "title");
  await paste(page, { html: "<h2>Заголовок</h2><ul><li>пункт</li></ul>", text: "Заголовок\nпункт" });
  const title = await page.evaluate(() => window.__paste!.api.editor.getJSON().content![0] as J);
  expect(title.type).toBe("title");
  expect(text(title)).toBe("ВставкаЗаголовок пункт");
  expect(marksOf(title).size).toBe(0);
  expect((await body(page)).map((n) => n.type)).toEqual(["paragraph"]);
});

test("a pasted screenshot (an image file, no rich text) goes in through the upload placeholder", async ({ mount, page }) => {
  await mount(<PasteEditor />);
  await ready(page);
  await caret(page, "body");
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], "screenshot.png", { type: "image/png" }));
    document.querySelector(".ds-prose")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect.poll(async () => find(await body(page), "image")[0]?.attrs?.attachmentId).toBe("att-1");
  expect(await page.evaluate(() => window.__paste!.uploads)).toEqual(["screenshot.png"]);
});
