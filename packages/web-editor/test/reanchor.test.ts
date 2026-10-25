import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { packPoints, putStroke, readStroke } from "@datascratch/shared/strokes";
import { decodeAnchor, encodeCharAnchor, resolveCharAnchor } from "../src/pen/anchors";
import { binding, findText, makeEditor, tick } from "./helpers";

/** A note with an underline stroke anchored to every character of `word`. */
async function setup(html: string, word: string) {
  const t = makeEditor();
  await tick();
  t.editor.commands.setContent(html);
  await tick();
  t.undoManager.clear();
  const frag = t.doc.getXmlFragment("content");
  const start = findText(t.editor, word);
  const anchors = [...word].map((_, i) => encodeCharAnchor(start + i, frag, binding(t.editor).mapping));
  putStroke(t.doc, "s1", {
    v: 1,
    tool: "pen",
    color: "ink.red",
    width: 2,
    opacity: 1,
    anchorKind: "text",
    blockId: null,
    anchors,
    points: packPoints(anchors.map((_, a) => ({ a, x: 0, y: 0.2, pressure: 1, altitude: Math.PI / 2, azimuth: 0, roll: 0, t: a }))),
    hint: "underline",
    author: { kind: "user", id: "u" },
    createdAt: 1,
  });
  /** Characters the (single) stroke currently resolves to. */
  const marked = () => {
    const strokes = t.doc.getMap<Y.Map<unknown>>("strokes");
    expect(strokes.size).toBe(1);
    const stroke = readStroke([...strokes.values()][0]!)!;
    return stroke.anchors
      .map((b) => {
        const pos = resolveCharAnchor(b, decodeAnchor(b)!, t.doc, frag, binding(t.editor).mapping);
        return pos === null ? "∅" : t.editor.state.doc.textBetween(pos, pos + 1);
      })
      .join("");
  };
  return { ...t, marked, start };
}

describe("re-anchoring after structural edits (strokes.md §4)", () => {
  it("Enter right before an underlined word keeps the mark", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>Hello brave new world</p>", "brave");
    t.editor.chain().setTextSelection(t.start).splitBlock().run();
    await tick();
    expect(t.editor.state.doc.child(2).textContent).toBe("brave new world");
    expect(t.marked()).toBe("brave");
    const ids = [...t.doc.getMap("strokes").keys()];
    expect(ids).not.toContain("s1"); // replaced by a copy with a new id
  });

  it("Enter inside the underlined word keeps both halves", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>Hello brave new world</p>", "brave");
    t.editor.chain().setTextSelection(t.start + 2).splitBlock().run();
    await tick();
    expect(t.marked()).toBe("brave");
  });

  it("Backspace joining paragraphs keeps the mark on the second paragraph", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>first</p><p>second line</p>", "second");
    t.editor.chain().setTextSelection(t.start).joinBackward().run();
    await tick();
    expect(t.editor.state.doc.child(1).textContent).toBe("firstsecond line");
    expect(t.marked()).toBe("second");
  });

  it("turning the paragraph into a heading keeps the mark", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>make me a heading</p>", "heading");
    t.editor.chain().setTextSelection(t.start).setHeading({ level: 2 }).run();
    await tick();
    expect(t.marked()).toBe("heading");
  });

  it("undo of the split brings back the original stroke", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>Hello brave new world</p>", "brave");
    t.editor.chain().setTextSelection(t.start).splitBlock().run();
    await tick();
    t.undoManager.undo();
    await tick();
    expect(t.editor.state.doc.child(1).textContent).toBe("Hello brave new world");
    expect([...t.doc.getMap("strokes").keys()]).toEqual(["s1"]);
    expect(t.marked()).toBe("brave");
  });

  it("plain typing does not replace strokes", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>Hello brave new world</p>", "brave");
    t.editor.chain().setTextSelection(t.start).insertContent("very ").run();
    await tick();
    expect([...t.doc.getMap("strokes").keys()]).toEqual(["s1"]);
    expect(t.marked()).toBe("brave");
  });
});

describe("moving a block", () => {
  it("dragging the paragraph below another keeps its marks", async () => {
    const t = await setup("<h1 data-type=title>T</h1><p>moved words here</p><p>other paragraph</p>", "words");
    const { state } = t.editor;
    const first = state.doc.child(1);
    const from = state.doc.child(0).nodeSize;
    const to = from + first.nodeSize;
    // Same shape as ProseMirror's drop with move: delete the block and insert it after the next one.
    const tr = state.tr.delete(from, to);
    tr.insert(tr.doc.content.size, first);
    t.editor.view.dispatch(tr);
    await tick();
    expect(t.editor.state.doc.child(2).textContent).toBe("moved words here");
    expect(t.marked()).toBe("words");
  });
});
