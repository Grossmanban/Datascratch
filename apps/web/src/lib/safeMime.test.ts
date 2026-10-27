import { describe, expect, it } from "vitest";
import { isSvg, opensInline, safeBlobType } from "./safeMime";

describe("decrypted blob types (audit 2026-10-27)", () => {
  it("keeps raster images and PDF, shows plain text as text, makes everything else opaque", () => {
    expect(safeBlobType("image/png")).toBe("image/png");
    expect(safeBlobType("IMAGE/JPEG; q=1")).toBe("image/jpeg");
    expect(safeBlobType("application/pdf")).toBe("application/pdf");
    expect(safeBlobType("text/markdown")).toBe("text/plain;charset=utf-8");
    for (const m of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/xml", "application/javascript", "", null, undefined])
      expect(safeBlobType(m)).toBe("application/octet-stream");
    expect(opensInline("text/html")).toBe(false);
    expect(opensInline("image/webp")).toBe(true);
  });

  it("recognises an SVG by type or name", () => {
    expect(isSvg({ type: "image/svg+xml", name: "a" })).toBe(true);
    expect(isSvg({ type: "", name: "logo.SVG" })).toBe(true);
    expect(isSvg({ type: "image/png", name: "a.png" })).toBe(false);
  });
});
