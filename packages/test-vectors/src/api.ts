import { vid } from "./util.js";

const ID = vid(1);
const KEY = "A".repeat(43);
const SALT = "B".repeat(21) + "A";
const T = "2026-10-25T12:00:00.000Z";
const KDF = { alg: "argon2id13", ops: 3, mem: 67108864 };

/** Valid/invalid REST bodies (api.md) by schema name; names match `@datascratch/shared/contracts` exports. */
export function apiVectors() {
  const cases: Record<string, { valid: unknown[]; invalid: { reason: string; body: unknown }[] }> =
    {
      preloginRequest: {
        valid: [{ email: "a@b.co" }],
        invalid: [{ reason: "not an email", body: { email: "nope" } }],
      },
      preloginResponse: {
        valid: [{ salt: SALT, kdf: KDF }],
        invalid: [
          { reason: "salt is not 16 bytes", body: { salt: "AAAA", kdf: KDF } },
          {
            reason: "non-canonical salt (trailing bits set)",
            body: { salt: "B".repeat(22), kdf: KDF },
          },
          { reason: "unknown KDF", body: { salt: SALT, kdf: { ...KDF, alg: "scrypt" } } },
        ],
      },
      signupRequest: {
        valid: [
          {
            email: "a@b.co",
            salt: SALT,
            kdf: KDF,
            loginKey: KEY,
            recoveryLoginKey: KEY,
            wrappedMasterKeyPassword: "AQ",
            wrappedMasterKeyRecovery: "AQ",
            userId: ID,
            accountDocId: vid(2),
          },
          {
            email: "a@b.co",
            salt: SALT,
            kdf: KDF,
            loginKey: KEY,
            recoveryLoginKey: KEY,
            wrappedMasterKeyPassword: "AQ",
            wrappedMasterKeyRecovery: "AQ",
            userId: ID,
            accountDocId: vid(2),
            deviceName: "iPad Pro",
          },
        ],
        invalid: [
          {
            reason: "loginKey is not 32 bytes",
            body: {
              email: "a@b.co",
              salt: SALT,
              kdf: KDF,
              loginKey: "AA",
              recoveryLoginKey: KEY,
              wrappedMasterKeyPassword: "AQ",
              wrappedMasterKeyRecovery: "AQ",
              userId: ID,
              accountDocId: ID,
            },
          },
          {
            reason: "userId is not a UUIDv7",
            body: {
              email: "a@b.co",
              salt: SALT,
              kdf: KDF,
              loginKey: KEY,
              recoveryLoginKey: KEY,
              wrappedMasterKeyPassword: "AQ",
              wrappedMasterKeyRecovery: "AQ",
              userId: "0192f3c4-0000-4000-8000-000000000001",
              accountDocId: ID,
            },
          },
        ],
      },
      loginRequest: {
        valid: [{ email: "a@b.co", loginKey: KEY, deviceName: "iPhone" }],
        invalid: [{ reason: "missing deviceName", body: { email: "a@b.co", loginKey: KEY } }],
      },
      session: {
        valid: [
          {
            userId: ID,
            deviceId: "dev-1",
            accessToken: "at",
            refreshToken: "rt",
            accessExpiresAt: T,
            wrappedMasterKeyPassword: "AQ",
            accountDocId: vid(2),
          },
        ],
        invalid: [
          {
            reason: "missing deviceId",
            body: {
              userId: ID,
              accessToken: "at",
              refreshToken: "rt",
              accessExpiresAt: T,
              wrappedMasterKeyPassword: "AQ",
              accountDocId: vid(2),
            },
          },
          {
            reason: "timestamp without milliseconds",
            body: {
              userId: ID,
              deviceId: "d",
              accessToken: "at",
              refreshToken: "rt",
              accessExpiresAt: "2026-10-25T12:00:00Z",
              wrappedMasterKeyPassword: "AQ",
              accountDocId: vid(2),
            },
          },
        ],
      },
      recoveryFinishRequest: {
        valid: [
          {
            recoveryToken: "rt",
            salt: SALT,
            kdf: KDF,
            loginKey: KEY,
            wrappedMasterKeyPassword: "AQ",
          },
          {
            recoveryToken: "rt",
            salt: SALT,
            kdf: KDF,
            loginKey: KEY,
            wrappedMasterKeyPassword: "AQ",
            deviceName: "Mac",
          },
        ],
        invalid: [
          {
            reason: "missing recoveryToken",
            body: { salt: SALT, kdf: KDF, loginKey: KEY, wrappedMasterKeyPassword: "AQ" },
          },
        ],
      },
      createNotebookRequest: {
        valid: [
          { notebookId: ID, mode: "private", wrappedKey: "AQ" },
          { notebookId: ID, mode: "agent", wrappedKey: "AQ", notebookKey: KEY },
        ],
        invalid: [
          {
            reason: "agent mode without notebookKey",
            body: { notebookId: ID, mode: "agent", wrappedKey: "AQ" },
          },
          {
            reason: "private mode with notebookKey",
            body: { notebookId: ID, mode: "private", wrappedKey: "AQ", notebookKey: KEY },
          },
        ],
      },
      registerDocRequest: {
        valid: [
          { docId: ID, kind: "account", notebookId: null },
          { docId: ID, kind: "notebook", notebookId: ID },
          { docId: vid(3), kind: "note", notebookId: ID },
        ],
        invalid: [
          { reason: "note without notebook", body: { docId: ID, kind: "note", notebookId: null } },
          {
            reason: "notebook doc id differs from notebookId",
            body: { docId: vid(3), kind: "notebook", notebookId: ID },
          },
        ],
      },
      moveDocRequest: {
        valid: [{ notebookId: ID }],
        invalid: [
          { reason: "missing notebookId", body: {} },
          { reason: "not a UUIDv7", body: { notebookId: "nope" } },
          { reason: "null notebookId", body: { notebookId: null } },
        ],
      },
      attachmentStatus: {
        valid: [{ size: 1048676, chunkCount: 2, mime: "image/png", uploadedChunks: [0] }],
        invalid: [{ reason: "missing mime", body: { size: 1, chunkCount: 1, uploadedChunks: [] } }],
      },
      createShareRequest: {
        valid: [
          {
            shareId: ID,
            target: { kind: "note", id: vid(3) },
            permission: "view",
            expiresAt: null,
          },
          { shareId: ID, target: { kind: "notebook", id: vid(3) }, permission: "edit" },
        ],
        invalid: [
          {
            reason: "unknown permission",
            body: { shareId: ID, target: { kind: "note", id: vid(3) }, permission: "admin" },
          },
        ],
      },
      apiError: {
        valid: [{ error: { code: "conflict", message: "id exists with different content" } }],
        invalid: [{ reason: "unknown code", body: { error: { code: "teapot", message: "" } } }],
      },
    };
  return {
    "api/bodies.json": {
      description:
        "REST bodies (api.md v1): every `valid` body must be accepted and every `invalid` one rejected by the schema of the same name (TS: `<name>Schema` in @datascratch/shared/contracts). Unknown extra fields are ignored.",
      cases,
    },
  };
}
