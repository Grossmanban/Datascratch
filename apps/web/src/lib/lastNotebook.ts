// The notebook last used for creating or opening notes, per space, on this device: where «Новый
// документ» puts a note when no notebook or folder is open (spec/05). Local only, in try/catch.

const key = (spaceId: string) => `ds.lastNotebook.${spaceId}`;

export function lastNotebookOf(spaceId: string | null): string | null {
  if (!spaceId) return null;
  try {
    return localStorage.getItem(key(spaceId));
  } catch {
    return null;
  }
}

export function rememberNotebook(spaceId: string | null, notebookId: string) {
  if (!spaceId) return;
  try {
    localStorage.setItem(key(spaceId), notebookId);
  } catch {
    // private mode: the first notebook is used instead
  }
}
