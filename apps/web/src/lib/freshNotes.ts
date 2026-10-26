/**
 * Notes the user created empty on this device in this session (spec/04 «Название новой заметки»).
 * Only these get a default title and are dropped when closed still empty; a note opened from the
 * list — made elsewhere, by an agent, or before — is never renamed or deleted on its own.
 */
const fresh = new Set<string>();

export const markFreshNote = (noteId: string) => void fresh.add(noteId);
export const isFreshNote = (noteId: string) => fresh.has(noteId);
