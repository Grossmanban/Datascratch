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
  /**
   * Encrypts and stores a pasted, dropped or picked file; resolves with its attachment record. The
   * editor has already inserted the block with a local preview; `onProgress(done)` (0..1 while the
   * chunks are sealed, optional) drives its progress ring. A rejection shows «Повторить» / «Удалить».
   */
  uploadAttachment?: (file: File, onProgress?: (done: number) => void) => Promise<UploadedAttachment>;
  /**
   * Downloads an image found in pasted HTML (http/https) so it can be stored as an attachment.
   * Rejects (or absent) when it cannot be fetched (CORS, offline): the image then stays as a link to
   * its URL.
   */
  fetchRemoteImage?: (url: string) => Promise<File>;
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
  /**
   * Task dates (D-51: notes-only by default, dates belong to the extended mode). "inert": date and
   * deadline chips are plain labels, the date entries and «Переместить…» are hidden from the task
   * and / menus; checkboxes still toggle and the attributes stay in the document. Default "full".
   */
  taskDates?: "full" | "inert";
  /**
   * The name an empty title gets (spec/04 «Название новой заметки»): «Заметка 26 октября 2026» —
   * localized and dated by the note's creation day. Without it empty titles stay empty.
   */
  defaultTitle?: () => string;
}

export interface HostRef {
  current: EditorHost;
}
