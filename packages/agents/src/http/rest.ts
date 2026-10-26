/**
 * REST API for agents without MCP: the same operations as the MCP tools,
 * under /v1/agent/*, authenticated with a static agent token or an OAuth
 * access token (`Authorization: Bearer …`).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import type * as z from "zod/v4";
import type { AgentsContext } from "../context.js";
import { AgentError } from "../errors.js";
import { sendError, type AgentsRuntime } from "../plugin.js";
import type { Principal } from "../service/access.js";
import * as S from "../service/schemas.js";
import { audited, targetOf } from "./audit.js";

const NUMERIC = new Set(["limit", "offset", "scale"]);

/** Query strings carry only strings: convert the known numeric/boolean fields before validation. */
function coerceQuery(q: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(q)) {
    if (typeof v !== "string") out[k] = v;
    else if (NUMERIC.has(k) && /^\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
    else if (k === "includeImages") out[k] = v === "true" || v === "1";
    else if (k === "folderId" && v === "null") out[k] = null;
    else out[k] = v;
  }
  return out;
}

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const issue = r.error.issues[0]!;
    throw new AgentError("bad_request", `Invalid ${issue.path.join(".") || "input"}: ${issue.message}.`);
  }
  return r.data;
}

export function registerRestRoutes(app: FastifyInstance, ctx: AgentsContext, rt: AgentsRuntime): void {
  const svc = rt.service;

  type Handler = (p: Principal, req: FastifyRequest) => Promise<unknown>;
  const route = (method: "GET" | "POST" | "PATCH" | "DELETE", url: string, action: string, input: (req: FastifyRequest) => unknown, run: Handler, raw?: "png") => {
    app.route({
      method,
      url,
      handler: async (request, reply) => {
        try {
          const { principal } = await rt.authenticate(request, "rest");
          rt.limit(principal);
          const args = input(request);
          const result = await audited(ctx, principal, action, targetOf(args), () => run(principal, request));
          if (raw === "png") {
            const r = result as { png: Buffer; description: string };
            return reply.header("content-type", "image/png").header("x-handwriting-description", encodeURIComponent(r.description)).send(r.png);
          }
          return reply.header("cache-control", "no-store").send(result);
        } catch (err) {
          if (err instanceof AgentError && err.code === "unauthorized") reply.header("www-authenticate", `Bearer error="invalid_token"`);
          return sendError(reply, err);
        }
      },
    });
  };
  const params = (req: FastifyRequest) => req.params as Record<string, string>;
  const query = (req: FastifyRequest) => coerceQuery(req.query as Record<string, unknown>);
  const body = (req: FastifyRequest) => (req.body ?? {}) as Record<string, unknown>;

  route("GET", "/v1/agent/spaces", "list_spaces", () => ({}), (p) => svc.listSpaces(p));
  route("GET", "/v1/agent/notebooks", "list_notebooks", () => ({}), (p) => svc.listNotebooks(p));
  route(
    "GET",
    "/v1/agent/notebooks/:notebookId/notes",
    "list_notes",
    (r) => ({ ...query(r), notebookId: params(r).notebookId }),
    (p, r) => svc.listNotes(p, parse(S.listNotesInput, { ...query(r), notebookId: params(r).notebookId })),
  );
  route("GET", "/v1/agent/search", "search_notes", query, (p, r) => svc.searchNotes(p, parse(S.searchNotesInput, { query: "", ...query(r) })));
  route(
    "GET",
    "/v1/agent/notes/:noteId",
    "read_note",
    (r) => params(r),
    async (p, r) => {
      const res = await svc.readNote(p, parse(S.readNoteInput, { noteId: params(r).noteId, includeImages: false }));
      return {
        note: res.note,
        markdown: res.markdown,
        handwriting: res.handwriting.map((h) => ({ ...h, imageUrl: `/v1/agent/notes/${res.note.id}/handwriting/${h.id}.png` })),
        comments: res.comments,
      };
    },
  );
  route(
    "GET",
    "/v1/agent/notes/:noteId/handwriting/:file",
    "get_handwriting_image",
    (r) => params(r),
    (p, r) =>
      svc.getHandwritingImage(
        p,
        parse(S.handwritingImageInput, { noteId: params(r).noteId, handwritingId: params(r).file!.replace(/\.png$/, ""), ...query(r) }),
      ),
    "png",
  );
  route("GET", "/v1/agent/notes/:noteId/backlinks", "get_backlinks", (r) => params(r), (p, r) => svc.getBacklinks(p, parse(S.backlinksInput, params(r))));
  route("GET", "/v1/agent/tasks", "list_tasks", query, (p, r) => svc.listTasks(p, parse(S.listTasksInput, query(r))));
  route("POST", "/v1/agent/notes", "create_note", body, (p, r) => svc.createNote(p, parse(S.createNoteInput, body(r))));
  route(
    "POST",
    "/v1/agent/notes/:noteId/edit",
    "edit_note",
    (r) => params(r),
    (p, r) => svc.editNote(p, parse(S.editNoteInput, { ...body(r), noteId: params(r).noteId })),
  );
  route(
    "POST",
    "/v1/agent/notes/:noteId/comments",
    "add_comment",
    (r) => params(r),
    (p, r) => svc.addComment(p, parse(S.addCommentInput, { ...body(r), noteId: params(r).noteId })),
  );
  route("POST", "/v1/agent/folders", "create_folder", body, (p, r) => svc.createFolder(p, parse(S.createFolderInput, body(r))));
  route(
    "PATCH",
    "/v1/agent/folders/:folderId",
    "rename_folder",
    (r) => ({ ...body(r), folderId: params(r).folderId }),
    (p, r) => svc.renameFolder(p, parse(S.renameFolderInput, { ...body(r), folderId: params(r).folderId })),
  );
  route(
    "POST",
    "/v1/agent/folders/:folderId/move",
    "move_folder",
    (r) => ({ ...body(r), folderId: params(r).folderId }),
    (p, r) => svc.moveFolder(p, parse(S.moveFolderInput, { ...body(r), folderId: params(r).folderId })),
  );
  route(
    "DELETE",
    "/v1/agent/folders/:folderId",
    "delete_folder",
    (r) => ({ ...query(r), folderId: params(r).folderId }),
    (p, r) => svc.deleteFolder(p, parse(S.deleteFolderInput, { ...query(r), folderId: params(r).folderId })),
  );
  route(
    "POST",
    "/v1/agent/notes/:noteId/move",
    "move_note",
    (r) => ({ ...body(r), noteId: params(r).noteId }),
    (p, r) => svc.moveNote(p, parse(S.moveNoteInput, { ...body(r), noteId: params(r).noteId })),
  );
  route(
    "PATCH",
    "/v1/agent/tasks/:taskId",
    "update_task",
    (r) => ({ ...body(r), taskId: params(r).taskId }),
    (p, r) => svc.updateTask(p, parse(S.updateTaskInput, { ...body(r), taskId: params(r).taskId })),
  );
}
