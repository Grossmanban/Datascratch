import { Extension, type Editor } from "@tiptap/core";
import {
  defaultDeleteFilter,
  defaultProtectedNodes,
  redoCommand,
  undoCommand,
  yCursorPlugin,
  yCursorPluginKey,
  ySyncPlugin,
  ySyncPluginKey,
  yUndoPlugin,
} from "y-prosemirror";
import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

/** Transaction origin of pen-layer edits; tracked by the shared undo manager so strokes undo/redo with text. */
export const PEN_ORIGIN = Symbol("ds-pen");
/** Origin for edits made by the editor outside ProseMirror (meta/style changes) — not undoable. */
export const META_ORIGIN = Symbol("ds-meta");

/**
 * One Y.UndoManager over the note's `content` and `strokes` (contract: strokes participate in undo/redo).
 * Remote changes (other origins) are never undone locally.
 */
export function createNoteUndoManager(doc: Y.Doc): Y.UndoManager {
  return new Y.UndoManager([doc.getXmlFragment("content"), doc.getMap("strokes")], {
    trackedOrigins: new Set<unknown>([ySyncPluginKey, PEN_ORIGIN]),
    deleteFilter: (item) => defaultDeleteFilter(item, defaultProtectedNodes),
    captureTransaction: (tr) => tr.meta.get("addToHistory") !== false,
  });
}

export interface CollaborationOptions {
  doc: Y.Doc | null;
  undoManager: Y.UndoManager | null;
  awareness: Awareness | null;
  user: { name: string; color: string } | null;
}

function cursorBuilder(user: { name?: string; color?: string }): HTMLElement {
  const caret = document.createElement("span");
  caret.className = "ds-collab-caret";
  caret.style.setProperty("--ds-collab-color", user.color ?? "#2E5BDB");
  const label = document.createElement("span");
  label.className = "ds-collab-label";
  label.textContent = user.name ?? "Гость";
  caret.append("⁠", label, "⁠");
  return caret;
}

/** Binds TipTap to `Y.XmlFragment "content"` with y-prosemirror (document-model.md §4.1). */
export const Collaboration = Extension.create<CollaborationOptions>({
  name: "dsCollaboration",
  priority: 1000,
  addOptions: () => ({ doc: null, undoManager: null, awareness: null, user: null }),
  addKeyboardShortcuts() {
    return {
      "Mod-z": () => undoCommand(this.editor.state, this.editor.view.dispatch),
      "Mod-y": () => redoCommand(this.editor.state, this.editor.view.dispatch),
      "Shift-Mod-z": () => redoCommand(this.editor.state, this.editor.view.dispatch),
    };
  },
  addProseMirrorPlugins() {
    const { doc, undoManager, awareness, user } = this.options;
    if (!doc) throw new Error("Collaboration: a Y.Doc is required");
    const plugins = [ySyncPlugin(doc.getXmlFragment("content")), yUndoPlugin({ undoManager })];
    if (awareness) {
      if (user) awareness.setLocalStateField("user", user);
      plugins.push(createCursorPlugin(awareness));
    }
    return plugins;
  },
});

/** Collaborators' carets and selections from an awareness instance. */
export function createCursorPlugin(awareness: Awareness) {
  return yCursorPlugin(awareness, {
    cursorBuilder: (u: { name?: string; color?: string }) => cursorBuilder(u),
    selectionBuilder: (u: { color?: string }) => ({
      style: `background-color: color-mix(in srgb, ${u.color ?? "#2E5BDB"} 22%, transparent)`,
      class: "ds-collab-selection",
    }),
  });
}

/**
 * Swaps the presence source of a live editor (no remount: the document binding, undo history and
 * pen layer stay as they are). Passing null removes collaborators' cursors.
 */
export function setEditorAwareness(editor: Editor, awareness: Awareness | null, user: { name: string; color: string } | null): void {
  if (editor.isDestroyed) return;
  editor.unregisterPlugin(yCursorPluginKey);
  if (!awareness) return;
  if (user) awareness.setLocalStateField("user", user);
  editor.registerPlugin(createCursorPlugin(awareness));
}
