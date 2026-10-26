// Visual state of a block being dragged by touch (long-press on its handle): the source block is
// dimmed in place while a lifted copy follows the finger. Set through a meta, never stored.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const blockLiftKey = new PluginKey<DecorationSet>("dsBlockLift");

/** `{ pos }` lifts the block at `pos`; `null` drops it. */
export type BlockLiftMeta = { pos: number } | null;

export const BlockLift = Extension.create({
  name: "dsBlockLift",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: blockLiftKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            const meta = tr.getMeta(blockLiftKey) as BlockLiftMeta | undefined;
            if (meta === undefined) return set.map(tr.mapping, tr.doc);
            const node = meta && tr.doc.nodeAt(meta.pos);
            if (!meta || !node) return DecorationSet.empty;
            return DecorationSet.create(tr.doc, [Decoration.node(meta.pos, meta.pos + node.nodeSize, { class: "ds-block-lifted-source" })]);
          },
        },
        props: { decorations: (state) => blockLiftKey.getState(state) },
      }),
    ];
  },
});
