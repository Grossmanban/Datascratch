// Callbacks the embedding app (web-app) provides. The editor reads them through a mutable
// holder so that changing a callback never recreates the editor.

export interface NoteSummary {
  noteId: string;
  title: string;
  icon?: string | null;
  coverUrl?: string | null;
}

export interface UploadedAttachment {
  attachmentId: string;
  name: string;
  size: number;
  mime: string;
}

export interface EditorHost {
  /** attachmentId → URL that can be put into <img src> (blob: or https:). */
  resolveAttachment?: (attachmentId: string) => Promise<string | null>;
  /** Uploads (encrypts) a pasted or dropped file and returns its attachment record. */
  uploadAttachment?: (file: File) => Promise<UploadedAttachment>;
  onOpenAttachment?: (attachment: { attachmentId: string; name: string; mime: string }) => void;
  /** Data for a page card (`pageCard`) or a note link chip. */
  resolveNote?: (noteId: string) => Promise<NoteSummary | null>;
  onOpenNote?: (noteId: string) => void;
  /** Autocomplete for `[[`. */
  searchNotes?: (query: string) => Promise<NoteSummary[]>;
  /** Creates a note from `[[New title` and returns its id. */
  createNote?: (title: string) => Promise<NoteSummary>;
  searchTags?: (query: string) => Promise<string[]>;
  onTagClick?: (name: string) => void;
  /** Opens the note that a task belongs to, moves a task, … (task context menu actions not handled in-editor). */
  onTaskAction?: (action: "open" | "move", task: { taskId: string; blockId: string }) => void;
}

export interface HostRef {
  current: EditorHost;
}
