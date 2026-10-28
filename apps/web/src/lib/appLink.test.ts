import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, isAppleMobile } from "./appLink";

describe("appLink", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("mirrors the web routes with the server host; the share key stays in the fragment", () => {
    const server = encodeURIComponent(new URL(location.origin).host);
    expect(appUrl({ kind: "invite", id: "abc" })).toBe(`ds://invite/abc?server=${server}`);
    expect(appUrl({ kind: "note", id: "n1" })).toBe(`ds://note/n1?server=${server}`);
    expect(appUrl({ kind: "share", id: "s1", key: "K_-9" })).toBe(`ds://share/s1?server=${server}#k=K_-9`);
  });
  it("tells iPhone and iPad (also as «Macintosh» with touch) from desktops", () => {
    const ua = (userAgent: string, maxTouchPoints = 0) => vi.stubGlobal("navigator", { userAgent, maxTouchPoints });
    ua("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(isAppleMobile()).toBe(true);
    ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5);
    expect(isAppleMobile()).toBe(true);
    ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0);
    expect(isAppleMobile()).toBe(false);
    ua("Mozilla/5.0 (Linux; Android 14)", 5);
    expect(isAppleMobile()).toBe(false);
  });
});
