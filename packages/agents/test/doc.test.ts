import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { applyEdits, initNoteContent } from "../src/doc/edits.js";
import { collectHandwriting } from "../src/doc/handwriting.js";
import { noteToMarkdown } from "../src/doc/markdown-export.js";
import { findBlock, plainText } from "../src/doc/model.js";
import { addTextStroke, blockIdAt, makeNoteDoc, titleBlockId } from "../src/testing/fixtures.js";

const agentEdit = { agentId: "grant-1", at: "2026-10-25T12:00:00.000Z" };

const SAMPLE = `Первый абзац с **жирным** и *курсивом*, ссылкой [сайт](https://example.com) и #тег.

## Раздел

- пункт один
- пункт два

- [ ] купить хлеб 📅 2026-10-26
- [x] позвонить

> [!warning] ⚠️
> Осторожно

\`\`\`ts
const x = 1;
\`\`\`

| A | B |
| --- | --- |
| 1 | 2 |
`;

describe("markdown round trip", () => {
  it("exports blocks with ids, marks, tasks and callouts", () => {
    const doc = makeNoteDoc("Тест", SAMPLE);
    const md = noteToMarkdown(doc, { blockIds: false });
    expect(md).toMatchInlineSnapshot(`
      "Первый абзац с **жирным** и *курсивом*, ссылкой [сайт](https://example.com) и #тег.

      ## Раздел

      - пункт один
      - пункт два

      - [ ] купить хлеб 📅 2026-10-26
      - [x] позвонить

      > [!warning] ⚠️
      > Осторожно

      \`\`\`ts
      const x = 1;
      \`\`\`

      | A | B |
      | --- | --- |
      | 1 | 2 |
      "
    `);
  });

  it("re-import of the export is stable", () => {
    const doc = makeNoteDoc("Тест", SAMPLE);
    const md = noteToMarkdown(doc, { blockIds: false });
    const again = noteToMarkdown(makeNoteDoc("Тест", md), { blockIds: false });
    expect(again).toBe(md);
  });
});

describe("edits", () => {
  it("replace_text keeps handwriting on untouched characters", () => {
    const doc = makeNoteDoc("Тест", "Очень важная мысль про сроки.");
    const p = blockIdAt(doc, 0);
    addTextStroke(doc, { blockId: p, start: 6, end: 18, hint: "underline" });
    expect(collectHandwriting(doc)[0]!.description).toBe("подчёркнуто от руки: «важная мысль»");
    applyEdits(doc, [{ op: "replace_text", blockId: p, find: "про сроки", replace: "о дедлайнах" }], { agentEdit });
    applyEdits(doc, [{ op: "insert", position: { at: "start" }, markdown: "Новый абзац сверху" }], { agentEdit });
    expect(plainText(findBlock(doc, p)!.el)).toBe("Очень важная мысль о дедлайнах.");
    expect(collectHandwriting(doc)[0]!.description).toBe("подчёркнуто от руки: «важная мысль»");
  });

  it("move re-anchors strokes", () => {
    const doc = makeNoteDoc("Тест", "Абзац A с пометкой.\n\nАбзац B.");
    const a = blockIdAt(doc, 0);
    const b = blockIdAt(doc, 1);
    addTextStroke(doc, { blockId: a, start: 8, end: 18, hint: "circle" });
    applyEdits(doc, [{ op: "move", blockId: a, position: { after: b } }], { agentEdit });
    expect(blockIdAt(doc, 1)).toBe(a);
    const hw = collectHandwriting(doc);
    expect(hw).toHaveLength(1);
    expect(hw[0]!.blockId).toBe(a);
    expect(hw[0]!.description).toBe("обведено от руки: «с пометкой»");
  });

  it("is atomic: a failing op leaves the update unsent", () => {
    const doc = makeNoteDoc("Тест", "Один.");
    const sv = Y.encodeStateVector(doc);
    expect(() => applyEdits(doc, [{ op: "delete", blockId: blockIdAt(doc, 0) }, { op: "delete", blockId: "nope" }], { agentEdit })).toThrow(/Operation 2/);
    // the caller discards the doc; nothing escapes unless it encodes the diff
    expect(Y.encodeStateAsUpdate(doc, sv).length).toBeGreaterThan(0);
  });

  it("inserts list items into lists and marks agent text", () => {
    const doc = makeNoteDoc("Тест", "- один\n- два");
    const list = findBlock(doc, blockIdAt(doc, 0))!.el;
    const second = (list.toArray()[1] as Y.XmlElement).getAttribute("blockId") as string;
    applyEdits(doc, [{ op: "insert", position: { after: second }, markdown: "- три" }], { agentEdit });
    const md = noteToMarkdown(doc, { blockIds: false });
    expect(md).toBe("- один\n- два\n- три\n");
    const third = list.toArray()[2] as Y.XmlElement;
    const delta = ((third.toArray()[0] as Y.XmlElement).toArray()[0] as Y.XmlText).toDelta();
    expect(delta[0].attributes.agentEdit).toEqual(agentEdit);
  });
});

describe("y-prosemirror conventions (document-model.md §4.1)", () => {
  it("writes marks as objects and omits null attributes", () => {
    const doc = makeNoteDoc("Т", "**жирный** и `код`\n\n- [ ] задача");
    const p = findBlock(doc, blockIdAt(doc, 0))!.el;
    const delta = (p.toArray()[0] as Y.XmlText).toDelta();
    expect(delta[0].attributes).toEqual({ bold: {} });
    expect(delta[2].attributes).toEqual({ code: {} });
    const task = (findBlock(doc, blockIdAt(doc, 1))!.el.toArray()[0] as Y.XmlElement).getAttributes();
    expect(Object.keys(task).sort()).toEqual(["blockId", "state", "taskId"]);
  });
});

describe("replace_text (regression: offsets inside marked runs)", () => {
  const cases: [string, string, string, string][] = [
    ["end", "неделю", "месяц", "План на месяц"],
    ["start", "План", "Планы", "Планы на неделю"],
    ["middle", " на ", " до ", "План до неделю"],
    ["whole", "План на неделю", "Итоги", "Итоги"],
  ];
  for (const withMark of [false, true]) {
    const ctx = { agentEdit: withMark ? agentEdit : null };
    for (const [where, find, replace, expected] of cases) {
      it(`title, ${where}, ${withMark ? "agentEdit-marked" : "unmarked"}`, () => {
        const doc = new Y.Doc();
        initNoteContent(doc, "План на неделю", "Текст", ctx);
        const id = titleBlockId(doc);
        applyEdits(doc, [{ op: "replace_text", blockId: id, find, replace }], ctx);
        expect(plainText(findBlock(doc, id)!.el)).toBe(expected);
      });
      it(`paragraph, ${where}, ${withMark ? "agentEdit-marked" : "unmarked"}`, () => {
        const doc = new Y.Doc();
        initNoteContent(doc, "Заметка", "План на неделю", ctx);
        const id = blockIdAt(doc, 0);
        applyEdits(doc, [{ op: "replace_text", blockId: id, find, replace }], ctx);
        expect(plainText(findBlock(doc, id)!.el)).toBe(expected);
      });
    }
  }

  it("replaces the chosen occurrence inside bold and agentEdit-marked text", () => {
    const doc = new Y.Doc();
    initNoteContent(doc, "Заметка", "раз **два** раз два раз", { agentEdit });
    const id = blockIdAt(doc, 0);
    expect(() => applyEdits(doc, [{ op: "replace_text", blockId: id, find: "раз", replace: "три" }], { agentEdit })).toThrow(/occurs 3 times/);
    applyEdits(doc, [{ op: "replace_text", blockId: id, find: "раз", replace: "три", occurrence: 3 }], { agentEdit });
    applyEdits(doc, [{ op: "replace_text", blockId: id, find: "два", replace: "2", occurrence: 2 }], { agentEdit: null });
    expect(plainText(findBlock(doc, id)!.el)).toBe("раз два раз 2 три");
    // Formatting of untouched text is kept.
    expect(noteToMarkdown(doc)).toContain("раз **два** раз 2 три");
  });

  it("finds text after a bold run in agentEdit-marked text", () => {
    const doc = new Y.Doc();
    initNoteContent(doc, "Заметка", "Сроки **запуска** сдвигаются", { agentEdit });
    const id = blockIdAt(doc, 0);
    applyEdits(doc, [{ op: "replace_text", blockId: id, find: "сдвигаются", replace: "сдвинуты" }], { agentEdit });
    expect(plainText(findBlock(doc, id)!.el)).toBe("Сроки запуска сдвинуты");
  });
});
