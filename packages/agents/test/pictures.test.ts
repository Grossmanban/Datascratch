import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { AgentService } from "../src/service/agent-service.js";
import { startServer } from "./server.js";
import { makeWorld, NB_WORK, principal, USER } from "./world.js";

const SCREENSHOT = "0192f3c4-0000-7000-8000-0000000000e1";
const PHOTO = "0192f3c4-0000-7000-8000-0000000000e2";
const UPLOADING = "0192f3c4-0000-7000-8000-0000000000e3";

async function picture(width: number, height: number, format: "png" | "jpeg"): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const g = canvas.getContext("2d");
  g.fillStyle = "#3a6ea5";
  g.fillRect(0, 0, width, height);
  return format === "png" ? canvas.encode("png") : canvas.encode("jpeg", 90);
}

async function setup() {
  const ctx = makeWorld();
  ctx.data.attachmentImages.set(SCREENSHOT, await picture(3000, 1500, "png"));
  ctx.data.attachmentImages.set(PHOTO, await picture(800, 1200, "jpeg"));
  const svc = new AgentService(ctx);
  const markdown = `Баг на iPad\n\n![Скриншот](attachment:${SCREENSHOT})\n\n![Фото](attachment:${PHOTO} "Кнопка съехала")\n\n![](attachment:${UPLOADING})`;
  const noteId = (await svc.createNote(principal(), { notebookId: NB_WORK, title: "Баги", markdown })).note.id;
  return { ctx, svc, noteId };
}

describe("pictures of a note", () => {
  it("read_note attaches them scaled down; PNG stays PNG, photos become JPEG", async () => {
    const { svc, noteId } = await setup();
    const r = await svc.readNote(principal(), { noteId, includeImages: true });
    expect(r.markdown).toContain(`(attachment:${SCREENSHOT})`);
    expect(r.pictures.map((x) => x.attachmentId)).toEqual([SCREENSHOT, PHOTO, UPLOADING]);
    expect(r.pictures[1]!.caption).toBe("Кнопка съехала");
    // The one the server cannot read yet is listed, not attached.
    expect(r.pictureImages.map((x) => [x.attachmentId, x.image.mimeType, x.image.width, x.image.height])).toEqual([
      [SCREENSHOT, "image/png", 1568, 784],
      [PHOTO, "image/jpeg", 800, 1200],
    ]);
    expect((await svc.readNote(principal(), { noteId, includeImages: false })).pictureImages).toEqual([]);
  });

  it("get_image returns a larger copy, and explains what it cannot show", async () => {
    const { svc, noteId } = await setup();
    const big = await svc.getImage(principal(), { noteId, attachmentId: SCREENSHOT });
    expect([big.width, big.height, big.mimeType]).toEqual([2048, 1024, "image/png"]);
    expect((await svc.getImage(principal(), { noteId, attachmentId: SCREENSHOT, maxSize: 512 })).width).toBe(512);
    await expect(svc.getImage(principal(), { noteId, attachmentId: UPLOADING })).rejects.toMatchObject({ code: "conflict" });
    // Only pictures of that note: an attachment id from elsewhere is not found.
    await expect(svc.getImage(principal(), { noteId, attachmentId: "0192f3c4-0000-7000-8000-0000000000e9" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("is served over MCP and REST", async () => {
    const s = await startServer();
    try {
      s.ctx.data.attachmentImages.set(SCREENSHOT, await picture(3000, 1500, "png"));
      const { token } = await fetch(`${s.base}/v1/agent-tokens`, {
        method: "POST",
        headers: { authorization: `Bearer user:${USER}`, "content-type": "application/json" },
        body: JSON.stringify({ name: "Pictures", allNotebooks: true, permission: "read_write" }),
      }).then((r) => r.json());
      const call = (path: string, init: RequestInit = {}) =>
        fetch(`${s.base}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } });
      const created = await call("/v1/agent/notes", {
        method: "POST",
        body: JSON.stringify({ notebookId: NB_WORK, title: "Баги", markdown: `![Скриншот](attachment:${SCREENSHOT})` }),
      }).then((r) => r.json());
      const note = await call(`/v1/agent/notes/${created.note.id}`).then((r) => r.json());
      expect(note.pictures[0].imageUrl).toBe(`/v1/agent/notes/${created.note.id}/images/${SCREENSHOT}`);
      const img = await call(`${note.pictures[0].imageUrl}?maxSize=300`);
      expect(img.headers.get("content-type"), await img.clone().text()).toBe("image/png");
      expect((await img.arrayBuffer()).byteLength).toBeGreaterThan(0);
    } finally {
      await s.close();
    }
  });
});
