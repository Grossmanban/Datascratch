import { describe, expect, it } from "vitest";
import {
  ad,
  decodeRecoveryKey,
  derivePasswordKeys,
  encodeRecoveryKey,
  open,
  randomKey,
  seal,
  unwrapKey,
  wrapKey,
} from "./crypto";
import { fromBase64Url, toBase64Url } from "./base64url";
import { uuidv7 } from "./uuid";

const FAST = { alg: "argon2id13" as const, ops: 1, mem: 8192 * 1024 };

describe("crypto stub", () => {
  it("envelope roundtrip and ad binding", async () => {
    const key = randomKey();
    const msg = new TextEncoder().encode("hello");
    const env = await seal(key, msg, ad.doc("a"));
    expect(env[0]).toBe(1);
    expect(env.length).toBe(1 + 24 + msg.length + 16);
    expect(new TextDecoder().decode(await open(key, env, ad.doc("a")))).toBe("hello");
    await expect(open(key, env, ad.doc("b"))).rejects.toThrow();
  });

  it("derives independent, deterministic keys", async () => {
    const salt = new Uint8Array(16).fill(7);
    const a = await derivePasswordKeys("pässword", salt, FAST);
    const b = await derivePasswordKeys("pässword".normalize("NFD"), salt, FAST);
    expect(toBase64Url(a.loginKey)).toBe(toBase64Url(b.loginKey));
    expect(toBase64Url(a.loginKey)).not.toBe(toBase64Url(a.passwordKey));
  });

  it("wraps keys", async () => {
    const master = randomKey();
    const nb = randomKey();
    const w = await wrapKey(master, nb, ad.notebookKey("x"));
    expect(await unwrapKey(master, w, ad.notebookKey("x"))).toEqual(nb);
  });

  it("recovery key format roundtrips", () => {
    const key = randomKey();
    const text = encodeRecoveryKey(key);
    expect(text).toMatch(/^DS1(-[0-9A-HJKMNP-TV-Z]{4}){13}$/);
    expect(decodeRecoveryKey(text.toLowerCase())).toEqual(key);
  });

  it("base64url and uuidv7", () => {
    const bytes = new Uint8Array([251, 255, 0, 1]);
    expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
    const ids = Array.from({ length: 50 }, uuidv7);
    expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect([...ids].sort()).toEqual(ids);
  });
});
