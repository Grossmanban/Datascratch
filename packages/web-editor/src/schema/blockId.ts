import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import { uuidv7 } from "../shared/uuid";

export const blockIdPluginKey = new PluginKey("dsBlockId");

/** Attributes that must be unique across the document: every block has `blockId`, every task `taskId`. */
const UNIQUE_ATTRS = ["blockId", "taskId"] as const;

function hasAttr(node: PMNode, attr: string): boolean {
  return Object.prototype.hasOwnProperty.call(node.type.spec.attrs ?? {}, attr) || attr in node.attrs;
}

/** Strips unique ids from pasted content so pasted blocks get fresh ids (contract §4.2). */
function stripIds(fragment: Fragment): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    let attrs = node.attrs;
    for (const a of UNIQUE_ATTRS) {
      if (a in attrs && attrs[a] !== null) attrs = { ...attrs, [a]: null };
    }
    nodes.push(node.isText ? node : node.type.create(attrs, stripIds(node.content), node.marks));
  });
  return Fragment.from(nodes);
}

/**
 * Collects the positions of nodes that need a fresh id: missing ids, and every duplicate except the
 * occurrence that sits where the id lived before the transaction (so the original keeps its id on split).
 */
export function findIdFixes(doc: PMNode, previous: PMNode | null, mapPos: (pos: number) => number): { pos: number; attr: string }[] {
  const fixes: { pos: number; attr: string }[] = [];
  for (const attr of UNIQUE_ATTRS) {
    const seen = new Map<string, number[]>();
    doc.descendants((node, pos) => {
      if (node.isText || !(attr in node.attrs)) return;
      const id = node.attrs[attr] as string | null;
      if (!id) fixes.push({ pos, attr });
      else {
        const list = seen.get(id);
        if (list) list.push(pos);
        else seen.set(id, [pos]);
      }
    });
    for (const [id, positions] of seen) {
      if (positions.length < 2) continue;
      let keep = positions[0]!;
      if (previous) {
        previous.descendants((node, pos) => {
          if (!node.isText && node.attrs[attr] === id) {
            const mapped = mapPos(pos);
            if (positions.includes(mapped)) keep = mapped;
            return false;
          }
          return true;
        });
      }
      for (const p of positions) if (p !== keep) fixes.push({ pos: p, attr });
    }
  }
  return fixes;
}

/** Adds `blockId` to every block node and keeps block and task ids unique (UUIDv7). */
export const BlockId = Extension.create({
  name: "dsBlockId",
  addGlobalAttributes() {
    const blockTypes = this.extensions
      .filter((e) => e.type === "node" && e.name !== "doc" && e.name !== "text")
      .filter((e) => {
        const group = (e.config as { group?: string; inline?: boolean }).group ?? "";
        const inline = (e.config as { inline?: boolean }).inline;
        return !inline && !/\binline\b/.test(typeof group === "string" ? group : "");
      })
      .map((e) => e.name);
    return [
      {
        types: blockTypes,
        attributes: {
          blockId: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute("data-block-id"),
            renderHTML: (attrs) => (attrs.blockId ? { "data-block-id": attrs.blockId } : {}),
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockIdPluginKey,
        props: {
          transformPasted: (slice) => new Slice(stripIds(slice.content), slice.openStart, slice.openEnd),
        },
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          // Read-only documents (newer formatVersion, R-03) must not be written to.
          if (!this.editor.isEditable) return null;
          const fixes = findIdFixes(newState.doc, oldState.doc, (pos) => {
            let p = pos;
            for (const tr of transactions) p = tr.mapping.map(p);
            return p;
          });
          if (!fixes.length) return null;
          const tr = newState.tr;
          for (const { pos, attr } of fixes) {
            const node = tr.doc.nodeAt(pos);
            if (node && hasAttr(node, attr)) tr.setNodeAttribute(pos, attr, uuidv7());
          }
          return tr;
        },
      }),
    ];
  },
});
