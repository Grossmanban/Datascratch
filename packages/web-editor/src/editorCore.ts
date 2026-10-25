import { Editor, getSchema, type AnyExtension } from "@tiptap/core";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { Collaboration, createNoteUndoManager } from "./collab/collaboration";
import { Reanchor } from "./collab/reanchor";
import type { HostRef } from "./host";
import { createSchemaExtensions, type SchemaOptions } from "./schema";
import { createUnknownExtensions, guardSchema, scanUnknown } from "./schema/unknown";

export interface CoreOptions {
  doc: Y.Doc;
  host: HostRef;
  undoManager?: Y.UndoManager;
  awareness?: Awareness | null;
  user?: { name: string; color: string } | null;
  placeholders?: SchemaOptions["placeholders"];
  extensions?: AnyExtension[];
}

/**
 * The full extension list for a note document: contract schema + placeholder types for unknown
 * nodes/marks already present in the doc + y-prosemirror binding.
 */
export function buildExtensions(opts: CoreOptions): { extensions: AnyExtension[]; undoManager: Y.UndoManager } {
  const base = createSchemaExtensions({ host: opts.host, placeholders: opts.placeholders });
  const known = getSchema(base);
  const scan = scanUnknown(opts.doc.getXmlFragment("content"), new Set(Object.keys(known.nodes)), new Set(Object.keys(known.marks)));
  const undoManager = opts.undoManager ?? createNoteUndoManager(opts.doc);
  const extensions = [
    ...base,
    ...createUnknownExtensions(scan),
    ...(opts.extensions ?? []),
    Reanchor.configure({ doc: opts.doc }),
    Collaboration.configure({ doc: opts.doc, undoManager, awareness: opts.awareness ?? null, user: opts.user ?? null }),
  ];
  return { extensions, undoManager };
}

/** Installs the unknown-name guard on a freshly created editor's schema. */
export function guardEditorSchema(editor: Editor, onUnknown: (name: string) => void): void {
  guardSchema(editor.schema, onUnknown);
}

/** Headless editor (tests, agents' previews). The React component uses the same building blocks. */
export function createHeadlessEditor(opts: CoreOptions & { element?: HTMLElement; onUnknown?: (name: string) => void }): { editor: Editor; undoManager: Y.UndoManager } {
  const { extensions, undoManager } = buildExtensions(opts);
  const editor = new Editor({
    element: opts.element ?? document.createElement("div"),
    extensions,
    onBeforeCreate: ({ editor: e }) => guardSchema(e.schema, opts.onUnknown ?? (() => {})),
  });
  return { editor, undoManager };
}
