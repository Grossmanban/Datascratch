import { afterEach, describe, expect, it, vi } from "vitest";
import { NetworkError, request } from "./client";

describe("API requests on flaky networks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retries an idempotent GET after a network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(request<{ ok: boolean }>("GET", "/health", { auth: false })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not repeat a write: it fails as a network error (the outbox resends it)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(request("POST", "/docs", { auth: false, body: { a: 1 } })).rejects.toBeInstanceOf(NetworkError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
