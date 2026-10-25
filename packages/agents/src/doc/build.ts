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
}

function withAgentMark(marks: Record<string, unknown>, ctx: BuildContext): Record<string, unknown> {
  return ctx.agentEdit ? { ...marks, agentEdit: { ...ctx.agentEdit } } : marks;
}

function fillInline(el: Y.XmlElement, inline: InlineSpec[], ctx: BuildContext): void {
  let text: Y.XmlText | null = null;
  for (const it of inline) {
    if ("text" in it) {
      if (it.text.length === 0) continue;
      if (!text) {
        text = new Y.XmlText();
        el.insert(el.length, [text]);
      }
      text.insert(text.length, it.text, withAgentMark(it.marks, ctx));
    } else {
      const atom = new Y.XmlElement(it.atom);
      el.insert(el.length, [atom]);
      for (const [k, v] of Object.entries(it.attrs)) atom.setAttribute(k, v as never);
      text = null;
    }
  }
}

function fill(el: Y.XmlElement, spec: BlockSpec, ctx: BuildContext): void {
  if (spec.type === "codeBlock") {
    const t = new Y.XmlText();
    el.insert(0, [t]);
    if (spec.text) t.insert(0, spec.text, ctx.agentEdit ? { agentEdit: { ...ctx.agentEdit } } : {});
    return;
  }
  if (TEXT_BLOCKS.has(spec.type)) {
    fillInline(el, spec.inline ?? [], ctx);
    return;
  }
  for (const child of spec.children ?? []) insertBlock(el, el.length, child, { ...ctx, keepBlockId: undefined });
}

/** Inserts one block (with a fresh blockId unless `ctx.keepBlockId`). Returns the element. */
export function insertBlock(parent: Y.XmlFragment | Y.XmlElement, index: number, spec: BlockSpec, ctx: BuildContext): Y.XmlElement {
  const el = new Y.XmlElement(spec.type);
  parent.insert(index, [el]);
  el.setAttribute("blockId", ctx.keepBlockId ?? uuidv7());
  const attrs = { ...spec.attrs };
  if (spec.type === "taskItem" && !attrs.taskId) attrs.taskId = uuidv7();
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, v as never);
  fill(el, spec, ctx);
  return el;
}

export function insertBlocks(parent: Y.XmlFragment | Y.XmlElement, index: number, specs: BlockSpec[], ctx: BuildContext): Y.XmlElement[] {
  return specs.map((spec, i) => insertBlock(parent, index + i, spec, i === 0 ? ctx : { ...ctx, keepBlockId: undefined }));
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
