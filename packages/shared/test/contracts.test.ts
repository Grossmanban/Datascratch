import { describe, expect, it } from "vitest";
import {
  AD,
  classifyApiFailure,
  createNotebookRequestSchema,
  emailSchema,
  isoDateTimeSchema,
  parseClientMessage,
  parseServerMessage,
  registerDocRequestSchema,
  signupRequestSchema,
  uuidSchema,
} from "../src/contracts/index.js";

const ID = "0192f3c4-a1b2-7c3d-8e4f-0123456789ab";
const KEY = "A".repeat(43);

describe("primitive schemas", () => {
  it("accepts only lowercase UUIDv7", () => {
    expect(uuidSchema.safeParse(ID).success).toBe(true);
    expect(uuidSchema.safeParse(ID.toUpperCase()).success).toBe(false);
    expect(uuidSchema.safeParse("0192f3c4-a1b2-4c3d-8e4f-0123456789ab").success).toBe(false);
  });
  it("accepts ISO timestamps with ms and Z only", () => {
    expect(isoDateTimeSchema.safeParse("2026-10-25T12:00:00.000Z").success).toBe(true);
    expect(isoDateTimeSchema.safeParse("2026-10-25T12:00:00Z").success).toBe(false);
    expect(isoDateTimeSchema.safeParse("2026-13-45T12:00:00.000Z").success).toBe(false);
  });
  it("normalizes emails", () => {
    expect(emailSchema.parse("  Foo@Example.COM ")).toBe("foo@example.com");
  });
});

describe("ad strings", () => {
  it("matches crypto.md §3", () => {
    expect(AD.doc(ID)).toBe(`ds1|doc|${ID}`);
    expect(AD.attachmentChunk(ID, 3, true)).toBe(`ds1|att|${ID}|3|1`);
    expect(AD.notebookKeyServer(ID)).toBe(`ds1|key|notebook-server|${ID}`);
  });
});

describe("sync messages", () => {
  it("parses valid client and server frames", () => {
    expect(
      parseClientMessage(
        JSON.stringify({
          type: "hello",
          protocol: 1,
          auth: { kind: "user", accessToken: "t" },
          deviceId: "dev",
          client: { platform: "web", version: "0.1.0" },
        }),
      )?.type,
    ).toBe("hello");
    expect(
      parseServerMessage(JSON.stringify({ type: "ack", docId: ID, clientMsgId: "m1", seq: 4 })),
    ).toEqual({
      type: "ack",
      docId: ID,
      clientMsgId: "m1",
      seq: 4,
    });
  });
  it("rejects garbage", () => {
    expect(parseServerMessage("{")).toBeNull();
    expect(parseServerMessage(JSON.stringify({ type: "ack", docId: ID }))).toBeNull();
    expect(
      parseClientMessage(
        JSON.stringify({ type: "push", docId: ID, clientMsgId: "m", payload: "a+b" }),
      ),
    ).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: "hello", protocol: 2 }))).toBeNull();
  });
});

describe("api bodies", () => {
  it("validates signup", () => {
    const body = {
      email: "a@b.co",
      salt: "A".repeat(22),
      kdf: { alg: "argon2id13", ops: 3, mem: 67108864 },
      loginKey: KEY,
      recoveryLoginKey: KEY,
      wrappedMasterKeyPassword: "AQ",
      wrappedMasterKeyRecovery: "AQ",
      userId: ID,
      accountDocId: ID,
    };
    expect(signupRequestSchema.safeParse(body).success).toBe(true);
    expect(signupRequestSchema.safeParse({ ...body, loginKey: "short" }).success).toBe(false);
  });
  it("requires notebookKey exactly for agent mode", () => {
    const base = { notebookId: ID, wrappedKey: "AQ" };
    expect(createNotebookRequestSchema.safeParse({ ...base, mode: "private" }).success).toBe(true);
    expect(createNotebookRequestSchema.safeParse({ ...base, mode: "agent" }).success).toBe(false);
    expect(
      createNotebookRequestSchema.safeParse({ ...base, mode: "agent", notebookKey: KEY }).success,
    ).toBe(true);
    expect(
      createNotebookRequestSchema.safeParse({ ...base, mode: "private", notebookKey: KEY }).success,
    ).toBe(false);
  });
  it("checks doc registration consistency", () => {
    expect(
      registerDocRequestSchema.safeParse({ docId: ID, kind: "account", notebookId: null }).success,
    ).toBe(true);
    expect(
      registerDocRequestSchema.safeParse({ docId: ID, kind: "note", notebookId: null }).success,
    ).toBe(false);
    expect(
      registerDocRequestSchema.safeParse({ docId: ID, kind: "notebook", notebookId: ID }).success,
    ).toBe(true);
  });
});

describe("canonical base64url", () => {
  it("rejects non-zero trailing bits and impossible lengths", async () => {
    const { base64UrlSchema, saltSchema } = await import("../src/contracts/index.js");
    expect(base64UrlSchema.safeParse("AA").success).toBe(true);
    expect(base64UrlSchema.safeParse("AB").success).toBe(false);
    expect(base64UrlSchema.safeParse("AAA").success).toBe(true);
    expect(base64UrlSchema.safeParse("AAB").success).toBe(false);
    expect(base64UrlSchema.safeParse("A").success).toBe(false);
    expect(saltSchema.safeParse("B".repeat(22)).success).toBe(false);
    expect(saltSchema.safeParse("B".repeat(21) + "A").success).toBe(true);
  });
});

describe("NoteMeta.createdByAgent (D-45)", () => {
  const base = {
    id: ID,
    folderId: null,
    parentNoteId: null,
    title: "t",
    kind: "note",
    dailyDate: null,
    tags: [],
    icon: null,
    coverThumb: null,
    wrappedKey: KEY,
    createdAt: "2026-10-26T09:00:00.000Z",
    updatedAt: "2026-10-26T09:00:00.000Z",
    trashedAt: null,
    order: 0,
  };
  it("is optional and nullable, so older notes stay valid", async () => {
    const { noteMetaSchema } = await import("../src/contracts/document.js");
    expect(noteMetaSchema.safeParse(base).success).toBe(true);
    expect(noteMetaSchema.safeParse({ ...base, createdByAgent: null }).success).toBe(true);
    expect(
      noteMetaSchema.safeParse({
        ...base,
        createdByAgent: { agentId: ID, agentName: "Claude", at: "2026-10-26T09:00:00.000Z" },
      }).success,
    ).toBe(true);
    expect(noteMetaSchema.safeParse({ ...base, createdByAgent: { agentId: ID } }).success).toBe(
      false,
    );
  });
});

describe("device revocation (D-53)", () => {
  const revoked = { error: { code: "device_revoked", message: "x", reason: "recovery" } };
  it("classifies only a well-formed 401 device_revoked as a revocation", () => {
    expect(classifyApiFailure(401, revoked)).toEqual({
      kind: "device_revoked",
      reason: "recovery",
    });
    expect(classifyApiFailure(401, JSON.stringify(revoked))).toEqual({
      kind: "device_revoked",
      reason: "recovery",
    });
    // A missing / newer reason is still a revocation; wrong status or proxy pages never are.
    const noReason = { error: { code: "device_revoked", message: "x" } };
    expect(classifyApiFailure(401, noReason)).toEqual({ kind: "device_revoked", reason: "user" });
    const newReason = { error: { code: "device_revoked", message: "x", reason: "future" } };
    expect(classifyApiFailure(401, newReason)).toEqual({ kind: "device_revoked", reason: "user" });
    expect(classifyApiFailure(403, revoked).kind).toBe("error");
    expect(classifyApiFailure(401, "<html>401</html>").kind).toBe("unauthorized");
  });
  it("keeps token expiry and network failures apart", () => {
    const expired = { error: { code: "unauthorized", message: "expired" } };
    expect(classifyApiFailure(401, expired)).toEqual({ kind: "unauthorized" });
    expect(classifyApiFailure(null, null)).toEqual({ kind: "network" });
    expect(classifyApiFailure(503, "<html>bad gateway</html>")).toEqual({ kind: "network" });
    const internal = { error: { code: "internal", message: "boom" } };
    expect(classifyApiFailure(500, internal)).toEqual({
      kind: "error",
      status: 500,
      code: "internal",
      message: "boom",
    });
  });
  it("parses the sync error frame with a reason", () => {
    const msg = parseServerMessage(
      JSON.stringify({ type: "error", code: "device_revoked", message: "x", reason: "user" }),
    );
    expect(msg).toMatchObject({ code: "device_revoked", reason: "user" });
  });
});
