// ProseMirror schema mirroring document-model.md §4.2 — the shape the web
// editor (TipTap) writes. Used to produce the reference document through
// y-prosemirror itself, so the vector is exactly what the web client stores.
import { Schema, type NodeSpec } from "prosemirror-model";

const id = { blockId: { default: null } };
const block = (spec: NodeSpec): NodeSpec => ({
  group: "block",
  ...spec,
  attrs: { ...id, ...(spec.attrs ?? {}) },
});
const cellAttrs = { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } };

export const schema = new Schema({
  nodes: {
    doc: { content: "title block+" },
    title: { content: "inline*", attrs: id },
    paragraph: block({ content: "inline*", attrs: { textAlign: { default: null } } }),
    heading: block({ content: "inline*", attrs: { level: { default: 1 } } }),
    bulletList: block({ content: "listItem+" }),
    orderedList: block({ content: "listItem+", attrs: { start: { default: 1 } } }),
    listItem: { content: "paragraph block*", attrs: id },
    taskList: block({ content: "taskItem+" }),
    taskItem: {
      content: "paragraph block*",
      attrs: {
        ...id,
        taskId: { default: null },
        state: { default: "open" },
        scheduled: { default: null },
        deadline: { default: null },
        completedAt: { default: null },
      },
    },
    blockquote: block({ content: "block+" }),
    callout: block({
      content: "block+",
      attrs: { tone: { default: "note" }, emoji: { default: null } },
    }),
    codeBlock: block({
      content: "text*",
      marks: "",
      code: true,
      attrs: { language: { default: null } },
    }),
    mathBlock: block({ atom: true, attrs: { latex: { default: "" } } }),
    mermaid: block({ atom: true, attrs: { source: { default: "" } } }),
    horizontalRule: block({ attrs: { style: { default: "line" } } }),
    table: block({ content: "tableRow+" }),
    tableRow: { content: "(tableCell | tableHeader)*", attrs: id },
    tableHeader: { content: "block+", attrs: { ...id, ...cellAttrs } },
    tableCell: { content: "block+", attrs: { ...id, ...cellAttrs } },
    image: block({
      atom: true,
      attrs: {
        attachmentId: { default: null },
        width: { default: null },
        alt: { default: null },
        caption: { default: null },
      },
    }),
    file: block({
      atom: true,
      attrs: {
        attachmentId: { default: null },
        name: { default: "" },
        size: { default: 0 },
        mime: { default: "" },
      },
    }),
    drawing: block({ atom: true, attrs: { height: { default: 200 } } }),
    pageCard: block({
      atom: true,
      attrs: { noteId: { default: null }, style: { default: "card" } },
    }),
    noteLink: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { noteId: { default: null }, label: { default: "" } },
    },
    tag: { group: "inline", inline: true, atom: true, attrs: { name: { default: "" } } },
    hardBreak: { group: "inline", inline: true },
    text: { group: "inline" },
  },
  marks: {
    bold: {},
    italic: {},
    underline: {},
    strike: {},
    code: {},
    link: { attrs: { href: {} }, inclusive: false },
    highlight: { attrs: { color: { default: "highlight.yellow" } } },
    textColor: { attrs: { color: {} } },
    agentEdit: { attrs: { agentId: {}, at: {} } },
  },
});
