import { describe, expect, it } from "vitest";
import { checkedPrelogin, UnsafeKdfError } from "./kdfBounds";

const salt = "wezLiGhjVonKvlt_8uu95w";
const pre = (kdf: Record<string, unknown>) => ({ salt, kdf: { alg: "argon2id13", ops: 3, mem: 67108864, ...kdf } });

describe("prelogin KDF bounds (crypto.md §2, audit 2026-10-27)", () => {
  it("accepts the default and parameters raised within bounds", () => {
    expect(checkedPrelogin(pre({})).kdf).toEqual({ alg: "argon2id13", ops: 3, mem: 67108864 });
    expect(checkedPrelogin(pre({ ops: 10, mem: 256 * 1024 * 1024 })).kdf.ops).toBe(10);
  });

  it("refuses a downgrade, an excessive value, another algorithm or a malformed response", () => {
    for (const bad of [
      pre({ ops: 2 }),
      pre({ ops: 1, mem: 8 * 1024 * 1024 }),
      pre({ mem: 64 * 1024 * 1024 - 1 }),
      pre({ ops: 11 }),
      pre({ mem: 256 * 1024 * 1024 + 1 }),
      pre({ alg: "argon2i13" }),
      pre({ ops: 3.5 }),
      { salt },
      { salt: "short", kdf: pre({}).kdf },
      null,
    ])
      expect(() => checkedPrelogin(bad)).toThrow(UnsafeKdfError);
  });
});
