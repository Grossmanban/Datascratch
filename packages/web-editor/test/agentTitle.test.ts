import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { applyEdits, initNoteContent } from "../../agents/src/doc/edits";
import { makeEditor, tick } from "./helpers";

// Data bug 2026-10-26: a note whose first block was not the title (a block before it, two titles,
// no title) was "fitted" to `title block+` on the first edit — a new empty title appeared and the
// real title became a paragraph, then the default name filled the new one.

const agentEdit = { agentId: "agent-claude", at: "2026-10-26T20:00:00.000Z" };

/** create_note + edit_note(replace_text on the title), exactly as packages/agents does over MCP. */
function agentNote(): Y.Doc {
  const doc = new Y.Doc();
  initNoteContent(doc, "План на неделю", "Первый абзац.\n\n- пункт", { agentEdit });
  const title = (doc.getXmlFragment("content").get(0) as Y.XmlElement).getAttribute("blockId") as string;
  applyEdits(doc, [{ op: "replace_text", blockId: title, find: "План", replace: "Планы" }], { agentEdit });
  return doc;
}

/** Top-level blocks as `name#blockId:text`. */
function blocks(doc: Y.Doc): string[] {
  return (doc.getXmlFragment("content").toArray() as Y.XmlElement[]).map((e) => {
    const text = e
      .toArray()
      .map((c) => (c instanceof Y.XmlText ? c.toDelta().map((d: { insert: unknown }) => (typeof d.insert === "string" ? d.insert : "")).join("") : ""))
      .join("");
    return `${e.nodeName}#${e.getAttribute("blockId")}:${text}`;
  });
}

function el(name: string, text: string): Y.XmlElement {
  const e = new Y.XmlElement(name);
  e.setAttribute("blockId", crypto.randomUUID());
  const t = new Y.XmlText();
  t.insert(0, text, { agentEdit } as never);
  e.insert(0, [t]);
  return e;
}

/** The agent note with something unexpected at the start (another client wrote it concurrently). */
const variants: Record<string, () => Y.Doc> = {
  "agent note": agentNote,
  "a paragraph before the title": () => {
    const doc = agentNote();
    doc.getXmlFragment("content").insert(0, [el("paragraph", "Абзац другого клиента")]);
    return doc;
  },
  "two titles (two clients created the note at once)": () => {
    const doc = agentNote();
    doc.getXmlFragment("content").insert(0, [el("title", "")]);
    return doc;
  },
  "no title": () => {
    const doc = agentNote();
    doc.getXmlFragment("content").delete(0, 1);
    return doc;
  },
};

describe("agent titles and unusual note starts open and edit without rewriting the title", () => {
  for (const [name, build] of Object.entries(variants)) {
    it(name, async () => {
      const doc = build();
      const before = blocks(doc);
      let updates = 0;
      doc.on("update", () => updates++);
      const { editor } = makeEditor(doc);
      await tick();
      await tick();
      expect(updates, "opening writes nothing").toBe(0);
      expect(blocks(doc)).toEqual(before);
      // The user types at the end of the last paragraph: only that paragraph changes.
      let end = 0;
      editor.state.doc.descendants((n, pos) => {
        if (n.isTextblock && n.type.name === "paragraph") end = pos + n.nodeSize - 1;
      });
      editor.chain().setTextSelection(end).insertContent("!").run();
      await tick();
      const after = blocks(doc);
      expect(after.length).toBe(before.length);
      after.forEach((b, i) => {
        if (b !== before[i]) expect(b).toBe(`${before[i]}!`);
      });
      expect(after.filter((b) => b.startsWith("title#")).length).toBe(before.filter((b) => b.startsWith("title#")).length);
      editor.destroy();
    });
  }

  it("the agent's title keeps its text and marks", async () => {
    const doc = agentNote();
    const { editor } = makeEditor(doc);
    await tick();
    const title = editor.state.doc.firstChild!;
    expect(title.type.name).toBe("title");
    // Same text as in the Y.Doc (whatever replace_text produced).
    expect(`title#${title.attrs.blockId}:${title.textContent}`).toBe(blocks(doc)[0]);
    expect(title.firstChild!.marks.map((m) => m.type.name)).toContain("agentEdit");
    editor.destroy();
  });
});
