// Re-anchoring of text strokes after structural edits (strokes.md §4). y-prosemirror rewrites text
// that moves between blocks (Enter in the middle of a paragraph, Backspace joining paragraphs,
// changing a block's type, moving a block) as new Yjs items, so anchors on that text would point to
// deleted characters and the marks would vanish by D-35. Before such a transaction is applied the
// anchored characters are located in the old document; afterwards each one whose Yjs item died but
// whose character survives in ProseMirror gets a new anchor, and the stroke is replaced by a copy
// (new strokeId, same points). The copy is written with the pen origin right after the edit, so the
// shared UndoManager folds it into the same undo step and undo brings the original back.
import { Extension } from "@tiptap/core";
import { Mapping, ReplaceAroundStep, ReplaceStep, type Step } from "@tiptap/pm/transform";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { readStroke, replaceStrokeWithReanchored, resolveAnchor, type Stroke } from "@datascratch/shared/strokes";
import { ySyncPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import { decodeAnchor, encodeCharAnchor, resolveCharAnchor, type ProsemirrorMapping } from "../pen/anchors";
import { PEN_ORIGIN } from "./collaboration";

interface AnchorSnapshot {
  id: string;
  stroke: Stroke;
  /** Old ProseMirror position and character of each anchor (null when already deleted). */
  anchors: ({ pos: number; char: string; blockId: string | null; offset: number } | null)[];
}

interface Pending {
  snapshots: AnchorSnapshot[];
  mapping: Mapping;
}

const reanchorKey = new PluginKey<{ pending: Pending | null }>("dsReanchor");

/** Steps after which y-prosemirror may recreate text items. Typing inside one textblock is not one. */
export function isStructuralStep(step: Step, doc: PMNode): boolean {
  if (step instanceof ReplaceAroundStep) return true;
  if (!(step instanceof ReplaceStep)) return false;
  const s = step as ReplaceStep & { from: number; to: number };
  if (s.slice.openStart > 0 || s.slice.openEnd > 0) return true;
  let blockInSlice = false;
  s.slice.content.forEach((n) => {
    if (n.isBlock) blockInSlice = true;
  });
  if (blockInSlice) return true;
  if (s.from === s.to) return false;
  const $from = doc.resolve(s.from);
  const $to = doc.resolve(s.to);
  return $from.parent !== $to.parent;
}

function isStructural(tr: Transaction): boolean {
  return tr.steps.some((step, i) => isStructuralStep(step, tr.docs[i] ?? tr.doc));
}

function mappingOf(state: EditorState): ProsemirrorMapping | null {
  const s = ySyncPluginKey.getState(state) as { binding?: { mapping: ProsemirrorMapping } } | undefined;
  return s?.binding?.mapping ?? null;
}

function snapshot(doc: Y.Doc, state: EditorState): AnchorSnapshot[] {
  const mapping = mappingOf(state);
  if (!mapping) return [];
  const fragment = doc.getXmlFragment("content");
  const out: AnchorSnapshot[] = [];
  doc.getMap<Y.Map<unknown>>("strokes").forEach((map, id) => {
    if (!(map instanceof Y.Map) || map.get("anchorKind") !== "text") return;
    const stroke = readStroke(map);
    if (!stroke) return;
    out.push({
      id,
      stroke,
      anchors: stroke.anchors.map((bytes) => {
        const rel = decodeAnchor(bytes);
        const pos = rel ? resolveCharAnchor(bytes, rel, doc, fragment, mapping) : null;
        if (pos === null) return null;
        const $pos = state.doc.resolve(pos);
        return { pos, char: state.doc.textBetween(pos, pos + 1), blockId: ($pos.parent.attrs.blockId as string | null) ?? null, offset: pos - $pos.start() };
      }),
    });
  });
  return out;
}

/**
 * Where an anchored character is now: through the step mapping, or — for moved blocks, which
 * ProseMirror sees as delete + insert — by the block's `blockId` and the offset inside it.
 */
function locate(doc: PMNode, mapping: Mapping, old: NonNullable<AnchorSnapshot["anchors"][number]>): number | null {
  const charAt = (pos: number) => (pos >= 0 && pos < doc.content.size ? doc.textBetween(pos, pos + 1) : "");
  const m = mapping.mapResult(old.pos, 1);
  if (!m.deleted && charAt(m.pos) === old.char) return m.pos;
  if (!old.blockId) return null;
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.isTextblock && node.attrs.blockId === old.blockId) {
      const candidate = pos + 1 + old.offset;
      if (charAt(candidate) === old.char) found = candidate;
      return false;
    }
    return true;
  });
  return found;
}

/** Applies pending re-anchoring after y-prosemirror has written the edit into the Y.Doc. */
export function reanchorAfterEdit(doc: Y.Doc, state: EditorState, pending: Pending): string[] {
  const mapping = mappingOf(state);
  if (!mapping) return [];
  const fragment = doc.getXmlFragment("content");
  const replaced: [string, Stroke][] = [];
  for (const snap of pending.snapshots) {
    let changed = false;
    const anchors = snap.stroke.anchors.map((bytes, i) => {
      const old = snap.anchors[i];
      if (!old) return bytes;
      const now = resolveAnchor(doc, bytes);
      if (now && !now.deleted) return bytes;
      const pos = locate(state.doc, pending.mapping, old);
      if (pos === null) return bytes;
      changed = true;
      return encodeCharAnchor(pos, fragment, mapping);
    });
    if (changed) replaced.push([snap.id, { ...snap.stroke, anchors }]);
  }
  if (!replaced.length) return [];
  const ids: string[] = [];
  // One transaction for all copies; nested replaceStrokeWithReanchored calls join it.
  doc.transact(() => {
    for (const [oldId, stroke] of replaced) {
      const id = replaceStrokeWithReanchored(doc, oldId, stroke.anchors, { origin: PEN_ORIGIN });
      if (id) ids.push(id);
    }
  }, PEN_ORIGIN);
  return ids;
}

export const Reanchor = Extension.create<{ doc: Y.Doc | null }>({
  name: "dsReanchor",
  addOptions: () => ({ doc: null }),
  addProseMirrorPlugins() {
    const doc = this.options.doc;
    if (!doc) return [];
    return [
      new Plugin<{ pending: Pending | null }>({
        key: reanchorKey,
        state: {
          init: () => ({ pending: null }),
          // The pending snapshot (set in filterTransaction) collects the mapping of the edit and
          // of transactions appended to it, up to the view update that consumes it.
          apply: (tr, value) => {
            value.pending?.mapping.appendMapping(tr.mapping);
            return value;
          },
        },
        filterTransaction: (tr, state) => {
          if (!tr.docChanged) return true;
          const meta = tr.getMeta(ySyncPluginKey) as { isChangeOrigin?: boolean } | undefined;
          if (meta?.isChangeOrigin) return true; // remote changes and undo/redo: their author re-anchors
          const value = reanchorKey.getState(state);
          if (!value || value.pending || !isStructural(tr)) return true;
          const snapshots = snapshot(doc, state);
          if (snapshots.length) value.pending = { snapshots, mapping: new Mapping() };
          return true;
        },
        view: () => ({
          update: (view) => {
            const value = reanchorKey.getState(view.state);
            const pending = value?.pending;
            if (!value || !pending) return;
            value.pending = null;
            reanchorAfterEdit(doc, view.state, pending);
          },
        }),
      }),
    ];
  },
});
