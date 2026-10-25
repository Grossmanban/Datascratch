import * as Y from "yjs";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import type { PMNode } from "@datascratch/shared/contracts";
import {
  DEFAULT_NOTE_STYLE,
  createAccountDoc,
  createNotebookDoc,
  extractNoteLinks,
  extractTags,
  extractTasks,
  getPlainText,
  getTitle,
  noteToMarkdown,
  putFolder,
  putNoteMeta,
  putNotebookRef,
  putSpace,
  putTagProps,
  setSetting,
  setStarred,
  openTab,
  yFragmentToPM,
} from "@datascratch/shared";
import { encodeAnchor, packPoints, putStroke } from "@datascratch/shared/strokes";
import { schema } from "./pm-schema.js";
import { b64, vid } from "./util.js";

const T = "2026-10-25T12:00:00.000Z";
const text = (t: string, marks?: PMNode["marks"]): PMNode => ({
  type: "text",
  text: t,
  ...(marks ? { marks } : {}),
});
const p = (id: number, ...content: PMNode[]): PMNode => ({
  type: "paragraph",
  attrs: { blockId: vid(id) },
  content,
});

/** A note using every node and mark of document-model.md §4.2. */
export const referenceNote: PMNode = {
  type: "doc",
  content: [
    { type: "title", attrs: { blockId: vid(100) }, content: [text("Reference note")] },
    p(
      101,
      text("Plain, "),
      text("bold", [{ type: "bold" }]),
      text(", "),
      text("italic", [{ type: "italic" }]),
      text(", "),
      text("underline", [{ type: "underline" }]),
      text(", "),
      text("strike", [{ type: "strike" }]),
      text(", "),
      text("code", [{ type: "code" }]),
      text(", "),
      text("link", [{ type: "link", attrs: { href: "https://example.com" } }]),
      text(", "),
      text("highlight", [{ type: "highlight", attrs: { color: "highlight.yellow" } }]),
      text(", "),
      text("color", [{ type: "textColor", attrs: { color: "text.accent" } }]),
      text(", "),
      text("agent", [{ type: "agentEdit", attrs: { agentId: "agent-1", at: T } }]),
      text(" "),
      text("bold+italic", [{ type: "bold" }, { type: "italic" }]),
      { type: "hardBreak" },
      text("Link to "),
      { type: "noteLink", attrs: { noteId: vid(900), label: "Other note" } },
      text(" with "),
      { type: "tag", attrs: { name: "project/alpha" } },
    ),
    { type: "heading", attrs: { blockId: vid(102), level: 1 }, content: [text("Heading 1")] },
    { type: "heading", attrs: { blockId: vid(103), level: 2 }, content: [text("Heading 2")] },
    { type: "heading", attrs: { blockId: vid(104), level: 3 }, content: [text("Heading 3")] },
    {
      type: "paragraph",
      attrs: { blockId: vid(105), textAlign: "center" },
      content: [text("Centered")],
    },
    {
      type: "bulletList",
      attrs: { blockId: vid(106) },
      content: [
        { type: "listItem", attrs: { blockId: vid(107) }, content: [p(108, text("Bullet"))] },
        {
          type: "listItem",
          attrs: { blockId: vid(109) },
          content: [
            p(110, text("Bullet with child")),
            {
              type: "orderedList",
              attrs: { blockId: vid(111), start: 3 },
              content: [
                {
                  type: "listItem",
                  attrs: { blockId: vid(112) },
                  content: [p(113, text("Third"))],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "taskList",
      attrs: { blockId: vid(114) },
      content: [
        {
          type: "taskItem",
          attrs: {
            blockId: vid(115),
            taskId: vid(500),
            state: "open",
            scheduled: "2026-10-26",
            deadline: "2026-10-30",
            completedAt: null,
          },
          content: [p(116, text("Open task"))],
        },
        {
          type: "taskItem",
          attrs: {
            blockId: vid(117),
            taskId: vid(501),
            state: "done",
            scheduled: null,
            deadline: null,
            completedAt: T,
          },
          content: [p(118, text("Done task"))],
        },
        {
          type: "taskItem",
          attrs: {
            blockId: vid(119),
            taskId: vid(502),
            state: "cancelled",
            scheduled: null,
            deadline: null,
            completedAt: null,
          },
          content: [p(120, text("Cancelled task"))],
        },
      ],
    },
    { type: "blockquote", attrs: { blockId: vid(121) }, content: [p(122, text("Quote"))] },
    {
      type: "callout",
      attrs: { blockId: vid(123), tone: "info", emoji: "💡" },
      content: [p(124, text("Callout"))],
    },
    {
      type: "codeBlock",
      attrs: { blockId: vid(125), language: "swift" },
      content: [text('let x = "y"\nprint(x)')],
    },
    { type: "mathBlock", attrs: { blockId: vid(126), latex: "e^{i\\pi} + 1 = 0" } },
    { type: "mermaid", attrs: { blockId: vid(127), source: "graph TD; A-->B" } },
    { type: "horizontalRule", attrs: { blockId: vid(128), style: "dots" } },
    {
      type: "table",
      attrs: { blockId: vid(129) },
      content: [
        {
          type: "tableRow",
          attrs: { blockId: vid(130) },
          content: [
            {
              type: "tableHeader",
              attrs: { blockId: vid(131), colspan: 1, rowspan: 1, colwidth: [120] },
              content: [p(132, text("H1"))],
            },
            {
              type: "tableHeader",
              attrs: { blockId: vid(133), colspan: 1, rowspan: 1, colwidth: null },
              content: [p(134, text("H2"))],
            },
          ],
        },
        {
          type: "tableRow",
          attrs: { blockId: vid(135) },
          content: [
            {
              type: "tableCell",
              attrs: { blockId: vid(136), colspan: 2, rowspan: 1, colwidth: null },
              content: [p(137, text("Wide cell"))],
            },
          ],
        },
      ],
    },
    {
      type: "image",
      attrs: {
        blockId: vid(138),
        attachmentId: vid(700),
        width: 0.5,
        alt: "Cat",
        caption: "A cat",
      },
    },
    {
      type: "file",
      attrs: {
        blockId: vid(139),
        attachmentId: vid(701),
        name: "report.pdf",
        size: 12345,
        mime: "application/pdf",
      },
    },
    { type: "drawing", attrs: { blockId: vid(140), height: 240 } },
    { type: "pageCard", attrs: { blockId: vid(141), noteId: vid(901), style: "card" } },
    p(142),
  ],
};

function fixedDoc(clientID: number): Y.Doc {
  const doc = new Y.Doc();
  doc.clientID = clientID;
  return doc;
}

export function documentVectors() {
  // --- note -----------------------------------------------------------------
  const note = fixedDoc(1);
  prosemirrorJSONToYXmlFragment(schema, referenceNote, note.getXmlFragment("content"));
  note.transact(() => {
    const meta = note.getMap("meta");
    meta.set("formatVersion", 1);
    meta.set("style", { ...DEFAULT_NOTE_STYLE, font: "serif", paper: "dots" });
    meta.set("cover", { attachmentId: vid(702), offsetY: 0.3 });
    meta.set("backdrop", null);
  });
  // A text stroke underlining "Plain" and a drawing stroke.
  const firstText = (note.getXmlFragment("content").get(1) as Y.XmlElement).get(0) as Y.XmlText;
  const pt = (a: number, x: number, t: number) => ({
    a,
    x,
    y: 0.15,
    pressure: 0.6,
    altitude: 1.2,
    azimuth: 0.5,
    roll: 0,
    t,
  });
  putStroke(note, vid(300), {
    v: 1,
    tool: "pen",
    color: "ink.blue",
    width: 1.5,
    opacity: 1,
    anchorKind: "text",
    blockId: null,
    anchors: [0, 4].map((i) => encodeAnchor(firstText, i)),
    points: packPoints([pt(0, 0, 0), pt(0, 0.4, 8), pt(1, 0.5, 16)]),
    hint: "underline",
    author: { kind: "user", id: vid(10) },
    createdAt: Date.parse(T),
  });
  putStroke(note, vid(301), {
    v: 1,
    tool: "pencil",
    color: "#336699",
    width: 2,
    opacity: 0.8,
    anchorKind: "drawing",
    blockId: vid(140),
    anchors: [],
    points: packPoints([pt(-1, 0.1, 0), pt(-1, 0.2, 8)]),
    hint: "free",
    author: { kind: "user", id: vid(10) },
    createdAt: Date.parse(T) + 1,
  });
  const comment = new Y.Map<unknown>();
  note.getMap("comments").set(vid(400), comment);
  for (const [k, v] of Object.entries({
    id: vid(400),
    blockId: vid(101),
    anchor: null,
    author: { kind: "agent", id: "agent-1", name: "Assistant" },
    text: "Looks good",
    createdAt: T,
    resolvedAt: null,
  })) {
    comment.set(k, v);
  }
  const noteId = vid(1);

  // --- notebook ---------------------------------------------------------------
  const notebookId = vid(2);
  const notebook = createNotebookDoc(notebookId, {
    doc: fixedDoc(2),
    name: "Main",
    icon: "📓",
    space: { id: vid(60), name: "Personal", icon: "🏠" },
  });
  putFolder(notebook, {
    id: vid(50),
    parentId: null,
    name: "Projects",
    icon: "📁",
    color: null,
    order: 1,
    createdAt: T,
  });
  putFolder(notebook, {
    id: vid(51),
    parentId: vid(50),
    name: "Alpha",
    icon: null,
    color: "accent.blue",
    order: 1,
    createdAt: T,
  });
  putNoteMeta(notebook, {
    id: noteId,
    folderId: vid(51),
    parentNoteId: null,
    title: "Reference note",
    kind: "note",
    dailyDate: null,
    tags: ["project/alpha"],
    icon: "📝",
    coverThumb: null,
    wrappedKey: "AQ",
    createdAt: T,
    updatedAt: T,
    trashedAt: null,
    order: 0.5,
  });
  putNoteMeta(notebook, {
    id: vid(3),
    folderId: null,
    parentNoteId: null,
    title: "2026-10-25",
    kind: "daily",
    dailyDate: "2026-10-25",
    tags: [],
    icon: null,
    coverThumb: null,
    wrappedKey: "AQ",
    createdAt: T,
    updatedAt: T,
    trashedAt: null,
    order: 1,
  });
  putTagProps(notebook, "project/alpha", { color: "accent.green", icon: null });

  // --- account ---------------------------------------------------------------
  const account = createAccountDoc({ doc: fixedDoc(3) });
  putSpace(account, {
    id: vid(60),
    name: "Personal",
    icon: "🏠",
    color: "accent.blue",
    order: 1,
    createdAt: T,
  });
  putNotebookRef(account, {
    id: notebookId,
    spaceId: vid(60),
    name: "Main",
    icon: "📓",
    color: null,
    order: 1,
    mode: "private",
    createdAt: T,
  });
  setSetting(account, "dailyNotebookId", notebookId);
  setStarred(account, { kind: "note", id: noteId }, true);
  openTab(account, noteId);

  return {
    "document/note.json": {
      description:
        "Reference note written through y-prosemirror (field 'content') with every node and mark of document-model.md §4.2. Decode `update` (Yjs update v1), then read: `content` as canonical PM JSON (attributes with null values are not stored; mark values are the mark attrs object — {} when empty — and mark attrs are omitted when empty), the other roots as plain JSON (binary as base64url).",
      noteId,
      update: b64(Y.encodeStateAsUpdate(note)),
      expected: {
        content: yFragmentToPM(note.getXmlFragment("content")),
        meta: note.getMap("meta").toJSON(),
        strokes: Object.fromEntries(
          [...note.getMap("strokes").entries()].map(([id, m]) => {
            const j = (m as Y.Map<unknown>).toJSON() as Record<string, unknown>;
            return [
              id,
              {
                ...j,
                anchors: (j.anchors as Uint8Array[]).map(b64),
                points: b64(j.points as Uint8Array),
              },
            ];
          }),
        ),
        comments: note.getMap("comments").toJSON(),
        derived: {
          title: getTitle(note),
          plainText: getPlainText(note),
          tasks: extractTasks(note, noteId),
          links: extractNoteLinks(note, noteId),
          tags: extractTags(note),
          markdown: noteToMarkdown(note, { blocksWithHandwriting: new Set([vid(101)]) }),
        },
      },
    },
    "document/notebook.json": {
      description:
        "Reference notebook index document (document-model.md §3). Records are nested Y.Maps.",
      notebookId,
      update: b64(Y.encodeStateAsUpdate(notebook)),
      expected: notebook.toJSON(),
    },
    "document/account.json": {
      description: "Reference account document (document-model.md §2).",
      update: b64(Y.encodeStateAsUpdate(account)),
      expected: account.toJSON(),
    },
  };
}
