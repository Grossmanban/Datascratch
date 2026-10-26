// Inline math written as text `$…$` (agents and Markdown users write it; the document contract has
// only `mathBlock`). Display-only: outside the caret the source is hidden and rendered with KaTeX;
// with the caret inside, the raw `$…$` is shown for editing. The document is never changed.
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { loadKatex } from "./blocks";

export const inlineMathKey = new PluginKey<DecorationSet>("dsInlineMath");

/** `$x^2$`: no space right inside the dollars, not part of a word or a price like `$5 and $10`. */
export const INLINE_MATH_RE = /(?<![\\$\w])\$(?![\s\d])([^$\n]+?)(?<![\s\\])\$(?![\w$])/g;

export function findInlineMath(text: string): { from: number; to: number; latex: string }[] {
  return [...text.matchAll(INLINE_MATH_RE)].map((m) => ({ from: m.index!, to: m.index! + m[0].length, latex: m[1]! }));
}

function build(doc: PMNode, state: EditorState | null): DecorationSet {
  const decos: Decoration[] = [];
  const sel = state?.selection;
  doc.descendants((node, pos, parent) => {
    if (!node.isText) return true;
    if (parent?.type.spec.code || node.marks.some((m) => m.type.name === "code")) return false;
    for (const m of findInlineMath(node.text!)) {
      const from = pos + m.from;
      const to = pos + m.to;
      if (sel && sel.from <= to && sel.to >= from) continue; // editing: show the source
      decos.push(
        Decoration.widget(
          from,
          () => {
            const span = document.createElement("span");
            span.className = "ds-inline-math";
            span.contentEditable = "false";
            span.textContent = m.latex;
            void loadKatex().then(({ default: katex }) => {
              try {
                katex.render(m.latex, span, { throwOnError: false, output: "htmlAndMathml" });
              } catch {
                /* keep the source text */
              }
            });
            return span;
          },
          { side: -1, key: `math-${from}-${m.latex}`, ignoreSelection: true },
        ),
        Decoration.inline(from, to, { class: "ds-inline-math-src" }),
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decos);
}

export const InlineMath = Extension.create({
  name: "dsInlineMath",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: inlineMathKey,
        state: {
          init: (_, state) => build(state.doc, state),
          apply: (tr, value, old, state) => (tr.docChanged || !old.selection.eq(state.selection) ? build(state.doc, state) : value),
        },
        props: { decorations: (state) => inlineMathKey.getState(state) },
      }),
    ];
  },
});
