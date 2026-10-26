/**
 * Regressions from production (note created by Claude via create_note):
 * escapes, verbatim math, multi-line quotes, trailing blocks, callout names.
 * Every case goes create_note → read_note and checks the round trip.
 */
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { contentOf, childElements, plainText } from "../src/doc/model.js";
import { AgentService } from "../src/service/agent-service.js";
import { makeWorld, NB_WORK, principal } from "./world.js";

const strip = (md: string) => md.replace(/ ?<!-- block:[^>]* -->/g, "");

async function roundTrip(markdown: string) {
  const ctx = makeWorld();
  const svc = new AgentService(ctx);
  const created = await svc.createNote(principal(), { notebookId: NB_WORK, title: "Тест", markdown });
  const doc = ctx.data.current(created.note.id);
  const read = await svc.readNote(principal(), { noteId: created.note.id, includeImages: false });
  const meta = ctx.data.current(NB_WORK).getMap("notes").get(created.note.id) as Y.Map<unknown>;
  return { ctx, svc, doc, md: strip(read.markdown), tags: meta.get("tags") as string[], noteId: created.note.id };
}

function bodyBlocks(doc: Y.Doc) {
  return childElements(contentOf(doc)).filter((e) => e.nodeName !== "title");
}

describe("Markdown escapes and verbatim content", () => {
  it("keeps backslash-escaped characters literal and escapes them again on read", async () => {
    const { doc, md, tags } = await roundTrip("\\#не тег, \\*не курсив\\*, \\`не код\\`, \\[\\[не ссылка\\]\\], \\=\\=не маркер\\=\\=, а #тег — настоящий.");
    expect(tags).toEqual(["тег"]);
    expect(plainText(bodyBlocks(doc)[0]!)).toBe("#не тег, *не курсив*, `не код`, [[не ссылка]], ==не маркер==, а #тег — настоящий.");
    // [[…]] stays as written: it is the link syntax agents use (an unknown title remains plain text).
    expect(md).toBe("\\#не тег, \\*не курсив\\*, \\`не код\\`, [[не ссылка]], \\=\\=не маркер\\=\\=, а #тег — настоящий.\n");
    // read_note output imports back to the same document
    const again = await roundTrip(md);
    expect(again.md).toBe(md);
    expect(again.tags).toEqual(["тег"]);
  });

  it("escapes block markers at the start of a line", async () => {
    const { doc, md } = await roundTrip("\\# не заголовок\n\n\\- не список\n\n1\\. не нумерация\n\n\\> не цитата");
    expect(bodyBlocks(doc).map((b) => b.nodeName)).toEqual(["paragraph", "paragraph", "paragraph", "paragraph"]);
    const again = await roundTrip(md);
    expect(bodyBlocks(again.doc).map((b) => plainText(b))).toEqual(["# не заголовок", "- не список", "1. не нумерация", "> не цитата"]);
  });

  it("keeps math verbatim, including backslashes", async () => {
    const latex = "\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}";
    const { doc, md } = await roundTrip(`До формулы.\n\n$$${latex}$$\n\n$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$\n\n> $$\\alpha\\,\\beta$$`);
    const blocks = bodyBlocks(doc);
    expect(blocks[1]!.getAttribute("latex")).toBe(latex);
    expect(blocks[2]!.getAttribute("latex")).toBe("\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}");
    expect((blocks[3]!.toArray()[0] as Y.XmlElement).getAttribute("latex")).toBe("\\alpha\\,\\beta");
    expect(md).toContain(`$$\n${latex}\n$$`);
    const again = await roundTrip(md);
    expect(bodyBlocks(again.doc)[1]!.getAttribute("latex")).toBe(latex);
  });

  it("keeps code verbatim", async () => {
    const { doc, md } = await roundTrip("Код: `a\\*b` и ``x`y``\n\n```ts\nconst re = /\\d+\\*/;\n```");
    expect(plainText(bodyBlocks(doc)[0]!)).toBe("Код: a\\*b и x`y");
    expect(plainText(bodyBlocks(doc)[1]!)).toBe("const re = /\\d+\\*/;");
    expect((await roundTrip(md)).md).toBe(md);
  });
});

describe("structure", () => {
  it("keeps every line of a multi-line quote inside the quote", async () => {
    const { md } = await roundTrip("> Обычная цитата.\n> Вторая строка цитаты.");
    expect(md).toContain("> Обычная цитата.\\\n> Вторая строка цитаты.\n");
    expect(md).not.toMatch(/^Вторая/m);
    expect((await roundTrip(md)).md).toBe(md);
  });

  it("keeps line breaks in list items indented", async () => {
    const { md } = await roundTrip("- первая строка\n  вторая строка\n- ещё");
    expect(md).toBe("- первая строка\\\n  вторая строка\n- ещё\n");
    expect((await roundTrip(md)).md).toBe(md);
  });

  it("does not create a trailing empty block", async () => {
    const { doc } = await roundTrip("Текст.\n\n![](https://example.com/x.png)\n\n");
    expect(bodyBlocks(doc).map((b) => b.nodeName)).toEqual(["paragraph"]);
  });

  it("maps Obsidian callout names to the schema tones", async () => {
    const { doc, md } = await roundTrip("> [!tip] 💡\n> Совет\n\n> [!WARNING]- Свёрнуто\n\n> [!bug]\n> Ошибка\n\n> [!unknown]\n> Что-то");
    expect(bodyBlocks(doc).map((b) => b.getAttribute("tone"))).toEqual(["success", "warning", "danger", "note"]);
    expect(md).toContain("> [!success] 💡\n> Совет");
    expect(md).toContain("> [!warning]\n> Свёрнуто");
  });
});

describe("review 2026-10-26", () => {
  it("keeps inline math verbatim in both directions", async () => {
    const src = "Корень: $\\sqrt{a^2+b^2}\\,dx$ и $$\\frac{1}{2}$$, цена $5.";
    const { doc, md } = await roundTrip(src);
    expect(plainText(bodyBlocks(doc)[0]!)).toBe("Корень: $\\sqrt{a^2+b^2}\\,dx$ и $$\\frac{1}{2}$$, цена $5.");
    expect(md).toBe(src + "\n");
    expect((await roundTrip(md)).md).toBe(md);
  });

  it("does not escape [[wiki links]] and footnote references", async () => {
    const { md } = await roundTrip("См. [[Несуществующая заметка]] и сноску[^1].\n\n[^1]: Текст сноски.");
    expect(md).toContain("См. [[Несуществующая заметка]] и сноску[^1].");
    expect(md).toContain("[^1]: Текст сноски.");
  });

  it("keeps table column alignment", async () => {
    const src = "| Лево | Центр | Право |\n| :--- | :---: | ---: |\n| a | b | c |";
    const { doc, md } = await roundTrip(src);
    const table = bodyBlocks(doc)[0]!;
    const firstRow = table.toArray()[0] as Y.XmlElement;
    expect((firstRow.toArray() as Y.XmlElement[]).map((c) => (c.toArray()[0] as Y.XmlElement).getAttribute("textAlign"))).toEqual(["left", "center", "right"]);
    expect(md).toContain("| :--- | :---: | ---: |");
    expect((await roundTrip(md)).md).toBe(md);
  });

  it("drops a leading H1 that repeats the title", async () => {
    const { doc } = await roundTrip("# Тест\n\nТекст.");
    expect(bodyBlocks(doc).map((b) => b.nodeName)).toEqual(["paragraph"]);
    const other = await roundTrip("# Другой заголовок\n\nТекст.");
    expect(bodyBlocks(other.doc).map((b) => b.nodeName)).toEqual(["heading", "paragraph"]);
  });
});
