/**
 * Exploit-style regressions from the security audit of 2026-10-27: inputs that
 * used to stall the single server process (quadratic text handling) or exhaust
 * memory (unbounded canvases), and unsafe link targets.
 */
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { noteToMarkdown } from "../src/doc/markdown-export.js";
import { markdownToBlocks, MAX_NESTING, safeHref } from "../src/doc/markdown-import.js";
import { contentOf } from "../src/doc/model.js";
import { makeNoteDoc } from "../src/testing/fixtures.js";

/** A note whose one paragraph is a single text run, as any client may write it. */
function rawNote(text: string, marks: Record<string, unknown> = {}): Y.Doc {
  const doc = new Y.Doc();
  const title = new Y.XmlElement("title");
  title.setAttribute("blockId", "0192f3c4-0000-7000-8000-000000000001");
  const p = new Y.XmlElement("paragraph");
  p.setAttribute("blockId", "0192f3c4-0000-7000-8000-000000000002");
  contentOf(doc).insert(0, [title, p]);
  const t = new Y.XmlText();
  p.insert(0, [t]);
  t.insert(0, text, marks);
  return doc;
}

const timed = <T>(run: () => T): { ms: number; value: T } => {
  const t0 = performance.now();
  const value = run();
  return { ms: performance.now() - t0, value };
};

describe("read_note on hostile text stays linear", () => {
  it("«a» + 199 999 spaces + «b» in bold (was ~17 s: /^(\\s*)(.*?)(\\s*)$/s)", () => {
    const { ms, value } = timed(() => noteToMarkdown(rawNote("a" + " ".repeat(199_999) + "b", { bold: {} })));
    expect(value).toContain("**a" + " ".repeat(10));
    expect(ms).toBeLessThan(1500);
  });

  it.each([
    ["[[ without a closing pair", "[[".repeat(100_000)],
    ["[^ without a closing bracket", "[^".repeat(100_000)],
    ["& before long words", "&" + "a".repeat(200_000)],
    ["backticks in code", "`a".repeat(100_000)],
  ])("%s", (_name, text) => {
    const { ms } = timed(() => noteToMarkdown(rawNote(text, text.startsWith("`") ? { code: {} } : {})));
    expect(ms).toBeLessThan(1500);
  });
});

describe("Markdown import limits", () => {
  it("refuses paragraphs whose parsing would be quadratic, with a clear error", () => {
    for (const md of ["*a".repeat(50_000), "a_".repeat(50_000), " #a".repeat(30_000), "a\n".repeat(60_000)]) {
      const { ms } = timed(() => expect(() => markdownToBlocks(md)).toThrow(/very long paragraphs/));
      expect(ms).toBeLessThan(200);
    }
  });

  it("still accepts long notes made of normal paragraphs, big tables and code", () => {
    const para = "Обычный абзац с **жирным** и [ссылкой](https://example.com). ".repeat(8);
    const md = [
      Array.from({ length: 300 }, () => para).join("\n\n"),
      "| a | b | c |\n|---|---|---|\n" + "| x | y | z |\n".repeat(3000),
      "```\n" + "const x = 1;\n".repeat(5000) + "```",
    ].join("\n\n");
    const { ms, value } = timed(() => markdownToBlocks(md));
    expect(value.length).toBeGreaterThan(300);
    expect(ms).toBeLessThan(5000);
  });

  it("builds thousands of tags and line breaks in one paragraph quickly (one Yjs insert)", () => {
    const { ms } = timed(() => makeNoteDoc("Теги", " #a".repeat(3000) + "\n\n" + "строка\n".repeat(1500)));
    expect(ms).toBeLessThan(1500);
  });

  it(`refuses nesting deeper than ${MAX_NESTING} levels`, () => {
    expect(() => markdownToBlocks("> ".repeat(MAX_NESTING + 5) + "x")).toThrow(/nested deeper/);
    expect(() => markdownToBlocks("> ".repeat(20) + "x")).not.toThrow();
  });

  it("drops javascript:, data: and other unsafe link targets but keeps the text", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(safeHref("#section")).toBe("#section");
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\tscript:alert(1)", " javascript:x", "data:text/html,<b>", "vbscript:x", "file:///etc/passwd"])
      expect(safeHref(bad)).toBeNull();
    const [p] = markdownToBlocks("[нажми](javascript:alert(1)) и [сайт](https://example.com)");
    const links = (p!.inline ?? []).filter((i) => "text" in i && "link" in i.marks);
    expect(links.map((l) => ("text" in l ? l.text : ""))).toEqual(["сайт"]);
    expect((p!.inline ?? []).map((i) => ("text" in i ? i.text : "")).join("")).toContain("нажми");
  });
});
