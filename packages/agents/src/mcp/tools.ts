/**
 * MCP tools — a thin adapter over AgentService (R-13). One McpServer is
 * built per HTTP request for the authenticated principal.
 */
import { McpServer, type CallToolResult, type ScopeChallengeHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { AgentsContext } from "../context.js";
import { SCOPE_READ, SCOPE_WRITE } from "../auth/grants.js";
import { toAgentError } from "../errors.js";
import { audited, targetOf } from "../http/audit.js";
import type { Principal } from "../service/access.js";
import type { AgentService } from "../service/agent-service.js";
import * as S from "../service/schemas.js";

export const SERVER_INSTRUCTIONS = `Datascratch is a notes app with Apple Pencil handwriting inside the text.
You can access only notebooks the user switched to "for agents" mode and granted to you.
Workflow: list_notebooks or search_notes → read_note (Markdown; every block has a <!-- block:ID --> marker) → edit_note with those block ids.
Handwriting appears as ![✍️ description](handwriting:ID) with attached images; call get_handwriting_image for a closer look.
Your edits apply immediately, are highlighted for the user and can be undone from version history. Prefer small, targeted edits (replace_text, insert) over replacing whole blocks: untouched text keeps the user's handwritten marks.
Organise with folders (create_folder, nested via parentFolderId; rename_folder, move_folder, delete_folder) and move_note, also between your notebooks. You cannot create notebooks: they are end-to-end encrypted with the user's master key — ask the user to create one in the app and switch it to "for agents" mode.`;

function json(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function failure(err: unknown): CallToolResult {
  const e = toAgentError(err);
  return { isError: true, content: [{ type: "text", text: `${e.code}: ${e.message}` }] };
}

/** OAuth clients with a read-only grant get a 403 scope challenge (step-up to notes:write). */
const writeChallenge: ScopeChallengeHandler = ({ authInfo }) => {
  if (!authInfo || authInfo.extra?.kind !== "oauth" || authInfo.scopes.includes(SCOPE_WRITE)) return undefined;
  return { scopes: [SCOPE_READ, SCOPE_WRITE], errorDescription: "Write access to notes is required" };
};

const READ = { readOnlyHint: true, openWorldHint: false } as const;

export function buildMcpServer(ctx: AgentsContext, service: AgentService, p: Principal, version: string): McpServer {
  const server = new McpServer({ name: "datascratch", title: "Datascratch", version }, { instructions: SERVER_INSTRUCTIONS });

  const tool = <A extends z.ZodType>(
    name: string,
    config: { title: string; description: string; inputSchema: A; write?: boolean; destructive?: boolean },
    run: (args: z.infer<A>) => Promise<CallToolResult>,
  ) => {
    server.registerTool(
      name,
      {
        title: config.title,
        description: config.description,
        inputSchema: config.inputSchema,
        annotations: config.write ? { readOnlyHint: false, destructiveHint: config.destructive ?? false, openWorldHint: false } : READ,
        ...(config.write ? { scopeChallenge: writeChallenge } : {}),
      },
      (async (args: z.infer<A>) => {
        try {
          return await audited(ctx, p, name, targetOf(args), () => run(args));
        } catch (err) {
          return failure(err);
        }
      }) as never,
    );
  };

  tool("list_spaces", { title: "List spaces", description: "Spaces (top-level groups) with the notebooks available to you.", inputSchema: z.object({}) }, async () =>
    json(await service.listSpaces(p)),
  );

  tool(
    "list_notebooks",
    { title: "List notebooks", description: "Notebooks available to you with their folders (nested: parentId, path), note counts and your permission (read or read_write). Agents cannot create notebooks (end-to-end encrypted with the user's master key): use folders inside these notebooks instead.", inputSchema: z.object({}) },
    async () => json(await service.listNotebooks(p)),
  );

  tool("list_notes", { title: "List notes", description: "Notes of a notebook (optionally one folder), most recently updated first.", inputSchema: S.listNotesInput }, async (a) =>
    json(await service.listNotes(p, a)),
  );

  tool(
    "search_notes",
    { title: "Search notes", description: "Full-text search over titles, text and tags of available notes. Returns note ids with snippets.", inputSchema: S.searchNotesInput },
    async (a) => json(await service.searchNotes(p, a)),
  );

  tool(
    "read_note",
    {
      title: "Read note",
      description:
        "Note content as Markdown. Each block is followed by <!-- block:ID --> (tasks: <!-- block:ID task:TASK_ID -->) for edit_note. Handwriting is shown as ![✍️ what it marks](handwriting:ID) with the images attached.",
      inputSchema: S.readNoteInput,
    },
    async (a) => {
      const r = await service.readNote(p, a);
      const header = [
        `# ${r.note.title}`,
        `noteId: ${r.note.id} · notebook: ${r.note.notebookName}${r.note.folderPath.length ? " / " + r.note.folderPath.join(" / ") : ""}${r.note.tags.length ? " · tags: " + r.note.tags.map((t) => "#" + t).join(" ") : ""}${r.note.updatedAt ? " · updated: " + r.note.updatedAt : ""}`,
        "",
      ].join("\n");
      const comments = r.comments.length
        ? "\n\n---\nComments:\n" + r.comments.map((c) => `- [block:${c.blockId}] ${c.author}: ${c.text}`).join("\n")
        : "";
      const content: CallToolResult["content"] = [{ type: "text", text: header + r.markdown + comments }];
      for (const img of r.images) {
        const h = r.handwriting.find((x) => x.id === img.handwritingId);
        content.push({ type: "text", text: `handwriting:${img.handwritingId} — ${h?.description ?? ""}` });
        content.push({ type: "image", data: img.png.toString("base64"), mimeType: "image/png" });
      }
      return { content };
    },
  );

  tool(
    "get_handwriting_image",
    { title: "Handwriting image", description: "PNG of a handwritten fragment with the surrounding text, by the id from a handwriting:ID link.", inputSchema: S.handwritingImageInput },
    async (a) => {
      const r = await service.getHandwritingImage(p, a);
      return {
        content: [
          { type: "text", text: `${r.description} (${r.kind}${r.blockId ? `, block ${r.blockId}` : ""})` },
          { type: "image", data: r.png.toString("base64"), mimeType: "image/png" },
        ],
      };
    },
  );

  tool(
    "get_backlinks",
    { title: "Backlinks", description: "Notes that link to this note ([[ ]] links and embedded note cards), plus this note's outgoing links.", inputSchema: S.backlinksInput },
    async (a) => json(await service.getBacklinks(p, a)),
  );

  tool(
    "list_tasks",
    { title: "List tasks", description: "Tasks (checkboxes) from all available notes with scheduled dates and deadlines.", inputSchema: S.listTasksInput },
    async (a) => json(await service.listTasks(p, a)),
  );

  tool(
    "create_note",
    { title: "Create note", description: "Creates a note from Markdown in a notebook (and optionally a folder). Requires read_write access.", inputSchema: S.createNoteInput, write: true },
    async (a) => json(await service.createNote(p, a)),
  );

  tool(
    "edit_note",
    {
      title: "Edit note",
      description:
        "Point edits by block id: insert Markdown before/after a block or at start/end, replace a block, delete, move, or replace_text inside a block (keeps handwriting on untouched text). Operations are atomic. Requires read_write access.",
      inputSchema: S.editNoteInput,
      write: true,
      destructive: true,
    },
    async (a) => json(await service.editNote(p, a)),
  );

  tool(
    "add_comment",
    { title: "Add comment", description: "Adds a comment to a block, optionally anchored to an exact quote inside it. Requires read_write access.", inputSchema: S.addCommentInput, write: true },
    async (a) => json(await service.addComment(p, a)),
  );

  tool(
    "update_task",
    { title: "Update task", description: "Marks a task done/open/cancelled or changes its scheduled date or deadline. Requires read_write access.", inputSchema: S.updateTaskInput, write: true },
    async (a) => json(await service.updateTask(p, a)),
  );

  tool(
    "create_folder",
    {
      title: "Create folder",
      description:
        "Creates a folder in a notebook, nested inside parentFolderId when given (folders nest to any depth). Use it to organise notes; notebooks themselves cannot be created by agents. Requires read_write access.",
      inputSchema: S.createFolderInput,
      write: true,
    },
    async (a) => json(await service.createFolder(p, a)),
  );

  tool(
    "rename_folder",
    { title: "Rename folder", description: "Renames a folder and optionally changes its emoji. Requires read_write access.", inputSchema: S.renameFolderInput, write: true },
    async (a) => json(await service.renameFolder(p, a)),
  );

  tool(
    "move_folder",
    {
      title: "Move folder",
      description: "Moves a folder (with everything inside) under another folder of the same notebook or to the notebook root. Requires read_write access.",
      inputSchema: S.moveFolderInput,
      write: true,
    },
    async (a) => json(await service.moveFolder(p, a)),
  );

  tool(
    "delete_folder",
    {
      title: "Delete folder",
      description:
        "Deletes a folder. By default only an empty one; with contents: \"move_to_parent\" its notes and subfolders move to the parent folder first. Never deletes notes. Requires read_write access.",
      inputSchema: S.deleteFolderInput,
      write: true,
      destructive: true,
    },
    async (a) => json(await service.deleteFolder(p, a)),
  );

  tool(
    "move_note",
    {
      title: "Move note",
      description:
        "Moves a note to a folder (null = root), in the same notebook or — with notebookId — in another notebook available to you. The note keeps its content, history, handwriting and attachments. Requires read_write access.",
      inputSchema: S.moveNoteInput,
      write: true,
    },
    async (a) => json(await service.moveNote(p, a)),
  );

  return server;
}
