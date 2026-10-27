/** Block specs → Yjs elements in the y-prosemirror format (contracts/document-model.md §4.1). */
import * as Y from "yjs";
import { uuidv7 } from "../util.js";
import type { BlockSpec, InlineSpec } from "./markdown-import.js";
import { TEXT_BLOCKS } from "./model.js";

export interface BuildContext {
  /** `agentEdit` mark attrs applied to all inserted text (D-10). Null = no highlight. */
  agentEdit: { agentId: string; at: string } | null;
  /** Keep this blockId for the first top-level block (replace keeps the id). */
  keepBlockId?: string;
  /** Id generator for blockId/taskId (default UUIDv7; fixed in test vectors). */
  newId?: () => string;
}

function withAgentMark(marks: Record<string, unknown>, ctx: BuildContext): Record<string, unknown> {
  return ctx.agentEdit ? { ...marks, agentEdit: { ...ctx.agentEdit } } : marks;
}

/**
 * Inline content of a text block as Yjs children: one XmlText per run of text
 * (all its marked pieces in one delta) and an XmlElement per atom.
 */
function inlineChildren(inline: InlineSpec[], ctx: BuildContext): (Y.XmlText | Y.XmlElement)[] {
  const out: (Y.XmlText | Y.XmlElement)[] = [];
  let delta: { insert: string; attributes: Record<string, unknown> }[] = [];
  const flush = () => {
    if (delta.length === 0) return;
    const text = new Y.XmlText();
    text.applyDelta(delta);
    out.push(text);
    delta = [];
  };
  for (const it of inline) {
    if ("text" in it) {
      if (it.text.length > 0) delta.push({ insert: it.text, attributes: withAgentMark(it.marks, ctx) });
    } else {
      flush();
      const atom = new Y.XmlElement(it.atom);
      for (const [k, v] of Object.entries(it.attrs)) if (v !== null && v !== undefined) atom.setAttribute(k, v as never);
      out.push(atom);
    }
  }
  flush();
  return out;
}

/**
 * Builds a block as a detached (prelim) Yjs tree. It is inserted into the
 * document with one call: inserting children one by one at the end makes Yjs
 * walk all previous siblings every time, which is quadratic for thousands of
 * tags, line breaks or table rows.
 */
function createBlock(spec: BlockSpec, ctx: BuildContext): Y.XmlElement {
  const el = new Y.XmlElement(spec.type);
  const newId = ctx.newId ?? uuidv7;
  el.setAttribute("blockId", ctx.keepBlockId ?? newId());
  const attrs = { ...spec.attrs };
  if (spec.type === "taskItem" && !attrs.taskId) attrs.taskId = newId();
  // y-prosemirror never writes null attributes: a missing attribute means null (document-model.md §4.1).
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) el.setAttribute(k, v as never);
  if (spec.type === "codeBlock") {
    const t = new Y.XmlText();
    if (spec.text) t.insert(0, spec.text, ctx.agentEdit ? { agentEdit: { ...ctx.agentEdit } } : {});
    el.insert(0, [t]);
  } else if (TEXT_BLOCKS.has(spec.type)) {
    const kids = inlineChildren(spec.inline ?? [], ctx);
    if (kids.length) el.insert(0, kids);
  } else {
    const kids = (spec.children ?? []).map((c) => createBlock(c, { ...ctx, keepBlockId: undefined }));
    if (kids.length) el.insert(0, kids);
  }
  return el;
}

/** Inserts one block (with a fresh blockId unless `ctx.keepBlockId`). Returns the element. */
export function insertBlock(parent: Y.XmlFragment | Y.XmlElement, index: number, spec: BlockSpec, ctx: BuildContext): Y.XmlElement {
  return insertBlocks(parent, index, [spec], ctx)[0]!;
}

export function insertBlocks(parent: Y.XmlFragment | Y.XmlElement, index: number, specs: BlockSpec[], ctx: BuildContext): Y.XmlElement[] {
  const els = specs.map((spec, i) => createBlock(spec, i === 0 ? ctx : { ...ctx, keepBlockId: undefined }));
  if (els.length) parent.insert(index, els);
  return els;
}

/** Deep copy of an existing element as a spec-free prelim-safe clone, preserving every attribute and mark. */
export function cloneInto(parent: Y.XmlFragment | Y.XmlElement, index: number, source: Y.XmlElement): Y.XmlElement {
  const el = new Y.XmlElement(source.nodeName);
  parent.insert(index, [el]);
  for (const [k, v] of Object.entries(source.getAttributes())) el.setAttribute(k, v as never);
  copyChildren(el, source);
  return el;
}

function copyChildren(target: Y.XmlElement, source: Y.XmlElement): void {
  for (const child of source.toArray()) {
    if (child instanceof Y.XmlText) {
      const t = new Y.XmlText();
      target.insert(target.length, [t]);
      t.applyDelta(child.toDelta());
    } else if (child instanceof Y.XmlElement) {
      cloneInto(target, target.length, child);
    }
  }
}
