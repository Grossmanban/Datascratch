import { describe, expect, it } from "vitest";
import en from "./en";
import ru from "./ru";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : keys(v as object, `${prefix}${k}.`)));
}

describe("i18n", () => {
  it("ru and en have the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(ru).sort());
  });
});
