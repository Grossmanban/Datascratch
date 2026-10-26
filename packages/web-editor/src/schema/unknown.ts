import { Mark, Node, type AnyExtension } from "@tiptap/core";
import { Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import * as Y from "yjs";

// Unknown nodes and marks (written by a newer client) must survive untouched (document-model.md §4.2).
// y-prosemirror deletes Y elements whose nodeName is not in the schema, so:
//  1. before the editor is created we scan the Y.Doc and add a placeholder node/mark type for every
//     unknown name — then y-prosemirror round-trips them exactly (same nodeName, same attributes);
//  2. names that arrive later (remote update) hit a guarded `schema.node` that returns a neutral
//     placeholder instead of throwing, and the editor is asked to remount with an extended schema.

export interface UnknownScan {
  nodes: Map<string, { inline: boolean; attrs: Set<string> }>;
  marks: Map<string, Set<string>>;
}

const TEXTBLOCKS = new Set(["title", "paragraph", "heading"]);

export function scanUnknown(fragment: Y.XmlFragment, knownNodes: Set<string>, knownMarks: Set<string>): UnknownScan {
  const scan: UnknownScan = { nodes: new Map(), marks: new Map() };
  const visit = (parent: Y.XmlFragment | Y.XmlElement) => {
    const children = parent.toArray();
    const inlineContext =
      children.some((c) => c instanceof Y.XmlText) || (parent instanceof Y.XmlElement && TEXTBLOCKS.has(parent.nodeName));
    for (const child of children) {
      if (child instanceof Y.XmlElement) {
        if (!knownNodes.has(child.nodeName)) {
          const entry = scan.nodes.get(child.nodeName) ?? { inline: inlineContext, attrs: new Set<string>() };
          for (const key of Object.keys(child.getAttributes())) entry.attrs.add(key);
          scan.nodes.set(child.nodeName, entry);
        }
        visit(child);
      } else if (child instanceof Y.XmlText) {
        for (const op of child.toDelta() as { attributes?: Record<string, unknown> }[]) {
          for (const [name, value] of Object.entries(op.attributes ?? {})) {
            const markName = name.replace(/--[a-zA-Z0-9+/=]{8}$/, "");
            if (knownMarks.has(markName)) continue;
            const attrs = scan.marks.get(markName) ?? new Set<string>();
            if (value && typeof value === "object") for (const k of Object.keys(value)) attrs.add(k);
            scan.marks.set(markName, attrs);
          }
        }
      }
    }
  };
  visit(fragment);
  return scan;
}

function placeholderLabel(name: string): string {
  return `Неподдерживаемый блок «${name}» — откройте заметку в новой версии приложения`;
}

export function createUnknownExtensions(scan: UnknownScan): AnyExtension[] {
  const exts: AnyExtension[] = [];
  for (const [name, info] of scan.nodes) {
    const attrs = Object.fromEntries([...info.attrs].map((a) => [a, { default: null, rendered: false }]));
    exts.push(
      Node.create({
        name,
        group: info.inline ? "inline" : "block",
        inline: info.inline,
        atom: true,
        selectable: true,
        draggable: false,
        addAttributes: () => attrs,
        parseHTML: () => [],
        renderHTML: () => [info.inline ? "span" : "div", { class: "ds-unsupported", "data-unsupported": name }, placeholderLabel(name)],
        addNodeView: () => () => {
          const dom = document.createElement(info.inline ? "span" : "div");
          dom.className = "ds-unsupported";
          dom.contentEditable = "false";
          dom.dataset.unsupported = name;
          dom.textContent = info.inline ? `⟨${name}⟩` : placeholderLabel(name);
          dom.title = placeholderLabel(name);
          return { dom, ignoreMutation: () => true };
        },
      }),
    );
  }
  for (const [name, attrNames] of scan.marks) {
    const attrs = Object.fromEntries([...attrNames].map((a) => [a, { default: null, rendered: false }]));
    exts.push(
      Mark.create({
        name,
        addAttributes: () => attrs,
        parseHTML: () => [],
        renderHTML: () => ["span", { class: "ds-unsupported-mark", "data-unsupported-mark": name }, 0],
      }),
    );
  }
  return exts;
}

export const UNSUPPORTED_BLOCK = "dsUnsupported";

/** Neutral fallback for names that appear after the editor was created (until it remounts). */
export const UnsupportedFallback = Node.create({
  name: UNSUPPORTED_BLOCK,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes: () => ({ originalName: { default: null, rendered: false } }),
  parseHTML: () => [],
  renderHTML: ({ node }) => ["div", { class: "ds-unsupported" }, placeholderLabel(String(node.attrs.originalName ?? "?"))],
});

/** Makes y-prosemirror tolerate unknown names instead of deleting them. */
export function guardSchema(schema: Schema, onUnknown: (name: string) => void): void {
  const guarded = schema as Schema & { __dsGuarded?: boolean };
  if (guarded.__dsGuarded) return;
  guarded.__dsGuarded = true;
  const node = schema.node.bind(schema);
  const mark = schema.mark.bind(schema);
  schema.node = ((type, attrs, content, marks) => {
    if (typeof type === "string" && !schema.nodes[type]) {
      onUnknown(type);
      return node(UNSUPPORTED_BLOCK, { originalName: type });
    }
    try {
      return node(type, attrs, content, marks);
    } catch {
      // y-prosemirror deletes the Y element when node creation throws — a data loss for content
      // another client wrote legitimately (e.g. agent text with marks in a code block, 2026-10-26).
      // Never throw: drop marks the node does not allow, and as a last resort skip the check.
      const nodeType = typeof type === "string" ? schema.nodes[type]! : type;
      const children: PMNode[] = [];
      Fragment.from(content as never).forEach((child) => {
        children.push(child.isText ? child.mark(child.marks.filter((m) => nodeType.allowsMarkType(m.type))) : child);
      });
      try {
        return nodeType.createChecked(attrs, children, marks);
      } catch {
        return nodeType.create(attrs, children, marks);
      }
    }
  }) as Schema["node"];
  schema.mark = ((type, attrs) => {
    if (typeof type === "string" && !schema.marks[type]) {
      onUnknown(type);
      return mark("dsUnsupportedMark", null);
    }
    return mark(type, attrs);
  }) as Schema["mark"];
}

export const UnsupportedMarkFallback = Mark.create({
  name: "dsUnsupportedMark",
  parseHTML: () => [],
  renderHTML: () => ["span", { class: "ds-unsupported-mark" }, 0],
});
