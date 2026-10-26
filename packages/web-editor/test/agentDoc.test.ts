import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { makeEditor, tick } from "./helpers";

// Mirrors packages/agents/src/doc/build.ts: blockId on every block, null attrs omitted, codeBlock
// text written as one Y.XmlText — with the agentEdit mark when the agent wrote it (D-10).
const AGENT = { agentEdit: { agentId: "agent-claude", at: "2026-10-26T08:38:00.000Z" } };

function block(name: string, attrs: Record<string, unknown>): Y.XmlElement {
  const el = new Y.XmlElement(name);
  el.setAttribute("blockId", crypto.randomUUID());
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v as never);
  return el;
}

function agentNote(): Y.Doc {
  const doc = new Y.Doc();
  const frag = doc.getXmlFragment("content");
  doc.transact(() => {
    const title = block("title", {});
    const caption = () => block("paragraph", {});
    const code = (language: string | null) => block("codeBlock", { language });
    const blocks = [title, caption(), code("python"), caption(), code("typescript"), caption(), code(null), block("paragraph", {})];
    frag.insert(0, blocks);
    const texts: [Y.XmlElement, string][] = [
      [blocks[0]!, "Тест"],
      [blocks[1]!, "Python:"],
      [blocks[2]!, "print('hi')"],
      [blocks[3]!, "TypeScript:"],
      [blocks[4]!, "const a = 1;"],
      [blocks[5]!, "Без языка:"],
      [blocks[6]!, "plain"],
      [blocks[7]!, "after"],
    ];
    for (const [el, s] of texts) {
      const t = new Y.XmlText();
      el.insert(0, [t]);
      t.insert(0, s, AGENT);
    }
  });
  return doc;
}

const codeBlocks = (doc: Y.Doc) =>
  (doc.getXmlFragment("content").toArray() as Y.XmlElement[]).filter((e) => e.nodeName === "codeBlock").map((e) => [e.getAttribute("language") ?? null, (e.get(0) as Y.XmlText)?.toString()]);

describe("agent-built documents survive editing (data loss 2026-10-26)", () => {
  it("code blocks written by an agent (with agentEdit on their text) are kept after the user edits elsewhere", async () => {
    const doc = agentNote();
    const before = codeBlocks(doc);
    expect(before).toHaveLength(3);
    const { editor } = makeEditor(doc);
    await tick();
    // The user edits the last paragraph (any local edit makes y-prosemirror diff the document).
    editor.chain().setTextSelection(editor.state.doc.content.size - 1).insertContent("!").run();
    await tick();
    expect(editor.state.doc.content.childCount).toBe(8);
    expect(codeBlocks(doc).map((c) => c[0])).toEqual(["python", "typescript", null]);
    editor.destroy();
  });
});

describe("content another client wrote that our schema would reject is never deleted", () => {
  it("a code block with a disallowed mark (bold) survives load and edits; its text stays in Yjs", async () => {
    const doc = new Y.Doc();
    const frag = doc.getXmlFragment("content");
    doc.transact(() => {
      const title = new Y.XmlElement("title");
      const code = new Y.XmlElement("codeBlock");
      code.setAttribute("language", "python");
      const p = new Y.XmlElement("paragraph");
      frag.insert(0, [title, code, p]);
      const t = new Y.XmlText();
      code.insert(0, [t]);
      t.insert(0, "x = 1", { bold: {} });
      const pt = new Y.XmlText();
      p.insert(0, [pt]);
      pt.insert(0, "after");
    });
    const { editor } = makeEditor(doc);
    await tick();
    expect(editor.state.doc.child(1).type.name).toBe("codeBlock");
    expect(editor.state.doc.child(1).textContent).toBe("x = 1");
    editor.chain().setTextSelection(editor.state.doc.content.size - 1).insertContent("!").run();
    await tick();
    const el = frag.get(1) as Y.XmlElement;
    expect(el.nodeName).toBe("codeBlock");
    expect((el.get(0) as Y.XmlText).toString()).toContain("x = 1");
    editor.destroy();
  });

  it("agent text inside code blocks is shown with the agent highlight", async () => {
    const doc = agentNote();
    const { editor } = makeEditor(doc);
    await tick();
    const code = editor.state.doc.child(2);
    expect(code.type.name).toBe("codeBlock");
    expect(code.firstChild!.marks.map((m) => m.type.name)).toEqual(["agentEdit"]);
    editor.destroy();
  });
});
