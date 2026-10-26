import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { colorTokenVar } from "../tokens";

/** `doc = title block+` (document-model.md §4.2). */
export const DocumentNode = Node.create({
  name: "doc",
  topNode: true,
  content: "title block+",
});

export const Title = Node.create({
  name: "title",
  content: "inline*",
  marks: "_",
  defining: true,
  parseHTML: () => [{ tag: "h1[data-type=title]" }],
  renderHTML: ({ HTMLAttributes }) => ["h1", mergeAttributes(HTMLAttributes, { "data-type": "title", class: "ds-title" }), 0],
  addKeyboardShortcuts() {
    return {
      // Enter at the end of the title jumps into the body instead of splitting the title.
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== "title") return false;
        const after = $from.after();
        return editor
          .chain()
          .command(({ tr, state }) => {
            const next = tr.doc.resolve(after).nodeAfter;
            if (!next || next.type.name !== "paragraph" || next.content.size > 0 || $from.parentOffset < $from.parent.content.size) {
              const rest = $from.parent.content.cut($from.parentOffset);
              tr.delete($from.pos, $from.end());
              tr.insert(tr.mapping.map(after), state.schema.nodes.paragraph!.create(null, rest));
            }
            return true;
          })
          .setTextSelection(after + 1)
          .run();
      },
    };
  },
});

/** Optional `textAlign` on paragraphs and headings (null = natural alignment). */
export const TextAlign = Extension.create({
  name: "dsTextAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.textAlign || null,
            renderHTML: (attrs) => (attrs.textAlign ? { style: `text-align: ${attrs.textAlign}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextAlign:
        (align: "left" | "center" | "right" | "justify" | null) =>
        ({ commands }) =>
          ["paragraph", "heading"].map((t) => commands.updateAttributes(t, { textAlign: align })).some(Boolean),
    };
  },
});

/**
 * Column alignment of a table (document-model.md §4.2): the cell attribute `align` on
 * `tableHeader`/`tableCell`, as Markdown writes it (`:---`, `:---:`, `---:`). No attribute =
 * default alignment. Agents and iOS write the same attribute.
 */
export const TableCellAlign = Extension.create({
  name: "dsTableAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["tableHeader", "tableCell"],
        attributes: {
          align: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.textAlign || (el as HTMLElement).getAttribute("align") || null,
            renderHTML: (attrs) => (attrs.align ? { style: `text-align: ${attrs.align}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setColumnAlign:
        (align: "left" | "center" | "right" | null) =>
        ({ commands }) =>
          ["tableHeader", "tableCell"].map((t) => commands.updateAttributes(t, { align })).some(Boolean),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dsTextAlign: { setTextAlign: (align: "left" | "center" | "right" | "justify" | null) => ReturnType };
    dsTableAlign: { setColumnAlign: (align: "left" | "center" | "right" | null) => ReturnType };
    dsHighlight: { toggleHighlight: (color?: string) => ReturnType; unsetHighlight: () => ReturnType };
    dsTextColor: { setTextColor: (color: string) => ReturnType; unsetTextColor: () => ReturnType };
    dsAgentEdit: { acceptAgentEdits: () => ReturnType };
    dsHorizontalRule: { setRuleStyle: (style: "line" | "dots" | "wave") => ReturnType };
  }
}

/** `link` keeps only `href` (contract), unlike TipTap's default target/rel/class. */
export const DsLink = Link.extend({
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("href"),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(HTMLAttributes, { rel: "noopener noreferrer nofollow", target: "_blank" }), 0];
  },
}).configure({ openOnClick: false, autolink: true, linkOnPaste: true });

/** `highlight` mark with a colour token (`highlight.yellow`, …). */
export const Highlight = Mark.create({
  name: "highlight",
  addAttributes() {
    return {
      color: {
        default: "highlight.yellow",
        parseHTML: (el) => el.getAttribute("data-color") ?? "highlight.yellow",
        renderHTML: (attrs) => ({ "data-color": attrs.color, style: `--ds-mark-bg: ${colorTokenVar(attrs.color)}` }),
      },
    };
  },
  parseHTML: () => [{ tag: "mark" }],
  renderHTML: ({ HTMLAttributes }) => ["mark", mergeAttributes(HTMLAttributes, { class: "ds-highlight" }), 0],
  addCommands() {
    return {
      toggleHighlight:
        (color = "highlight.yellow") =>
        ({ commands }) =>
          commands.toggleMark(this.name, { color }),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-h": () => this.editor.commands.toggleHighlight() };
  },
});

/** `textColor` mark with a colour token. */
export const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-text-color"),
        renderHTML: (attrs) => ({ "data-text-color": attrs.color, style: `color: ${colorTokenVar(attrs.color)}` }),
      },
    };
  },
  parseHTML: () => [{ tag: "span[data-text-color]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0],
  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

/** `agentEdit` — highlights text written by an AI agent until the user accepts it (D-10). */
export const AgentEdit = Mark.create({
  name: "agentEdit",
  inclusive: false,
  addAttributes() {
    return {
      agentId: { default: null, parseHTML: (el) => el.getAttribute("data-agent-id") },
      at: { default: null, parseHTML: (el) => el.getAttribute("data-agent-at") },
    };
  },
  parseHTML: () => [{ tag: "span[data-agent-id]" }],
  renderHTML: ({ mark }) => [
    "span",
    { class: "ds-agent-edit", "data-agent-id": mark.attrs.agentId, "data-agent-at": mark.attrs.at, title: "Изменено агентом" },
    0,
  ],
  addCommands() {
    return {
      acceptAgentEdits:
        () =>
        ({ tr, state, dispatch }) => {
          const type = state.schema.marks.agentEdit!;
          const { from, to, empty } = state.selection;
          if (dispatch) {
            if (empty) tr.removeMark(0, state.doc.content.size, type);
            else tr.removeMark(from, to, type);
          }
          return true;
        },
    };
  },
});

/** `horizontalRule` with `style: line | dots | wave`. */
export const DsHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      style: {
        default: "line",
        parseHTML: (el) => el.getAttribute("data-style") ?? "line",
        renderHTML: (attrs) => ({ "data-style": attrs.style }),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "ds-hr", "data-type": "horizontalRule" }), ["hr"]];
  },
  parseHTML() {
    return [{ tag: "hr" }, { tag: "div[data-type=horizontalRule]" }];
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setRuleStyle:
        (style) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { style }),
    };
  },
});
