// Derived data of notes kept only as stored state (sync "stored" mode): a
// transient Y.Doc is built, read and destroyed, so no note stays in memory.
import * as Y from "yjs";
import type { NoteLinkRef, TaskIndexEntry } from "../contracts/document.js";
import { extractNoteLinks, extractTags, extractTasks, getPlainText, getTitle } from "./extract.js";

export interface NoteIndex {
  noteId: string;
  title: string;
  plainText: string;
  tasks: TaskIndexEntry[];
  links: NoteLinkRef[];
  tags: string[];
}

/** Everything the task index, search, backlinks and tags need from one note state. */
export function indexNoteState(noteId: string, state: Uint8Array): NoteIndex {
  const doc = new Y.Doc({ gc: true });
  try {
    Y.applyUpdate(doc, state);
    return {
      noteId,
      title: getTitle(doc),
      plainText: getPlainText(doc),
      tasks: extractTasks(doc, noteId),
      links: extractNoteLinks(doc, noteId),
      tags: extractTags(doc),
    };
  } finally {
    doc.destroy();
  }
}

export interface NoteIndexerOptions {
  /** Current saved state of a note (after the app persisted its updates). */
  loadState: (noteId: string) => Uint8Array | null | Promise<Uint8Array | null>;
  /** Receives fresh indexes in batches. */
  onIndex: (indexes: NoteIndex[]) => void | Promise<void>;
  /** Changes within this window are indexed together. Default 300 ms. */
  delayMs?: number;
  /** Notes per batch, so one big first sync does not block for long. Default 200. */
  batchSize?: number;
}

/**
 * Debounced re-indexing: call `schedule(noteId)` whenever a note's stored state
 * changed (e.g. from `storedDocs.onUpdates`); each note is indexed once per
 * window no matter how many updates arrived.
 */
export function createNoteIndexer(options: NoteIndexerOptions) {
  const delay = options.delayMs ?? 300;
  const batchSize = options.batchSize ?? 200;
  const dirty = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> = Promise.resolve();

  const run = async () => {
    while (dirty.size > 0) {
      const ids = [...dirty].slice(0, batchSize);
      for (const id of ids) dirty.delete(id);
      const out: NoteIndex[] = [];
      for (const id of ids) {
        const state = await options.loadState(id);
        if (state) out.push(indexNoteState(id, state));
      }
      if (out.length > 0) await options.onIndex(out);
      // Yield between batches so UI and sync keep running.
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const flush = (): Promise<void> => {
    if (timer) clearTimeout(timer);
    timer = null;
    running = running.then(run, run);
    return running;
  };

  return {
    schedule(noteId: string): void {
      dirty.add(noteId);
      timer ??= setTimeout(() => void flush(), delay);
    },
    /** Index everything scheduled now; resolves when done. */
    flush,
    get pending(): number {
      return dirty.size;
    },
  };
}
