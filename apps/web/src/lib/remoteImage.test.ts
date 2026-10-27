import { afterEach, describe, expect, it, vi } from "vitest";

const requestResponse = vi.fn();
vi.mock("@/api/client", () => ({ requestResponse: (...a: unknown[]) => requestResponse(...a) }));
const { fetchRemoteImage } = await import("./remoteImage");

const reply = (body: BodyInit | null, status: number, headers: Record<string, string> = {}) =>
  requestResponse.mockResolvedValueOnce(new Response(body, { status, headers }));

describe("fetchRemoteImage (D-52, through POST /fetch-image)", () => {
  afterEach(() => requestResponse.mockReset());

  it("asks the server for the URL and returns its bytes as a File named after the URL", async () => {
    reply(new Uint8Array([1, 2, 3]), 200, { "content-type": "image/png" });
    const f = await fetchRemoteImage("https://example.com/a/cat%20photo.png?x=1");
    expect(requestResponse).toHaveBeenCalledWith("POST", "/fetch-image", expect.objectContaining({ body: { url: "https://example.com/a/cat%20photo.png?x=1" } }));
    expect([f.name, f.type, f.size]).toEqual(["cat photo.png", "image/png", 3]);
  });

  it("rejects with the server's reason so the editor keeps a link", async () => {
    reply(JSON.stringify({ error: "blocked" }), 422, { "content-type": "application/json" });
    await expect(fetchRemoteImage("http://10.0.0.1/x.png")).rejects.toMatchObject({ code: "blocked" });
    reply(null, 429);
    await expect(fetchRemoteImage("https://example.com/x.png")).rejects.toMatchObject({ code: "http_429" });
    reply("<svg/>", 200, { "content-type": "image/svg+xml" });
    await expect(fetchRemoteImage("https://example.com/x.svg")).rejects.toMatchObject({ code: "not_image" });
    requestResponse.mockRejectedValueOnce(new Error("offline"));
    await expect(fetchRemoteImage("https://example.com/x.png")).rejects.toThrow("offline");
  });

  it("never sends a non-http(s) URL to the server", async () => {
    await expect(fetchRemoteImage("file:///etc/passwd")).rejects.toMatchObject({ code: "blocked" });
    expect(requestResponse).not.toHaveBeenCalled();
  });
});
