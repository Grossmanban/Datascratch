import { describe, expect, it } from "vitest";
import { iconGlyph, withIcon } from "./glyph";

describe("icon glyphs (iOS stores SF Symbol names)", () => {
  it("keeps emoji as they are", () => {
    expect(iconGlyph("📓")).toBe("📓");
    expect(withIcon("✨", "Личное")).toBe("✨ Личное");
  });
  it("never shows an SF Symbol name as text", () => {
    expect(withIcon("house", "Личное")).toBe("🏠 Личное");
    expect(iconGlyph("book.closed")).toBe("📕");
    expect(iconGlyph("folder.fill")).toBe("📁");
    expect(iconGlyph("some.unknown.symbol")).toBe("");
    expect(withIcon("some.unknown.symbol", "Работа")).toBe("Работа");
  });
  it("handles a missing icon", () => {
    expect(withIcon(null, "Без иконки")).toBe("Без иконки");
    expect(iconGlyph(undefined)).toBe("");
  });
});
