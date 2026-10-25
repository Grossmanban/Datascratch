import * as Y from "yjs";
import { ySyncPluginKey } from "y-prosemirror";
import type { Editor } from "@tiptap/core";
import { createHeadlessEditor } from "../src/editorCore";

export function makeEditor(doc = new Y.Doc(), onUnknown?: (name: string) => void) {
  const element = document.createElement("div");
  document.body.append(element);
  const { editor, undoManager } = createHeadlessEditor({ doc, host: { current: {} }, placeholders: false, element, onUnknown });
  return { doc, editor, undoManager };
}

export function binding(editor: Editor) {
  return ySyncPluginKey.getState(editor.state).binding as { mapping: Map<Y.AbstractType<unknown>, unknown>; type: Y.XmlFragment };
}

/** Lets y-prosemirror's deferred initial render and observers run. */
export const tick = () => new Promise((r) => setTimeout(r, 0));

/** Position of the n-th occurrence of a substring in the editor text (ProseMirror position). */
export function findText(editor: Editor, needle: string, nth = 0): number {
  let found = -1;
  let count = 0;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0 || !node.isText) return found < 0;
    let idx = node.text!.indexOf(needle);
    while (idx >= 0) {
      if (count === nth) {
        found = pos + idx;
        return false;
      }
      count++;
      idx = node.text!.indexOf(needle, idx + 1);
    }
    return true;
  });
  if (found < 0) throw new Error(`text not found: ${needle}`);
  return found;
}
