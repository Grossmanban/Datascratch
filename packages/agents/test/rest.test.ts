import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "./server.js";
import { NB_WORK, NOTE_PLAN, USER } from "./world.js";

let close: (() => Promise<void>) | null = null;
afterEach(async () => {
  await close?.();
  close = null;
});

async function setup(permission: "read" | "read_write" = "read_write") {
  const s = await startServer();
  close = s.close;
  const { token } = await fetch(`${s.base}/v1/agent-tokens`, {
    method: "POST",
    headers: { authorization: `Bearer user:${USER}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "REST agent", notebookIds: [NB_WORK], permission }),
  }).then((r) => r.json());
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`${s.base}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  return { s, call };
}

describe("REST /v1/agent", () => {
  it("reads notes with handwriting image URLs", async () => {
    const { call } = await setup();
    const r = await call(`/v1/agent/notes/${NOTE_PLAN}`).then((x) => x.json());
    expect(r.note.title).toBe("План запуска");
    expect(r.handwriting[0].imageUrl).toMatch(new RegExp(`^/v1/agent/notes/${NOTE_PLAN}/handwriting/[0-9a-f-]+\\.png$`));
    const png = await call(r.handwriting[0].imageUrl);
    expect(png.headers.get("content-type")).toBe("image/png");
    expect(decodeURIComponent(png.headers.get("x-handwriting-description")!)).toBe("подчёркнуто от руки: «сроки запуска»");
    expect(Buffer.from(await png.arrayBuffer()).subarray(1, 4).toString()).toBe("PNG");
  });

  it("searches, lists tasks and edits", async () => {
    const { call } = await setup();
    const found = await call(`/v1/agent/search?query=${encodeURIComponent("бюджет")}&limit=5`).then((x) => x.json());
    expect(found.results.map((x: { id: string }) => x.id)).toEqual([NOTE_PLAN]);
    const tasks = await call(`/v1/agent/tasks?state=all`).then((x) => x.json());
    expect(tasks.total).toBe(3);
    const note = await call(`/v1/agent/notes/${NOTE_PLAN}`).then((x) => x.json());
    const block = /<!-- block:([0-9a-f-]+) -->/.exec(note.markdown)![1];
    const edit = await call(`/v1/agent/notes/${NOTE_PLAN}/edit`, {
      method: "POST",
      body: JSON.stringify({ operations: [{ op: "insert", position: { after: block }, markdown: "Новый абзац" }] }),
    });
    expect(edit.status).toBe(200);
    const task = tasks.tasks[0];
    const upd = await call(`/v1/agent/tasks/${task.taskId}`, { method: "PATCH", body: JSON.stringify({ state: "done" }) }).then((x) => x.json());
    expect(upd.task.state).toBe("done");
    const created = await call(`/v1/agent/notes`, { method: "POST", body: JSON.stringify({ notebookId: NB_WORK, title: "REST note", markdown: "Текст" }) });
    expect(created.status).toBe(200);
  });

  it("returns clear validation and permission errors", async () => {
    const { call, s } = await setup("read");
    const bad = await call(`/v1/agent/notes/not-a-uuid`);
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatchObject({ code: "bad_request", message: expect.stringContaining("noteId") });
    const ro = await call(`/v1/agent/notes`, { method: "POST", body: JSON.stringify({ notebookId: NB_WORK, title: "x" }) });
    expect(ro.status).toBe(403);
    expect((await ro.json()).error.code).toBe("forbidden");
    const anon = await fetch(`${s.base}/v1/agent/notebooks`);
    expect(anon.status).toBe(401);
  });

  it("only accepts agent-mode notebooks when creating tokens", async () => {
    const { s } = await setup();
    const res = await fetch(`${s.base}/v1/agent-tokens`, {
      method: "POST",
      headers: { authorization: `Bearer user:${USER}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "x", notebookIds: ["0192f3c4-0000-7000-8000-0000000000a2"], permission: "read" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("for agents");
  });
});
