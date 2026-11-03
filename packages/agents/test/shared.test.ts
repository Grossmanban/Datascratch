/**
 * D-54 amendment (2026-10-28): a member's own agent works with a notebook the
 * owner shared and opened to agents, with the member's role.
 */
import { describe, expect, it } from "vitest";
import { getNoteMeta } from "@datascratch/shared/document";
import { consentPage } from "../src/auth/pages.js";
import { AgentService } from "../src/service/agent-service.js";
import { describeAgentNotebooks } from "../src/service/notebook-meta.js";
import { makeNotebookDoc, makeNoteDoc } from "../src/testing/fixtures.js";
import { makeWorld, NB_WORK, NOTE_PLAN, principal, USER } from "./world.js";

const OWNER = "0192f3c4-0000-7000-8000-0000000000e1";
const NB_TEAM = "0192f3c4-0000-7000-8000-0000000000e2";
const NOTE_TEAM = "0192f3c4-0000-7000-8000-0000000000e3";

function setup(role: "editor" | "viewer") {
  const ctx = makeWorld();
  ctx.users.addUser(OWNER, "anna@example.com");
  ctx.data.emails.set(OWNER, "anna@example.com");
  ctx.data.addNotebook(OWNER, { id: NB_TEAM, name: "Команда", space: { id: "s-owner", name: "Работа Анны", icon: null } }, makeNotebookDoc(NB_TEAM, "Команда", [{ id: NOTE_TEAM, title: "План команды" }]));
  ctx.data.putDoc(OWNER, NOTE_TEAM, NB_TEAM, makeNoteDoc("План команды", "Созвон в четверг — обсудить сроки."));
  ctx.data.share(NB_TEAM, USER, role);
  const p = principal({ notebookIds: [NB_WORK, NB_TEAM] });
  return { ctx, svc: new AgentService(ctx), p };
}

describe("shared notebooks for a member's agent (D-54)", () => {
  it("lists them marked as shared, under «Общие со мной», with the member's effective permission", async () => {
    const { svc, p } = setup("viewer");
    const { notebooks, hint } = await svc.listNotebooks(p);
    const team = notebooks.find((n) => n.id === NB_TEAM)!;
    expect(team).toMatchObject({ name: "Команда", permission: "read", shared: { ownerEmail: "anna@example.com", role: "viewer" }, space: null });
    expect(notebooks.find((n) => n.id === NB_WORK)).not.toHaveProperty("shared");
    expect(hint).toMatch(/shared/);
    const { spaces } = await svc.listSpaces(p);
    expect(spaces.find((s) => s.name === "Общие со мной")!.notebooks).toEqual([{ id: NB_TEAM, name: "Команда" }]);
  });

  it("reads and searches them like own notebooks", async () => {
    const { svc, p } = setup("viewer");
    const found = await svc.searchNotes(p, { query: "созвон", limit: 10 });
    expect(found.results.map((r) => r.id)).toEqual([NOTE_TEAM]);
    const read = await svc.readNote(p, { noteId: NOTE_TEAM, includeImages: false });
    expect(read.markdown).toContain("Созвон в четверг");
    expect((await svc.listNotes(p, { notebookId: NB_TEAM, limit: 10, offset: 0 })).notes).toHaveLength(1);
  });

  it("a viewer's agent gets a clear «только чтение» error for every write", async () => {
    const { svc, p } = setup("viewer");
    const ro = { code: "forbidden", message: expect.stringContaining("только чтение") };
    await expect(svc.createNote(p, { notebookId: NB_TEAM, title: "x", markdown: "y" })).rejects.toMatchObject(ro);
    await expect(svc.editNote(p, { noteId: NOTE_TEAM, operations: [{ op: "replace_text", blockId: "x", find: "a", replace: "b" }] })).rejects.toMatchObject(ro);
    await expect(svc.addComment(p, { noteId: NOTE_TEAM, blockId: "x", text: "hi" })).rejects.toMatchObject(ro);
    await expect(svc.createFolder(p, { notebookId: NB_TEAM, name: "Папка" })).rejects.toMatchObject(ro);
    await expect(svc.moveNote(p, { noteId: NOTE_TEAM, folderId: null })).rejects.toMatchObject(ro);
    // Own notebooks stay writable.
    await expect(svc.createNote(p, { notebookId: NB_WORK, title: "Своя", markdown: "ok" })).resolves.toBeTruthy();
  });

  it("an editor's agent writes there; the note belongs to the owner and the history names the member's agent", async () => {
    const { ctx, svc, p } = setup("editor");
    const { note } = await svc.createNote(p, { notebookId: NB_TEAM, title: "Итоги", markdown: "Всё готово." });
    expect(ctx.data.docs.get(note.id)!.userId).toBe(OWNER);
    expect(getNoteMeta(ctx.data.current(NB_TEAM), note.id)).toMatchObject({ title: "Итоги", createdByAgent: { agentId: p.grant.id } });
    await svc.createFolder(p, { notebookId: NB_TEAM, name: "Архив" });
    expect(ctx.data.history(NB_TEAM).at(-1)!.origin).toMatchObject({ grantId: p.grant.id, userId: USER, action: "create_folder" });
  });

  it("never moves a note between different owners' notebooks", async () => {
    const { svc, p } = setup("editor");
    await expect(svc.moveNote(p, { noteId: NOTE_PLAN, folderId: null, notebookId: NB_TEAM })).rejects.toMatchObject({ code: "bad_request", message: expect.stringContaining("same owner") });
    await expect(svc.moveNote(p, { noteId: NOTE_TEAM, folderId: null, notebookId: NB_WORK })).rejects.toMatchObject({ code: "bad_request" });
  });

  it("access ends when the member is removed", async () => {
    const { ctx, svc, p } = setup("editor");
    ctx.data.unshare(NB_TEAM, USER);
    expect((await svc.listNotebooks(p)).notebooks.map((n) => n.id)).not.toContain(NB_TEAM);
    await expect(svc.readNote(p, { noteId: NOTE_TEAM, includeImages: false })).rejects.toMatchObject({ code: "not_found" });
  });

  it("the consent page offers them, marked «общий · owner · только чтение»", async () => {
    const { ctx } = setup("viewer");
    const nbs = await describeAgentNotebooks(ctx, USER);
    const team = nbs.find((n) => n.id === NB_TEAM)!;
    expect(team.shared).toMatchObject({ role: "viewer" });
    const html = consentPage({
      clientName: "Claude",
      clientUri: null,
      logoUri: null,
      redirectHost: "claude.ai",
      verifiedHost: "claude.ai",
      userEmail: null,
      notebooks: [{ id: team.id, name: team.name, space: null, icon: null, color: null, shared: { ownerEmail: "anna@example.com", readOnly: true } }],
      writeRequested: false,
      request: "r",
      action: "/oauth/authorize",
      appUrl: null,
    });
    expect(html).toContain("<small>общий · anna@example.com · только чтение</small>");
  });
});
