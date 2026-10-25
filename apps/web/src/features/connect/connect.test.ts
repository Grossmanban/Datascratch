import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./ConnectPage";

describe("/connect returnTo", () => {
  (window as unknown as { __DS_SERVER_URL__: string }).__DS_SERVER_URL__ = "https://notes.example.com";
  it("accepts only the server's own consent screen", () => {
    expect(safeReturnTo("https://notes.example.com/oauth/authorize?client_id=x")).toBe("https://notes.example.com/oauth/authorize?client_id=x");
    expect(safeReturnTo("https://evil.example.com/oauth/authorize")).toBeNull();
    expect(safeReturnTo("https://notes.example.com/v1/me")).toBeNull();
    expect(safeReturnTo("javascript:alert(1)")).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
  });
});
