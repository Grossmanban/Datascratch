import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { noteToMarkdown } from "../src/doc/markdown-export.js";
import { AgentService } from "../src/service/agent-service.js";
import { FOLDER, makeWorld, NB_OTHER, NB_PRIVATE, NB_WORK, NOTE_IDEAS, NOTE_OTHER, NOTE_PLAN, NOTE_SECRET, principal } from "./world.js";

function setup() {
  const ctx = makeWorld();
  return { ctx, svc: new AgentService(ctx) };
}

describe("access", () => {
  it("lists only granted agent-mode notebooks", async () => {
    const { svc } = setup();
    const r = await svc.listNotebooks(principal());
    expect(r.notebooks.map((n) => n.name)).toEqual(["Работа"]);
    expect(r.notebooks[0]!.noteCount).toBe(2);
    expect(r.notebooks[0]!.folders[0]!.path).toBe("Черновики");
    const spaces = await svc.listSpaces(principal());
    expect(spaces.spaces).toEqual([{ id: "s1", name: "Основное", icon: "🏠", notebooks: [{ id: NB_WORK, name: "Работа" }] }]);
  });

  it("takes name, icon and space from the notebook document when the server does not know them", async () => {
    const { ctx, svc } = setup();
    const nb = ctx.data.notebooks.get(NB_WORK)!;
    nb.name = null;
    nb.space = null;
    const doc = ctx.data.current(NB_WORK);
    doc.transact(() => {
      doc.getMap("meta").set("icon", "💼");
      doc.getMap("meta").set("space", { id: "s9", name: "Проекты", icon: null });
    });
    const r = await svc.listNotebooks(principal());
    expect(r.notebooks[0]).toMatchObject({ name: "Работа", icon: "💼", space: { id: "s9", name: "Проекты" } });
  });

  it("never exposes private or ungranted notebooks", async () => {
    const { svc } = setup();
    const p = principal();
    await expect(svc.readNote(p, { noteId: NOTE_SECRET, includeImages: false })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.readNote(p, { noteId: NOTE_OTHER, includeImages: false })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.listNotes(p, { notebookId: NB_PRIVATE, limit: 10, offset: 0 })).rejects.toMatchObject({ code: "not_found" });
    await expect(svc.listNotes(p, { notebookId: NB_OTHER, limit: 10, offset: 0 })).rejects.toMatchObject({ code: "not_found" });
    const s = await svc.searchNotes(p, { query: "сроки", limit: 10 });
    expect(s.results.map((r) => r.id).sort()).toEqual([NOTE_PLAN, NOTE_IDEAS].sort());
  });

  it("passes the grant to the data source for row-level security", async () => {
    const { ctx, svc } = setup();
    await svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: false });
    expect(ctx.data.grantCalls.length).toBeGreaterThan(0);
    expect(new Set(ctx.data.grantCalls)).toEqual(new Set([principal().grant.id]));
  });

  it("stops access when a notebook is switched to private", async () => {
    const { ctx, svc } = setup();
    ctx.data.setMode(NB_WORK, "private");
    await expect(svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: false })).rejects.toMatchObject({ code: "not_found" });
  });

  it("read-only grants cannot write", async () => {
    const { svc } = setup();
    const p = principal({ permission: "read" });
    await expect(svc.createNote(p, { notebookId: NB_WORK, title: "x", markdown: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(svc.editNote(p, { noteId: NOTE_PLAN, operations: [{ op: "delete", blockId: "0192f3c4-0000-7000-8000-000000000999" }] })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("reading", () => {
  it("reads a note as Markdown with handwriting links and images", async () => {
    const { svc } = setup();
    const r = await svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: true });
    expect(r.note.title).toBe("План запуска");
    expect(r.note.notebookName).toBe("Работа");
    expect(r.markdown).toContain("<!-- block:");
    expect(r.markdown).toMatch(/!\[✍️ подчёркнуто от руки: «сроки запуска»\]\(handwriting:[0-9a-f-]+\)/);
    expect(r.markdown).toMatch(/- \[ \] Подготовить макеты ⏳ 2026-10-27 <!-- block:[0-9a-f-]+ task:[0-9a-f-]+ -->/);
    expect(r.images).toHaveLength(1);
    expect(r.images[0]!.png.subarray(1, 4).toString()).toBe("PNG");
    const img = await svc.getHandwritingImage(principal(), { noteId: NOTE_PLAN, handwritingId: r.handwriting[0]!.id, scale: 1 });
    expect(img.width).toBe(640);
  });

  it("lists notes by folder and searches by tag", async () => {
    const { svc } = setup();
    const inFolder = await svc.listNotes(principal(), { notebookId: NB_WORK, folderId: FOLDER, limit: 10, offset: 0 });
    expect(inFolder.notes.map((n) => n.title)).toEqual(["Идеи"]);
    expect(inFolder.notes[0]!.folderPath).toEqual(["Черновики"]);
    const byTag = await svc.searchNotes(principal(), { query: "", tag: "запуск", limit: 10 });
    expect(byTag.results.map((n) => n.id)).toEqual([NOTE_PLAN]);
  });

  it("reuses the index for unchanged notes", async () => {
    const { ctx, svc } = setup();
    await svc.searchNotes(principal(), { query: "сроки", limit: 10 });
    const loads = ctx.data.loads;
    await svc.searchNotes(principal(), { query: "бюджет", limit: 10 });
    expect(ctx.data.loads - loads).toBe(1); // only the notebook index is reloaded
  });

  it("finds backlinks and tasks", async () => {
    const { svc } = setup();
    const b = await svc.getBacklinks(principal(), { noteId: NOTE_PLAN });
    expect(b.backlinks.map((x) => x.id)).toEqual([NOTE_IDEAS]);
    expect(b.backlinks[0]!.contexts[0]).toContain("[[План запуска]]");
    const t = await svc.listTasks(principal(), { state: "open", limit: 50 });
    expect(t.tasks.map((x) => x.text)).toEqual(["Подготовить макеты", "Написать пресс-релиз"]);
    const due = await svc.listTasks(principal(), { state: "open", deadlineBefore: "2026-11-30", limit: 50 });
    expect(due.tasks.map((x) => x.text)).toEqual(["Написать пресс-релиз"]);
  });
});

describe("writing", () => {
  it("creates a note in the index with agentEdit marks", async () => {
    const { ctx, svc } = setup();
    const r = await svc.createNote(principal(), { notebookId: NB_WORK, title: "Итоги", markdown: "Связано с [[План запуска]]\n\n- [ ] Отправить отчёт", folderId: FOLDER });
    const doc = ctx.data.current(r.note.id);
    expect(noteToMarkdown(doc, { blockIds: false })).toBe("Связано с [[План запуска]]\n\n- [ ] Отправить отчёт\n");
    const meta = ctx.data.current(NB_WORK).getMap("notes").get(r.note.id) as Y.Map<unknown>;
    expect(meta.get("title")).toBe("Итоги");
    expect(meta.get("folderId")).toBe(FOLDER);
    expect(meta.get("wrappedKey")).toBe(`wrapped-${r.note.id}`);
    expect(ctx.data.history(r.note.id)[0]!.origin).toMatchObject({ kind: "agent", action: "create_note" });
    const b = await svc.getBacklinks(principal(), { noteId: NOTE_PLAN });
    expect(b.backlinks.map((x) => x.title).sort()).toEqual(["Идеи", "Итоги"]);
  });

  it("edits blocks atomically and keeps handwriting", async () => {
    const { ctx, svc } = setup();
    const before = await svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: false });
    const firstBlock = /<!-- block:([0-9a-f-]+) -->/.exec(before.markdown)![1]!;
    await expect(
      svc.editNote(principal(), {
        noteId: NOTE_PLAN,
        operations: [
          { op: "replace_text", blockId: firstBlock, find: "в четверг", replace: "в пятницу" },
          { op: "delete", blockId: "0192f3c4-0000-7000-8000-000000000999" },
        ],
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(ctx.data.history(NOTE_PLAN)).toHaveLength(0);
    await svc.editNote(principal(), {
      noteId: NOTE_PLAN,
      operations: [
        { op: "replace_text", blockId: firstBlock, find: "в четверг", replace: "в пятницу" },
        { op: "insert", position: { after: firstBlock }, markdown: "> [!info] 💡\n> Добавлено агентом" },
      ],
    });
    const after = await svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: false });
    expect(after.markdown).toContain("Встреча с командой в пятницу.");
    expect(after.markdown).toContain("> [!info] 💡");
    expect(after.handwriting[0]!.description).toBe("подчёркнуто от руки: «сроки запуска»");
    const meta = ctx.data.current(NB_WORK).getMap("notes").get(NOTE_PLAN) as Y.Map<unknown>;
    expect(meta.get("updatedAt")).toBe("2026-10-25T12:00:00.000Z");
  });

  it("adds comments and updates tasks", async () => {
    const { ctx, svc } = setup();
    const before = await svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: false });
    const firstBlock = /<!-- block:([0-9a-f-]+) -->/.exec(before.markdown)![1]!;
    await svc.addComment(principal(), { noteId: NOTE_PLAN, blockId: firstBlock, quote: "бюджет", text: "Какой лимит?" });
    const after = await svc.readNote(principal(), { noteId: NOTE_PLAN, includeImages: false });
    expect(after.comments).toMatchObject([{ blockId: firstBlock, author: "Claude", text: "Какой лимит?" }]);
    const c = [...ctx.data.current(NOTE_PLAN).getMap("comments").values()][0] as Y.Map<unknown>;
    expect(c.get("anchor")).toMatchObject({ start: expect.any(String), end: expect.any(String) });

    const tasks = await svc.listTasks(principal(), { state: "open", limit: 10 });
    const t = tasks.tasks[0]!;
    const r = await svc.updateTask(principal(), { taskId: t.taskId, state: "done", deadline: "2026-10-30" });
    expect(r.task).toMatchObject({ state: "done", deadline: "2026-10-30", completedAt: "2026-10-25T12:00:00.000Z", noteId: NOTE_PLAN });
  });
});
