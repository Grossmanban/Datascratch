import {
  DEVICE_REVOKED_REASONS,
  SYNC_CLOSE_DEVICE_REVOKED,
  classifyApiFailure,
} from "@datascratch/shared/contracts";
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
      rotateRecoveryKeyRequest: {
        valid: [{ currentLoginKey: KEY, recoveryLoginKey: KEY, wrappedMasterKeyRecovery: "AQ" }],
        invalid: [
          {
            reason: "missing currentLoginKey",
            body: { recoveryLoginKey: KEY, wrappedMasterKeyRecovery: "AQ" },
          },
          {
            reason: "recoveryLoginKey is 31 bytes",
            body: {
              currentLoginKey: KEY,
              recoveryLoginKey: "A".repeat(42),
              wrappedMasterKeyRecovery: "AQ",
            },
          },
          {
            reason: "empty wrappedMasterKeyRecovery",
            body: { currentLoginKey: KEY, recoveryLoginKey: KEY, wrappedMasterKeyRecovery: "" },
          },
        ],
      },
      securityEvent: {
        valid: [
          { kind: "recovery_key_rotated", at: T, deviceId: "dev-1", deviceName: "iPad" },
          { kind: "recovery_used", at: T, deviceId: null, deviceName: null },
        ],
        invalid: [
          {
            reason: "unknown kind",
            body: { kind: "login", at: T, deviceId: null, deviceName: null },
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
      boxKey: {
        valid: [{ publicKey: KEY, wrappedSecretKey: "AQ" }],
        invalid: [
          { reason: "short public key", body: { publicKey: "AAAA", wrappedSecretKey: "AQ" } },
        ],
      },
      createInvitationRequest: {
        valid: [
          {
            invitationId: ID,
            target: { kind: "notebook", id: vid(3) },
            email: "A@B.co",
            role: "editor",
          },
          {
            invitationId: ID,
            target: { kind: "note", id: vid(3) },
            email: "a@b.co",
            role: "viewer",
          },
        ],
        invalid: [
          {
            reason: "unknown role",
            body: {
              invitationId: ID,
              target: { kind: "notebook", id: vid(3) },
              email: "a@b.co",
              role: "admin",
            },
          },
          {
            reason: "spaces cannot be shared",
            body: {
              invitationId: ID,
              target: { kind: "space", id: vid(3) },
              email: "a@b.co",
              role: "viewer",
            },
          },
        ],
      },
      incomingInvitation: {
        valid: [
          {
            id: ID,
            target: { kind: "notebook", id: vid(3) },
            from: { userId: vid(4), email: "owner@b.co" },
            role: "viewer",
            createdAt: T,
            expiresAt: T,
          },
        ],
        invalid: [
          {
            reason: "missing from",
            body: {
              id: ID,
              target: { kind: "notebook", id: vid(3) },
              role: "viewer",
              createdAt: T,
              expiresAt: T,
            },
          },
        ],
      },
      member: {
        valid: [
          {
            userId: vid(4),
            email: "m@b.co",
            role: "editor",
            status: "awaiting_key",
            joinedAt: T,
            accountCreatedAfterInvite: true,
          },
        ],
        invalid: [
          {
            reason: "unknown status",
            body: {
              userId: vid(4),
              email: "m@b.co",
              role: "editor",
              status: "left",
              joinedAt: T,
              accountCreatedAfterInvite: false,
            },
          },
        ],
      },
      putMemberKeyRequest: {
        valid: [{ version: 1, wrappedKey: "AQ" }],
        invalid: [{ reason: "version 0", body: { version: 0, wrappedKey: "AQ" } }],
      },
      rotateKeyRequest: {
        valid: [
          {
            version: 2,
            ownerWrappedKey: "AQ",
            previousKeyWrap: "AQ",
            memberKeys: [{ userId: vid(4), wrappedKey: "AQ" }],
          },
          {
            version: 3,
            ownerWrappedKey: "AQ",
            previousKeyWrap: "AQ",
            memberKeys: [],
            notebookKey: KEY,
          },
        ],
        invalid: [
          {
            reason: "rotation must produce version ≥ 2",
            body: { version: 1, ownerWrappedKey: "AQ", previousKeyWrap: "AQ", memberKeys: [] },
          },
          {
            reason: "duplicate member",
            body: {
              version: 2,
              ownerWrappedKey: "AQ",
              previousKeyWrap: "AQ",
              memberKeys: [
                { userId: vid(4), wrappedKey: "AQ" },
                { userId: vid(4), wrappedKey: "AQ" },
              ],
            },
          },
        ],
      },
      sharedItem: {
        valid: [
          {
            target: { kind: "notebook", id: vid(3) },
            owner: { userId: vid(4), email: "owner@b.co", publicKey: KEY },
            role: "editor",
            keyVersion: 2,
            wrappedKey: "AQ",
            keyChain: ["AQ"],
            docIds: [vid(3), vid(5)],
            addedAt: T,
            agentsMode: true,
          },
          {
            target: { kind: "note", id: vid(5) },
            owner: { userId: vid(4), email: "owner@b.co", publicKey: KEY },
            role: "viewer",
            keyVersion: 1,
            wrappedKey: null,
            keyChain: [],
            docIds: [vid(5)],
            addedAt: T,
          },
        ],
        invalid: [
          {
            reason: "agentsMode is not a boolean",
            body: {
              target: { kind: "note", id: vid(5) },
              owner: { userId: vid(4), email: "o@b.co", publicKey: KEY },
              role: "viewer",
              keyVersion: 1,
              wrappedKey: null,
              keyChain: [],
              docIds: [],
              addedAt: T,
              agentsMode: "yes",
            },
          },
          {
            reason: "missing owner public key",
            body: {
              target: { kind: "note", id: vid(5) },
              owner: { userId: vid(4), email: "o@b.co" },
              role: "viewer",
              keyVersion: 1,
              wrappedKey: null,
              keyChain: [],
              docIds: [],
              addedAt: T,
            },
          },
        ],
      },
      sharedByMeItem: {
        valid: [
          {
            target: { kind: "notebook", id: vid(3) },
            keyVersion: 2,
            keyRotationPending: true,
            pendingSinceVersion: 1,
            members: 3,
            awaitingKey: 1,
          },
          {
            target: { kind: "note", id: vid(5) },
            keyVersion: 1,
            keyRotationPending: false,
            pendingSinceVersion: null,
            members: 1,
            awaitingKey: 0,
          },
        ],
        invalid: [
          {
            reason: "negative count",
            body: {
              target: { kind: "note", id: vid(3) },
              keyVersion: 1,
              keyRotationPending: false,
              members: -1,
              awaitingKey: 0,
            },
          },
        ],
      },
      notebookKeyResponse: {
        valid: [
          { wrappedKey: "AQ" },
          {
            wrappedKey: "AQ",
            version: 3,
            keyChain: ["AQ", "AQ"],
            keyRotationPending: true,
            pendingSinceVersion: 2,
          },
          {
            wrappedKey: "AQ",
            version: 1,
            keyChain: [],
            keyRotationPending: false,
            pendingSinceVersion: null,
          },
        ],
        invalid: [
          { reason: "pendingSinceVersion 0", body: { wrappedKey: "AQ", pendingSinceVersion: 0 } },
        ],
      },
      docVersion: {
        valid: [
          { seq: 3, createdAt: T, deviceId: "dev-1" },
          {
            seq: 9,
            createdAt: T,
            deviceId: "dev-1",
            authors: [
              { kind: "user", userId: vid(4) },
              { kind: "agent", tokenId: "tok-1" },
            ],
          },
        ],
        invalid: [
          {
            reason: "author without kind",
            body: { seq: 9, createdAt: T, deviceId: "d", authors: [{ userId: vid(4) }] },
          },
        ],
      },
      apiError: {
        valid: [
          { error: { code: "conflict", message: "id exists with different content" } },
          { error: { code: "device_revoked", message: "device revoked", reason: "user" } },
          { error: { code: "rate_limited", message: "slow down", retryAfterMs: 5000 } },
        ],
        invalid: [
          { reason: "unknown code", body: { error: { code: "teapot", message: "" } } },
          {
            reason: "unknown revocation reason",
            body: { error: { code: "device_revoked", message: "", reason: "bored" } },
          },
        ],
      },
    };
  return {
    "api/bodies.json": {
      description:
        "REST bodies (api.md v1): every `valid` body must be accepted and every `invalid` one rejected by the schema of the same name (TS: `<name>Schema` in @datascratch/shared/contracts). Unknown extra fields are ignored.",
      cases,
    },
    "api/failures.json": failureVectors(),
  };
}

/** How a client classifies REST failures (D-53): only a revocation wipes data. */
function failureVectors() {
  const revoked = (reason: string) => ({
    error: { code: "device_revoked", message: "device revoked", reason },
  });
  const inputs: { name: string; status: number | null; body: unknown }[] = [
    ...DEVICE_REVOKED_REASONS.map((r) => ({
      name: `revoked: ${r}`,
      status: 401,
      body: revoked(r),
    })),
    { name: "revoked body as raw text", status: 401, body: JSON.stringify(revoked("recovery")) },
    {
      name: "expired access token",
      status: 401,
      body: { error: { code: "unauthorized", message: "token expired" } },
    },
    {
      name: "device_revoked without reason → reason user",
      status: 401,
      body: { error: { code: "device_revoked", message: "x" } },
    },
    { name: "unknown (newer) reason → reason user", status: 401, body: revoked("bored") },
    { name: "device_revoked on a non-401 is not a wipe", status: 403, body: revoked("user") },
    { name: "proxy 401 page", status: 401, body: "<html>401 Unauthorized</html>" },
    { name: "no response (offline, timeout)", status: null, body: null },
    { name: "gateway error page", status: 502, body: "<html>Bad Gateway</html>" },
    { name: "gateway timeout, empty", status: 504, body: "" },
    {
      name: "server error with body",
      status: 503,
      body: { error: { code: "internal", message: "maintenance" } },
    },
    { name: "conflict", status: 409, body: { error: { code: "conflict", message: "exists" } } },
    { name: "non-JSON 500", status: 500, body: "oops" },
  ];
  return {
    description:
      'REST failure classification (D-53, api.md; TS: classifyApiFailure). `status: null` = no HTTP response. `body` is parsed JSON or raw text (a string is JSON-parsed first; unparsable → no error body). A 401 with `error.code: "device_revoked"` is a revocation whatever its reason (unknown/absent → "user"); only it wipes local data; `unauthorized` → refresh the token; `network` → retry later. `syncCloseDeviceRevoked` is the WebSocket close code with the same meaning (close reason = revocation reason; unknown/absent → "user").',
    reasons: [...DEVICE_REVOKED_REASONS],
    syncCloseDeviceRevoked: SYNC_CLOSE_DEVICE_REVOKED,
    cases: inputs.map((c) => ({ ...c, expected: classifyApiFailure(c.status, c.body) })),
  };
}
