// Review of AI agent edits (D-10, spec/04): agent text carries the `agentEdit` mark. The editor shows
// a quiet highlight, a per-block "Принять" pill and (in the React layer) a banner "Правки агента ·
// Принять все". Accepting removes the mark; the text itself stays.
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const agentReviewKey = new PluginKey<DecorationSet>("dsAgentReview");

/** Textblocks (position + node) that contain text marked `agentEdit`. */
export function blocksWithAgentEdits(doc: PMNode): { pos: number; node: PMNode }[] {
  const out: { pos: number; node: PMNode }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let marked = false;
    node.forEach((child) => {
      if (!marked && child.marks.some((m) => m.type.name === "agentEdit")) marked = true;
    });
    if (marked) out.push({ pos, node });
    return false;
  });
  return out;
}

/** Removes the `agentEdit` mark from one textblock (accept a single block). */
export function acceptBlock(state: EditorState, pos: number): Transaction | null {
  const node = state.doc.nodeAt(pos);
  const type = state.schema.marks.agentEdit;
  if (!node || !type) return null;
  return state.tr.removeMark(pos + 1, pos + node.nodeSize - 1, type);
}

/** Removes every `agentEdit` mark in the document (accept all). */
export function acceptAll(state: EditorState): Transaction | null {
  const type = state.schema.marks.agentEdit;
  if (!type) return null;
  return state.tr.removeMark(0, state.doc.content.size, type);
}

function decorations(doc: PMNode, editable: boolean): DecorationSet {
  if (!editable) return DecorationSet.empty;
  const decos = blocksWithAgentEdits(doc).map(({ pos, node }) =>
    Decoration.widget(
      pos + node.nodeSize - 1,
      (view) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ds-agent-accept";
        btn.contentEditable = "false";
        btn.dataset.acceptBlock = String(pos);
        btn.textContent = "Принять";
        btn.title = "Принять правку агента в этом блоке";
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tr = acceptBlock(view.state, pos);
          if (tr) view.dispatch(tr);
        });
        return btn;
      },
      { side: 1, ignoreSelection: true, key: `agent-accept-${pos}`, stopEvent: () => true },
    ),
  );
  return DecorationSet.create(doc, decos);
}

/** Per-block accept pills for agent edits. */
export const AgentReview = Extension.create({
  name: "dsAgentReview",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin<DecorationSet>({
        key: agentReviewKey,
        state: {
          init: (_, state) => decorations(state.doc, editor.isEditable),
          apply: (tr, value, _old, state) => (tr.docChanged || tr.getMeta(agentReviewKey) ? decorations(state.doc, editor.isEditable) : value.map(tr.mapping, tr.doc)),
        },
        props: {
          decorations: (state) => agentReviewKey.getState(state),
        },
      }),
    ];
  },
});
