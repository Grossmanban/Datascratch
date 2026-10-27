import { describe, expect, it } from "vitest";
import { diffText } from "./textDiff";

describe("diffText", () => {
  it("marks added and removed words", () => {
    expect(diffText("один два три", "один четыре три")).toEqual([
      { kind: "same", text: "один " },
      { kind: "removed", text: "два" },
      { kind: "added", text: "четыре" },
      { kind: "same", text: " три" },
    ]);
  });
  it("joins back to either side", () => {
    const a = "Начало\nвторая строка\nконец";
    const b = "Начало правка\nконец\nновая";
    const parts = diffText(a, b);
    expect(parts.filter((p) => p.kind !== "added").map((p) => p.text).join("")).toBe(a);
    expect(parts.filter((p) => p.kind !== "removed").map((p) => p.text).join("")).toBe(b);
  });
  it("handles empty sides", () => {
    expect(diffText("", "текст")).toEqual([{ kind: "added", text: "текст" }]);
    expect(diffText("текст", "")).toEqual([{ kind: "removed", text: "текст" }]);
    expect(diffText("", "")).toEqual([]);
  });
});
