import { vid } from "./util.js";

const doc = vid(1);
const P = "AQIDBA";

export function syncVectors() {
  const valid = {
    client: [
      {
        type: "hello",
        protocol: 1,
        auth: { kind: "user", accessToken: "at-123" },
        deviceId: "dev-1",
        client: { platform: "ios", version: "1.0.0" },
      },
      {
        type: "hello",
        protocol: 1,
        auth: { kind: "guest", shareId: vid(5), guestToken: "gt-1" },
        deviceId: "dev-2",
        client: { platform: "web", version: "1.0.0" },
      },
      {
        type: "subscribe",
        docs: [
          { docId: doc, since: 0 },
          { docId: vid(2), since: 42 },
        ],
      },
      { type: "unsubscribe", docIds: [doc] },
      { type: "push", docId: doc, clientMsgId: vid(30), payload: P },
      { type: "snapshot", docId: doc, clientMsgId: vid(31), baseSeq: 42, payload: P },
      { type: "awareness", docId: doc, payload: P },
    ],
    server: [
      { type: "welcome", userId: vid(10), serverTime: "2026-10-25T12:00:00.000Z", protocol: 1 },
      { type: "welcome", userId: null, serverTime: "2026-10-25T12:00:00.000Z", protocol: 1 },
      {
        type: "updates",
        docId: doc,
        snapshot: { seq: 40, payload: P },
        items: [{ seq: 41, payload: P, deviceId: "dev-1" }],
        upToDate: false,
      },
      { type: "updates", docId: doc, snapshot: null, items: [], upToDate: true },
      { type: "update", docId: doc, seq: 43, payload: P, deviceId: "dev-3" },
      { type: "ack", docId: doc, clientMsgId: vid(30), seq: 44 },
      { type: "awareness", docId: doc, payload: P, deviceId: "dev-3" },
      { type: "error", code: "payload_too_large", message: "update exceeds 2 MiB", ref: vid(30) },
      { type: "error", code: "unauthorized", message: "token expired" },
      { type: "error", code: "bad_request", message: "invalid message" },
      { type: "error", code: "rate_limited", message: "too many messages", retryAfterMs: 5000 },
      { type: "update", docId: doc, seq: 45, payload: P, deviceId: "guest:AAECAwQFBgcICQoLDA0ODw" },
    ],
  };
  const invalid = {
    client: [
      { reason: "unknown type", message: { type: "bogus" } },
      { reason: "wrong protocol", message: { ...valid.client[0], protocol: 2 } },
      {
        reason: "unknown platform",
        message: { ...valid.client[0], client: { platform: "android", version: "1" } },
      },
      {
        reason: "payload is not base64url",
        message: { type: "push", docId: doc, clientMsgId: "m", payload: "AQ==" },
      },
      {
        reason: "docId is not a lowercase UUIDv7",
        message: { type: "push", docId: doc.toUpperCase(), clientMsgId: "m", payload: P },
      },
      {
        reason: "negative since",
        message: { type: "subscribe", docs: [{ docId: doc, since: -1 }] },
      },
      {
        reason: "duplicate docId in subscribe",
        message: {
          type: "subscribe",
          docs: [
            { docId: doc, since: 0 },
            { docId: doc, since: 5 },
          ],
        },
      },
      {
        reason: "more than 1000 documents in one subscribe",
        message: {
          type: "subscribe",
          docs: Array.from({ length: 1001 }, (_, i) => ({ docId: vid(10_000 + i), since: 0 })),
        },
      },
      { reason: "empty subscribe", message: { type: "subscribe", docs: [] } },
      {
        reason: "fractional baseSeq",
        message: { type: "snapshot", docId: doc, clientMsgId: "m", baseSeq: 1.5, payload: P },
      },
    ],
    server: [
      {
        reason: "seq must be positive",
        message: { type: "update", docId: doc, seq: 0, payload: P, deviceId: "d" },
      },
      { reason: "unknown error code", message: { type: "error", code: "teapot", message: "" } },
      {
        reason: "missing upToDate",
        message: { type: "updates", docId: doc, snapshot: null, items: [] },
      },
    ],
  };
  return {
    "sync/messages.json": {
      description:
        "Sync protocol v1 frames (sync-protocol.md). Every `valid` message must parse; every `invalid` one must be rejected. Unknown extra fields are ignored by readers.",
      valid,
      invalid,
    },
  };
}
