// Ruled paper that the text actually sits on (D-15, spec/12 «бумага»). On «линейка», «клетка» and
// «точки» every text line is one pitch P tall (P = body line-height in whole px), block spacing is a
// whole number of pitches, and blocks without lines (images, formulas, diagrams, drawings…) get a
// bottom margin that rounds them up to whole pitches. The rules are drawn from the first body
// baseline of the text column, so text sits on them all the way down the page.
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

export const paperKey = new PluginKey<DecorationSet>("dsPaper");

/** Holds the per-block snap margins computed from the layout (see `alignPaper`). */
export const PaperSnap = Extension.create({
  name: "dsPaper",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: paperKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => (tr.getMeta(paperKey) as DecorationSet | undefined) ?? set.map(tr.mapping, tr.doc),
        },
        props: { decorations: (state) => paperKey.getState(state) },
      }),
    ];
  },
});

/** Line pitch for a body font size: line-height 1.5 rounded to whole px (no drift down the page). */
export function pitchFor(fontSize: number): number {
  return Math.round(fontSize * 1.5);
}

/**
 * Snap margins for top-level blocks laid out in a column without margin collapsing: each block
 * starts on the grid (its top margin is a whole number of pitches) and ends rounded up to the grid.
 * Pure: takes the measured block heights and CSS margins.
 */
export function snapMargins(blocks: readonly { height: number; marginTop: number; marginBottom: number }[], pitch: number): number[] {
  let y = 0;
  return blocks.map((b) => {
    const top = y + b.marginTop;
    const bottom = top + b.height;
    const snapped = Math.ceil(bottom / pitch - 1e-3) * pitch;
    const snap = Math.max(0, snapped - bottom);
    y = bottom + snap + b.marginBottom;
    return Math.round(snap * 100) / 100;
  });
}

/** Distance from a line box top to the text baseline, for the column's body font and pitch. */
function measureBaseline(prose: HTMLElement, pitch: number): number {
  const probe = document.createElement("div");
  const cs = getComputedStyle(prose);
  probe.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;white-space:nowrap;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};line-height:${pitch}px`;
  probe.textContent = "Hg";
  const mark = document.createElement("span");
  mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  probe.append(mark);
  prose.parentElement!.append(probe);
  const baseline = mark.offsetTop;
  probe.remove();
  return baseline;
}

const lastKeys = new WeakMap<EditorView, string>();

/**
 * Aligns the paper to the text: sets `--ds-pitch`, `--ds-paper-x/y` (rule origin) on the editor and
 * the snap margins of top-level blocks. Cheap and idempotent — call after any relayout.
 */
export function alignPaper(view: EditorView, editorEl: HTMLElement, root: HTMLElement): void {
  if (view.isDestroyed) return;
  const prose = view.dom as HTMLElement;
  const cs = getComputedStyle(prose);
  const pitch = pitchFor(parseFloat(cs.fontSize) || 17);
  editorEl.style.setProperty("--ds-pitch", `${pitch}px`);

  const proseRect = prose.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const contentTop = proseRect.top - rootRect.top + (parseFloat(cs.paddingTop) || 0);
  const contentLeft = proseRect.left - rootRect.left + (parseFloat(cs.paddingLeft) || 0);
  const baseline = measureBaseline(prose, pitch);
  // The rule sits 1px under the baseline of every line; the grid's columns start at the text column.
  const ruleY = contentTop + baseline + 1;
  editorEl.style.setProperty("--ds-paper-y", `${((ruleY % pitch) + pitch) % pitch}px`);
  editorEl.style.setProperty("--ds-paper-x", `${((contentLeft % pitch) + pitch) % pitch}px`);

  const blocks: { pos: number; node: PMNode; height: number; marginTop: number; marginBottom: number }[] = [];
  view.state.doc.forEach((node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const s = getComputedStyle(dom);
    blocks.push({
      pos: offset,
      node,
      height: dom.getBoundingClientRect().height,
      marginTop: parseFloat(s.marginTop) || 0,
      // The snap itself is applied through --ds-snap; read the block's own base margin.
      marginBottom: parseFloat(s.getPropertyValue("--ds-mb")) || 0,
    });
  });
  const snaps = snapMargins(blocks, pitch);
  const key = `${pitch}|${snaps.map((s, i) => `${blocks[i]!.pos}:${s}`).join(",")}`;
  if (lastKeys.get(view) === key) return;
  lastKeys.set(view, key);
  const decos = blocks
    .map((b, i) => (snaps[i]! > 0.5 ? Decoration.node(b.pos, b.pos + b.node.nodeSize, { style: `--ds-snap: ${snaps[i]}px` }) : null))
    .filter((d): d is Decoration => d !== null);
  view.dispatch(view.state.tr.setMeta(paperKey, DecorationSet.create(view.state.doc, decos)).setMeta("addToHistory", false));
}

/** Removes snap margins (plain paper). */
export function clearPaper(view: EditorView, editorEl: HTMLElement): void {
  lastKeys.delete(view);
  editorEl.style.removeProperty("--ds-paper-y");
  editorEl.style.removeProperty("--ds-paper-x");
  if (!view.isDestroyed && paperKey.getState(view.state) !== DecorationSet.empty) {
    view.dispatch(view.state.tr.setMeta(paperKey, DecorationSet.empty));
  }
}
