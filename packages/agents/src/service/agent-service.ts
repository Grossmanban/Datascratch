/**
 * The service layer shared by MCP tools and the agent REST API (R-13: MCP
 * stays a thin adapter). Every method checks access: only agent-mode
 * notebooks (D-04) that the grant lists, write operations only with
 * `read_write`.
 */
import * as Y from "yjs";
import type { AgentEditOrigin, AgentNotebook, AgentsContext } from "../context.js";
import { applyEdits, initNoteContent } from "../doc/edits.js";
import { collectHandwriting, findHandwriting, type HandwritingItem } from "../doc/handwriting.js";
import { noteToMarkdown } from "../doc/markdown-export.js";
import {
  deleteFolder,
  deleteNoteMeta,
  folderSubtree,
  getFolders,
  getNoteMeta,
  getNoteMetas,
  getTitle,
  patchFolder,
  patchNoteMeta,
  putFolder,
  putNoteMeta,
  type Folder,
} from "@datascratch/shared/document";
import { blockIdOf, childElements, contentOf, findBlock, TEXT_BLOCKS, walkBlocks } from "../doc/model.js";
import { AgentError } from "../errors.js";
import { renderHandwriting, type RenderedImage } from "../render/handwriting-png.js";
import { base64url, uuidv7 } from "../util.js";
import { requireWrite, type Principal } from "./access.js";
import { mergeNotebookMeta, readNotebookMeta, type NotebookDocMeta } from "./notebook-meta.js";
import { buildNoteIndex, matchNote, NoteIndexCache, searchTerms, type NoteIndex, type TaskInfo } from "./note-index.js";
import {
  NO_NOTEBOOKS_HINT,
  type AddCommentInput,
  type BacklinksInput,
  type CreateFolderInput,
  type CreateNoteInput,
  type DeleteFolderInput,
  type EditNoteInput,
  type HandwritingImageInput,
  type ListNotesInput,
  type ListTasksInput,
  type MoveFolderInput,
  type MoveNoteInput,
  type ReadNoteInput,
  type RenameFolderInput,
  type SearchNotesInput,
  type UpdateTaskInput,
} from "./schemas.js";

interface NoteMetaView {
  id: string;
  folderId: string | null;
  title: string;
  kind: string;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  trashedAt: string | null;
}

interface FolderView {
  id: string;
  parentId: string | null;
  name: string;
  icon: string | null;
}

/** A granted notebook whose document could not be loaded: listed, never silently dropped. */
interface UnavailableNotebook {
  info: AgentNotebook & { name: string };
  reason: string;
}

interface NotebookView {
  /** Updates of the notebook index the server had to skip (partly readable notebook). */
  skippedUpdates: number;
  info: AgentNotebook;
  name: string;
  doc: Y.Doc;
  notes: Map<string, NoteMetaView>;
  folders: Map<string, FolderView>;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function readNotebookDoc(doc: Y.Doc): { meta: NotebookDocMeta; notes: Map<string, NoteMetaView>; folders: Map<string, FolderView> } {
  const notes = new Map<string, NoteMetaView>();
  doc.getMap("notes").forEach((raw, id) => {
    if (!(raw instanceof Y.Map)) return;
    notes.set(id, {
      id,
      folderId: str(raw.get("folderId")),
      title: str(raw.get("title")) ?? "",
      kind: str(raw.get("kind")) ?? "note",
      tags: Array.isArray(raw.get("tags")) ? (raw.get("tags") as string[]) : [],
      createdAt: str(raw.get("createdAt")),
      updatedAt: str(raw.get("updatedAt")),
      trashedAt: str(raw.get("trashedAt")),
    });
  });
  const folders = new Map<string, FolderView>();
  doc.getMap("folders").forEach((raw, id) => {
    if (!(raw instanceof Y.Map)) return;
    folders.set(id, { id, parentId: str(raw.get("parentId")), name: str(raw.get("name")) ?? "", icon: str(raw.get("icon")) });
  });
  return { meta: readNotebookMeta(doc), notes, folders };
}

/** Null attributes are not stored (y-prosemirror convention, document-model.md §4.1). */
function setOrRemove(el: Y.XmlElement, name: string, value: string | null): void {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/** Order value that puts a new item after its siblings. */
function nextOrder(items: { order: number }[]): number {
  return items.reduce((max, i) => Math.max(max, typeof i.order === "number" ? i.order : 0), 0) + 1;
}

function folderPath(nb: NotebookView, folderId: string | null): string[] {
  const out: string[] = [];
  let cur = folderId ? nb.folders.get(folderId) : undefined;
  for (let guard = 0; cur && guard < 64; guard++) {
    out.unshift(cur.name);
    cur = cur.parentId ? nb.folders.get(cur.parentId) : undefined;
  }
  return out;
}

export interface ServiceOptions {
  /** Max handwriting images attached by read_note. */
  maxImagesPerRead?: number;
  imageCacheSize?: number;
}

export interface ReadNoteResult {
  note: NoteSummary & { notebookName: string; folderPath: string[] };
  markdown: string;
  handwriting: { id: string; kind: HandwritingItem["kind"]; blockId: string | null; description: string }[];
  comments: { id: string; blockId: string; author: string; text: string; createdAt: string; quote: string | null }[];
  images: { handwritingId: string; png: Buffer }[];
}

export interface NoteSummary {
  id: string;
  title: string;
  notebookId: string;
  folderId: string | null;
  tags: string[];
  updatedAt: string | null;
}

export class AgentService {
  private readonly index = new NoteIndexCache();
  private readonly images = new Map<string, RenderedImage>();
  private readonly now: () => Date;

  constructor(
    private readonly ctx: AgentsContext,
    private readonly options: ServiceOptions = {},
  ) {
    this.now = ctx.now ?? (() => new Date());
  }

  // -------------------------------------------------------------------------
  // Access
  // -------------------------------------------------------------------------

  /** Agent-mode notebooks the grant may use, loaded. Private or unlisted notebooks never appear. */
  /** Granted agent-mode notebooks, loaded; the ones that fail to load are reported, not dropped. */
  private async notebookStates(p: Principal, only?: string): Promise<{ views: NotebookView[]; unavailable: UnavailableNotebook[] }> {
    const all = await this.ctx.data.listAgentNotebooks(p.grant.userId, p.grant.id);
    const allowed = all.filter((n) => p.grant.notebookIds.includes(n.id) && (!only || n.id === only));
    if (only && allowed.length === 0)
      throw new AgentError("not_found", `Notebook ${only} is not available to this agent. Call list_notebooks to see the notebooks you can access.`);
    const views: NotebookView[] = [];
    const unavailable: UnavailableNotebook[] = [];
    for (const info of allowed) {
      let loaded: Awaited<ReturnType<typeof this.ctx.data.loadDoc>>;
      try {
        loaded = await this.ctx.data.loadDoc(p.grant.userId, info.id, p.grant.id);
      } catch {
        loaded = null;
      }
      if (!loaded) {
        unavailable.push({
          info: mergeNotebookMeta(info, { name: null, icon: null, color: null, space: null }),
          reason: "The server could not decrypt or load this notebook. Tell the user: the notebook is in “for agents” mode, but its data is not readable right now; reopening it in the app usually re-syncs it.",
        });
        continue;
      }
      const parsed = readNotebookDoc(loaded.doc);
      const merged = mergeNotebookMeta(info, parsed.meta);
      views.push({ info: merged, name: merged.name, doc: loaded.doc, notes: parsed.notes, folders: parsed.folders, skippedUpdates: loaded.skipped?.length ?? 0 });
    }
    return { views, unavailable };
  }

  private async notebooks(p: Principal, only?: string): Promise<NotebookView[]> {
    const { views, unavailable } = await this.notebookStates(p, only);
    if (only && views.length === 0 && unavailable[0]) throw new AgentError("conflict", `Notebook ${only} is temporarily unavailable. ${unavailable[0].reason}`);
    return views;
  }

  private async locate(p: Principal, noteId: string): Promise<{ nb: NotebookView; meta: NoteMetaView }> {
    const { views, unavailable } = await this.notebookStates(p);
    for (const nb of views) {
      const meta = nb.notes.get(noteId);
      if (meta && !meta.trashedAt) return { nb, meta };
    }
    const hint = unavailable.length
      ? ` ${unavailable.length} granted notebook(s) are temporarily unavailable (${unavailable.map((u) => u.info.id).join(", ")}): the note may be there. ${unavailable[0]!.reason}`
      : "";
    throw new AgentError("not_found", `Note ${noteId} not found or not available to this agent. Use search_notes or list_notes to find notes.${hint}`);
  }

  private async loadNote(p: Principal, noteId: string): Promise<{ doc: Y.Doc; seq: number }> {
    const loaded = await this.ctx.data.loadDoc(p.grant.userId, noteId, p.grant.id);
    if (!loaded) throw new AgentError("not_found", `Note ${noteId} content is not available.`);
    return loaded;
  }

  private async noteIndex(p: Principal, noteIds: string[]): Promise<Map<string, NoteIndex>> {
    const out = new Map<string, NoteIndex>();
    const seqs = this.ctx.data.docSeqs ? await this.ctx.data.docSeqs(p.grant.userId, noteIds, p.grant.id) : null;
    for (const id of noteIds) {
      const known = seqs?.[id];
      if (known !== undefined) {
        const hit = this.index.get(`${p.grant.userId}:${id}`, known);
        if (hit) {
          out.set(id, hit);
          continue;
        }
      }
      const loaded = await this.ctx.data.loadDoc(p.grant.userId, id, p.grant.id);
      if (!loaded) continue;
      const cached = this.index.get(`${p.grant.userId}:${id}`, loaded.seq);
      const idx = cached ?? buildNoteIndex(id, loaded.seq, loaded.doc);
      if (!cached) this.index.set(`${p.grant.userId}:${id}`, idx);
      out.set(id, idx);
    }
    return out;
  }

  private origin(p: Principal, action: string): AgentEditOrigin {
    return { kind: "agent", grantId: p.grant.id, userId: p.grant.userId, agentName: p.agentName, action };
  }

  /** Runs `mutate` on a fresh copy of the doc and sends only the resulting update. */
  private async mutate<T>(p: Principal, docId: string, action: string, mutate: (doc: Y.Doc) => T, existing?: { doc: Y.Doc }): Promise<{ result: T; seq: number }> {
    const doc = existing?.doc ?? (await this.loadNote(p, docId)).doc;
    const before = Y.encodeStateVector(doc);
    const result = mutate(doc);
    const update = Y.encodeStateAsUpdate(doc, before);
    if (update.byteLength <= 2) return { result, seq: -1 };
    const { seq } = await this.ctx.data.applyUpdate(p.grant.userId, docId, update, this.origin(p, action));
    return { result, seq };
  }

  /** Bumps NoteMeta.updatedAt (and title/tags when given) in the notebook index. */
  private async touchMeta(p: Principal, nb: NotebookView, noteId: string, action: string, patch: { title?: string; tags?: string[] } = {}): Promise<void> {
    await this.mutate(
      p,
      nb.info.id,
      action,
      (doc) => {
        const m = doc.getMap("notes").get(noteId);
        if (!(m instanceof Y.Map)) return;
        doc.transact(() => {
          m.set("updatedAt", this.now().toISOString());
          if (patch.title !== undefined && m.get("title") !== patch.title) m.set("title", patch.title);
          if (patch.tags && JSON.stringify(m.get("tags")) !== JSON.stringify(patch.tags)) m.set("tags", patch.tags);
        });
      },
      { doc: nb.doc },
    );
  }

  private resolver(views: NotebookView[]): (label: string) => string | null {
    const byTitle = new Map<string, string>();
    for (const nb of views) for (const n of nb.notes.values()) if (!n.trashedAt && n.title) byTitle.set(n.title.toLowerCase(), n.id);
    return (label) => byTitle.get(label.trim().toLowerCase()) ?? null;
  }

  private summary(nb: NotebookView, m: NoteMetaView): NoteSummary {
    return { id: m.id, title: m.title, notebookId: nb.info.id, folderId: m.folderId, tags: m.tags, updatedAt: m.updatedAt };
  }

  // -------------------------------------------------------------------------
  // Read operations
  // -------------------------------------------------------------------------

  async listSpaces(p: Principal) {
    const { views: loaded, unavailable } = await this.notebookStates(p);
    const views = [...loaded.map((v) => ({ info: v.info, name: v.name })), ...unavailable.map((u) => ({ info: u.info, name: u.info.name }))];
    const spaces = new Map<string, { id: string | null; name: string; icon: string | null; notebooks: { id: string; name: string }[] }>();
    for (const nb of views) {
      const s = nb.info.space;
      const key = s?.id ?? "";
      const entry = spaces.get(key) ?? { id: s?.id ?? null, name: s?.name ?? "Без пространства", icon: s?.icon ?? null, notebooks: [] };
      entry.notebooks.push({ id: nb.info.id, name: nb.name });
      spaces.set(key, entry);
    }
    return { spaces: [...spaces.values()] };
  }

  async listNotebooks(p: Principal) {
    const { views, unavailable } = await this.notebookStates(p);
    return {
      notebooks: [
        ...views.map((nb) => ({
          id: nb.info.id,
          name: nb.name,
          icon: nb.info.icon,
          space: nb.info.space ? { id: nb.info.space.id, name: nb.info.space.name } : null,
          permission: p.grant.permission,
          noteCount: [...nb.notes.values()].filter((n) => !n.trashedAt).length,
          folders: [...nb.folders.values()].map((f) => ({ id: f.id, parentId: f.parentId, name: f.name, icon: f.icon, path: folderPath(nb, f.id).join(" / ") })),
          ...(nb.skippedUpdates
            ? { warning: `${nb.skippedUpdates} recent change(s) of this notebook could not be read by the server and are not shown.` }
            : {}),
        })),
        ...unavailable.map((u) => ({
          id: u.info.id,
          name: u.info.name,
          icon: u.info.icon,
          space: u.info.space ? { id: u.info.space.id, name: u.info.space.name } : null,
          permission: p.grant.permission,
          unavailable: true as const,
          reason: u.reason,
        })),
      ],
      hint: NO_NOTEBOOKS_HINT,
    };
  }

  async listNotes(p: Principal, input: ListNotesInput) {
    const [nb] = await this.notebooks(p, input.notebookId);
    const notes = [...nb!.notes.values()]
      .filter((n) => !n.trashedAt && (input.folderId === undefined || n.folderId === input.folderId))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return {
      total: notes.length,
      notes: notes.slice(input.offset, input.offset + input.limit).map((m) => ({ ...this.summary(nb!, m), folderPath: folderPath(nb!, m.folderId) })),
    };
  }

  async searchNotes(p: Principal, input: SearchNotesInput) {
    const views = input.notebookId ? await this.notebooks(p, input.notebookId) : await this.notebooks(p);
    const metas = views.flatMap((nb) => [...nb.notes.values()].filter((n) => !n.trashedAt).map((m) => ({ nb, m })));
    const terms = searchTerms(input.query);
    const idx = await this.noteIndex(p, metas.map((x) => x.m.id));
    const hits: { nb: NotebookView; m: NoteMetaView; score: number; snippet: string }[] = [];
    for (const { nb, m } of metas) {
      const i = idx.get(m.id);
      if (!i) continue;
      if (input.tag && !i.tags.includes(input.tag.replace(/^#/, "")) && !m.tags.includes(input.tag.replace(/^#/, ""))) continue;
      const hit = matchNote(i, terms);
      if (hit) hits.push({ nb, m, ...hit });
    }
    hits.sort((a, b) => b.score - a.score || (b.m.updatedAt ?? "").localeCompare(a.m.updatedAt ?? ""));
    return {
      total: hits.length,
      results: hits.slice(0, input.limit).map((h) => ({ ...this.summary(h.nb, h.m), snippet: h.snippet })),
    };
  }

  async readNote(p: Principal, input: ReadNoteInput): Promise<ReadNoteResult> {
    const { nb, meta } = await this.locate(p, input.noteId);
    const { doc, seq } = await this.loadNote(p, input.noteId);
    const handwriting = collectHandwriting(doc);
    const titles = new Map([...nb.notes.values()].map((n) => [n.id, n.title]));
    const markdown = noteToMarkdown(doc, { handwriting, noteTitle: (id) => titles.get(id) ?? null });
    const comments: ReadNoteResult["comments"] = [];
    doc.getMap("comments").forEach((raw, id) => {
      if (!(raw instanceof Y.Map) || raw.get("resolvedAt")) return;
      const author = raw.get("author") as { kind?: string; name?: string } | undefined;
      comments.push({
        id,
        blockId: String(raw.get("blockId") ?? ""),
        author: author?.name ?? author?.kind ?? "",
        text: String(raw.get("text") ?? ""),
        createdAt: String(raw.get("createdAt") ?? ""),
        quote: (raw.get("quote") as string | undefined) ?? null,
      });
    });
    const images: ReadNoteResult["images"] = [];
    if (input.includeImages) {
      for (const item of handwriting.slice(0, this.options.maxImagesPerRead ?? 6)) {
        const img = await this.image(p, input.noteId, seq, doc, item, 2);
        images.push({ handwritingId: item.id, png: img.png });
      }
    }
    return {
      note: { ...this.summary(nb, meta), title: getTitle(doc) || meta.title, notebookName: nb.name, folderPath: folderPath(nb, meta.folderId) },
      markdown,
      handwriting: handwriting.map((h) => ({ id: h.id, kind: h.kind, blockId: h.blockId, description: h.description })),
      comments,
      images,
    };
  }

  private async image(p: Principal, noteId: string, seq: number, doc: Y.Doc, item: HandwritingItem, scale: number): Promise<RenderedImage> {
    const key = `${p.grant.userId}:${noteId}:${seq}:${item.id}:${scale}`;
    const hit = this.images.get(key);
    if (hit) return hit;
    let attachment: Uint8Array | null = null;
    if (item.kind === "image" && item.blockId && this.ctx.data.loadAttachmentImage) {
      const loc = findBlock(doc, item.blockId);
      const attId = loc?.el.getAttribute("attachmentId");
      if (typeof attId === "string") attachment = await this.ctx.data.loadAttachmentImage(p.grant.userId, attId, p.grant.id);
    }
    const img = await renderHandwriting(doc, item, { scale, image: attachment });
    this.images.set(key, img);
    const max = this.options.imageCacheSize ?? 200;
    while (this.images.size > max) this.images.delete(this.images.keys().next().value!);
    return img;
  }

  async getHandwritingImage(p: Principal, input: HandwritingImageInput) {
    await this.locate(p, input.noteId);
    const { doc, seq } = await this.loadNote(p, input.noteId);
    const item = findHandwriting(collectHandwriting(doc), input.handwritingId);
    if (!item) throw new AgentError("not_found", `Handwriting ${input.handwritingId} not found in note ${input.noteId} (it may have been erased). Call read_note for current ids.`);
    const img = await this.image(p, input.noteId, seq, doc, item, input.scale);
    return { handwritingId: item.id, description: item.description, kind: item.kind, blockId: item.blockId, width: img.width, height: img.height, png: img.png };
  }

  async getBacklinks(p: Principal, input: BacklinksInput) {
    const { meta } = await this.locate(p, input.noteId);
    const views = await this.notebooks(p);
    const metas = views.flatMap((nb) => [...nb.notes.values()].filter((n) => !n.trashedAt).map((m) => ({ nb, m })));
    const idx = await this.noteIndex(p, metas.map((x) => x.m.id));
    const backlinks = [];
    for (const { nb, m } of metas) {
      const i = idx.get(m.id);
      const refs = i?.links.filter((l) => l.noteId === input.noteId) ?? [];
      if (refs.length) backlinks.push({ ...this.summary(nb, m), contexts: refs.map((r) => r.context) });
    }
    const own = idx.get(input.noteId);
    const titles = new Map(metas.map((x) => [x.m.id, x.m.title]));
    return {
      note: { id: meta.id, title: meta.title },
      backlinks,
      outgoing: (own?.links ?? []).map((l) => ({ noteId: l.noteId, title: titles.get(l.noteId) ?? null, label: l.label })),
    };
  }

  async listTasks(p: Principal, input: ListTasksInput) {
    const views = input.notebookId ? await this.notebooks(p, input.notebookId) : await this.notebooks(p);
    const metas = views.flatMap((nb) => [...nb.notes.values()].filter((n) => !n.trashedAt).map((m) => ({ nb, m })));
    const idx = await this.noteIndex(p, metas.map((x) => x.m.id));
    const tasks: (TaskInfo & { noteId: string; noteTitle: string; notebookId: string })[] = [];
    for (const { nb, m } of metas) {
      for (const t of idx.get(m.id)?.tasks ?? []) {
        if (input.state !== "all" && t.state !== input.state) continue;
        if (input.scheduledFrom && (!t.scheduled || t.scheduled < input.scheduledFrom)) continue;
        if (input.scheduledTo && (!t.scheduled || t.scheduled > input.scheduledTo)) continue;
        if (input.deadlineBefore && (!t.deadline || t.deadline > input.deadlineBefore)) continue;
        tasks.push({ ...t, noteId: m.id, noteTitle: m.title, notebookId: nb.info.id });
      }
    }
    tasks.sort((a, b) => (a.deadline ?? a.scheduled ?? "9999").localeCompare(b.deadline ?? b.scheduled ?? "9999"));
    return { total: tasks.length, tasks: tasks.slice(0, input.limit) };
  }

  // -------------------------------------------------------------------------
  // Write operations
  // -------------------------------------------------------------------------

  async createNote(p: Principal, input: CreateNoteInput) {
    requireWrite(p);
    const views = await this.notebooks(p);
    const nb = views.find((v) => v.info.id === input.notebookId);
    if (!nb) throw new AgentError("not_found", `Notebook ${input.notebookId} is not available to this agent. Call list_notebooks.`);
    if (input.folderId && !nb.folders.has(input.folderId)) throw new AgentError("not_found", `Folder ${input.folderId} not found in the notebook.`);
    const noteId = uuidv7(this.now().getTime());
    const { wrappedKey } = await this.ctx.data.createNoteDoc(p.grant.userId, nb.info.id, noteId, p.grant.id);
    const doc = new Y.Doc();
    // D-45: a note created by an agent is marked as a whole in NoteMeta.createdByAgent, not with agentEdit marks.
    initNoteContent(doc, input.title, input.markdown, { agentEdit: null, resolveNoteLink: this.resolver(views) });
    await this.ctx.data.applyUpdate(p.grant.userId, noteId, Y.encodeStateAsUpdate(doc), this.origin(p, "create_note"));
    const index = buildNoteIndex(noteId, 0, doc);
    const at = this.now().toISOString();
    await this.mutate(
      p,
      nb.info.id,
      "create_note",
      (nbDoc) => {
        const m = new Y.Map<unknown>();
        nbDoc.getMap("notes").set(noteId, m);
        const order = nb.notes.size;
        const fields: Record<string, unknown> = {
          id: noteId,
          folderId: input.folderId ?? null,
          parentNoteId: null,
          title: input.title,
          kind: "note",
          dailyDate: null,
          tags: index.tags,
          icon: null,
          coverThumb: null,
          wrappedKey,
          createdAt: at,
          updatedAt: at,
          trashedAt: null,
          order,
          createdByAgent: { agentId: p.grant.id, agentName: p.agentName, at },
        };
        for (const [k, v] of Object.entries(fields)) m.set(k, v);
      },
      { doc: nb.doc },
    );
    return { note: { id: noteId, title: input.title, notebookId: nb.info.id, folderId: input.folderId ?? null }, blocks: this.blockList(doc) };
  }

  // -------------------------------------------------------------------------
  // Organising: folders and moving notes (notebooks themselves are never created by agents)
  // -------------------------------------------------------------------------

  private async findFolder(p: Principal, folderId: string): Promise<{ nb: NotebookView; folder: FolderView }> {
    for (const nb of await this.notebooks(p)) {
      const folder = nb.folders.get(folderId);
      if (folder) return { nb, folder };
    }
    throw new AgentError("not_found", `Folder ${folderId} not found. Call list_notebooks to see the folders of each notebook.`);
  }

  private requireFolder(nb: NotebookView, folderId: string | null): void {
    if (folderId && !nb.folders.has(folderId))
      throw new AgentError("not_found", `Folder ${folderId} is not in notebook “${nb.name}”. Call list_notebooks to see its folders.`);
  }

  /** Two folders with one name side by side are confusing in the app: refuse, name the existing one. */
  private requireUniqueName(nb: NotebookView, parentId: string | null, name: string, except?: string): void {
    const clash = [...nb.folders.values()].find((f) => f.parentId === parentId && f.id !== except && f.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (clash) throw new AgentError("conflict", `A folder named “${clash.name}” already exists here (folderId ${clash.id}). Use it, or choose another name.`);
  }

  private folderOut(nb: NotebookView, f: { id: string; parentId: string | null; name: string; icon: string | null }) {
    return { id: f.id, notebookId: nb.info.id, parentId: f.parentId, name: f.name, icon: f.icon, path: [...folderPath(nb, f.parentId), f.name].join(" / ") };
  }

  async createFolder(p: Principal, input: CreateFolderInput) {
    requireWrite(p);
    const [nb] = await this.notebooks(p, input.notebookId);
    const parentId = input.parentFolderId ?? null;
    this.requireFolder(nb!, parentId);
    this.requireUniqueName(nb!, parentId, input.name);
    const folder: Folder = {
      id: uuidv7(this.now().getTime()),
      parentId,
      name: input.name,
      icon: input.icon ?? null,
      color: null,
      order: nextOrder(getFolders(nb!.doc).filter((f) => f.parentId === parentId)),
      createdAt: this.now().toISOString(),
    };
    await this.mutate(p, nb!.info.id, "create_folder", (doc) => putFolder(doc, folder), { doc: nb!.doc });
    return { folder: this.folderOut(nb!, folder) };
  }

  async renameFolder(p: Principal, input: RenameFolderInput) {
    requireWrite(p);
    const { nb, folder } = await this.findFolder(p, input.folderId);
    this.requireUniqueName(nb, folder.parentId, input.name, folder.id);
    const patch: Partial<Folder> = { name: input.name };
    if (input.icon !== undefined) patch.icon = input.icon;
    await this.mutate(p, nb.info.id, "rename_folder", (doc) => patchFolder(doc, folder.id, patch), { doc: nb.doc });
    return { folder: this.folderOut(nb, { ...folder, name: input.name, icon: input.icon === undefined ? folder.icon : input.icon }) };
  }

  async moveFolder(p: Principal, input: MoveFolderInput) {
    requireWrite(p);
    const { nb, folder } = await this.findFolder(p, input.folderId);
    const parentId = input.parentFolderId;
    this.requireFolder(nb, parentId);
    if (parentId && folderSubtree(nb.doc, folder.id).includes(parentId))
      throw new AgentError("bad_request", `Folder “${folder.name}” cannot be moved into itself or one of its subfolders.`);
    if (folder.parentId !== parentId) {
      this.requireUniqueName(nb, parentId, folder.name, folder.id);
      const order = nextOrder(getFolders(nb.doc).filter((f) => f.parentId === parentId));
      await this.mutate(p, nb.info.id, "move_folder", (doc) => patchFolder(doc, folder.id, { parentId, order }), { doc: nb.doc });
    }
    nb.folders.set(folder.id, { ...folder, parentId });
    return { folder: this.folderOut(nb, { ...folder, parentId }) };
  }

  async deleteFolder(p: Principal, input: DeleteFolderInput) {
    requireWrite(p);
    const { nb, folder } = await this.findFolder(p, input.folderId);
    const notes = [...nb.notes.values()].filter((n) => n.folderId === folder.id);
    const live = notes.filter((n) => !n.trashedAt);
    const subfolders = [...nb.folders.values()].filter((f) => f.parentId === folder.id);
    if (input.contents === "refuse" && (live.length > 0 || subfolders.length > 0))
      throw new AgentError(
        "conflict",
        `Folder “${folder.name}” is not empty (${live.length} note(s), ${subfolders.length} subfolder(s)). Move them first, or call delete_folder with contents: "move_to_parent". Notes are never deleted by agents.`,
      );
    const target = folder.parentId;
    // Trashed notes go up too, so restoring them from the trash never points at a missing folder.
    await this.mutate(
      p,
      nb.info.id,
      "delete_folder",
      (doc) =>
        doc.transact(() => {
          for (const n of notes) patchNoteMeta(doc, n.id, { folderId: target });
          for (const f of subfolders) patchFolder(doc, f.id, { parentId: target });
          deleteFolder(doc, folder.id);
        }),
      { doc: nb.doc },
    );
    return {
      deleted: { id: folder.id, name: folder.name },
      movedTo: target ? this.folderOut(nb, nb.folders.get(target)!) : null,
      movedNotes: live.length,
      movedFolders: subfolders.length,
    };
  }

  async moveNote(p: Principal, input: MoveNoteInput) {
    requireWrite(p);
    const { nb: from, meta } = await this.locate(p, input.noteId);
    const toId = input.notebookId ?? from.info.id;
    if (toId === from.info.id) {
      this.requireFolder(from, input.folderId);
      if (meta.folderId !== input.folderId) {
        const order = nextOrder(getNoteMetas(from.doc).filter((n) => (n.folderId ?? null) === input.folderId));
        await this.mutate(
          p,
          from.info.id,
          "move_note",
          (doc) => patchNoteMeta(doc, meta.id, { folderId: input.folderId, parentNoteId: null, order, updatedAt: this.now().toISOString() }),
          { doc: from.doc },
        );
      }
      return { note: { id: meta.id, title: meta.title, notebookId: from.info.id, folderId: input.folderId, folderPath: folderPath(from, input.folderId) } };
    }

    const [to] = await this.notebooks(p, toId);
    this.requireFolder(to!, input.folderId);
    if (meta.kind !== "note")
      throw new AgentError("bad_request", `“${meta.title}” is a ${meta.kind === "daily" ? "daily note" : "task inbox"}; it stays in its notebook. It can still be moved between folders there.`);
    const move = this.ctx.data.moveNoteDoc?.bind(this.ctx.data);
    if (!move) throw new AgentError("bad_request", "This server cannot move notes between notebooks yet; notes can be moved between folders of one notebook.");
    const full = getNoteMeta(from.doc, meta.id);
    if (!full) throw new AgentError("not_found", `Note ${meta.id} is not in the notebook index.`);
    const fromDoc = from.doc;
    const toDoc = to!.doc;
    const order = nextOrder(getNoteMetas(toDoc).filter((n) => (n.folderId ?? null) === input.folderId));
    await move(p.grant.userId, {
      noteId: meta.id,
      fromNotebookId: from.info.id,
      toNotebookId: to!.info.id,
      origin: this.origin(p, "move_note"),
      indexUpdates: (wrappedKey) => {
        const toBefore = Y.encodeStateVector(toDoc);
        // Nesting under another note does not survive a move to another notebook (as in the apps).
        putNoteMeta(toDoc, { ...full, wrappedKey, folderId: input.folderId, parentNoteId: null, order, updatedAt: this.now().toISOString() });
        const fromBefore = Y.encodeStateVector(fromDoc);
        fromDoc.transact(() => {
          deleteNoteMeta(fromDoc, meta.id);
          for (const n of getNoteMetas(fromDoc)) if (n.parentNoteId === meta.id) patchNoteMeta(fromDoc, n.id, { parentNoteId: null });
        });
        return { from: Y.encodeStateAsUpdate(fromDoc, fromBefore), to: Y.encodeStateAsUpdate(toDoc, toBefore) };
      },
    });
    return { note: { id: meta.id, title: meta.title, notebookId: to!.info.id, folderId: input.folderId, folderPath: folderPath(to!, input.folderId) } };
  }

  /** `agentEdit` mark attrs for text written by this agent (D-10). */
  private mark(p: Principal): { agentId: string; at: string } {
    return { agentId: p.grant.id, at: this.now().toISOString() };
  }

  private blockList(doc: Y.Doc): { blockId: string; type: string }[] {
    return childElements(contentOf(doc)).map((e) => ({ blockId: blockIdOf(e) ?? "", type: e.nodeName }));
  }

  async editNote(p: Principal, input: EditNoteInput) {
    requireWrite(p);
    const views = await this.notebooks(p);
    const nb = views.find((v) => v.notes.get(input.noteId) && !v.notes.get(input.noteId)!.trashedAt);
    if (!nb) throw new AgentError("not_found", `Note ${input.noteId} not found or not available to this agent.`);
    const { result, seq } = await this.mutate(p, input.noteId, "edit_note", (doc) => {
      const results = applyEdits(doc, input.operations, { agentEdit: this.mark(p), resolveNoteLink: this.resolver(views) });
      const idx = buildNoteIndex(input.noteId, 0, doc);
      return { results, title: idx.title, tags: idx.tags };
    });
    await this.touchMeta(p, nb, input.noteId, "edit_note", { title: result.title, tags: result.tags });
    return { noteId: input.noteId, applied: result.results, seq };
  }

  async addComment(p: Principal, input: AddCommentInput) {
    requireWrite(p);
    const { nb } = await this.locate(p, input.noteId);
    const commentId = uuidv7(this.now().getTime());
    await this.mutate(p, input.noteId, "add_comment", (doc) => {
      const loc = findBlock(doc, input.blockId);
      if (!loc) throw new AgentError("not_found", `Block ${input.blockId} not found. Call read_note for current block ids.`);
      let anchor: { start: string; end: string } | null = null;
      if (input.quote) {
        const texts: Y.XmlText[] = [];
        const collect = (el: Y.XmlElement) => {
          for (const c of el.toArray()) {
            if (c instanceof Y.XmlText) texts.push(c);
            else if (c instanceof Y.XmlElement && !TEXT_BLOCKS.has(el.nodeName)) collect(c);
          }
        };
        collect(loc.el);
        const hit = texts.map((t) => ({ t, i: t.toString().indexOf(input.quote!) })).find((x) => x.i !== -1);
        if (!hit) throw new AgentError("not_found", `Quote "${input.quote}" not found in block ${input.blockId}. Use exact plain text, or omit quote.`);
        const start = Y.createRelativePositionFromTypeIndex(hit.t, hit.i);
        const end = Y.createRelativePositionFromTypeIndex(hit.t, hit.i + input.quote.length, -1);
        anchor = { start: base64url(Y.encodeRelativePosition(start)), end: base64url(Y.encodeRelativePosition(end)) };
      }
      const m = new Y.Map<unknown>();
      doc.getMap("comments").set(commentId, m);
      const fields: Record<string, unknown> = {
        id: commentId,
        blockId: input.blockId,
        anchor,
        author: { kind: "agent", id: p.grant.id, name: p.agentName },
        text: input.text,
        createdAt: this.now().toISOString(),
        resolvedAt: null,
      };
      for (const [k, v] of Object.entries(fields)) m.set(k, v);
    });
    await this.touchMeta(p, nb, input.noteId, "add_comment");
    return { commentId, noteId: input.noteId, blockId: input.blockId };
  }

  async updateTask(p: Principal, input: UpdateTaskInput) {
    requireWrite(p);
    let noteId = input.noteId;
    if (!noteId) {
      const found = (await this.listTasks(p, { state: "all", limit: 100_000 })).tasks.find((t) => t.taskId === input.taskId);
      if (!found) throw new AgentError("not_found", `Task ${input.taskId} not found. Call list_tasks for current task ids.`);
      noteId = found.noteId;
    }
    const { nb } = await this.locate(p, noteId);
    const { result } = await this.mutate(p, noteId, "update_task", (doc) => {
      let el: Y.XmlElement | null = null;
      walkBlocks(doc, (b) => {
        if (b.nodeName === "taskItem" && b.getAttribute("taskId") === input.taskId) el = b;
      });
      const task = el as Y.XmlElement | null;
      if (!task) throw new AgentError("not_found", `Task ${input.taskId} not found in note ${noteId}.`);
      doc.transact(() => {
        if (input.state !== undefined && input.state !== task.getAttribute("state")) {
          task.setAttribute("state", input.state);
          setOrRemove(task, "completedAt", input.state === "done" ? this.now().toISOString() : null);
        }
        if (input.scheduled !== undefined) setOrRemove(task, "scheduled", input.scheduled);
        if (input.deadline !== undefined) setOrRemove(task, "deadline", input.deadline);
      });
      return buildNoteIndex(noteId!, 0, doc).tasks.find((t) => t.taskId === input.taskId)!;
    });
    await this.touchMeta(p, nb, noteId, "update_task");
    return { task: { ...result, noteId } };
  }
}
