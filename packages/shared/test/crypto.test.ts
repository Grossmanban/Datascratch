import { beforeAll, describe, expect, it } from "vitest";
import {
  AD,
  ATTACHMENT_CHUNK_BYTES,
  CryptoError,
  attachmentChunkCount,
  attachmentCiphertextSize,
  buildShareLink,
  bytesEqual,
  createAccountKeys,
  decodeCrockford,
  decryptAttachment,
  decryptDocUpdate,
  decryptEnvelope,
  derivePasswordKeys,
  deriveRecoveryLoginKey,
  encodeCrockford,
  encryptAttachment,
  encryptDocUpdate,
  encryptEnvelope,
  formatRecoveryKey,
  fromBase64Url,
  generateKey,
  initCrypto,
  parseRecoveryKey,
  parseShareLink,
  rekeyPassword,
  toBase64Url,
  unwrapMasterKeyWithPassword,
  unwrapMasterKeyWithRecovery,
  unwrapNoteKey,
  unwrapNotebookKey,
  utf8,
  wrapNoteKey,
  wrapNotebookKey,
  type KdfParams,
} from "../src/index.js";

// Cheap KDF parameters for flow tests; the real parameters are covered by vectors.
const FAST_KDF: KdfParams = { alg: "argon2id13", ops: 1, mem: 8 * 1024 * 1024 };
const USER = "0192f3c4-0000-7000-8000-000000000001";

beforeAll(async () => {
  await initCrypto();
});

describe("base64url", () => {
  it("round-trips every length", () => {
    for (let n = 0; n < 70; n++) {
      const bytes = new Uint8Array(n).map((_, i) => (i * 37 + n) & 255);
      const text = toBase64Url(bytes);
      expect(text).not.toMatch(/[=+/]/);
      expect(fromBase64Url(text)).toEqual(bytes);
    }
  });
  it("matches Node's base64url", () => {
    const bytes = new Uint8Array(257).map((_, i) => (i * 131) & 255);
    expect(toBase64Url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
  });
  it("rejects padding, bad characters and non-canonical forms", () => {
    expect(() => fromBase64Url("AA==")).toThrow();
    expect(() => fromBase64Url("A")).toThrow();
    expect(() => fromBase64Url("A+B/")).toThrow();
    expect(() => fromBase64Url("AB")).toThrow(); // trailing bits set
    expect(fromBase64Url("AA")).toEqual(new Uint8Array([0]));
  });
});

describe("envelope", () => {
  it("encrypts with version byte and nonce prefix", () => {
    const key = generateKey();
    const env = encryptEnvelope(key, utf8("hello"), "ds1|doc|x");
    expect(env[0]).toBe(1);
    expect(env.length).toBe(1 + 24 + 5 + 16);
    expect(decryptEnvelope(key, env, "ds1|doc|x")).toEqual(utf8("hello"));
  });
  it("binds ciphertext to ad and key", () => {
    const key = generateKey();
    const env = encryptEnvelope(key, utf8("hello"), "ds1|doc|a");
    expect(() => decryptEnvelope(key, env, "ds1|doc|b")).toThrow(CryptoError);
    expect(() => decryptEnvelope(generateKey(), env, "ds1|doc|a")).toThrow(CryptoError);
    const tampered = env.slice();
    tampered[30]! ^= 1;
    expect(() => decryptEnvelope(key, tampered, "ds1|doc|a")).toThrow(/decryption failed/);
  });
  it("rejects unknown versions and short input", () => {
    const key = generateKey();
    const env = encryptEnvelope(key, utf8("x"), "a");
    env[0] = 2;
    expect(() => decryptEnvelope(key, env, "a")).toThrow(/version/);
    expect(() => decryptEnvelope(key, new Uint8Array(10), "a")).toThrow(/short/);
  });
  it("is deterministic with a fixed nonce", () => {
    const key = new Uint8Array(32).fill(7);
    const nonce = new Uint8Array(24).fill(9);
    const a = encryptEnvelope(key, utf8("same"), "ad", { nonce });
    const b = encryptEnvelope(key, utf8("same"), "ad", { nonce });
    expect(a).toEqual(b);
  });
});

describe("kdf", () => {
  it("derives independent loginKey and passwordKey", () => {
    const salt = new Uint8Array(16).fill(1);
    const k = derivePasswordKeys("correct horse", salt, FAST_KDF);
    expect(k.loginKey).toHaveLength(32);
    expect(k.passwordKey).toHaveLength(32);
    expect(toBase64Url(k.loginKey)).not.toBe(toBase64Url(k.passwordKey));
    expect(derivePasswordKeys("correct horse", salt, FAST_KDF).loginKey).toEqual(k.loginKey);
  });
  it("normalizes the password with NFKC", () => {
    const salt = new Uint8Array(16).fill(2);
    // "ﬁ" (U+FB01) → "fi"; precomposed vs decomposed "é".
    expect(derivePasswordKeys("ﬁ", salt, FAST_KDF).loginKey).toEqual(
      derivePasswordKeys("fi", salt, FAST_KDF).loginKey,
    );
    expect(derivePasswordKeys("é", salt, FAST_KDF).passwordKey).toEqual(
      derivePasswordKeys("é", salt, FAST_KDF).passwordKey,
    );
  });
  it("rejects bad salt", () => {
    expect(() => derivePasswordKeys("x", new Uint8Array(8), FAST_KDF)).toThrow(/salt/);
  });
});

describe("recovery key", () => {
  it("formats as DS1- plus 13 groups of 4 Crockford chars", () => {
    const key = new Uint8Array(32).map((_, i) => i * 8);
    const text = formatRecoveryKey(key);
    expect(text).toMatch(/^DS1-([0-9A-HJKMNP-TV-Z]{4}-){12}[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(parseRecoveryKey(text)).toEqual(key);
  });
  it("parses leniently", () => {
    const key = generateKey();
    const text = formatRecoveryKey(key);
    const sloppy =
      " ds1-" +
      text.slice(4).toLowerCase().replace(/-/g, " ").replace(/0/g, "o").replace(/1/g, "l") +
      " ";
    expect(parseRecoveryKey(sloppy)).toEqual(key);
    expect(parseRecoveryKey(text.slice(4))).toEqual(key);
  });
  it("rejects wrong length, invalid chars and padding bits", () => {
    expect(() => parseRecoveryKey("DS1-ABCD")).toThrow(CryptoError);
    const text = encodeCrockford(new Uint8Array(32));
    expect(() => parseRecoveryKey(text.slice(0, 51) + "U")).toThrow(CryptoError);
    expect(() => parseRecoveryKey(text.slice(0, 51) + "1")).toThrow(/padding/);
  });
  it("crockford matches a known encoding", () => {
    expect(encodeCrockford(utf8("foobar"))).toBe("CSQPYRK1E8");
    expect(decodeCrockford("CSQPYRK1E8", 6)).toEqual(utf8("foobar"));
  });
});

describe("account flows", () => {
  it("signup → login → recovery → password change keeps the masterKey", () => {
    const acc = createAccountKeys("pw-1", USER, FAST_KDF);
    const login = derivePasswordKeys("pw-1", acc.salt, FAST_KDF);
    expect(login.loginKey).toEqual(acc.loginKey);
    expect(
      unwrapMasterKeyWithPassword(acc.wrappedMasterKeyPassword, login.passwordKey, USER),
    ).toEqual(acc.masterKey);

    const recoveryKey = parseRecoveryKey(acc.recoveryKeyText);
    expect(deriveRecoveryLoginKey(recoveryKey)).toEqual(acc.recoveryLoginKey);
    const master = unwrapMasterKeyWithRecovery(acc.wrappedMasterKeyRecovery, recoveryKey, USER);
    expect(master).toEqual(acc.masterKey);

    const next = rekeyPassword(master, "pw-2", USER, FAST_KDF);
    expect(next.loginKey).not.toEqual(acc.loginKey);
    expect(
      unwrapMasterKeyWithPassword(next.wrappedMasterKeyPassword, next.passwordKey, USER),
    ).toEqual(acc.masterKey);
  });
  it("wrapped keys are bound to their ids", () => {
    const master = generateKey();
    const nb = generateKey();
    const wrapped = wrapNotebookKey(nb, master, "nb-1");
    expect(unwrapNotebookKey(wrapped, master, "nb-1")).toEqual(nb);
    expect(() => unwrapNotebookKey(wrapped, master, "nb-2")).toThrow(CryptoError);
    const note = generateKey();
    const w2 = wrapNoteKey(note, nb, "n-1");
    expect(unwrapNoteKey(w2, nb, "n-1")).toEqual(note);
    // A note key wrap cannot pass for a notebook key wrap.
    expect(() => unwrapNotebookKey(w2, nb, "n-1")).toThrow(CryptoError);
  });
  it("doc updates use the doc ad", () => {
    const key = generateKey();
    const env = encryptDocUpdate(key, "d1", utf8("u"));
    expect(decryptEnvelope(key, env, AD.doc("d1"))).toEqual(utf8("u"));
    expect(() => decryptDocUpdate(key, "d2", env)).toThrow(CryptoError);
  });
});

describe("attachments", () => {
  it("chunks at 1 MiB and round-trips", () => {
    const key = generateKey();
    const data = new Uint8Array(ATTACHMENT_CHUNK_BYTES * 2 + 5).map((_, i) => i & 255);
    const chunks = encryptAttachment(key, "att", data);
    expect(chunks).toHaveLength(3);
    expect(attachmentChunkCount(data.length)).toBe(3);
    expect(chunks.reduce((s, c) => s + c.length, 0)).toBe(attachmentCiphertextSize(data.length));
    expect(bytesEqual(decryptAttachment(key, "att", chunks), data)).toBe(true);
  });
  it("detects truncation, reordering and foreign chunks", () => {
    const key = generateKey();
    const data = new Uint8Array(ATTACHMENT_CHUNK_BYTES + 1);
    const chunks = encryptAttachment(key, "att", data);
    expect(() => decryptAttachment(key, "att", chunks.slice(0, 1))).toThrow(CryptoError);
    expect(() => decryptAttachment(key, "att", [chunks[1]!, chunks[0]!])).toThrow(CryptoError);
    expect(() => decryptAttachment(key, "other", chunks)).toThrow(CryptoError);
  });
  it("encrypts an empty file as one empty chunk", () => {
    const key = generateKey();
    const chunks = encryptAttachment(key, "att", new Uint8Array(0));
    expect(chunks).toHaveLength(1);
    expect(decryptAttachment(key, "att", chunks)).toEqual(new Uint8Array(0));
  });
});

describe("share links", () => {
  it("round-trips and keeps the key in the fragment", () => {
    const key = generateKey();
    const link = buildShareLink(
      "https://app.example/",
      "0192f3c4-0000-7000-8000-000000000009",
      key,
    );
    expect(link).toMatch(/^https:\/\/app\.example\/s\/0192f3c4-0000-7000-8000-000000000009#k=/);
    const parsed = parseShareLink(link);
    expect(parsed.key).toEqual(key);
    expect(parsed.shareId).toBe("0192f3c4-0000-7000-8000-000000000009");
  });
});

describe("moving a note", () => {
  it("rewraps the noteKey for the target notebook", async () => {
    const { rewrapNoteKey } = await import("../src/index.js");
    const a = generateKey();
    const b = generateKey();
    const note = generateKey();
    const moved = rewrapNoteKey(wrapNoteKey(note, a, "n1"), a, b, "n1");
    expect(unwrapNoteKey(moved, b, "n1")).toEqual(note);
    expect(() => unwrapNoteKey(moved, a, "n1")).toThrow(CryptoError);
  });
});
