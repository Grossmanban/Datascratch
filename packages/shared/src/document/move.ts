// Moving a note to another notebook (api.md, «Перенос заметки»): the note
// document stays the same, only its key wrapping and index entry move.
import type * as Y from "yjs";
import type { NoteMeta } from "../contracts/document.js";
import { rewrapNoteKey } from "../crypto/keys.js";
import { deleteNoteMeta, getNoteMeta, putNoteMeta } from "./records.js";

export interface MoveNoteOptions {
  noteId: string;
  /** Index (notebook document) of the source and the target notebook. */
  fromIndex: Y.Doc;
  toIndex: Y.Doc;
  fromNotebookKey: Uint8Array;
  toNotebookKey: Uint8Array;
  toNotebookId: string;
  /** `PATCH /v1/docs/:noteId { notebookId }`; must reject on failure. */
  patchDoc: (noteId: string, notebookId: string) => Promise<void>;
  /** Folder in the target notebook (default: its root). */
  toFolderId?: string | null;
  now?: () => Date;
}

/**
 * 1. re-wrap the noteKey with the target notebookKey and write the NoteMeta
 *    into the target index; 2. PATCH the document; 3. remove the NoteMeta from
 *    the source index. If the PATCH fails the target entry is removed again.
 * Returns the NoteMeta as written to the target index.
 */
export async function moveNoteToNotebook(options: MoveNoteOptions): Promise<NoteMeta> {
  const { noteId, fromIndex, toIndex } = options;
  const meta = getNoteMeta(fromIndex, noteId);
  if (!meta) throw new Error(`note ${noteId} is not in the source notebook`);
  const moved: NoteMeta = {
    ...meta,
    wrappedKey: rewrapNoteKey(
      meta.wrappedKey,
      options.fromNotebookKey,
      options.toNotebookKey,
      noteId,
    ),
    folderId: options.toFolderId ?? null,
    // Nesting under another note does not survive a move to another notebook.
    parentNoteId: null,
    updatedAt: (options.now?.() ?? new Date()).toISOString(),
  };
  putNoteMeta(toIndex, moved);
  try {
    await options.patchDoc(noteId, options.toNotebookId);
  } catch (e) {
    deleteNoteMeta(toIndex, noteId);
    throw e;
  }
  deleteNoteMeta(fromIndex, noteId);
  return moved;
}
