import { describe, expect, it } from "vitest";
import { orderBetween } from "./ymap";

describe("orderBetween", () => {
  it("places items between neighbours without renumbering", () => {
    expect(orderBetween(undefined, undefined)).toBe(1);
    expect(orderBetween(1, undefined)).toBe(2);
    expect(orderBetween(undefined, 1)).toBe(0);
    expect(orderBetween(1, 2)).toBe(1.5);
  });
});
