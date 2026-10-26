// The note title, Apple Notes style (spec/04 «Название новой заметки», same API as the iOS editor):
// Enter in the title never splits it — the caret goes to the start of the text (an empty paragraph
// is created if the note has none). A NEW note's empty title gets the host's default name
// («Заметка 26 октября 2026») on Enter, when the caret leaves it, when the editor loses focus, and
// on close (`fillEmptyTitleIfNeeded`). A note is new for the editor once the app called
// `focusTitle()` (it does so only for a note it has just created): opening a note — or an existing
// note's empty or unusual title — never names anything.
import { Extension, type Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import type { HostRef } from "../host";

/** Position and node of the title (the first child of the doc), if any. */
function titleOf(editor: Editor) {
  const node = editor.state.doc.firstChild;
  return node && node.type.name === "title" ? node : null;
}

function caretInTitle(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  return $from.depth >= 1 && $from.node(1).type.name === "title";
}

/** Editors whose note was just created (focusTitle was called): only their titles are named. */
const newNotes = new WeakSet<Editor>();

/**
 * Fills the empty title of a new note with `host.defaultTitle()`; returns whether it did. The caret
 * keeps its place in the text (or lands at the end of the title if it was there). One undo step.
 */
export function fillEmptyTitleIfNeeded(editor: Editor, host: HostRef, undo?: { stopCapturing(): void }): boolean {
  if (editor.isDestroyed || !editor.isEditable || !newNotes.has(editor)) return false;
  const title = titleOf(editor);
  if (!title || title.content.size > 0) return false;
  const name = host.current.defaultTitle?.();
  if (!name) return false;
  undo?.stopCapturing();
  editor.view.dispatch(editor.state.tr.insertText(name, 1));
  undo?.stopCapturing();
  return true;
}

/** Puts the caret at the end of the title and focuses the editor: the note is a new one. */
export function focusTitle(editor: Editor): void {
  const title = titleOf(editor);
  if (!title || editor.isDestroyed) return;
  newNotes.add(editor);
  editor.commands.focus(1 + title.content.size);
}

export interface TitleBehaviorOptions {
  host: HostRef;
}

export const TitleBehavior = Extension.create<TitleBehaviorOptions>({
  name: "dsTitleBehavior",
  // Runs before the title node's own shortcuts and the default Enter.
  priority: 1000,
  addOptions() {
    return { host: { current: {} } };
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!caretInTitle(editor) || editor.view.composing) return false;
        fillEmptyTitleIfNeeded(editor, this.options.host);
        // The title the caret is in (usually the first block; a document may carry another one).
        const after = editor.state.selection.$from.after(1);
        const next = editor.state.doc.nodeAt(after);
        const tr = editor.state.tr;
        if (next?.isTextblock) {
          tr.setSelection(TextSelection.create(tr.doc, after + 1));
        } else {
          tr.insert(after, editor.schema.nodes.paragraph!.create());
          tr.setSelection(TextSelection.create(tr.doc, after + 1));
        }
        editor.view.dispatch(tr.scrollIntoView());
        return true;
      },
    };
  },
  onCreate() {
    let wasInTitle = false;
    const editor = this.editor;
    const host = this.options.host;
    // The caret was in the title while the editor had focus; leaving it names an empty title.
    const leave = () => queueMicrotask(() => fillEmptyTitleIfNeeded(editor, host));
    // Focus arrives before a click moves the caret: look once the selection has settled, so a
    // click into the text of a note with an empty title (never in the title) does not name it.
    editor.on("focus", () => {
      requestAnimationFrame(() => {
        if (!editor.isDestroyed && editor.isFocused && caretInTitle(editor)) wasInTitle = true;
      });
    });
    editor.on("selectionUpdate", () => {
      const inTitle = caretInTitle(editor);
      if (wasInTitle && !inTitle) leave();
      wasInTitle = inTitle && editor.isFocused;
    });
    editor.on("blur", () => {
      if (wasInTitle) leave();
      wasInTitle = false;
    });
  },
});
