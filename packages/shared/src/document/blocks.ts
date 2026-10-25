// Block-level operations by blockId — the editing API for agents (spec/09)
// and for any code that edits a note without a ProseMirror editor.
import * as Y from "yjs";
import { z } from "zod";
import {
  BLOCK_NODES,
  INLINE_NODES,
  MARKS,
  TEXTBLOCK_NODES,
  pmNodeSchema,
  type PMNode,
} from "../contracts/document.js";
import { uuidv7 } from "../ids.js";
import { noteRoots, withBlockIds } from "./factories.js";
import { pmNodeToY, yElementToPM, type YChild } from "./yjs.js";

export interface BlockLocation {
  element: Y.XmlElement;
  parent: Y.XmlElement | Y.XmlFragment;
  index: number;
}

/** Depth-first search of the element with `blockId` in a note's `content`. */
export function findBlock(doc: Y.Doc, blockId: string): BlockLocation | null {
  const visit = (parent: Y.XmlElement | Y.XmlFragment): BlockLocation | null => {
    const children = parent.toArray() as YChild[];
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      if (!(child instanceof Y.XmlElement)) continue;
      if (child.getAttribute("blockId") === blockId) return { element: child, parent, index: i };
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(noteRoots(doc).content);
}

export function getBlock(doc: Y.Doc, blockId: string): PMNode | null {
  const loc = findBlock(doc, blockId);
  return loc ? yElementToPM(loc.element) : null;
}

/** Top-level blocks after the title, as PM JSON. */
export function listTopLevelBlocks(doc: Y.Doc): PMNode[] {
  return (noteRoots(doc).content.toArray() as YChild[])
    .filter((c): c is Y.XmlElement => c instanceof Y.XmlElement && c.nodeName !== "title")
    .map(yElementToPM);
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

const positionSchema = z.union([
  z.object({ after: z.string() }),
  z.object({ before: z.string() }),
  /** Inside a container block (list, quote, callout, list/task item…); omitted = top level. */
  z.object({ parent: z.string().nullable().optional(), at: z.enum(["start", "end"]) }),
]);
export type BlockPosition = z.infer<typeof positionSchema>;

export const blockOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("insert"),
    position: positionSchema,
    blocks: z.array(pmNodeSchema).min(1),
  }),
  z.object({ op: z.literal("replace"), blockId: z.string(), block: pmNodeSchema }),
  z.object({ op: z.literal("delete"), blockId: z.string() }),
  z.object({
    op: z.literal("updateAttrs"),
    blockId: z.string(),
    attrs: z.record(z.string(), z.unknown()),
  }),
  z.object({ op: z.literal("setTitle"), text: z.string() }),
]);
export type BlockOperation = z.infer<typeof blockOperationSchema>;

export interface ApplyOptions {
  /** Mark inserted/replaced text with `agentEdit` (D-10). */
  agentEdit?: { agentId: string; at: string };
  /** Transaction origin (lets editors tell remote/agent edits apart). */
  origin?: unknown;
  newId?: () => string;
}

export interface ApplyResult {
  /** blockIds of inserted or replaced top blocks, in operation order. */
  blockIds: string[];
}

export class BlockOperationError extends Error {
  override readonly name = "BlockOperationError";
  constructor(
    readonly code: "not_found" | "invalid_block" | "forbidden",
    message: string,
  ) {
    super(message);
  }
}

const KNOWN_BLOCKS = new Set<string>(BLOCK_NODES);
const KNOWN_INLINE = new Set<string>(INLINE_NODES);
const KNOWN_MARKS = new Set<string>(MARKS);
const TEXTBLOCKS = new Set<string>(TEXTBLOCK_NODES);

/** Structural check of agent-supplied blocks against the contract's node names. */
export function validateBlock(node: PMNode, path = "block"): void {
  const fail = (msg: string) => {
    throw new BlockOperationError("invalid_block", `${path}: ${msg}`);
  };
  if (!KNOWN_BLOCKS.has(node.type)) fail(`unknown block type "${node.type}"`);
  if (node.type === "title") fail("title cannot be inserted");
  if (TEXTBLOCKS.has(node.type)) {
    (node.content ?? []).forEach((c, i) => {
      const p = `${path}.content[${i}]`;
      if (c.type === "text") {
        if (typeof c.text !== "string" || c.text === "")
          throw new BlockOperationError("invalid_block", `${p}: empty text`);
        if (node.type === "codeBlock" && c.marks?.length) {
          throw new BlockOperationError("invalid_block", `${p}: code blocks have no marks`);
        }
        for (const m of c.marks ?? []) {
          if (!KNOWN_MARKS.has(m.type))
            throw new BlockOperationError("invalid_block", `${p}: unknown mark "${m.type}"`);
        }
      } else if (!KNOWN_INLINE.has(c.type) || node.type === "codeBlock") {
        throw new BlockOperationError(
          "invalid_block",
          `${p}: "${c.type}" is not allowed in ${node.type}`,
        );
      }
    });
  } else {
    (node.content ?? []).forEach((c, i) => validateBlock(c, `${path}.content[${i}]`));
  }
}

function addAgentMark(node: PMNode, mark: { agentId: string; at: string }): PMNode {
  if (node.type === "text") {
    return {
      ...node,
      marks: [
        ...(node.marks ?? []).filter((m) => m.type !== "agentEdit"),
        { type: "agentEdit", attrs: mark },
      ],
    };
  }
  return node.content ? { ...node, content: node.content.map((c) => addAgentMark(c, mark)) } : node;
}

function resolvePosition(
  doc: Y.Doc,
  position: BlockPosition,
): { parent: Y.XmlElement | Y.XmlFragment; index: number } {
  const content = noteRoots(doc).content;
  if ("after" in position || "before" in position) {
    const id = "after" in position ? position.after : position.before;
    const loc = findBlock(doc, id);
    if (!loc) throw new BlockOperationError("not_found", `block ${id} not found`);
    if (loc.element.nodeName === "title" && "before" in position) {
      throw new BlockOperationError("forbidden", "nothing can precede the title");
    }
    return { parent: loc.parent, index: "after" in position ? loc.index + 1 : loc.index };
  }
  let parent: Y.XmlElement | Y.XmlFragment = content;
  if (position.parent) {
    const loc = findBlock(doc, position.parent);
    if (!loc) throw new BlockOperationError("not_found", `block ${position.parent} not found`);
    if (TEXTBLOCKS.has(loc.element.nodeName)) {
      throw new BlockOperationError(
        "invalid_block",
        `${loc.element.nodeName} cannot contain blocks`,
      );
    }
    parent = loc.element;
  }
  let index = position.at === "start" ? 0 : parent.length;
  // At the top level the title always stays first.
  if (parent === content && index === 0 && content.length > 0) {
    const first = content.get(0);
    if (first instanceof Y.XmlElement && first.nodeName === "title") index = 1;
  }
  return { parent, index };
}

function prepare(node: PMNode, options: ApplyOptions, newId: () => string): PMNode {
  validateBlock(node);
  let out = withBlockIds(node, newId);
  if (options.agentEdit) out = addAgentMark(out, options.agentEdit);
  return out;
}

/** Apply operations atomically (one transaction; on error nothing is applied). */
export function applyBlockOperations(
  doc: Y.Doc,
  ops: BlockOperation[],
  options: ApplyOptions = {},
): ApplyResult {
  const newId = options.newId ?? (() => uuidv7());
  // Validate everything first so a failing op cannot leave a half-applied transaction.
  const parsed = ops.map((op) => blockOperationSchema.parse(op));
  for (const op of parsed) {
    if (op.op === "insert") op.blocks.forEach((b) => validateBlock(b));
    if (op.op === "replace") validateBlock(op.block);
  }
  const blockIds: string[] = [];
  const probe = new Y.Doc();
  // Dry run on a copy to surface not_found / forbidden errors before touching `doc`.
  Y.applyUpdate(probe, Y.encodeStateAsUpdate(doc));
  runOps(probe, parsed, options, () => uuidv7());
  doc.transact(() => {
    blockIds.push(...runOps(doc, parsed, options, newId));
  }, options.origin);
  return { blockIds };
}

function runOps(
  doc: Y.Doc,
  ops: BlockOperation[],
  options: ApplyOptions,
  newId: () => string,
): string[] {
  const ids: string[] = [];
  for (const op of ops) {
    switch (op.op) {
      case "insert": {
        const { parent, index } = resolvePosition(doc, op.position);
        const nodes = op.blocks.map((b) => prepare(b, options, newId));
        parent.insert(index, nodes.map(pmNodeToY));
        ids.push(...nodes.map((n) => n.attrs!.blockId as string));
        break;
      }
      case "replace": {
        const loc = findBlock(doc, op.blockId);
        if (!loc) throw new BlockOperationError("not_found", `block ${op.blockId} not found`);
        if (loc.element.nodeName === "title")
          throw new BlockOperationError("forbidden", "use setTitle for the title");
        // The replacement keeps the blockId so comments and margin strokes stay attached.
        const node = prepare(
          { ...op.block, attrs: { ...(op.block.attrs ?? {}), blockId: op.blockId } },
          options,
          newId,
        );
        loc.parent.delete(loc.index, 1);
        loc.parent.insert(loc.index, [pmNodeToY(node)]);
        ids.push(op.blockId);
        break;
      }
      case "delete": {
        const loc = findBlock(doc, op.blockId);
        if (!loc) throw new BlockOperationError("not_found", `block ${op.blockId} not found`);
        if (loc.element.nodeName === "title")
          throw new BlockOperationError("forbidden", "the title cannot be deleted");
        loc.parent.delete(loc.index, 1);
        break;
      }
      case "updateAttrs": {
        const loc = findBlock(doc, op.blockId);
        if (!loc) throw new BlockOperationError("not_found", `block ${op.blockId} not found`);
        for (const [k, v] of Object.entries(op.attrs)) {
          if (k === "blockId") throw new BlockOperationError("forbidden", "blockId is immutable");
          if (v === null || v === undefined) loc.element.removeAttribute(k);
          else loc.element.setAttribute(k, v as string);
        }
        break;
      }
      case "setTitle": {
        setTitle(doc, op.text, options);
        break;
      }
    }
  }
  return ids;
}

/** Replace the title text (keeps the title's blockId). */
export function setTitle(doc: Y.Doc, text: string, options: ApplyOptions = {}): void {
  const content = noteRoots(doc).content;
  doc.transact(() => {
    let title = content.length > 0 ? content.get(0) : null;
    if (!(title instanceof Y.XmlElement) || title.nodeName !== "title") {
      const el = new Y.XmlElement("title");
      el.setAttribute("blockId", (options.newId ?? (() => uuidv7()))());
      content.insert(0, [el]);
      title = el;
    }
    const el = title as Y.XmlElement;
    if (el.length > 0) el.delete(0, el.length);
    if (text) {
      const t = new Y.XmlText();
      t.applyDelta([
        { insert: text, attributes: options.agentEdit ? { agentEdit: options.agentEdit } : {} },
      ]);
      el.insert(0, [t]);
    }
  }, options.origin);
}
