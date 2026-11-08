import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { TextSelection } from "@tiptap/pm/state";
import { makeEditor, tick } from "./helpers";

// Bug 2026-11-05: with doc = (title | block)+ the default block after any block was a title, so
// Enter at the end of a paragraph made an empty title (deleted by the title repair: nothing happened).

const types = (editor: ReturnType<typeof makeEditor>["editor"]) => (editor.getJSON().content ?? []).map((n) => n.type);

async function note(html: string) {
  const { editor } = makeEditor(new Y.Doc());
  await tick();
  editor.commands.setContent(html);
  await tick();
  return editor;
}

describe("the default block is a paragraph except at the very start of the note", () => {
  it("Enter at the end of a paragraph makes a new paragraph", async () => {
    const editor = await note("<h1 data-type=title>Т</h1><p>первый</p>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.enter();
    editor.commands.insertContent("второй");
    await tick();
    expect(types(editor)).toEqual(["title", "paragraph", "paragraph"]);
    expect(editor.getText()).toContain("второй");
    editor.destroy();
  });

  it("Enter at the end of a heading, and after a block, gives a paragraph too", async () => {
    const editor = await note("<h1 data-type=title>Т</h1><h2>Раздел</h2><pre><code>x</code></pre>");
    const headingEnd = editor.state.doc.child(0).nodeSize + editor.state.doc.child(1).nodeSize - 1;
    editor.commands.setTextSelection(headingEnd);
    editor.commands.enter();
    expect(types(editor)).toEqual(["title", "heading", "paragraph", "codeBlock"]);
    // Leaving the code block (Mod-Enter / exitCode) and a paragraph after a horizontal rule.
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)));
    editor.commands.exitCode();
    expect(types(editor).at(-1)).toBe("paragraph");
    editor.destroy();
  });

  it("an empty note still starts with a title; deleting everything leaves a title", async () => {
    const editor = await note("<h1 data-type=title>Т</h1><p>текст</p>");
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    expect(types(editor)[0]).toBe("title");
    expect(editor.schema.topNodeType.createAndFill()!.firstChild!.type.name).toBe("title");
    editor.destroy();
  });
});
