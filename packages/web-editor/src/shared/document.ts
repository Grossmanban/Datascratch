// Temporary stand-in for @datascratch/shared (contracts/document.ts). Mirrors
// docs/architecture/contracts/document-model.md §4. Replace once core lands in main.

export type NoteFont = "serif" | "sans" | "mono";
export type NoteWidth = "normal" | "wide" | "full";
export type NotePaper = "plain" | "dots" | "grid" | "lines";

export interface NoteStyle {
  font: NoteFont;
  width: NoteWidth;
  paper: NotePaper;
  textColor: string | null;
}

export interface NoteCover {
  attachmentId: string;
  offsetY: number;
}

export interface NoteBackdrop {
  kind: "color" | "gradient";
  value: string;
}

export const DEFAULT_NOTE_STYLE: NoteStyle = { font: "serif", width: "normal", paper: "plain", textColor: null };

export type TaskState = "open" | "done" | "cancelled";
export type CalloutTone = "note" | "info" | "success" | "warning" | "danger";
