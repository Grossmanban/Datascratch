import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { uuidv7 } from "@datascratch/shared/ids";
import { initNoteContent } from "../../agents/src/doc/edits";
import { repairTitles, uuidv7Time } from "../src/collab/repairTitle";
import { makeEditor, tick } from "./helpers";

// document-model.md «Один title»: the repair of damaged note starts (2026-10-26), same rule as iOS.
const agentEdit = { agentId: "agent-claude", at: "2026-10-26T20:00:00.000Z" };

/** Top-level blocks as `name:text` (+ `#id` when asked). */
function blocks(doc: Y.Doc, ids = false): string[] {
  return (doc.getXmlFragment("content").toArray() as Y.XmlElement[]).map((e) => {
    const text = e
      .toArray()
      .map((c) => (c instanceof Y.XmlText ? c.toDelta().map((d: { insert: unknown }) => (typeof d.insert === "string" ? d.insert : "")).join("") : ""))
      .join("");
    return `${e.nodeName}${ids ? `#${e.getAttribute("blockId")}` : ""}:${text}`;
  });
}

/** create_note from packages/agents (title + Markdown), as over MCP. */
function agentNote(title = "План на неделю"): Y.Doc {
  const doc = new Y.Doc();
  initNoteContent(doc, title, "Первый абзац.\n\n- пункт", { agentEdit });
  return doc;
}

/** An empty block with a blockId minted now (newer than everything the agent wrote). */
function emptyBlock(name: string, id = uuidv7()): Y.XmlElement {
  const e = new Y.XmlElement(name);
  e.setAttribute("blockId", id);
  e.insert(0, [new Y.XmlText()]);
  return e;
}

const later = () => new Promise((r) => setTimeout(r, 3));

/** The demotion damage: a new empty title in front, the agent's title turned into a paragraph (same id). */
function demoted(): Y.Doc {
  const doc = agentNote();
  const frag = doc.getXmlFragment("content");
  const title = frag.get(0) as Y.XmlElement;
  const para = new Y.XmlElement("paragraph");
  para.setAttribute("blockId", title.getAttribute("blockId") as string);
  const t = new Y.XmlText();
  t.applyDelta((title.get(0) as Y.XmlText).toDelta());
  para.insert(0, [t]);
  doc.transact(() => {
    frag.delete(0, 1);
    frag.insert(0, [emptyBlock("title"), para]);
  });
  return doc;
}

describe("title repair (document-model.md «Один title»)", () => {
  it("uuidv7Time reads the timestamp and rejects other ids", () => {
    const id = uuidv7();
    expect(Math.abs(uuidv7Time(id)! - Date.now())).toBeLessThan(5000);
    expect(uuidv7Time("not-an-id")).toBeNull();
    expect(uuidv7Time(crypto.randomUUID())).toBeNull();
  });

  it("(a) an empty title seeded before the agent's title is deleted; the agent's title stays", async () => {
    const doc = agentNote();
    const original = blocks(doc, true);
    await later();
    doc.getXmlFragment("content").insert(0, [emptyBlock("title")]);
    expect(repairTitles(doc.getXmlFragment("content"))).toEqual({ deletedEmptyTitles: 1, restoredFromParagraph: false });
    expect(blocks(doc, true)).toEqual(original);
  });

  it("(a) several empty titles: only the first survives; non-empty extra titles are left as they are", () => {
    const doc = new Y.Doc();
    const frag = doc.getXmlFragment("content");
    const named = new Y.XmlElement("title");
    named.setAttribute("blockId", uuidv7());
    const t = new Y.XmlText();
    t.insert(0, "Второе название");
    named.insert(0, [t]);
    frag.insert(0, [emptyBlock("title"), emptyBlock("title"), emptyBlock("paragraph")]);
    repairTitles(frag);
    expect(blocks(doc)).toEqual(["title:", "paragraph:"]);
    const doc2 = agentNote();
    doc2.getXmlFragment("content").insert(1, [named]);
    const before = blocks(doc2);
    repairTitles(doc2.getXmlFragment("content"));
    expect(blocks(doc2)).toEqual(before);
  });

  it("(b) an empty title followed by an OLDER paragraph gets that paragraph's text back (marks kept)", () => {
    const doc = demoted();
    expect(blocks(doc).slice(0, 2)).toEqual(["title:", "paragraph:План на неделю"]);
    expect(repairTitles(doc.getXmlFragment("content"))).toEqual({ deletedEmptyTitles: 0, restoredFromParagraph: true });
    expect(blocks(doc)).toEqual(["title:План на неделю", "paragraph:Первый абзац.", "bulletList:"]);
    const title = doc.getXmlFragment("content").get(0) as Y.XmlElement;
    expect((title.get(0) as Y.XmlText).toDelta()[0].attributes).toEqual({ agentEdit });
  });

  it("(b) a new note (empty title, NEWER paragraph) and a normal note are left alone", async () => {
    const doc = new Y.Doc();
    const frag = doc.getXmlFragment("content");
    const title = emptyBlock("title");
    await later();
    frag.insert(0, [title, emptyBlock("paragraph")]);
    expect(repairTitles(frag)).toEqual({ deletedEmptyTitles: 0, restoredFromParagraph: false });
    const agent = agentNote();
    const before = blocks(agent, true);
    repairTitles(agent.getXmlFragment("content"));
    expect(blocks(agent, true)).toEqual(before);
  });

  it("(c) an empty document is left alone; the repair is idempotent (a second run writes nothing)", () => {
    const empty = new Y.Doc();
    let n = 0;
    empty.on("update", () => n++);
    repairTitles(empty.getXmlFragment("content"));
    expect(n).toBe(0);
    const doc = demoted();
    repairTitles(doc.getXmlFragment("content"));
    let m = 0;
    doc.on("update", () => m++);
    expect(repairTitles(doc.getXmlFragment("content"))).toEqual({ deletedEmptyTitles: 0, restoredFromParagraph: false });
    expect(m).toBe(0);
  });

  it("(a) two clients deleting the same empty title concurrently converge", async () => {
    const a = agentNote();
    await later();
    a.getXmlFragment("content").insert(0, [emptyBlock("title")]);
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    repairTitles(a.getXmlFragment("content"));
    repairTitles(b.getXmlFragment("content"));
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    expect(blocks(a, true)).toEqual(blocks(b, true));
    expect(blocks(a).filter((x) => x.startsWith("title"))).toEqual(["title:План на неделю"]);
  });

  it("the editor heals a damaged note on open and when the damage arrives later", async () => {
    const doc = demoted();
    const { editor } = makeEditor(doc);
    await tick();
    await tick();
    expect(editor.state.doc.firstChild!.type.name).toBe("title");
    expect(editor.state.doc.firstChild!.textContent).toBe("План на неделю");
    expect(blocks(doc)[1]).toBe("paragraph:Первый абзац.");
    // Another client seeds an empty title in front later: it disappears.
    await later();
    doc.getXmlFragment("content").insert(0, [emptyBlock("title")]);
    await tick();
    await tick();
    expect(blocks(doc).filter((x) => x.startsWith("title"))).toEqual(["title:План на неделю"]);
    // The repair is not an undoable user edit.
    editor.destroy();
  });

  it("an empty note writes nothing on focus or selection; typing writes the title with an id", async () => {
    const doc = new Y.Doc();
    let n = 0;
    doc.on("update", () => n++);
    const { editor } = makeEditor(doc);
    await tick();
    editor.commands.focus("start");
    editor.commands.setTextSelection(1);
    await tick();
    expect(n).toBe(0);
    editor.commands.insertContent("Новая");
    await tick();
    expect(blocks(doc)[0]).toBe("title:Новая");
    expect((doc.getXmlFragment("content").get(0) as Y.XmlElement).getAttribute("blockId")).toBeTruthy();
    editor.destroy();
  });
});
