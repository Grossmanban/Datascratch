import { describe, expect, it } from "vitest";
import { isUuidV7, uuidv7, uuidv7FromParts, uuidv7Timestamp } from "../src/ids.js";

describe("uuidv7", () => {
  it("produces lowercase v7 ids with the timestamp", () => {
    const now = Date.UTC(2026, 9, 25, 12);
    const id = uuidv7(now);
    expect(isUuidV7(id)).toBe(true);
    expect(uuidv7Timestamp(id)).toBe(now);
  });
  it("is monotonic within a millisecond and across clock steps back", () => {
    const ids: string[] = [];
    const t = Date.UTC(2030, 0, 1);
    for (let i = 0; i < 5000; i++) ids.push(uuidv7(t));
    ids.push(uuidv7(t - 1000));
    for (let i = 1; i < ids.length; i++) expect(ids[i]! > ids[i - 1]!).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("builds deterministic ids from parts", () => {
    const id = uuidv7FromParts(
      0x0192f3c4a1b2,
      new Uint8Array([0xff, 0xff, 0xff, 1, 2, 3, 4, 5, 6, 7]),
    );
    expect(id).toBe("0192f3c4-a1b2-7fff-bf01-020304050607");
  });
});

describe("guestDeviceId", () => {
  it("is guest: + 22 base64url chars", async () => {
    const { guestDeviceId } = await import("../src/ids.js");
    expect(guestDeviceId()).toMatch(/^guest:[A-Za-z0-9_-]{22}$/);
  });
});
