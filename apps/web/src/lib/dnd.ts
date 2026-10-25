// HTML5 drag-and-drop payloads between the document list, sidebar folders and tabs.
export const DND_NOTE = "application/x-ds-note";
export const DND_FOLDER = "application/x-ds-folder";

export function dragNote(e: React.DragEvent, noteId: string) {
  e.dataTransfer.setData(DND_NOTE, noteId);
  e.dataTransfer.setData("text/plain", `/doc/${noteId}`);
  e.dataTransfer.effectAllowed = "move";
}

export function dragFolder(e: React.DragEvent, folderId: string) {
  e.dataTransfer.setData(DND_FOLDER, folderId);
  e.dataTransfer.effectAllowed = "move";
}

export function dropKind(e: React.DragEvent): "note" | "folder" | null {
  const types = Array.from(e.dataTransfer.types);
  if (types.includes(DND_NOTE)) return "note";
  if (types.includes(DND_FOLDER)) return "folder";
  return null;
}
