import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { decodeAnchor, encodeCharAnchor, resolveCharAnchor } from "../src/pen/anchors";
import { binding, findText, makeEditor, tick } from "./helpers";

async function setup(text = "Hello brave new world") {
  const ctx = makeEditor();
  await tick();
  ctx.editor.commands.setContent(`<h1 data-type=title>Title</h1><p>${text}</p><p>second paragraph</p>`);
  await tick();
  ctx.undoManager.clear();
  const frag = ctx.doc.getXmlFragment("content");
  const anchor = (pos: number) => decodeAnchor(encodeCharAnchor(pos, frag, binding(ctx.editor).mapping))!;
  const resolve = (rel: Y.RelativePosition) => resolveCharAnchor(rel, ctx.doc, frag, binding(ctx.editor).mapping);
  const charAt = (pos: number | null) => (pos === null ? null : ctx.editor.state.doc.textBetween(pos, pos + 1));
  return { ...ctx, anchor, resolve, charAt };
}

describe("character anchors (strokes.md §4)", () => {
  it("anchor resolves back to the same character", async () => {
    const t = await setup();
    const pos = findText(t.editor, "brave");
    const rel = t.anchor(pos);
    expect(t.resolve(rel)).toBe(pos);
    expect(t.charAt(t.resolve(rel))).toBe("b");
    t.editor.destroy();
  });

  it("follows the character when text is inserted before it and inside the word", async () => {
    const t = await setup();
    const rel = [..."brave"].map((_, i) => t.anchor(findText(t.editor, "brave") + i));
    t.editor.chain().setTextSelection(findText(t.editor, "Hello")).insertContent("Oh, ").run();
    t.editor.chain().setTextSelection(findText(t.editor, "ave")).insertContent("XX").run();
    await tick();
    expect(rel.map((r) => t.charAt(t.resolve(r))).join("")).toBe("brave");
    expect(t.editor.state.doc.textContent).toContain("brXXave");
    t.editor.destroy();
  });

  it("follows the character across a remote change from another client", async () => {
    const t = await setup();
    const rel = t.anchor(findText(t.editor, "world"));
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(t.doc));
    const p = remote.getXmlFragment("content").get(1) as Y.XmlElement;
    (p.get(0) as Y.XmlText).insert(0, "Agent says: ");
    Y.applyUpdate(t.doc, Y.encodeStateAsUpdate(remote));
    await tick();
    expect(t.editor.state.doc.textContent).toContain("Agent says: Hello");
    expect(t.charAt(t.resolve(rel))).toBe("w");
    t.editor.destroy();
  });

  it("D-35: deleted character resolves to null; undo brings it back", async () => {
    const t = await setup();
    const start = findText(t.editor, "brave");
    const rel = [..."brave"].map((_, i) => t.anchor(start + i));
    t.editor.chain().setTextSelection({ from: start + 1, to: start + 4 }).deleteSelection().run();
    await tick();
    expect(rel.map((r) => t.resolve(r) !== null)).toEqual([true, false, false, false, true]);
    t.undoManager.undo();
    await tick();
    expect(rel.map((r) => t.charAt(t.resolve(r))).join("")).toBe("brave");
    t.editor.destroy();
  });

  it("D-35: deleting the whole paragraph hides all anchors; undo restores them", async () => {
    const t = await setup();
    const start = findText(t.editor, "brave");
    const rel = t.anchor(start);
    const $p = t.editor.state.doc.resolve(start);
    t.editor.chain().setTextSelection({ from: $p.before(), to: $p.after() }).deleteSelection().run();
    await tick();
    expect(t.resolve(rel)).toBeNull();
    t.undoManager.undo();
    await tick();
    expect(t.charAt(t.resolve(rel))).toBe("b");
    t.editor.destroy();
  });

  it("survives redo after undo of an insertion", async () => {
    const t = await setup();
    t.editor.chain().setTextSelection(findText(t.editor, "world")).insertContent("big ").run();
    await tick();
    const rel = t.anchor(findText(t.editor, "big"));
    t.undoManager.undo();
    await tick();
    expect(t.resolve(rel)).toBeNull();
    t.undoManager.redo();
    await tick();
    expect(t.charAt(t.resolve(rel))).toBe("b");
    t.editor.destroy();
  });
});

describe("rebaseRedoneAnchors (strokes.md: anchors after undo/redo)", () => {
  it("another device resolves the mark after the author undoes a deletion", async () => {
    const { rebaseRedoneAnchors } = await import("../src/pen/anchors");
    const t = await setup();
    const start = findText(t.editor, "brave");
    const bytes = [..."brave"].map((_, i) => encodeCharAnchor(start + i, t.doc.getXmlFragment("content"), binding(t.editor).mapping));
    t.doc.getMap("strokes").set("s1", new Y.Map([["anchorKind", "text"], ["anchors", bytes]]) as never);
    t.editor.chain().setTextSelection({ from: start, to: start + 5 }).deleteSelection().run();
    await tick();
    t.undoManager.undo();
    await tick();
    expect(rebaseRedoneAnchors(t.doc, "test")).toBe(1);
    // A second replica never saw the local `redone` links.
    const other = makeEditor(new Y.Doc());
    Y.applyUpdate(other.doc, Y.encodeStateAsUpdate(t.doc));
    await tick();
    const anchors = (other.doc.getMap<Y.Map<unknown>>("strokes").get("s1")!.get("anchors") as Uint8Array[]).map((b) => decodeAnchor(b)!);
    const frag = other.doc.getXmlFragment("content");
    const chars = anchors.map((r) => {
      const pos = resolveCharAnchor(r, other.doc, frag, binding(other.editor).mapping);
      return pos === null ? "∅" : other.editor.state.doc.textBetween(pos, pos + 1);
    });
    expect(chars.join("")).toBe("brave");
    t.editor.destroy();
    other.editor.destroy();
  });
});
