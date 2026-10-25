import { Schema } from "prosemirror-model";
import { prosemirrorJSONToYDoc, yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import {
  BlockOperationError,
  applyBlockOperations,
  buildBacklinks,
  createAccountDoc,
  createNoteDoc,
  createNotebookDoc,
  extractNoteLinks,
  extractTags,
  extractTasks,
  findDailyNote,
  folderSubtree,
  getBlock,
  getFormatVersion,
  getNoteMetas,
  getPlainText,
  getSpaces,
  getStarred,
  getTabs,
  getTitle,
  isReadOnlyFormat,
  listTopLevelBlocks,
  noteRoots,
  noteToMarkdown,
  openTab,
  closeTab,
  patchNoteMeta,
  pmContentToY,
  putFolder,
  putNoteMeta,
  putSpace,
  setStarred,
  setTitle,
  tagAncestors,
  yFragmentToPM,
  type NoteMeta,
  type PMNode,
} from "../src/index.js";

let n = 0;
const seqId = () => `0192f3c4-0000-7000-8000-${(++n).toString(16).padStart(12, "0")}`;
const T = "2026-10-25T12:00:00.000Z";

const schema = new Schema({
  nodes: {
    doc: { content: "title block+" },
    title: { content: "inline*", attrs: { blockId: { default: null } } },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: { blockId: { default: null }, textAlign: { default: null } },
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { blockId: { default: null }, level: { default: 1 } },
    },
    noteLink: { group: "inline", inline: true, atom: true, attrs: { noteId: {}, label: {} } },
    tag: { group: "inline", inline: true, atom: true, attrs: { name: {} } },
    text: { group: "inline" },
  },
  marks: {
    bold: {},
    italic: {},
    link: { attrs: { href: {} }, inclusive: false },
  },
});

const sample: PMNode = {
  type: "doc",
  content: [
    { type: "title", attrs: { blockId: seqId() }, content: [{ type: "text", text: "Title" }] },
    {
      type: "paragraph",
      attrs: { blockId: seqId(), textAlign: null },
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " and ", marks: [] },
        {
          type: "text",
          text: "link",
          marks: [{ type: "link", attrs: { href: "https://x.y" } }, { type: "italic" }],
        },
        { type: "noteLink", attrs: { noteId: seqId(), label: "Other" } },
        { type: "text", text: " " },
        { type: "tag", attrs: { name: "work/urgent" } },
      ],
    },
    {
      type: "heading",
      attrs: { blockId: seqId(), level: 2 },
      content: [{ type: "text", text: "Sub" }],
    },
    { type: "paragraph", attrs: { blockId: seqId(), textAlign: null } },
  ],
};

describe("y-prosemirror compatibility", () => {
  it("pmContentToY writes the same tree as y-prosemirror", () => {
    const viaYpm = prosemirrorJSONToYDoc(schema, sample, "content");
    const ours = new Y.Doc();
    ours.getXmlFragment("content").insert(0, pmContentToY(sample.content));
    expect(ours.getXmlFragment("content").toJSON()).toBe(viaYpm.getXmlFragment("content").toJSON());
    // Formatting attributes: `{}` for attribute-less marks, attrs object otherwise.
    const p = ours.getXmlFragment("content").get(1) as Y.XmlElement;
    const delta = (p.get(0) as Y.XmlText).toDelta();
    expect(delta[1]).toEqual({ insert: "bold", attributes: { bold: {} } });
    expect(p.getAttribute("textAlign")).toBeUndefined();
  });

  it("yFragmentToPM reads what y-prosemirror reads", () => {
    const viaYpm = prosemirrorJSONToYDoc(schema, sample, "content");
    const frag = viaYpm.getXmlFragment("content");
    const theirs = yXmlFragmentToProsemirrorJSON(frag);
    const ours = yFragmentToPM(frag);
    // y-prosemirror fills schema defaults; compare after dropping null attrs.
    const strip = (node: PMNode): PMNode => {
      const out: PMNode = { ...node };
      if (out.attrs) {
        const attrs = Object.fromEntries(Object.entries(out.attrs).filter(([, v]) => v !== null));
        if (Object.keys(attrs).length) out.attrs = attrs;
        else delete out.attrs;
      }
      if (out.marks)
        out.marks = out.marks.map((m) =>
          m.attrs && Object.keys(m.attrs).length ? m : { type: m.type },
        );
      if (out.content) out.content = out.content.map(strip);
      return out;
    };
    expect(strip(ours)).toEqual(strip(theirs as PMNode));
  });

  it("accepts `true` and hashed keys for marks", () => {
    const doc = new Y.Doc();
    const p = new Y.XmlElement("paragraph");
    const t = new Y.XmlText();
    p.insert(0, [t]);
    doc.getXmlFragment("content").insert(0, [p]);
    t.insert(0, "x", { bold: true, "comment--abc": { id: "1" } });
    expect(yFragmentToPM(doc.getXmlFragment("content")).content![0]!.content).toEqual([
      {
        type: "text",
        text: "x",
        marks: [{ type: "bold" }, { type: "comment", attrs: { id: "1" } }],
      },
    ]);
  });
});

describe("factories", () => {
  it("creates notes as title + body with blockIds and meta", () => {
    const doc = createNoteDoc({ title: "Hi", newId: seqId });
    const pm = yFragmentToPM(noteRoots(doc).content);
    expect(pm.content!.map((c) => c.type)).toEqual(["title", "paragraph"]);
    expect(pm.content!.every((c) => typeof c.attrs?.blockId === "string")).toBe(true);
    expect(getTitle(doc)).toBe("Hi");
    expect(noteRoots(doc).meta.get("style")).toEqual({
      font: "sans",
      width: "normal",
      paper: "plain",
      textColor: null,
    });
    expect(getFormatVersion(doc)).toBe(1);
  });
  it("assigns taskIds and nested blockIds", () => {
    const doc = createNoteDoc({
      newId: seqId,
      blocks: [
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { state: "open" }, content: [{ type: "paragraph" }] },
          ],
        },
      ],
    });
    const list = listTopLevelBlocks(doc)[0]!;
    const item = list.content![0]!;
    expect(item.attrs!.taskId).toMatch(/^0192f3c4/);
    expect(item.content![0]!.attrs!.blockId).toMatch(/^0192f3c4/);
  });
  it("flags newer formats read-only", () => {
    const doc = createAccountDoc();
    expect(isReadOnlyFormat(doc)).toBe(false);
    doc.getMap("meta").set("formatVersion", 2);
    expect(isReadOnlyFormat(doc)).toBe(true);
    expect(createNotebookDoc("nb").getMap("meta").get("notebookId")).toBe("nb");
  });
});

describe("records", () => {
  it("spaces sort by order; starred and tabs dedupe", () => {
    const doc = createAccountDoc();
    putSpace(doc, { id: "b", name: "B", icon: null, color: null, order: 2, createdAt: T });
    putSpace(doc, { id: "a", name: "A", icon: "📚", color: null, order: 1, createdAt: T });
    expect(getSpaces(doc).map((s) => s.id)).toEqual(["a", "b"]);
    setStarred(doc, { kind: "note", id: "n1" }, true);
    setStarred(doc, { kind: "note", id: "n1" }, true);
    expect(getStarred(doc)).toEqual([{ kind: "note", id: "n1" }]);
    setStarred(doc, { kind: "note", id: "n1" }, false);
    expect(getStarred(doc)).toEqual([]);
    openTab(doc, "n1");
    openTab(doc, "n2");
    openTab(doc, "n1");
    expect(getTabs(doc)).toEqual([{ noteId: "n1" }, { noteId: "n2" }]);
    closeTab(doc, "n1");
    expect(doc.getMap("settings").get("activeTab")).toBe("n2");
  });
  it("note metas merge concurrent field edits", () => {
    const a = createNotebookDoc("nb");
    const meta: NoteMeta = {
      id: "n1",
      folderId: null,
      parentNoteId: null,
      title: "T",
      kind: "daily",
      dailyDate: "2026-10-25",
      tags: [],
      icon: null,
      coverThumb: null,
      wrappedKey: "w",
      createdAt: T,
      updatedAt: T,
      trashedAt: null,
      order: 0,
    };
    putNoteMeta(a, meta);
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    patchNoteMeta(a, "n1", { title: "Renamed" });
    patchNoteMeta(b, "n1", { folderId: "f1" });
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    expect(getNoteMetas(a)[0]).toMatchObject({ title: "Renamed", folderId: "f1" });
    expect(getNoteMetas(a, { folderId: null })).toHaveLength(0);
    expect(findDailyNote(a, "2026-10-25")?.id).toBe("n1");
    patchNoteMeta(a, "n1", { trashedAt: T });
    expect(getNoteMetas(a)).toHaveLength(0);
    expect(getNoteMetas(a, { includeTrashed: true })).toHaveLength(1);
  });
  it("folder subtree", () => {
    const doc = createNotebookDoc("nb");
    const f = (id: string, parentId: string | null) =>
      putFolder(doc, { id, parentId, name: id, icon: null, color: null, order: 0, createdAt: T });
    f("r", null);
    f("c1", "r");
    f("c2", "c1");
    f("x", null);
    expect(folderSubtree(doc, "r").sort()).toEqual(["c1", "c2", "r"]);
  });
});

function richNote(): { doc: Y.Doc; ids: Record<string, string> } {
  const ids = {
    p: seqId(),
    task: seqId(),
    task2: seqId(),
    quote: seqId(),
    card: seqId(),
    other: seqId(),
  };
  const doc = createNoteDoc({
    title: "Plan",
    newId: seqId,
    blocks: [
      {
        type: "paragraph",
        attrs: { blockId: ids.p },
        content: [
          { type: "text", text: "See " },
          { type: "noteLink", attrs: { noteId: ids.other, label: "Other note" } },
          { type: "text", text: " for " },
          { type: "tag", attrs: { name: "work/q4" } },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: {
              blockId: ids.task,
              taskId: "t1",
              state: "open",
              scheduled: "2026-10-26",
              deadline: null,
            },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Call Bob" }] }],
          },
          {
            type: "taskItem",
            attrs: { blockId: ids.task2, taskId: "t2", state: "done", deadline: "2026-11-01" },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Ship" }] }],
          },
        ],
      },
      {
        type: "blockquote",
        attrs: { blockId: ids.quote },
        content: [{ type: "paragraph", content: [{ type: "text", text: "Quote" }] }],
      },
      { type: "pageCard", attrs: { blockId: ids.card, noteId: ids.other, style: "card" } },
    ],
  });
  return { doc, ids };
}

describe("extraction", () => {
  it("extracts tasks, links, tags and plain text", () => {
    const { doc, ids } = richNote();
    expect(extractTasks(doc, "note")).toEqual([
      {
        noteId: "note",
        taskId: "t1",
        blockId: ids.task,
        text: "Call Bob",
        state: "open",
        scheduled: "2026-10-26",
        deadline: null,
      },
      {
        noteId: "note",
        taskId: "t2",
        blockId: ids.task2,
        text: "Ship",
        state: "done",
        scheduled: null,
        deadline: "2026-11-01",
      },
    ]);
    const links = extractNoteLinks(doc, "note");
    expect(links).toEqual([
      { fromNoteId: "note", toNoteId: ids.other, blockId: ids.p, label: "Other note" },
      { fromNoteId: "note", toNoteId: ids.other, blockId: ids.card, label: "" },
    ]);
    expect(buildBacklinks(links).get(ids.other)).toHaveLength(2);
    expect(extractTags(doc)).toEqual(["work/q4"]);
    expect(tagAncestors("work/q4/x")).toEqual(["work", "work/q4", "work/q4/x"]);
    expect(getPlainText(doc)).toBe("Plan\nSee Other note for #work/q4\nCall Bob\nShip\nQuote");
  });
});

describe("markdown", () => {
  it("exports a rich note", () => {
    const { doc } = richNote();
    expect(noteToMarkdown(doc)).toBe(
      [
        "# Plan",
        "",
        "See [[Other note]] for #work/q4",
        "",
        "- [ ] Call Bob ⏳ 2026-10-26",
        "- [x] Ship 📅 2026-11-01",
        "",
        "> Quote",
        "",
        `[[note:${listTopLevelBlocks(doc)[3]!.attrs!.noteId as string}]]`,
        "",
      ].join("\n"),
    );
  });
  it("nests marks and escapes text", () => {
    const doc = createNoteDoc({
      newId: seqId,
      blocks: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a*b " },
            { type: "text", text: "bold ", marks: [{ type: "bold" }] },
            { type: "text", text: "both", marks: [{ type: "bold" }, { type: "italic" }] },
            { type: "text", text: " x", marks: [{ type: "link", attrs: { href: "https://e.x" } }] },
            { type: "text", text: "`c`", marks: [{ type: "code" }] },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "let *x* = 1" }],
        },
        {
          type: "callout",
          attrs: { tone: "warning", emoji: "⚠️" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Careful" }] }],
        },
        { type: "drawing", attrs: { blockId: "d1", height: 200 } },
        { type: "image", attrs: { attachmentId: "img", alt: "cat", caption: null, width: null } },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "one" }] },
                {
                  type: "orderedList",
                  attrs: { start: 3 },
                  content: [
                    {
                      type: "listItem",
                      content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "H|1" }] }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "H2" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "c" }] }],
                },
              ],
            },
          ],
        },
        { type: "futureBlock", content: [{ type: "text", text: "kept" }] },
      ],
    });
    expect(noteToMarkdown(doc, { attachmentUrl: (id) => `files/${id}` })).toBe(
      [
        "a\\*b **bold *both***[ x](https://e.x)``c``",
        "",
        "```ts\nlet *x* = 1\n```",
        "",
        "> [!warning] ⚠️\n> Careful",
        "",
        "![Рисунок](handwriting:d1)",
        "",
        "![cat](files/img)",
        "",
        "- one\n  3. nested",
        "",
        "| H\\|1 | H2 |\n| --- | --- |\n| c |  |",
        "",
        "<!-- futureBlock -->\nkept",
        "",
      ].join("\n"),
    );
  });
});

describe("block operations", () => {
  it("inserts, replaces, updates and deletes by blockId", () => {
    const { doc, ids } = richNote();
    const { blockIds } = applyBlockOperations(
      doc,
      [
        {
          op: "insert",
          position: { after: ids.p },
          blocks: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "New" }] },
          ],
        },
        {
          op: "replace",
          blockId: ids.quote,
          block: { type: "paragraph", content: [{ type: "text", text: "Replaced" }] },
        },
        { op: "updateAttrs", blockId: ids.task, attrs: { state: "done", scheduled: null } },
        { op: "delete", blockId: ids.card },
        {
          op: "insert",
          position: { at: "start" },
          blocks: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }],
        },
        { op: "setTitle", text: "Plan v2" },
      ],
      { agentEdit: { agentId: "agent-1", at: T }, newId: seqId },
    );
    expect(blockIds).toHaveLength(3);
    expect(blockIds[1]).toBe(ids.quote);
    const top = listTopLevelBlocks(doc);
    expect(top.map((b) => b.type)).toEqual([
      "paragraph",
      "paragraph",
      "heading",
      "taskList",
      "paragraph",
    ]);
    expect(top[0]!.content![0]!.marks).toEqual([
      { type: "agentEdit", attrs: { agentId: "agent-1", at: T } },
    ]);
    expect(getBlock(doc, ids.quote)!.content![0]!.text).toBe("Replaced");
    expect(getBlock(doc, ids.task)!.attrs).toMatchObject({ state: "done" });
    expect(getBlock(doc, ids.task)!.attrs!.scheduled).toBeUndefined();
    expect(getTitle(doc)).toBe("Plan v2");
  });
  it("is atomic: a failing op applies nothing", () => {
    const { doc, ids } = richNote();
    const before = Y.encodeStateVector(doc);
    expect(() =>
      applyBlockOperations(doc, [
        { op: "delete", blockId: ids.p },
        { op: "delete", blockId: "missing" },
      ]),
    ).toThrow(BlockOperationError);
    expect(Y.encodeStateVector(doc)).toEqual(before);
  });
  it("rejects invalid blocks and title edits", () => {
    const { doc } = richNote();
    const titleId = yFragmentToPM(noteRoots(doc).content).content![0]!.attrs!.blockId as string;
    expect(() => applyBlockOperations(doc, [{ op: "delete", blockId: titleId }])).toThrow(/title/);
    expect(() =>
      applyBlockOperations(doc, [
        { op: "insert", position: { at: "end" }, blocks: [{ type: "script" }] },
      ]),
    ).toThrow(/unknown block/);
    expect(() =>
      applyBlockOperations(doc, [
        {
          op: "insert",
          position: { at: "end" },
          blocks: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "x", marks: [{ type: "evil" }] }],
            },
          ],
        },
      ]),
    ).toThrow(/unknown mark/);
  });
  it("setTitle replaces text", () => {
    const doc = createNoteDoc({ title: "Old" });
    setTitle(doc, "New");
    expect(getTitle(doc)).toBe("New");
    setTitle(doc, "");
    expect(getTitle(doc)).toBe("");
  });
});
