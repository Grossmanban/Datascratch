import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { appendTask, extractNote, initNoteDoc, noteMaps, removeTask, restoreFrom, setTaskText, setTitle, updateTask } from "./note";

function para(text: string) {
  const p = new Y.XmlElement("paragraph");
  const t = new Y.XmlText();
  t.insert(0, text);
  p.insert(0, [t]);
  return p;
}

describe("note document (document-model.md §4)", () => {
  it("initialises title + paragraph with blockIds and meta", () => {
    const doc = new Y.Doc();
    initNoteDoc(doc, { title: "Hello", body: ["World"] });
    const { content, meta } = noteMaps(doc);
    const [title, p] = content.toArray() as Y.XmlElement[];
    expect(title!.nodeName).toBe("title");
    expect(p!.nodeName).toBe("paragraph");
    expect(title!.getAttribute("blockId")).toMatch(/^[0-9a-f-]{36}$/);
    expect(meta.get("formatVersion")).toBe(1);
    expect(extractNote(doc).title).toBe("Hello");
  });

  it("extracts tasks, links and tags", () => {
    const doc = new Y.Doc();
    initNoteDoc(doc, { title: "T" });
    const { content } = noteMaps(doc);
    const p = para("see ");
    const link = new Y.XmlElement("noteLink");
    link.setAttribute("noteId", "n-1");
    link.setAttribute("label", "Other");
    const tag = new Y.XmlElement("tag");
    tag.setAttribute("name", "work/q4");
    p.insert(p.length, [link, tag]);
    content.insert(content.length, [p]);
    appendTask(doc, "Ship it", { scheduled: "2026-10-26" });
    const ex = extractNote(doc);
    expect(ex.links).toEqual(["n-1"]);
    expect(ex.tags).toEqual(["work/q4"]);
    expect(ex.tasks).toHaveLength(1);
    expect(ex.tasks[0]).toMatchObject({ text: "Ship it", state: "open", scheduled: "2026-10-26", deadline: null });
    expect(ex.text).toContain("see Other#work/q4");
  });

  it("updates, renames and removes tasks; null attrs are removed like y-prosemirror", () => {
    const doc = new Y.Doc();
    initNoteDoc(doc);
    const id = appendTask(doc, "A", { deadline: "2026-11-01" });
    appendTask(doc, "B");
    updateTask(doc, id, { state: "done", deadline: null });
    let ex = extractNote(doc);
    expect(ex.tasks[0]).toMatchObject({ state: "done", deadline: null });
    expect(ex.tasks[0]!.completedAt).toBeTruthy();
    const list = noteMaps(doc).content.toArray().find((c) => c instanceof Y.XmlElement && c.nodeName === "taskList") as Y.XmlElement;
    expect((list.get(0) as Y.XmlElement).getAttribute("deadline")).toBeUndefined();
    setTaskText(doc, id, "A2");
    expect(extractNote(doc).tasks[0]!.text).toBe("A2");
    const removed = removeTask(doc, id);
    expect(removed?.text).toBe("A2");
    ex = extractNote(doc);
    expect(ex.tasks.map((t) => t.text)).toEqual(["B"]);
  });

  it("appends consecutive tasks into the same task list", () => {
    const doc = new Y.Doc();
    initNoteDoc(doc, { body: [] });
    appendTask(doc, "1");
    appendTask(doc, "2");
    const lists = noteMaps(doc).content.toArray().filter((c) => c instanceof Y.XmlElement && c.nodeName === "taskList");
    expect(lists).toHaveLength(1);
  });

  it("restores a version as a new edit that merges with concurrent replicas", () => {
    const a = new Y.Doc();
    initNoteDoc(a, { title: "v1", body: ["old"] });
    const snapshot = new Y.Doc();
    Y.applyUpdate(snapshot, Y.encodeStateAsUpdate(a));
    setTitle(a, "v2");
    noteMaps(a).content.insert(noteMaps(a).content.length, [para("new")]);
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    restoreFrom(a, snapshot);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    expect(extractNote(b).title).toBe("v1");
    expect(extractNote(b).text).toBe("old");
  });
});
