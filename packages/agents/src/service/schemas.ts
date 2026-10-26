/**
 * Input schemas of agent operations, shared by MCP tools and REST
 * (`/v1/agent/*`). Descriptions are written for models.
 */
import * as z from "zod/v4";

/** The Markdown dialect agents write (create_note, edit_note) and read (read_note). */
export const MARKDOWN_DIALECT =
  "Body in Markdown: headings (#..###); lists; task lists (- [ ] open, - [x] done, - [-] cancelled; optional ⏳ YYYY-MM-DD scheduled and 📅 YYYY-MM-DD deadline at the end); > quotes; " +
  "callouts > [!note|info|success|warning|danger] optional-emoji (Obsidian names map to the closest tone: tip/hint/done→success, important/abstract/todo/question→info, caution/attention→warning, error/failure/bug→danger, example/quote→note); " +
  "tables; ``` code ```; $$ LaTeX $$ blocks (verbatim); ```mermaid; [[Note title]] links; #tags; ==highlight==; <u>underline</u>. " +
  "A line break inside a paragraph is kept as a line break. Backslash-escape characters you want literally (\\# \\* \\_ \\` \\[ \\=\\=); read_note escapes them the same way.";

const id = z.string().regex(/^[0-9a-f-]{36}$/, "must be a UUID");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const listNotesInput = z.object({
  notebookId: id.describe("Notebook to list (from list_notebooks)."),
  folderId: id.nullable().optional().describe("Only notes directly in this folder; null = notebook root. Omit for all notes."),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export const searchNotesInput = z.object({
  query: z.string().max(500).describe("Words to find (all must match, case-insensitive). Empty string lists recently updated notes."),
  notebookId: id.optional().describe("Limit the search to one notebook."),
  tag: z.string().optional().describe("Only notes with this tag (without #)."),
  limit: z.number().int().min(1).max(50).default(10),
});

export const readNoteInput = z.object({
  noteId: id,
  includeImages: z
    .boolean()
    .default(true)
    .describe("Attach handwriting images (PNG) to the result. Each handwritten fragment is also referenced in the Markdown as ![✍️ …](handwriting:<id>)."),
});

export const handwritingImageInput = z.object({
  noteId: id,
  handwritingId: z.string().describe("Id from a ![✍️ …](handwriting:<id>) link in read_note output."),
  scale: z.number().min(1).max(4).default(2).describe("Pixels per point."),
});

export const createNoteInput = z.object({
  notebookId: id,
  title: z.string().min(1).max(300),
  markdown: z
    .string()
    .max(200_000)
    .default("")
    .describe(MARKDOWN_DIALECT),
  folderId: id.nullable().optional(),
});

const position = z.union([
  z.object({ after: id.describe("Insert after this block.") }),
  z.object({ before: id.describe("Insert before this block.") }),
  z.object({ at: z.enum(["start", "end"]).describe("Start (right after the title) or end of the note.") }),
]);

export const editOperation = z.discriminatedUnion("op", [
  z.object({ op: z.literal("insert"), position, markdown: z.string().min(1).max(100_000) }),
  z.object({ op: z.literal("replace"), blockId: id, markdown: z.string().min(1).max(100_000) }),
  z.object({ op: z.literal("delete"), blockId: id }),
  z.object({ op: z.literal("move"), blockId: id, position }),
  z.object({
    op: z.literal("replace_text"),
    blockId: id,
    find: z.string().max(10_000).describe("Plain text to find inside the block (no Markdown). Empty string appends `replace` at the end of the block."),
    replace: z.string().max(10_000),
    occurrence: z.number().int().min(1).optional().describe("Which match to change when the text occurs several times (1-based)."),
  }),
]);

export const editNoteInput = z.object({
  noteId: id,
  operations: z
    .array(editOperation)
    .min(1)
    .max(100)
    .describe("Applied in order and atomically: if one fails, nothing changes. Block ids come from <!-- block:ID --> markers in read_note output."),
});

export const addCommentInput = z.object({
  noteId: id,
  blockId: id.describe("Block the comment belongs to."),
  quote: z.string().max(2000).optional().describe("Exact plain text inside the block to attach the comment to. Omit to comment on the whole block."),
  text: z.string().min(1).max(10_000),
});

export const backlinksInput = z.object({ noteId: id });

export const listTasksInput = z.object({
  state: z.enum(["open", "done", "cancelled", "all"]).default("open"),
  notebookId: id.optional(),
  scheduledFrom: date.optional().describe("Only tasks scheduled on or after this date."),
  scheduledTo: date.optional().describe("Only tasks scheduled on or before this date."),
  deadlineBefore: date.optional().describe("Only tasks with a deadline on or before this date."),
  limit: z.number().int().min(1).max(500).default(100),
});

export const updateTaskInput = z.object({
  taskId: id,
  noteId: id.optional().describe("Note containing the task (speeds up the lookup)."),
  state: z.enum(["open", "done", "cancelled"]).optional(),
  scheduled: date.nullable().optional().describe("Scheduled date; null clears it."),
  deadline: date.nullable().optional().describe("Deadline; null clears it."),
});

export type ListNotesInput = z.infer<typeof listNotesInput>;
export type SearchNotesInput = z.infer<typeof searchNotesInput>;
export type ReadNoteInput = z.infer<typeof readNoteInput>;
export type HandwritingImageInput = z.infer<typeof handwritingImageInput>;
export type CreateNoteInput = z.infer<typeof createNoteInput>;
export type EditNoteInput = z.infer<typeof editNoteInput>;
export type AddCommentInput = z.infer<typeof addCommentInput>;
export type BacklinksInput = z.infer<typeof backlinksInput>;
export type ListTasksInput = z.infer<typeof listTasksInput>;
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;
