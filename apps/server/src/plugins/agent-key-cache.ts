/**
 * Decrypted note keys of agent-mode notebooks, kept briefly so a burst of
 * agent calls does not re-read the notebook index for every note (crypto.md §8:
 * the server holds keys only while serving agents). Bounded, expires after
 * KEY_TTL_MS, and flushed when a notebook leaves agent mode or is deleted, or
 * when a grant is revoked. Access is still re-checked by RLS on every call.
 */
export const KEY_TTL_MS = 10 * 60_000;
const MAX_KEYS = 10_000;

interface Entry {
  key: Uint8Array;
  notebookId: string;
  at: number;
}

const entries = new Map<string, Entry>();

export const noteKeyCache = {
  get(noteId: string, now = Date.now()): Uint8Array | undefined {
    const e = entries.get(noteId);
    if (!e) return undefined;
    if (now - e.at > KEY_TTL_MS) {
      entries.delete(noteId);
      return undefined;
    }
    return e.key;
  },

  set(noteId: string, notebookId: string, key: Uint8Array, now = Date.now()): void {
    entries.delete(noteId);
    if (entries.size >= MAX_KEYS) entries.delete(entries.keys().next().value as string);
    entries.set(noteId, { key, notebookId, at: now });
  },

  /** Drops every key of these notebooks (mode change, deletion, revoked grant). */
  forgetNotebooks(notebookIds: Iterable<string>): void {
    const ids = new Set(notebookIds);
    if (ids.size === 0) return;
    for (const [noteId, e] of entries) if (ids.has(e.notebookId)) entries.delete(noteId);
  },

  /** Drops the keys of these notes (a note shared on its own got a new key, D-54). */
  forgetNotes(noteIds: Iterable<string>): void {
    for (const id of noteIds) entries.delete(id);
  },

  size(): number {
    return entries.size;
  },
};
