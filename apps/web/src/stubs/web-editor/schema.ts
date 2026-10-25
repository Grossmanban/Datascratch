import { Extension, InputRule, Mark, mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { uuidv7 } from "@/lib/shared";

// Every node of document-model.md §4.2 is declared, even the ones this stub only shows as
// placeholders: y-prosemirror deletes Yjs elements its schema can't represent, so a missing
// node type here would destroy content written by iOS or the real editor.

const attr = (name: string, def: unknown = null) => ({
  [name]: {
    default: def,
    parseHTML: (el: HTMLElement) => {
      const v = el.getAttribute(`data-${name.toLowerCase()}`);
      if (v === null) return def;
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs[name] === null || attrs[name] === undefined
        ? {}
        : { [`data-${name.toLowerCase()}`]: typeof attrs[name] === "string" ? attrs[name] : JSON.stringify(attrs[name]) },
  },
});

export const Title = Node.create({
  name: "title",
  content: "inline*",
  marks: "",
  defining: true,
  parseHTML: () => [{ tag: "h1[data-title]" }],
  renderHTML: ({ HTMLAttributes }) => ["h1", mergeAttributes(HTMLAttributes, { "data-title": "", class: "ds-title" }), 0],
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "title") return false;
        const after = $from.after();
        const next = editor.state.doc.nodeAt(after);
        if (next && next.type.name === "paragraph" && next.content.size === 0) {
          return editor.commands.setTextSelection(after + 1);
        }
        return editor.chain().insertContentAt(after, { type: "paragraph" }).setTextSelection(after + 1).run();
      },
    };
  },
});

export const BlockIds = Extension.create({
  name: "blockIds",
  addGlobalAttributes() {
    return [
      {
        types: [
          "title",
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "listItem",
          "taskList",
          "taskItem",
          "blockquote",
          "callout",
          "codeBlock",
          "mathBlock",
          "mermaid",
          "horizontalRule",
          "table",
          "tableRow",
          "tableHeader",
          "tableCell",
          "image",
          "file",
          "drawing",
          "pageCard",
        ],
        attributes: { blockId: { default: null, keepOnSplit: false, rendered: false } },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockIds"),
        appendTransaction: (trs, _old, state) => {
          if (!trs.some((t) => t.docChanged)) return null;
          const seen = new Set<string>();
          const tr = state.tr;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (!node.isBlock || !("blockId" in node.attrs)) return;
            const id = node.attrs.blockId as string | null;
            const patch: Record<string, unknown> = {};
            if (!id || seen.has(id)) patch.blockId = uuidv7();
            if (node.type.name === "taskItem" && (!node.attrs.taskId || (patch.blockId && id && node.attrs.taskId === id)))
              patch.taskId = uuidv7();
            seen.add((patch.blockId as string) ?? id!);
            if (Object.keys(patch).length) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch });
              changed = true;
            }
          });
          if (!changed) return null;
          tr.setMeta("addToHistory", false);
          return tr;
        },
      }),
    ];
  },
});

export const TaskList = Node.create({
  name: "taskList",
  group: "block list",
  content: "taskItem+",
  parseHTML: () => [{ tag: 'ul[data-type="taskList"]', priority: 60 }],
  renderHTML: ({ HTMLAttributes }) => ["ul", mergeAttributes(HTMLAttributes, { "data-type": "taskList", class: "ds-tasklist" }), 0],
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*\[( |x)?\]\s$/,
        handler: ({ range, chain, match }) => {
          chain()
            .deleteRange(range)
            .wrapIn("taskList")
            .wrapIn("taskItem")
            .run();
          void match;
        },
      }),
    ];
  },
});

export const TaskItem = Node.create({
  name: "taskItem",
  content: "paragraph block*",
  defining: true,
  addAttributes: () => ({
    ...attr("taskId"),
    ...attr("state", "open"),
    ...attr("scheduled"),
    ...attr("deadline"),
    ...attr("completedAt"),
  }),
  parseHTML: () => [{ tag: 'li[data-type="taskItem"]', priority: 60 }],
  renderHTML: ({ HTMLAttributes }) => ["li", mergeAttributes(HTMLAttributes, { "data-type": "taskItem" }), 0],
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
      "Mod-Enter": () => {
        const { $from } = this.editor.state.selection;
        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          if (node.type.name === this.name) {
            const done = node.attrs.state !== "done";
            this.editor
              .chain()
              .command(({ tr }) => {
                tr.setNodeMarkup($from.before(d), undefined, {
                  ...node.attrs,
                  state: done ? "done" : "open",
                  completedAt: done ? new Date().toISOString() : null,
                });
                return true;
              })
              .run();
            return true;
          }
        }
        return false;
      },
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      let current = node;
      const li = document.createElement("li");
      li.dataset.type = "taskItem";
      const box = document.createElement("button");
      box.type = "button";
      box.contentEditable = "false";
      box.className = "ds-taskbox";
      const meta = document.createElement("span");
      meta.contentEditable = "false";
      meta.className = "ds-taskmeta";
      const content = document.createElement("div");
      content.className = "ds-taskcontent";
      li.append(box, content, meta);
      const paint = () => {
        li.dataset.state = String(current.attrs.state ?? "open");
        box.setAttribute("role", "checkbox");
        box.setAttribute("aria-checked", String(current.attrs.state === "done"));
        const bits: string[] = [];
        if (current.attrs.scheduled) bits.push(`◷ ${current.attrs.scheduled}`);
        if (current.attrs.deadline) bits.push(`⚑ ${current.attrs.deadline}`);
        meta.textContent = bits.join("  ");
        meta.hidden = bits.length === 0;
      };
      paint();
      box.addEventListener("mousedown", (e) => e.preventDefault());
      box.addEventListener("click", () => {
        if (!editor.isEditable || typeof getPos !== "function") return;
        const pos = getPos();
        if (pos === undefined) return;
        const done = current.attrs.state !== "done";
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...current.attrs,
            state: done ? "done" : "open",
            completedAt: done ? new Date().toISOString() : null,
          }),
        );
      });
      return {
        dom: li,
        contentDOM: content,
        update: (n) => {
          if (n.type !== current.type) return false;
          current = n;
          paint();
          return true;
        },
      };
    };
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ ...attr("tone", "note"), ...attr("emoji") }),
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "aside",
    mergeAttributes(HTMLAttributes, { "data-callout": "", class: `ds-callout ds-callout-${node.attrs.tone}` }),
    0,
  ],
});

export const HorizontalRule = Node.create({
  name: "horizontalRule",
  group: "block",
  atom: true,
  addAttributes: () => ({ ...attr("style", "line") }),
  parseHTML: () => [{ tag: "hr" }],
  renderHTML: ({ node, HTMLAttributes }) => ["hr", mergeAttributes(HTMLAttributes, { class: `ds-hr ds-hr-${node.attrs.style}` })],
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|___)\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).insertContentAt(range.from, { type: "horizontalRule" }).run();
        },
      }),
    ];
  },
});

function atomBlock(name: string, attrs: Record<string, unknown>, render: (a: Record<string, unknown>) => string, cls: string) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes: () => Object.assign({}, ...Object.entries(attrs).map(([k, v]) => attr(k, v))),
    parseHTML: () => [{ tag: `div[data-node="${name}"]` }],
    renderHTML: ({ node, HTMLAttributes }) => [
      "div",
      mergeAttributes(HTMLAttributes, { "data-node": name, class: `ds-atom ${cls}`, contenteditable: "false" }),
      render(node.attrs),
    ],
  });
}

export const MathBlock = atomBlock("mathBlock", { latex: "" }, (a) => String(a.latex || "∑ LaTeX"), "ds-atom-math");
export const Mermaid = atomBlock("mermaid", { source: "" }, (a) => String(a.source || "Mermaid"), "ds-atom-code");
export const ImageBlock = atomBlock(
  "image",
  { attachmentId: null, width: null, alt: "", caption: "" },
  (a) => `🖼  ${String(a.caption || a.alt || "Image")}`,
  "ds-atom-media",
);
export const FileBlock = atomBlock("file", { attachmentId: null, name: "", size: 0, mime: "" }, (a) => `📎  ${String(a.name || "File")}`, "ds-atom-media");
export const DrawingBlock = atomBlock("drawing", { height: 240 }, () => "✎", "ds-atom-drawing");

export const PageCard = Node.create({
  name: "pageCard",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes: () => ({ ...attr("noteId"), ...attr("style", "card") }),
  parseHTML: () => [{ tag: 'div[data-node="pageCard"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-node": "pageCard", class: "ds-atom ds-pagecard", contenteditable: "false" }),
    "📄",
  ],
});

const tableAttrs = () => ({ ...attr("colspan", 1), ...attr("rowspan", 1), ...attr("colwidth") });
export const Table = Node.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  isolating: true,
  parseHTML: () => [{ tag: "table" }],
  renderHTML: ({ HTMLAttributes }) => ["table", mergeAttributes(HTMLAttributes, { class: "ds-table" }), ["tbody", 0]],
});
export const TableRow = Node.create({
  name: "tableRow",
  content: "(tableCell | tableHeader)*",
  parseHTML: () => [{ tag: "tr" }],
  renderHTML: ({ HTMLAttributes }) => ["tr", HTMLAttributes, 0],
});
export const TableCell = Node.create({
  name: "tableCell",
  content: "block+",
  isolating: true,
  addAttributes: tableAttrs,
  parseHTML: () => [{ tag: "td" }],
  renderHTML: ({ HTMLAttributes }) => ["td", HTMLAttributes, 0],
});
export const TableHeader = Node.create({
  name: "tableHeader",
  content: "block+",
  isolating: true,
  addAttributes: tableAttrs,
  parseHTML: () => [{ tag: "th" }],
  renderHTML: ({ HTMLAttributes }) => ["th", HTMLAttributes, 0],
});

// ---------- inline ----------

export type InlineCallbacks = {
  noteTitle?: (noteId: string) => string | null;
  onOpenNote?: (noteId: string) => void;
  onOpenTag?: (tag: string) => void;
  resolveNoteLink?: (label: string) => Promise<{ noteId: string; label: string } | null>;
};

export const NoteLink = Node.create<InlineCallbacks>({
  name: "noteLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({}),
  addAttributes: () => ({ ...attr("noteId"), ...attr("label", "") }),
  parseHTML: () => [{ tag: "a[data-note-link]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "a",
    mergeAttributes(HTMLAttributes, { "data-note-link": "", class: "ds-notelink", href: `/doc/${node.attrs.noteId}` }),
    String(node.attrs.label || "…"),
  ],
  addNodeView() {
    return ({ node }) => {
      const a = document.createElement("a");
      a.className = "ds-notelink";
      a.href = `/doc/${node.attrs.noteId}`;
      a.textContent = this.options.noteTitle?.(node.attrs.noteId as string) || String(node.attrs.label || "…");
      a.addEventListener("click", (e) => {
        e.preventDefault();
        this.options.onOpenNote?.(node.attrs.noteId as string);
      });
      return { dom: a };
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ range, match, chain }) => {
          const label = match[1]!.trim();
          const from = range.from;
          chain().deleteRange(range).insertContentAt(from, label).run();
          void this.options.resolveNoteLink?.(label).then((res) => {
            if (!res) return;
            const ed = this.editor;
            const text = ed.state.doc.textBetween(from, from + label.length);
            if (text !== label) return;
            ed.chain()
              .insertContentAt({ from, to: from + label.length }, [
                { type: "noteLink", attrs: { noteId: res.noteId, label: res.label } },
                { type: "text", text: " " },
              ])
              .run();
          });
        },
      }),
    ];
  },
});

export const Tag = Node.create<InlineCallbacks>({
  name: "tag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({}),
  addAttributes: () => ({ ...attr("name", "") }),
  parseHTML: () => [{ tag: "span[data-tag]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, { "data-tag": "", class: "ds-tag" }),
    `#${String(node.attrs.name)}`,
  ],
  addNodeView() {
    return ({ node }) => {
      const s = document.createElement("span");
      s.className = "ds-tag";
      s.textContent = `#${String(node.attrs.name)}`;
      s.addEventListener("click", () => this.options.onOpenTag?.(node.attrs.name as string));
      return { dom: s };
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)\s$/u,
        handler: ({ range, match, chain }) => {
          const name = match[1]!;
          const start = range.from + (match[0].startsWith("#") ? 0 : 1);
          chain()
            .deleteRange({ from: start, to: range.to })
            .insertContentAt(start, [{ type: "tag", attrs: { name } }, { type: "text", text: " " }])
            .run();
        },
      }),
    ];
  },
});

export const Mention = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  renderHTML: () => ["span", { class: "ds-mention" }, "@"],
});

export const Highlight = Mark.create({
  name: "highlight",
  addAttributes: () => ({ ...attr("color", "highlight.yellow") }),
  parseHTML: () => [{ tag: "mark" }],
  renderHTML: ({ HTMLAttributes }) => ["mark", mergeAttributes(HTMLAttributes, { class: "ds-highlight" }), 0],
  addKeyboardShortcuts() {
    return { "Mod-Shift-h": () => this.editor.commands.toggleMark(this.name) };
  },
});

export const TextColor = Mark.create({
  name: "textColor",
  addAttributes: () => ({ ...attr("color") }),
  parseHTML: () => [{ tag: "span[data-text-color]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-text-color": "" }), 0],
});

export const AgentEdit = Mark.create({
  name: "agentEdit",
  addAttributes: () => ({ ...attr("agentId"), ...attr("at") }),
  parseHTML: () => [{ tag: "span[data-agent-edit]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-agent-edit": "", class: "ds-agentedit" }), 0],
});
