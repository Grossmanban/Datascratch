// `[[Title]]` written as plain text — what agents write for a note that does not exist yet (the
// MCP importer keeps unknown links literal). The editor shows it as a link; activating it links to
// an existing note with that title or creates one, and replaces the text with a `noteLink` node.
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { HostRef } from "../host";

export const missingLinksKey = new PluginKey<DecorationSet>("dsMissingLinks");
export const MISSING_LINK_RE = /\[\[([^\]\n]+)\]\]/g;

function decorations(doc: PMNode): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText) return true;
    if (parent?.type.spec.code || node.marks.some((m) => m.type.name === "code")) return false;
    for (const m of node.text!.matchAll(MISSING_LINK_RE)) {
      const from = pos + m.index!;
      decos.push(Decoration.inline(from, from + m[0].length, { class: "ds-missing-link", "data-missing-link": m[1]!, title: "Заметки ещё нет — нажмите, чтобы создать" }));
    }
    return false;
  });
  return DecorationSet.create(doc, decos);
}

/** Resolves the literal `[[title]]` at `from..to` into a `noteLink` (existing note or a new one). */
export async function resolveMissingLink(view: EditorView, host: HostRef, from: number, to: number, title: string): Promise<boolean> {
  const h = host.current;
  const exact = (await h.searchNotes?.(title))?.find((n) => n.title.trim().toLowerCase() === title.trim().toLowerCase());
  const note = exact ?? (await h.createNote?.(title));
  if (!note) return false;
  // The document may have changed while we waited: only replace if the text is still there.
  if (view.isDestroyed || view.state.doc.textBetween(from, to) !== `[[${title}]]`) return false;
  const type = view.state.schema.nodes.noteLink!;
  view.dispatch(view.state.tr.replaceWith(from, to, type.create({ noteId: note.noteId, label: note.title || title })));
  h.onOpenNote?.(note.noteId);
  return true;
}

export const MissingLinks = Extension.create<{ host: HostRef }>({
  name: "dsMissingLinks",
  addOptions: () => ({ host: { current: {} } }),
  addProseMirrorPlugins() {
    const host = this.options.host;
    return [
      new Plugin<DecorationSet>({
        key: missingLinksKey,
        state: {
          init: (_, state) => decorations(state.doc),
          apply: (tr, value, _old, state) => (tr.docChanged ? decorations(state.doc) : value),
        },
        props: {
          decorations: (state) => missingLinksKey.getState(state),
          handleClick: (view, pos, event) => {
            const el = (event.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-missing-link]");
            if (!el) return false;
            // Links follow on a single tap/click, like `noteLink` atoms (touch has no ⌘-click).
            const deco = missingLinksKey.getState(view.state)?.find(pos, pos).find((d) => d.from <= pos && d.to >= pos);
            if (!deco) return false;
            void resolveMissingLink(view, host, deco.from, deco.to, el.dataset.missingLink!);
            return true;
          },
        },
      }),
    ];
  },
});
