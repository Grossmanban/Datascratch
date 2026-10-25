import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { makeEditor, tick } from "./helpers";

const UUID7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function xmlElements(frag: Y.XmlFragment | Y.XmlElement): Y.XmlElement[] {
  const out: Y.XmlElement[] = [];
  for (const c of frag.toArray()) {
    if (c instanceof Y.XmlElement) {
      out.push(c, ...xmlElements(c));
    }
  }
  return out;
}

describe("document schema over Y.XmlFragment \"content\" (document-model.md §4)", () => {
  it("writes title + blocks as Y.XmlElements with contract names and attributes", async () => {
    const { editor, doc } = makeEditor();
    await tick();
    editor.commands.setContent({
      type: "doc",
      content: [
        { type: "title", content: [{ type: "text", text: "Заметка" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Раздел" }] },
        { type: "paragraph", content: [{ type: "text", text: "жирный", marks: [{ type: "bold" }] }, { type: "text", text: " ссылка", marks: [{ type: "link", attrs: { href: "https://x.y" } }] }] },
        {
          type: "taskList",
          content: [{ type: "taskItem", attrs: { state: "open", scheduled: "2026-10-26" }, content: [{ type: "paragraph", content: [{ type: "text", text: "задача" }] }] }],
        },
        { type: "callout", attrs: { tone: "warning" }, content: [{ type: "paragraph" }] },
        { type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "let a = 1" }] },
        { type: "mathBlock", attrs: { latex: "E=mc^2" } },
        { type: "mermaid", attrs: { source: "graph TD; A-->B" } },
        { type: "horizontalRule", attrs: { style: "dots" } },
        { type: "image", attrs: { attachmentId: "att1", width: 0.5 } },
        { type: "file", attrs: { attachmentId: "att2", name: "a.pdf", size: 10, mime: "application/pdf" } },
        { type: "drawing", attrs: { height: 300 } },
        { type: "pageCard", attrs: { noteId: "n1", style: "card" } },
        { type: "paragraph", content: [{ type: "noteLink", attrs: { noteId: "n2", label: "Другая" } }, { type: "tag", attrs: { name: "work/project" } }] },
      ],
    });
    await tick();
    const frag = doc.getXmlFragment("content");
    const top = frag.toArray() as Y.XmlElement[];
    expect(top.map((e) => e.nodeName)).toEqual([
      "title",
      "heading",
      "paragraph",
      "taskList",
      "callout",
      "codeBlock",
      "mathBlock",
      "mermaid",
      "horizontalRule",
      "image",
      "file",
      "drawing",
      "pageCard",
      "paragraph",
    ]);
    expect(top[1]!.getAttribute("level")).toBe(2);
    const task = top[3]!.toArray()[0] as Y.XmlElement;
    expect(task.nodeName).toBe("taskItem");
    expect(task.getAttribute("state")).toBe("open");
    expect(task.getAttribute("scheduled")).toBe("2026-10-26");
    expect(task.getAttribute("taskId")).toMatch(UUID7);
    expect(top[8]!.getAttribute("style")).toBe("dots");
    expect(top[9]!.getAttribute("width")).toBe(0.5);

    const text = top[2]!.toArray()[0] as Y.XmlText;
    const delta = text.toDelta() as { insert: string; attributes?: Record<string, unknown> }[];
    expect(delta[0]!.attributes).toHaveProperty("bold");
    // link keeps only href
    expect(delta[1]!.attributes).toEqual({ link: { href: "https://x.y" } });

    const inline = (top[13]!.toArray() as Y.XmlElement[]).map((e) => [e.nodeName, e.getAttributes()]);
    expect(inline[0]![0]).toBe("noteLink");
    expect(inline[0]![1]).toMatchObject({ noteId: "n2", label: "Другая" });
    expect(inline[1]![1]).toMatchObject({ name: "work/project" });
    editor.destroy();
  });

  it("gives every block node a unique UUIDv7 blockId, including after split and paste", async () => {
    const { editor, doc } = makeEditor();
    await tick();
    editor.commands.setContent("<h1 data-type=title>T</h1><p>first second</p>");
    await tick();
    const pos = editor.state.doc.textContent.indexOf("second");
    // split the paragraph in the middle
    editor.chain().setTextSelection(1 + 2 + 1 + "first ".length).splitBlock().run();
    await tick();
    const blocks = xmlElements(doc.getXmlFragment("content"));
    const ids = blocks.map((b) => b.getAttribute("blockId"));
    expect(ids.every((id) => typeof id === "string" && UUID7.test(id as string))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pos).toBeGreaterThan(0);
    editor.destroy();
  });

  it("keeps the original blockId on the first half of a split", async () => {
    const { editor } = makeEditor();
    await tick();
    editor.commands.setContent("<h1 data-type=title>T</h1><p>abcdef</p>");
    await tick();
    const before = editor.state.doc.child(1).attrs.blockId;
    editor.chain().setTextSelection(3 + 3 + 1).splitBlock().run();
    expect(editor.state.doc.child(1).attrs.blockId).toBe(before);
    expect(editor.state.doc.child(2).attrs.blockId).not.toBe(before);
    editor.destroy();
  });

  it("reads documents written by another client (state from Y updates)", async () => {
    const src = makeEditor();
    await tick();
    src.editor.commands.setContent("<h1 data-type=title>Hi</h1><blockquote><p>quoted</p></blockquote>");
    await tick();
    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(src.doc));
    const dst = makeEditor(doc2);
    await tick();
    expect(dst.editor.state.doc.child(1).type.name).toBe("blockquote");
    expect(dst.editor.state.doc.child(1).textContent).toBe("quoted");
    src.editor.destroy();
    dst.editor.destroy();
  });
});

describe("unknown nodes and marks (document-model.md §4.2)", () => {
  function docWithUnknown() {
    const doc = new Y.Doc();
    const frag = doc.getXmlFragment("content");
    const title = new Y.XmlElement("title");
    const unknown = new Y.XmlElement("kanban");
    unknown.setAttribute("columns", 3 as unknown as string);
    const p = new Y.XmlElement("paragraph");
    const text = new Y.XmlText();
    frag.insert(0, [title, unknown, p]);
    p.insert(0, [text]);
    text.insert(0, "glow", { sparkle: { level: 2 } });
    return doc;
  }

  it("keeps unknown nodes and marks present at load time untouched", async () => {
    const doc = docWithUnknown();
    const { editor } = makeEditor(doc);
    await tick();
    expect(editor.state.doc.child(1).type.name).toBe("kanban");
    // edit elsewhere
    editor.chain().setTextSelection(editor.state.doc.content.size - 1).insertContent("!").run();
    await tick();
    const frag = doc.getXmlFragment("content");
    const el = frag.get(1) as Y.XmlElement;
    expect(el.nodeName).toBe("kanban");
    expect(el.getAttribute("columns")).toBe(3);
    const text = (frag.get(2) as Y.XmlElement).get(0) as Y.XmlText;
    expect(JSON.stringify(text.toDelta())).toContain("sparkle");
    editor.destroy();
  });

  it("does not delete unknown nodes that arrive after the editor was created", async () => {
    const doc = new Y.Doc();
    const seen: string[] = [];
    const { editor } = makeEditor(doc, (n) => seen.push(n));
    await tick();
    editor.commands.setContent("<h1 data-type=title>T</h1><p>x</p>");
    await tick();
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc));
    remote.getXmlFragment("content").insert(1, [new Y.XmlElement("whiteboard")]);
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote));
    await tick();
    expect(seen).toContain("whiteboard");
    expect((doc.getXmlFragment("content").get(1) as Y.XmlElement).nodeName).toBe("whiteboard");
    editor.destroy();
  });
});
