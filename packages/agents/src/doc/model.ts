/**
 * Read helpers over the note document format (contracts/document-model.md §4):
 * `content` is a y-prosemirror tree of Y.XmlElement blocks with Y.XmlText runs.
 *
 * These are Y-level helpers (offsets inside Y.XmlText runs) that the agent
 * layer needs for handwriting and text edits; the PM-JSON level helpers live
 * in @datascratch/shared/document.
 */
import * as Y from "yjs";

export const INLINE_ATOMS = new Set(["noteLink", "tag", "mention", "hardBreak"]);

/** Block nodes whose direct children are inline content (text runs and inline atoms). */
export const TEXT_BLOCKS = new Set(["title", "paragraph", "heading", "codeBlock"]);

export const CONTAINER_BLOCKS = new Set([
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "callout",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
]);

export type Marks = Record<string, unknown>;

export type Inline =
  | { kind: "text"; text: string; marks: Marks; ytext: Y.XmlText; offset: number }
  | { kind: "atom"; name: string; attrs: Record<string, unknown> };

export function contentOf(doc: Y.Doc): Y.XmlFragment {
  return doc.getXmlFragment("content");
}

export function attrs(el: Y.XmlElement): Record<string, unknown> {
  return el.getAttributes() as Record<string, unknown>;
}

export function attr<T = unknown>(el: Y.XmlElement, name: string): T | undefined {
  return el.getAttribute(name) as T | undefined;
}

export function blockIdOf(el: Y.XmlElement): string | null {
  const id = el.getAttribute("blockId");
  return typeof id === "string" ? id : null;
}

export function childElements(parent: Y.XmlFragment | Y.XmlElement): Y.XmlElement[] {
  return parent.toArray().filter((c): c is Y.XmlElement => c instanceof Y.XmlElement);
}

/** Mark name without the y-prosemirror overlap suffix (`comment--a1b2` → `comment`). */
export function markName(key: string): string {
  const i = key.indexOf("--");
  return i === -1 ? key : key.slice(0, i);
}

/** Inline content of a text block in document order. */
export function inlineOf(block: Y.XmlElement): Inline[] {
  const out: Inline[] = [];
  for (const child of block.toArray()) {
    if (child instanceof Y.XmlText) {
      let offset = 0;
      for (const op of child.toDelta() as { insert: unknown; attributes?: Marks }[]) {
        if (typeof op.insert === "string") {
          out.push({ kind: "text", text: op.insert, marks: op.attributes ?? {}, ytext: child, offset });
          offset += op.insert.length;
        } else {
          offset += 1;
        }
      }
    } else if (child instanceof Y.XmlElement) {
      out.push({ kind: "atom", name: child.nodeName, attrs: attrs(child) });
    }
  }
  return out;
}

/** Plain text of an inline atom as shown to agents and in rendered images. */
export function atomText(name: string, a: Record<string, unknown>): string {
  switch (name) {
    case "noteLink":
      return `[[${String(a.label ?? "")}]]`;
    case "tag":
      return `#${String(a.name ?? "")}`;
    case "hardBreak":
      return "\n";
    default:
      return "";
  }
}

/** Plain text of any element (blocks joined by newlines). */
export function plainText(node: Y.XmlElement | Y.XmlFragment): string {
  if (node instanceof Y.XmlElement && TEXT_BLOCKS.has(node.nodeName)) {
    return inlineOf(node)
      .map((i) => (i.kind === "text" ? i.text : atomText(i.name, i.attrs)))
      .join("");
  }
  return childElements(node)
    .map((c) => plainText(c))
    .filter((t) => t.length > 0)
    .join("\n");
}

export interface BlockLocation {
  el: Y.XmlElement;
  parent: Y.XmlFragment | Y.XmlElement;
  index: number;
  /** Ancestors from the root down to the parent. */
  path: Y.XmlElement[];
}

export function findBlock(doc: Y.Doc, blockId: string): BlockLocation | null {
  const walk = (parent: Y.XmlFragment | Y.XmlElement, path: Y.XmlElement[]): BlockLocation | null => {
    const children = parent.toArray();
    for (let index = 0; index < children.length; index++) {
      const el = children[index];
      if (!(el instanceof Y.XmlElement) || INLINE_ATOMS.has(el.nodeName)) continue;
      if (blockIdOf(el) === blockId) return { el, parent, index, path };
      if (!TEXT_BLOCKS.has(el.nodeName)) {
        const found = walk(el, [...path, el]);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(contentOf(doc), []);
}

/** Visits every block element depth-first. */
export function walkBlocks(doc: Y.Doc, visit: (el: Y.XmlElement, path: Y.XmlElement[]) => void): void {
  const walk = (parent: Y.XmlFragment | Y.XmlElement, path: Y.XmlElement[]) => {
    for (const el of childElements(parent)) {
      if (INLINE_ATOMS.has(el.nodeName)) continue;
      visit(el, path);
      if (!TEXT_BLOCKS.has(el.nodeName)) walk(el, [...path, el]);
    }
  };
  walk(contentOf(doc), []);
}

/** Visits every inline atom (noteLink, tag, …) with its enclosing text block. */
export function walkAtoms(doc: Y.Doc, visit: (atom: Y.XmlElement, block: Y.XmlElement) => void): void {
  walkBlocks(doc, (el) => {
    if (!TEXT_BLOCKS.has(el.nodeName)) return;
    for (const c of childElements(el)) if (INLINE_ATOMS.has(c.nodeName)) visit(c, el);
  });
}

/** The nearest enclosing text block of a Y.XmlText run. */
export function textBlockOf(ytext: Y.XmlText): Y.XmlElement | null {
  const parent = ytext.parent;
  return parent instanceof Y.XmlElement ? parent : null;
}

/** Ancestors (innermost first) of a node, up to the content fragment. */
export function ancestors(node: Y.AbstractType<unknown>): Y.XmlElement[] {
  const out: Y.XmlElement[] = [];
  let p = node.parent;
  while (p instanceof Y.XmlElement) {
    out.push(p);
    p = p.parent;
  }
  return out;
}

/**
 * Flattened text of a text block with a mapping back to Y.XmlText runs, so a
 * (ytext, index) position can be turned into an offset in the block's text.
 */
export interface FlatText {
  text: string;
  /** Offset of each XmlText child in `text`. */
  runStart: Map<Y.XmlText, number>;
  /** Marks for every character of `text` (same length as text). */
  charMarks: Marks[];
}

/**
 * Text of one run with indices as Yjs counts them (an embed = one "￼").
 * Never use `Y.XmlText.toString()` for offsets: it renders formatting marks as
 * XML tags (`<agentEdit …>text</agentEdit>`), which shifts every index.
 */
export function runText(t: Y.XmlText): string {
  let s = "";
  for (const op of t.toDelta() as { insert: unknown }[]) s += typeof op.insert === "string" ? op.insert : "￼";
  return s;
}

export function flatten(block: Y.XmlElement): FlatText {
  let text = "";
  const runStart = new Map<Y.XmlText, number>();
  const charMarks: Marks[] = [];
  for (const child of block.toArray()) {
    if (child instanceof Y.XmlText) {
      runStart.set(child, text.length);
      for (const op of child.toDelta() as { insert: unknown; attributes?: Marks }[]) {
        const s = typeof op.insert === "string" ? op.insert : "￼";
        text += s;
        for (let i = 0; i < s.length; i++) charMarks.push(op.attributes ?? {});
      }
    } else if (child instanceof Y.XmlElement) {
      const s = atomText(child.nodeName, attrs(child)) || "￼";
      text += s;
      for (let i = 0; i < s.length; i++) charMarks.push({ __atom: child.nodeName });
    }
  }
  return { text, runStart, charMarks };
}
