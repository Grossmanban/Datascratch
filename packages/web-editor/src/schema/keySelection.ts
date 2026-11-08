// A key acts at the caret the user sees. Moving the caret natively (End, Home, ⌘→, arrows) changes
// the DOM selection; ProseMirror reads it on the asynchronous selectionchange event. A key pressed
// right after (End then Enter, by a fast typist or a test) used the old selection — next to a
// co-author's caret widget Chrome reports the new one late enough for Enter to split the paragraph
// at its start (bug 2026-11-08). Before any key handler runs, the pending DOM selection is read.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

type WithObserver = EditorView & { domObserver?: { flush(): void } };

export const KeySelection = Extension.create({
  name: "dsKeySelection",
  // Before every other key handler (keymaps, the title's Enter, suggestion menus).
  priority: 100_000,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("dsKeySelection"),
        props: {
          handleKeyDown(view, event) {
            if (!view.composing && event.keyCode !== 229) (view as WithObserver).domObserver?.flush();
            return false;
          },
        },
      }),
    ];
  },
});
