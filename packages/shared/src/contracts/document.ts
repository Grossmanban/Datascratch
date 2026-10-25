// Types of the document model contract (document-model.md, v1).
import { z } from "zod";
import {
  authorKindSchema,
  dateOnlySchema,
  isoDateTimeSchema,
  notebookModeSchema,
  uuidSchema,
  type DateOnly,
  type IsoDateTime,
  type NotebookMode,
  type Uuid,
} from "./common.js";

/** `meta.formatVersion` written by this implementation (document-model.md §6). */
export const FORMAT_VERSION = 1;

// ---------------------------------------------------------------------------
// Root type names
// ---------------------------------------------------------------------------

export const ACCOUNT_ROOTS = {
  meta: "meta",
  spaces: "spaces",
  notebooks: "notebooks",
  settings: "settings",
  starred: "starred",
  tabs: "tabs",
} as const;

export const NOTEBOOK_ROOTS = {
  meta: "meta",
  folders: "folders",
  notes: "notes",
  tags: "tags",
} as const;

export const NOTE_ROOTS = {
  content: "content",
  meta: "meta",
  strokes: "strokes",
  comments: "comments",
} as const;

// ---------------------------------------------------------------------------
// account document (§2)
// ---------------------------------------------------------------------------

export const spaceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  /** Emoji or SF Symbol name. */
  icon: z.string().nullable(),
  /** Color token. */
  color: z.string().nullable(),
  order: z.number(),
  createdAt: isoDateTimeSchema,
});
export type Space = z.infer<typeof spaceSchema>;

export const notebookRefSchema = z.object({
  id: uuidSchema,
  spaceId: uuidSchema,
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number(),
  mode: notebookModeSchema,
  createdAt: isoDateTimeSchema,
});
export type NotebookRef = z.infer<typeof notebookRefSchema> & { mode: NotebookMode };

export const STARRED_KINDS = ["note", "folder", "notebook"] as const;
export type StarredKind = (typeof STARRED_KINDS)[number];
export const starredItemSchema = z.object({ kind: z.enum(STARRED_KINDS), id: uuidSchema });
export type StarredItem = z.infer<typeof starredItemSchema>;

export const tabItemSchema = z.object({ noteId: uuidSchema });
export type TabItem = z.infer<typeof tabItemSchema>;

/** Well-known keys of the account `settings` map; other keys are free-form JSON. */
export const ACCOUNT_SETTINGS_KEYS = {
  /** Notebook that holds daily notes and the inbox (§3). */
  dailyNotebookId: "dailyNotebookId",
  /** noteId of the last active tab (§2). */
  activeTab: "activeTab",
} as const;

export interface AccountSettings {
  dailyNotebookId?: Uuid | null;
  activeTab?: Uuid | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// notebook document (§3)
// ---------------------------------------------------------------------------

export const folderSchema = z.object({
  id: uuidSchema,
  parentId: uuidSchema.nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  order: z.number(),
  createdAt: isoDateTimeSchema,
});
export type Folder = z.infer<typeof folderSchema>;

export const NOTE_KINDS = ["note", "daily", "inbox"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const noteMetaSchema = z.object({
  id: uuidSchema,
  folderId: uuidSchema.nullable(),
  parentNoteId: uuidSchema.nullable(),
  title: z.string(),
  kind: z.enum(NOTE_KINDS),
  dailyDate: dateOnlySchema.nullable(),
  tags: z.array(z.string()),
  icon: z.string().nullable(),
  /** attachmentId of the cover thumbnail. */
  coverThumb: z.string().nullable(),
  /** noteKey wrapped by the notebookKey, base64url envelope (crypto.md). */
  wrappedKey: z.string(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  trashedAt: isoDateTimeSchema.nullable(),
  order: z.number(),
});
export type NoteMeta = z.infer<typeof noteMetaSchema>;

export const tagPropsSchema = z.object({
  color: z.string().nullable(),
  icon: z.string().nullable(),
});
export type TagProps = z.infer<typeof tagPropsSchema>;

/** Days a trashed note stays in the trash before deletion. */
export const TRASH_RETENTION_DAYS = 30;

// ---------------------------------------------------------------------------
// note document (§4)
// ---------------------------------------------------------------------------

export const NOTE_FONTS = ["serif", "sans", "mono"] as const;
export const NOTE_WIDTHS = ["normal", "wide", "full"] as const;
export const NOTE_PAPERS = ["plain", "dots", "grid", "lines"] as const;

export const noteStyleSchema = z.object({
  font: z.enum(NOTE_FONTS),
  width: z.enum(NOTE_WIDTHS),
  paper: z.enum(NOTE_PAPERS),
  textColor: z.string().nullable(),
});
export type NoteStyle = z.infer<typeof noteStyleSchema>;

export const DEFAULT_NOTE_STYLE: NoteStyle = Object.freeze({
  font: "sans",
  width: "normal",
  paper: "plain",
  textColor: null,
});

export const noteCoverSchema = z.object({
  attachmentId: uuidSchema,
  offsetY: z.number().min(0).max(1),
});
export type NoteCover = z.infer<typeof noteCoverSchema>;

export const noteBackdropSchema = z.object({
  kind: z.enum(["color", "gradient"]),
  value: z.string(),
});
export type NoteBackdrop = z.infer<typeof noteBackdropSchema>;

export interface NoteDocMeta {
  formatVersion: number;
  style: NoteStyle;
  cover: NoteCover | null;
  backdrop: NoteBackdrop | null;
}

export const commentAuthorSchema = z.object({
  kind: authorKindSchema,
  id: z.string(),
  name: z.string(),
});
export type CommentAuthor = z.infer<typeof commentAuthorSchema>;

export const commentSchema = z.object({
  id: uuidSchema,
  blockId: uuidSchema,
  /** Relative positions (Y.encodeRelativePosition) in base64url, or null for the whole block. */
  anchor: z.object({ start: z.string(), end: z.string() }).nullable(),
  author: commentAuthorSchema,
  text: z.string(),
  createdAt: isoDateTimeSchema,
  resolvedAt: isoDateTimeSchema.nullable(),
});
export type Comment = z.infer<typeof commentSchema>;

// ---------------------------------------------------------------------------
// Block schema (§4.2) — ProseMirror node names as stored by y-prosemirror
// ---------------------------------------------------------------------------

export const BLOCK_NODES = [
  "title",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "callout",
  "codeBlock",
  "mathBlock",
  "mermaid",
  "horizontalRule",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "image",
  "file",
  "drawing",
  "pageCard",
  "collection",
] as const;
export type BlockNodeName = (typeof BLOCK_NODES)[number];

export const INLINE_NODES = ["noteLink", "tag", "mention", "hardBreak"] as const;
export type InlineNodeName = (typeof INLINE_NODES)[number];

export const MARKS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
  "highlight",
  "textColor",
  "agentEdit",
] as const;
export type MarkName = (typeof MARKS)[number];

/** Blocks whose direct content is inline (text + inline nodes). */
export const TEXTBLOCK_NODES = ["title", "paragraph", "heading", "codeBlock"] as const;
/** Blocks without content (atoms). */
export const ATOM_BLOCK_NODES = [
  "mathBlock",
  "mermaid",
  "horizontalRule",
  "image",
  "file",
  "drawing",
  "pageCard",
] as const;

export const TASK_STATES = ["open", "done", "cancelled"] as const;
export type TaskState = (typeof TASK_STATES)[number];
export const CALLOUT_TONES = ["note", "info", "success", "warning", "danger"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];
export const HR_STYLES = ["line", "dots", "wave"] as const;
export type HorizontalRuleStyle = (typeof HR_STYLES)[number];
export const PAGE_CARD_STYLES = ["card", "link"] as const;
export type PageCardStyle = (typeof PAGE_CARD_STYLES)[number];

interface WithBlockId {
  blockId: Uuid;
}

/** Attributes of every block node, keyed by node name. Missing attributes read as null. */
export interface BlockAttrs {
  title: WithBlockId;
  paragraph: WithBlockId & { textAlign?: "left" | "center" | "right" | "justify" | null };
  heading: WithBlockId & { level: 1 | 2 | 3 };
  bulletList: WithBlockId;
  orderedList: WithBlockId & { start?: number | null };
  listItem: WithBlockId;
  taskList: WithBlockId;
  taskItem: WithBlockId & {
    taskId: Uuid;
    state: TaskState;
    scheduled: DateOnly | null;
    deadline: DateOnly | null;
    completedAt: IsoDateTime | null;
  };
  blockquote: WithBlockId;
  callout: WithBlockId & { tone: CalloutTone; emoji: string | null };
  codeBlock: WithBlockId & { language: string | null };
  mathBlock: WithBlockId & { latex: string };
  mermaid: WithBlockId & { source: string };
  horizontalRule: WithBlockId & { style: HorizontalRuleStyle };
  table: WithBlockId;
  tableRow: WithBlockId;
  tableHeader: WithBlockId & { colspan: number; rowspan: number; colwidth: number[] | null };
  tableCell: WithBlockId & { colspan: number; rowspan: number; colwidth: number[] | null };
  image: WithBlockId & {
    attachmentId: Uuid;
    /** Fraction of the column width 0..1, null = natural size. */
    width: number | null;
    alt: string | null;
    caption: string | null;
  };
  file: WithBlockId & { attachmentId: Uuid; name: string; size: number; mime: string };
  /** `height` in pt at column width 1.0; strokes live in `strokes`. */
  drawing: WithBlockId & { height: number };
  pageCard: WithBlockId & { noteId: Uuid; style: PageCardStyle };
  collection: WithBlockId & Record<string, unknown>;
}

export interface InlineAttrs {
  noteLink: { noteId: Uuid; label: string };
  /** Tag name without `#`, nesting with `/`. */
  tag: { name: string };
  mention: Record<string, unknown>;
  hardBreak: Record<string, never>;
}

export interface MarkAttrs {
  bold: Record<string, never>;
  italic: Record<string, never>;
  underline: Record<string, never>;
  strike: Record<string, never>;
  code: Record<string, never>;
  link: { href: string };
  highlight: { color: string };
  textColor: { color: string };
  agentEdit: { agentId: string; at: IsoDateTime };
}

// ---------------------------------------------------------------------------
// ProseMirror-style JSON (used by the agent block API, export and test vectors)
// ---------------------------------------------------------------------------

export interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  /** Only for `type: "text"`. */
  text?: string;
  marks?: PMMark[];
}

const pmMarkSchema = z.object({
  type: z.string().min(1),
  attrs: z.record(z.string(), z.unknown()).optional(),
});
export const pmNodeSchema: z.ZodType<PMNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(pmNodeSchema).optional(),
    text: z.string().optional(),
    marks: z.array(pmMarkSchema).optional(),
  }),
);

// ---------------------------------------------------------------------------
// Derived, never synchronized (§5)
// ---------------------------------------------------------------------------

export interface TaskIndexEntry {
  noteId: Uuid;
  taskId: Uuid;
  blockId: Uuid;
  text: string;
  state: TaskState;
  scheduled: DateOnly | null;
  deadline: DateOnly | null;
}

export interface NoteLinkRef {
  /** Linking note. */
  fromNoteId: Uuid;
  /** Linked note. */
  toNoteId: Uuid;
  blockId: Uuid | null;
  label: string;
}
