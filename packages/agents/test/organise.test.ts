import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { getFolders, getNoteMeta } from "@datascratch/shared/document";
import { AgentService } from "../src/service/agent-service.js";
import { FOLDER, makeWorld, NB_OTHER, NB_PRIVATE, NB_WORK, NOTE_IDEAS, NOTE_OTHER, NOTE_PLAN, NOTE_SECRET, NOTE_TRASH, principal } from "./world.js";

function setup() {
  const ctx = makeWorld();
  return { ctx, svc: new AgentService(ctx), p: principal({ notebookIds: [NB_WORK, NB_OTHER] }) };
}

const folders = (doc: Y.Doc) => getFolders(doc).map((f) => ({ name: f.name, parentId: f.parentId }));

describe("folders", () => {
  it("creates nested folders with paths and order", async () => {
    const { ctx, svc, p } = setup();
    const a = await svc.createFolder(p, { notebookId: NB_WORK, name: "Проекты", icon: "📁" });
    const b = await svc.createFolder(p, { notebookId: NB_WORK, name: "2026", parentFolderId: a.folder.id });
    const c = await svc.createFolder(p, { notebookId: NB_WORK, name: "Q4", parentFolderId: b.folder.id });
    expect(c.folder).toMatchObject({ notebookId: NB_WORK, parentId: b.folder.id, path: "Проекты / 2026 / Q4" });
    const doc = ctx.data.current(NB_WORK);
    expect(folders(doc)).toEqual(expect.arrayContaining([{ name: "Проекты", parentId: null }, { name: "Q4", parentId: b.folder.id }]));
    const stored = getFolders(doc).find((f) => f.id === a.folder.id)!;
    expect(stored).toMatchObject({ icon: "📁", color: null, order: 1, createdAt: expect.any(String) });
    expect(ctx.data.history(NB_WORK).at(-1)!.origin).toMatchObject({ action: "create_folder", grantId: p.grant.id });
    const listed = await svc.listNotebooks(p);
    expect(listed.hint).toMatch(/cannot create.*notebooks/i);
    const work = listed.notebooks.find((n) => n.id === NB_WORK) as { folders: { path: string }[] };
    expect(work.folders.map((f) => f.path)).toContain("Проекты / 2026 / Q4");
  });

  it("refuses unknown parents, duplicate names and read-only grants", async () => {
    const { svc, p } = setup();
    await expect(svc.createFolder(p, { notebookId: NB_WORK, name: "x", parentFolderId: NOTE_PLAN })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.createFolder(p, { notebookId: NB_WORK, name: "черновики" })).rejects.toMatchObject({ code: "conflict", message: expect.stringContaining(FOLDER) });
    await expect(svc.createFolder(p, { notebookId: NB_PRIVATE, name: "x" })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.createFolder(principal({ permission: "read" }), { notebookId: NB_WORK, name: "x" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("renames and changes the icon", async () => {
    const { ctx, svc, p } = setup();
    const r = await svc.renameFolder(p, { folderId: FOLDER, name: "Наброски", icon: "✏️" });
    expect(r.folder).toMatchObject({ name: "Наброски", icon: "✏️", path: "Наброски" });
    expect(getFolders(ctx.data.current(NB_WORK))[0]).toMatchObject({ name: "Наброски", icon: "✏️" });
  });

  it("moves folders without cycles", async () => {
    const { ctx, svc, p } = setup();
    const a = await svc.createFolder(p, { notebookId: NB_WORK, name: "A" });
    const b = await svc.createFolder(p, { notebookId: NB_WORK, name: "B", parentFolderId: a.folder.id });
    await expect(svc.moveFolder(p, { folderId: a.folder.id, parentFolderId: b.folder.id })).rejects.toMatchObject({ code: "bad_request" });
    await expect(svc.moveFolder(p, { folderId: a.folder.id, parentFolderId: a.folder.id })).rejects.toMatchObject({ code: "bad_request" });
    const r = await svc.moveFolder(p, { folderId: a.folder.id, parentFolderId: FOLDER });
    expect(r.folder.path).toBe("Черновики / A");
    await svc.moveFolder(p, { folderId: b.folder.id, parentFolderId: null });
    expect(folders(ctx.data.current(NB_WORK))).toEqual(expect.arrayContaining([{ name: "A", parentId: FOLDER }, { name: "B", parentId: null }]));
  });

  it("deletes only empty folders unless asked to move the contents up; never deletes notes", async () => {
    const { ctx, svc, p } = setup();
    const sub = await svc.createFolder(p, { notebookId: NB_WORK, name: "Вложенная", parentFolderId: FOLDER });
    await expect(svc.deleteFolder(p, { folderId: FOLDER, contents: "refuse" })).rejects.toMatchObject({ code: "conflict", message: expect.stringContaining("1 note(s), 1 subfolder(s)") });
    // A trashed note in a folder does not block deleting it, and is moved up with the rest.
    (ctx.data.current(NB_WORK).getMap("notes").get(NOTE_TRASH) as Y.Map<unknown>).set("folderId", sub.folder.id);
    const empty = await svc.deleteFolder(p, { folderId: sub.folder.id, contents: "refuse" });
    expect(empty).toMatchObject({ movedNotes: 0, movedTo: { id: FOLDER } });
    const doc = ctx.data.current(NB_WORK);
    expect(getNoteMeta(doc, NOTE_TRASH)!.folderId).toBe(FOLDER);

    const inner = await svc.createFolder(p, { notebookId: NB_WORK, name: "Внутри", parentFolderId: FOLDER });
    const r = await svc.deleteFolder(p, { folderId: FOLDER, contents: "move_to_parent" });
    expect(r).toMatchObject({ deleted: { id: FOLDER }, movedTo: null, movedNotes: 1, movedFolders: 1 });
    expect(getNoteMeta(doc, NOTE_IDEAS)).toMatchObject({ folderId: null, trashedAt: null });
    expect(getNoteMeta(doc, NOTE_TRASH)!.folderId).toBeNull();
    expect(getFolders(doc).find((f) => f.id === inner.folder.id)!.parentId).toBeNull();
    expect(getFolders(doc).some((f) => f.id === FOLDER)).toBe(false);
    expect(doc.getMap("notes").size).toBe(3);
  });
});

describe("move_note", () => {
  it("moves a note between folders of one notebook", async () => {
    const { ctx, svc, p } = setup();
    const r = await svc.moveNote(p, { noteId: NOTE_PLAN, folderId: FOLDER });
    expect(r.note).toMatchObject({ notebookId: NB_WORK, folderId: FOLDER, folderPath: ["Черновики"] });
    expect(getNoteMeta(ctx.data.current(NB_WORK), NOTE_PLAN)).toMatchObject({ folderId: FOLDER, order: expect.any(Number) });
    await expect(svc.moveNote(p, { noteId: NOTE_PLAN, folderId: NOTE_IDEAS })).rejects.toMatchObject({ code: "not_found" });
  });

  it("moves a note to another granted notebook in one step, re-wrapping its key", async () => {
    const { ctx, svc, p } = setup();
    const target = await svc.createFolder(p, { notebookId: NB_OTHER, name: "Входящее" });
    const before = ctx.data.history(NB_WORK).length;
    const r = await svc.moveNote(p, { noteId: NOTE_PLAN, folderId: target.folder.id, notebookId: NB_OTHER });
    expect(r.note).toMatchObject({ notebookId: NB_OTHER, folderId: target.folder.id, folderPath: ["Входящее"] });
    const from = ctx.data.current(NB_WORK);
    const to = ctx.data.current(NB_OTHER);
    expect(getNoteMeta(from, NOTE_PLAN)).toBeNull();
    expect(getNoteMeta(to, NOTE_PLAN)).toMatchObject({ title: "План запуска", tags: ["запуск"], folderId: target.folder.id, parentNoteId: null, wrappedKey: `wrapped-${NOTE_PLAN}@${NB_OTHER}` });
    expect(ctx.data.docs.get(NOTE_PLAN)!.notebookId).toBe(NB_OTHER);
    expect(ctx.data.history(NB_WORK).length).toBe(before + 1);
    expect(ctx.data.history(NB_WORK).at(-1)!.origin).toMatchObject({ action: "move_note" });
    // The note is still readable, now from the other notebook.
    const read = await svc.readNote(p, { noteId: NOTE_PLAN, includeImages: false });
    expect(read.note).toMatchObject({ notebookId: NB_OTHER, folderPath: ["Входящее"] });
  });

  it("changes nothing when the server move fails", async () => {
    const { ctx, svc, p } = setup();
    ctx.data.failNextMove = true;
    const before = [ctx.data.history(NB_WORK).length, ctx.data.history(NB_OTHER).length];
    await expect(svc.moveNote(p, { noteId: NOTE_PLAN, folderId: null, notebookId: NB_OTHER })).rejects.toThrow(/simulated/);
    expect([ctx.data.history(NB_WORK).length, ctx.data.history(NB_OTHER).length]).toEqual(before);
    expect(getNoteMeta(ctx.data.current(NB_WORK), NOTE_PLAN)).not.toBeNull();
    expect(getNoteMeta(ctx.data.current(NB_OTHER), NOTE_PLAN)).toBeNull();
  });

  it("refuses notebooks outside the grant, daily notes and servers without cross-notebook moves", async () => {
    const { ctx, svc, p } = setup();
    await expect(svc.moveNote(principal(), { noteId: NOTE_PLAN, folderId: null, notebookId: NB_OTHER })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.moveNote(p, { noteId: NOTE_PLAN, folderId: null, notebookId: NB_PRIVATE })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.moveNote(p, { noteId: NOTE_SECRET, folderId: null, notebookId: NB_WORK })).rejects.toMatchObject({ code: "not_found" });
    (ctx.data.current(NB_OTHER).getMap("notes").get(NOTE_OTHER) as Y.Map<unknown>).set("kind", "daily");
    await expect(svc.moveNote(p, { noteId: NOTE_OTHER, folderId: null, notebookId: NB_WORK })).rejects.toMatchObject({ code: "bad_request", message: expect.stringContaining("daily note") });
    const bare = new AgentService({ ...ctx, data: Object.assign(Object.create(Object.getPrototypeOf(ctx.data)), ctx.data, { moveNoteDoc: undefined }) });
    await expect(bare.moveNote(p, { noteId: NOTE_PLAN, folderId: null, notebookId: NB_OTHER })).rejects.toMatchObject({ code: "bad_request" });
  });
});
