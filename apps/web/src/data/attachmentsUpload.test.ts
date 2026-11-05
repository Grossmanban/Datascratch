import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The network side of attachment uploads: chunks go up CHUNK_CONCURRENCY at a time across all
// pending attachments, each finished chunk is recorded at once, and after a break only what is
// missing is sent again.

const net = vi.hoisted(() => ({
  inFlight: 0,
  maxInFlight: 0,
  puts: [] as string[],
  failOn: null as string | null,
  posts: [] as string[],
}));

vi.mock("@/api/client", async (importActual) => {
  const actual = await importActual<typeof import("@/api/client")>();
  return {
    ...actual,
    request: vi.fn(async (_method: string, _path: string, opts: { body: { attachmentId: string } }) => {
      net.posts.push(opts.body.attachmentId);
    }),
    timedFetch: vi.fn(async (url: string) => {
      const key = url.split("/attachments/")[1]!.replace("/chunks/", ":");
      net.inFlight++;
      net.maxInFlight = Math.max(net.maxInFlight, net.inFlight);
      try {
        await new Promise((r) => setTimeout(r, 5 + Math.random() * 10));
        if (net.failOn === key) {
          net.failOn = null;
          throw new TypeError("Failed to fetch");
        }
        net.puts.push(key);
        return new Response(null, { status: 204 });
      } finally {
        net.inFlight--;
      }
    }),
  };
});
vi.mock("@/auth/session", () => ({ getSession: () => null }));

import { CHUNK_CONCURRENCY, inPool, uploadPending, useAttachmentUploads, watchAttachmentUpload } from "./attachments";
import { accountDb, closeAccountDb, openAccountDb } from "./db";

async function addAttachment(id: string, chunkCount: number, mime = "image/png") {
  const db = accountDb();
  await db.attachments.put({ id, noteId: "n1", mime, plainSize: chunkCount, size: chunkCount, chunkCount, registered: 0, uploaded: [], local: 1, createdAt: Date.now() });
  await db.chunks.bulkPut(Array.from({ length: chunkCount }, (_, i) => ({ key: `${id}:${i}`, attachmentId: id, index: i, data: new Uint8Array([i]) })));
}

beforeEach(() => {
  Object.assign(net, { inFlight: 0, maxInFlight: 0, puts: [], failOn: null, posts: [] });
  openAccountDb(`upload-test-${Math.random()}`);
  useAttachmentUploads.setState({ progress: {}, batch: {}, done: {} });
});
afterEach(() => closeAccountDb());

describe("inPool", () => {
  it("runs at most `limit` at once and every item once", async () => {
    let now = 0;
    let max = 0;
    const seen: number[] = [];
    await inPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      now++;
      max = Math.max(max, now);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      now--;
    });
    expect(max).toBe(3);
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("uploadPending", () => {
  it("sends the chunks of several attachments three at a time and reports progress", async () => {
    await addAttachment("a", 4);
    await addAttachment("b", 1);
    await addAttachment("c", 2);
    const ring: (number | null)[] = [];
    const stop = watchAttachmentUpload("a", (f) => ring.push(f));
    expect(await uploadPending()).toBe(true);
    stop();
    expect(net.maxInFlight).toBe(CHUNK_CONCURRENCY);
    expect(net.puts.sort()).toEqual(["a:0", "a:1", "a:2", "a:3", "b:0", "c:0", "c:1"]);
    expect(net.posts).toEqual(["a", "b", "c"]);
    for (const id of ["a", "b", "c"]) {
      const row = (await accountDb().attachments.get(id))!;
      expect(row.registered).toBe(1);
      expect([...row.uploaded].sort()).toEqual(Array.from({ length: row.chunkCount }, (_, i) => i));
    }
    // The picture's ring: not known yet (rows written by the test, not storeAttachment), queued,
    // then quarters, then gone.
    expect(ring.slice(0, 2)).toEqual([null, 0]);
    expect(ring.at(-1)).toBeNull();
    expect(ring.filter((f) => f !== null && f > 0)).toEqual([0.25, 0.5, 0.75]);
    const s = useAttachmentUploads.getState();
    expect(s.progress).toEqual({});
    expect(Object.keys(s.done).sort()).toEqual(["a", "b", "c"]);
  });

  it("after a break resumes with only the missing chunks", async () => {
    await addAttachment("big", 6);
    net.failOn = "big:3";
    expect(await uploadPending()).toBe(false);
    const sentBefore = new Set(net.puts);
    const row = (await accountDb().attachments.get("big"))!;
    // Every chunk the server confirmed is recorded, whatever order they finished in.
    expect([...row.uploaded].sort()).toEqual([...sentBefore].map((k) => Number(k.split(":")[1])).sort());
    expect(row.uploaded).not.toContain(3);
    expect(useAttachmentUploads.getState().progress.big).toBeGreaterThan(0);

    net.puts = [];
    expect(await uploadPending()).toBe(true);
    // Nothing already on the server is sent twice; the failed one and the rest are.
    for (const k of net.puts) expect(sentBefore.has(k)).toBe(false);
    expect(new Set([...sentBefore, ...net.puts]).size).toBe(6);
    expect(net.puts).toContain("big:3");
    expect([...(await accountDb().attachments.get("big"))!.uploaded].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(useAttachmentUploads.getState().progress.big).toBeUndefined();
  });
});
