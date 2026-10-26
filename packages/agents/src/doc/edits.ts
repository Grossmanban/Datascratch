/**
 * Point edits of a note by an agent (edit_note). All operations of one call
 * run in one Yjs transaction on a throwaway copy of the document; the caller
 * sends the resulting update to the server only if every operation succeeded,
 * so a call is atomic.
 *
 * Handwriting stays attached (D-10): text that is not touched keeps its Yjs
 * items, so relative-position anchors survive; moved blocks get their stroke
 * and comment anchors rewritten to the copy.
 */
import * as Y from "yjs";
import { AgentError } from "../errors.js";
import { base64url, fromBase64url } from "../util.js";
import { cloneInto, insertBlocks, type BuildContext } from "./build.js";
import { markdownToBlocks, type BlockSpec, type ImportOptions } from "./markdown-import.js";
import { blockIdOf, childElements, contentOf, findBlock, runText, TEXT_BLOCKS, type BlockLocation, type Marks } from "./model.js";
import { readStroke } from "@datascratch/shared/strokes";
import { resolveAnchor } from "./strokes.js";

export type Position = { after: string } | { before: string } | { at: "start" | "end" };

export type EditOp =
  | { op: "insert"; position: Position; markdown: string }
  | { op: "replace"; blockId: string; markdown: string }
  | { op: "delete"; blockId: string }
  | { op: "move"; blockId: string; position: Position }
  | { op: "replace_text"; blockId: string; find: string; replace: string; occurrence?: number };

export interface EditResult {
  op: EditOp["op"];
  /** Block ids created or affected by the operation. */
  blockIds: string[];
}

export interface EditContext extends ImportOptions {
  agentEdit: BuildContext["agentEdit"];
  newId?: BuildContext["newId"];
}

const ITEM_OF: Record<string, string[]> = {
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  taskList: ["taskItem"],
  table: ["tableRow"],
  tableRow: ["tableHeader", "tableCell"],
};
const LISTS = new Set(["bulletList", "orderedList", "taskList"]);

function requireBlock(doc: Y.Doc, blockId: string): BlockLocation {
  const loc = findBlock(doc, blockId);
  if (!loc) throw new AgentError("not_found", `Block ${blockId} not found in the note. Call read_note to get current block ids.`);
  return loc;
}

function parse(markdown: string, ctx: EditContext): BlockSpec[] {
  const specs = markdownToBlocks(markdown, ctx);
  if (specs.length === 0) throw new AgentError("bad_request", "Markdown produced no blocks. Pass non-empty Markdown content.");
  return specs;
}

/**
 * Where to insert `specs` relative to `loc` so that the schema stays valid:
 * list items go into lists, rows into tables; other blocks next to a list
 * item climb out of the list.
 */
function placement(doc: Y.Doc, loc: BlockLocation, side: "before" | "after", specs: BlockSpec[]): { parent: Y.XmlFragment | Y.XmlElement; index: number; specs: BlockSpec[] } {
  let parent = loc.parent;
  let index = side === "after" ? loc.index + 1 : loc.index;
  let path = loc.path;
  for (;;) {
    const allowed = parent instanceof Y.XmlElement ? ITEM_OF[parent.nodeName] : undefined;
    if (!allowed) break;
    if (specs.every((s) => allowed.includes(s.type))) break;
    // A single list of the same kind: insert its items here.
    const only = specs.length === 1 ? specs[0]! : null;
    const parentName = (parent as Y.XmlElement).nodeName;
    if (only && (only.type === parentName || (LISTS.has(only.type) && LISTS.has(parentName))) && (only.children ?? []).every((c) => allowed.includes(c.type) || (c.type === "listItem" || c.type === "taskItem"))) {
      specs = (only.children ?? []).map((c) => convertItem(c, allowed[0]!));
      break;
    }
    // Climb out: place next to the container.
    const container = parent as Y.XmlElement;
    const up = path.slice(0, -1);
    const grand = up.length ? up[up.length - 1]! : contentOf(doc);
    const cIndex = grand.toArray().indexOf(container);
    parent = grand;
    index = side === "after" ? cIndex + 1 : cIndex;
    path = up;
  }
  return { parent, index, specs };
}

function convertItem(spec: BlockSpec, target: string): BlockSpec {
  if (spec.type === target) return spec;
  if (target === "taskItem") return { ...spec, type: "taskItem", attrs: { state: "open", scheduled: null, deadline: null, completedAt: null } };
  if (target === "listItem") return { ...spec, type: "listItem", attrs: {} };
  return spec;
}

function resolvePosition(doc: Y.Doc, position: Position, specs: BlockSpec[]) {
  const root = contentOf(doc);
  if ("at" in position) {
    const els = childElements(root);
    const hasTitle = els[0]?.nodeName === "title";
    return { parent: root as Y.XmlFragment | Y.XmlElement, index: position.at === "start" ? (hasTitle ? 1 : 0) : root.length, specs };
  }
  const id = "after" in position ? position.after : position.before;
  const loc = requireBlock(doc, id);
  if (loc.el.nodeName === "title") {
    if ("before" in position) throw new AgentError("bad_request", "Nothing can be inserted before the title. Use {\"at\":\"start\"}.");
    return { parent: loc.parent, index: loc.index + 1, specs };
  }
  return placement(doc, loc, "after" in position ? "after" : "before", specs);
}

/** Ensures specs fit at the root: list items or rows on their own get wrapped. */
function fitRoot(parent: Y.XmlFragment | Y.XmlElement, specs: BlockSpec[]): BlockSpec[] {
  const name = parent instanceof Y.XmlElement ? parent.nodeName : "doc";
  if (ITEM_OF[name]) return specs;
  return specs.map((s) => {
    if (s.type === "listItem") return { type: "bulletList", attrs: {}, children: [s] };
    if (s.type === "taskItem") return { type: "taskList", attrs: {}, children: [s] };
    return s;
  });
}

function insertAt(doc: Y.Doc, position: Position, specs: BlockSpec[], ctx: BuildContext): string[] {
  const place = resolvePosition(doc, position, specs);
  const els = insertBlocks(place.parent, place.index, fitRoot(place.parent, place.specs), ctx);
  return els.map((e) => blockIdOf(e)!).filter(Boolean);
}

// ---------------------------------------------------------------------------
// replace_text
// ---------------------------------------------------------------------------

function textTarget(loc: BlockLocation): Y.XmlElement {
  const el = loc.el;
  if (TEXT_BLOCKS.has(el.nodeName)) return el;
  if (el.nodeName === "listItem" || el.nodeName === "taskItem") {
    const p = childElements(el)[0];
    if (p && TEXT_BLOCKS.has(p.nodeName)) return p;
  }
  throw new AgentError("bad_request", `Block ${blockIdOf(el)} (${el.nodeName}) has no text of its own. Use replace for whole blocks, or address a paragraph inside it.`);
}

function marksAt(ytext: Y.XmlText, index: number): Marks {
  let pos = 0;
  let marks: Marks = {};
  for (const op of ytext.toDelta() as { insert: unknown; attributes?: Marks }[]) {
    const len = typeof op.insert === "string" ? op.insert.length : 1;
    if (index > pos && index <= pos + len) return op.attributes ?? {};
    if (pos === 0 && index === 0) marks = op.attributes ?? {};
    pos += len;
  }
  return marks;
}

function stripTransient(marks: Marks): Marks {
  const out: Marks = {};
  for (const [k, v] of Object.entries(marks)) if (k !== "agentEdit" && !k.startsWith("comment")) out[k] = v;
  return out;
}

function replaceText(doc: Y.Doc, op: Extract<EditOp, { op: "replace_text" }>, ctx: BuildContext): void {
  const block = textTarget(requireBlock(doc, op.blockId));
  const runs = block.toArray().filter((c): c is Y.XmlText => c instanceof Y.XmlText);
  if (op.find === "") {
    let t = runs[runs.length - 1];
    if (!t) {
      t = new Y.XmlText();
      block.insert(block.length, [t]);
    }
    const marks = stripTransient(marksAt(t, t.length));
    if (op.replace) t.insert(t.length, op.replace, ctx.agentEdit ? { ...marks, agentEdit: { ...ctx.agentEdit } } : marks);
    return;
  }
  const hits: { t: Y.XmlText; at: number }[] = [];
  for (const t of runs) {
    const s = runText(t);
    for (let i = s.indexOf(op.find); i !== -1; i = s.indexOf(op.find, i + 1)) hits.push({ t, at: i });
  }
  if (hits.length === 0) throw new AgentError("not_found", `Text "${op.find}" not found in block ${op.blockId}. Match plain text without Markdown formatting.`);
  if (hits.length > 1 && op.occurrence === undefined)
    throw new AgentError("conflict", `Text "${op.find}" occurs ${hits.length} times in block ${op.blockId}. Pass "occurrence" (1-based) or a longer fragment.`);
  const hit = hits[(op.occurrence ?? 1) - 1];
  if (!hit) throw new AgentError("bad_request", `occurrence ${op.occurrence} is out of range: the text occurs ${hits.length} times.`);
  // Minimal change: keep the common prefix and suffix so untouched characters keep their items (and handwriting anchors).
  const a = op.find;
  const b = op.replace;
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const delAt = hit.at + pre;
  const delLen = a.length - pre - suf;
  const ins = b.slice(pre, b.length - suf);
  const marks = stripTransient(marksAt(hit.t, delLen > 0 ? delAt + 1 : delAt));
  if (delLen > 0) hit.t.delete(delAt, delLen);
  if (ins) hit.t.insert(delAt, ins, ctx.agentEdit ? { ...marks, agentEdit: { ...ctx.agentEdit } } : marks);
}

// ---------------------------------------------------------------------------
// move (with re-anchoring of handwriting and comments)
// ---------------------------------------------------------------------------

function textRuns(el: Y.XmlElement, out: Y.XmlText[] = []): Y.XmlText[] {
  for (const c of el.toArray()) {
    if (c instanceof Y.XmlText) out.push(c);
    else if (c instanceof Y.XmlElement) textRuns(c, out);
  }
  return out;
}

function moveBlock(doc: Y.Doc, op: Extract<EditOp, { op: "move" }>): void {
  const loc = requireBlock(doc, op.blockId);
  if (loc.el.nodeName === "title") throw new AgentError("bad_request", "The title block cannot be moved.");
  const target = "at" in op.position ? null : "after" in op.position ? op.position.after : op.position.before;
  if (target === op.blockId) throw new AgentError("bad_request", "A block cannot be moved relative to itself.");
  if (target) {
    const t = requireBlock(doc, target);
    if (t.path.includes(loc.el)) throw new AgentError("bad_request", "A block cannot be moved inside itself.");
  }
  const spec: BlockSpec = { type: loc.el.nodeName, attrs: {} };
  const place = resolvePosition(doc, op.position, [spec]);
  const srcRuns = textRuns(loc.el);
  const clone = cloneInto(place.parent, place.index, loc.el);
  const dstRuns = textRuns(clone);
  const runMap = new Map<Y.XmlText, Y.XmlText>();
  srcRuns.forEach((r, i) => dstRuns[i] && runMap.set(r, dstRuns[i]!));

  const reanchor = (encoded: Uint8Array): Uint8Array | null => {
    const r = resolveAnchor(doc, encoded);
    if (!r) return null;
    const dst = runMap.get(r.ytext);
    if (!dst) return null;
    return Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(dst, r.index));
  };

  // `anchors` is mutable (strokes.md §1): rewrite the anchors of affected strokes in place.
  doc.getMap("strokes").forEach((raw) => {
    if (!(raw instanceof Y.Map)) return;
    const s = readStroke(raw);
    if (!s || s.anchorKind !== "text") return;
    let touched = false;
    const anchors = s.anchors.map((a) => {
      const n = reanchor(a);
      if (n) touched = true;
      return n ?? a;
    });
    if (touched) raw.set("anchors", anchors);
  });
  doc.getMap("comments").forEach((raw) => {
    if (!(raw instanceof Y.Map)) return;
    const anchor = raw.get("anchor") as { start: string; end: string } | null;
    if (!anchor) return;
    const start = reanchor(fromBase64url(anchor.start));
    const end = reanchor(fromBase64url(anchor.end));
    if (start && end) raw.set("anchor", { start: base64url(start), end: base64url(end) });
  });

  const parent = loc.el.parent as Y.XmlFragment | Y.XmlElement;
  parent.delete(parent.toArray().indexOf(loc.el), 1);
  // A list left empty by the move is removed too (lists must have items).
  if (parent instanceof Y.XmlElement && ITEM_OF[parent.nodeName] && parent.length === 0) {
    const gp = parent.parent as Y.XmlFragment | Y.XmlElement;
    gp.delete(gp.toArray().indexOf(parent), 1);
  }
}

function deleteBlock(doc: Y.Doc, blockId: string): void {
  const loc = requireBlock(doc, blockId);
  if (loc.el.nodeName === "title") throw new AgentError("bad_request", "The title block cannot be deleted. Use replace_text to rename the note.");
  loc.parent.delete(loc.index, 1);
  const parent = loc.parent;
  if (parent instanceof Y.XmlElement && ITEM_OF[parent.nodeName] && parent.length === 0) {
    const gp = parent.parent as Y.XmlFragment | Y.XmlElement;
    gp.delete(gp.toArray().indexOf(parent), 1);
  }
}

function replaceBlock(doc: Y.Doc, op: Extract<EditOp, { op: "replace" }>, ctx: EditContext): string[] {
  const loc = requireBlock(doc, op.blockId);
  if (loc.el.nodeName === "title") throw new AgentError("bad_request", "The title block cannot be replaced. Use replace_text to rename the note.");
  const specs = parse(op.markdown, ctx);
  const place = placement(doc, loc, "after", specs);
  const els = insertBlocks(place.parent, place.index, fitRoot(place.parent, place.specs), { agentEdit: ctx.agentEdit, newId: ctx.newId, keepBlockId: op.blockId });
  // The new first block now carries the original id; drop the original.
  const parent = loc.el.parent as Y.XmlFragment | Y.XmlElement;
  parent.delete(parent.toArray().indexOf(loc.el), 1);
  return els.map((e) => blockIdOf(e)!);
}

export function applyEdits(doc: Y.Doc, ops: EditOp[], ctx: EditContext): EditResult[] {
  if (ops.length === 0) throw new AgentError("bad_request", "operations must not be empty.");
  if (ops.length > 100) throw new AgentError("payload_too_large", "At most 100 operations per call.");
  const results: EditResult[] = [];
  doc.transact(() => {
    ops.forEach((op, i) => {
      try {
        switch (op.op) {
          case "insert":
            results.push({ op: op.op, blockIds: insertAt(doc, op.position, parse(op.markdown, ctx), { agentEdit: ctx.agentEdit, newId: ctx.newId }) });
            break;
          case "replace":
            results.push({ op: op.op, blockIds: replaceBlock(doc, op, ctx) });
            break;
          case "delete":
            deleteBlock(doc, op.blockId);
            results.push({ op: op.op, blockIds: [op.blockId] });
            break;
          case "move":
            moveBlock(doc, op);
            results.push({ op: op.op, blockIds: [op.blockId] });
            break;
          case "replace_text":
            replaceText(doc, op, { agentEdit: ctx.agentEdit, newId: ctx.newId });
            results.push({ op: op.op, blockIds: [op.blockId] });
            break;
          default:
            throw new AgentError("bad_request", `Unknown operation "${(op as { op: string }).op}".`);
        }
      } catch (err) {
        if (err instanceof AgentError) throw new AgentError(err.code, `Operation ${i + 1} (${op.op}): ${err.message} No changes were applied.`);
        throw err;
      }
    });
  });
  return results;
}

/** Builds the content of a new note: title block followed by Markdown blocks. */
export function initNoteContent(doc: Y.Doc, title: string, markdown: string, ctx: EditContext): void {
  doc.transact(() => {
    const root = contentOf(doc);
    insertBlocks(root, 0, [{ type: "title", attrs: {}, inline: title ? [{ text: title, marks: {} }] : [] }], { agentEdit: ctx.agentEdit, newId: ctx.newId });
    let specs = markdown.trim() ? markdownToBlocks(markdown, ctx) : [];
    // Agents often repeat the title as a leading "# Title": the title block already says it.
    const first = specs[0];
    const firstText = first?.type === "heading" && first.attrs.level === 1 ? (first.inline ?? []).map((i) => ("text" in i ? i.text : "")).join("") : null;
    if (firstText !== null && firstText.trim().toLowerCase() === title.trim().toLowerCase()) specs = specs.slice(1);
    const body = specs.length ? specs : [{ type: "paragraph", attrs: {}, inline: [] } as BlockSpec];
    insertBlocks(root, 1, fitRoot(root, body), { agentEdit: ctx.agentEdit, newId: ctx.newId });
    const meta = doc.getMap("meta");
    if (!meta.has("formatVersion")) meta.set("formatVersion", 1);
  });
}
