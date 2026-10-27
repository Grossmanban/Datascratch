import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRemoteImage, REMOTE_IMAGE_MAX_BYTES } from "./remoteImage";

function respond(body: Uint8Array, headers: Record<string, string>, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body as BodyInit, { status, headers })));
}

describe("fetchRemoteImage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns an image as a File named after the URL, without credentials", async () => {
    respond(new Uint8Array([1, 2, 3]), { "content-type": "image/png; charset=binary" });
    const f = await fetchRemoteImage("https://example.com/a/cat%20photo.png?x=1");
    expect(f.name).toBe("cat photo.png");
    expect(f.type).toBe("image/png");
    expect(f.size).toBe(3);
    expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({ credentials: "omit" });
  });

  it("rejects non-http(s) URLs, errors, non-images and files over the cap", async () => {
    await expect(fetchRemoteImage("data:image/png;base64,AA==")).rejects.toThrow();
    await expect(fetchRemoteImage("file:///etc/passwd")).rejects.toThrow();
    respond(new Uint8Array([1]), { "content-type": "image/png" }, 404);
    await expect(fetchRemoteImage("https://example.com/x.png")).rejects.toThrow("HTTP 404");
    respond(new Uint8Array([1]), { "content-type": "text/html" });
    await expect(fetchRemoteImage("https://example.com/x.png")).rejects.toThrow("not an image");
    respond(new Uint8Array([1]), { "content-type": "image/png", "content-length": String(REMOTE_IMAGE_MAX_BYTES + 1) });
    await expect(fetchRemoteImage("https://example.com/x.png")).rejects.toThrow("too large");
    // A body larger than the cap without a declared length is cut off while reading.
    respond(new Uint8Array(REMOTE_IMAGE_MAX_BYTES + 1), { "content-type": "image/jpeg" });
    await expect(fetchRemoteImage("https://example.com/x.jpg")).rejects.toThrow("too large");
  });

  it("rejects on a network error (CORS, CSP) and on a timeout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(fetchRemoteImage("https://example.com/x.png")).rejects.toThrow("Failed to fetch");
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: unknown, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener("abort", () => rej(new Error("aborted"))))),
    );
    await expect(fetchRemoteImage("https://example.com/x.png", 20)).rejects.toThrow("aborted");
  });
});
