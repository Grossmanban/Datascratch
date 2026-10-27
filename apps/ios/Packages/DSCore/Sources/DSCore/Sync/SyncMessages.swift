import Foundation

// Messages of the WebSocket sync protocol (sync-protocol.md v1; mirrors
// packages/shared/src/contracts/sync.ts). Text frames, one JSON object each, `type` field.
// Binary payloads are base64url without padding.

public enum SyncProtocol {
    public static let version = 1
    public static let path = "/v1/sync"
    public static let pingInterval: Duration = .seconds(25)
    /// Decoded payload limits (§7).
    public static let maxUpdateBytes = 2 * 1024 * 1024
    public static let maxSnapshotBytes = 50 * 1024 * 1024
    /// Documents in one `subscribe` (§2): more go in several messages.
    public static let maxSubscribeDocs = 1000
}

public enum SyncAuth: Codable, Hashable, Sendable {
    case user(accessToken: String)
    case guest(shareId: String, guestToken: String)

    enum CodingKeys: String, CodingKey { case kind, accessToken, shareId, guestToken }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .kind) {
        case "user": self = .user(accessToken: try c.decode(String.self, forKey: .accessToken))
        case "guest": self = .guest(shareId: try SyncValidation.uuid(c, .shareId), guestToken: try c.decode(String.self, forKey: .guestToken))
        case let k: throw DecodingError.dataCorruptedError(forKey: .kind, in: c, debugDescription: "unknown auth kind \(k)")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .user(let token):
            try c.encode("user", forKey: .kind)
            try c.encode(token, forKey: .accessToken)
        case .guest(let shareId, let token):
            try c.encode("guest", forKey: .kind)
            try c.encode(shareId, forKey: .shareId)
            try c.encode(token, forKey: .guestToken)
        }
    }
}

public struct SubscribeEntry: Codable, Hashable, Sendable {
    public var docId: String
    public var since: Int64

    public init(docId: String, since: Int64) {
        self.docId = docId
        self.since = since
    }

    enum CodingKeys: String, CodingKey { case docId, since }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        docId = try SyncValidation.uuid(c, .docId)
        since = try SyncValidation.nonNegative(c, .since)
    }
}

public struct ClientInfo: Codable, Hashable, Sendable {
    public var platform: String
    public var version: String

    public init(platform: String = "ios", version: String) {
        self.platform = platform
        self.version = version
    }

    enum CodingKeys: String, CodingKey { case platform, version }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        platform = try c.decode(String.self, forKey: .platform)
        version = try c.decode(String.self, forKey: .version)
        guard ["ios", "web"].contains(platform), !version.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .platform, in: c, debugDescription: "unknown platform")
        }
    }
}

/// Validation shared by both directions (mirrors the zod schemas of `contracts/sync.ts`).
enum SyncValidation {
    static func uuid<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String {
        let s = try c.decode(String.self, forKey: k)
        guard EntityID.isValid(s) else { throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "expected lowercase UUIDv7") }
        return s
    }

    static func shortId<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String {
        let s = try c.decode(String.self, forKey: k)
        guard (1...64).contains(s.count) else { throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "length 1...64") }
        return s
    }

    static func positive<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> Int64 {
        let v = try c.decode(Int64.self, forKey: k)
        guard v > 0 else { throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "expected seq > 0") }
        return v
    }

    static func nonNegative<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> Int64 {
        let v = try c.decode(Int64.self, forKey: k)
        guard v >= 0 else { throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "expected >= 0") }
        return v
    }

    static func bytes<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> Data {
        guard let d = Base64URL.decode(try c.decode(String.self, forKey: k)) else {
            throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "expected base64url without padding")
        }
        return d
    }
}

/// Client → server (§3).
public enum ClientMessage: Codable, Hashable, Sendable {
    case hello(auth: SyncAuth, deviceId: String, client: ClientInfo)
    case subscribe(docs: [SubscribeEntry])
    case unsubscribe(docIds: [String])
    case push(docId: String, clientMsgId: String, payload: Data)
    case snapshot(docId: String, clientMsgId: String, baseSeq: Int64, payload: Data)
    case awareness(docId: String, payload: Data)

    enum CodingKeys: String, CodingKey { case type, protocolVersion = "protocol", auth, deviceId, client, docs, docIds, docId, clientMsgId, payload, baseSeq }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .hello(let auth, let deviceId, let client):
            try c.encode("hello", forKey: .type)
            try c.encode(SyncProtocol.version, forKey: .protocolVersion)
            try c.encode(auth, forKey: .auth)
            try c.encode(deviceId, forKey: .deviceId)
            try c.encode(client, forKey: .client)
        case .subscribe(let docs):
            try c.encode("subscribe", forKey: .type)
            try c.encode(docs, forKey: .docs)
        case .unsubscribe(let ids):
            try c.encode("unsubscribe", forKey: .type)
            try c.encode(ids, forKey: .docIds)
        case .push(let docId, let id, let payload):
            try c.encode("push", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(id, forKey: .clientMsgId)
            try c.encode(Base64URL.encode(payload), forKey: .payload)
        case .snapshot(let docId, let id, let baseSeq, let payload):
            try c.encode("snapshot", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(id, forKey: .clientMsgId)
            try c.encode(baseSeq, forKey: .baseSeq)
            try c.encode(Base64URL.encode(payload), forKey: .payload)
        case .awareness(let docId, let payload):
            try c.encode("awareness", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(Base64URL.encode(payload), forKey: .payload)
        }
    }

    public init(from decoder: any Decoder) throws {
        typealias V = SyncValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .type) {
        case "hello":
            guard try c.decode(Int.self, forKey: .protocolVersion) == SyncProtocol.version else {
                throw DecodingError.dataCorruptedError(forKey: .protocolVersion, in: c, debugDescription: "protocol")
            }
            self = .hello(auth: try c.decode(SyncAuth.self, forKey: .auth), deviceId: try V.shortId(c, .deviceId),
                          client: try c.decode(ClientInfo.self, forKey: .client))
        case "subscribe":
            let docs = try c.decode([SubscribeEntry].self, forKey: .docs)
            guard (1...SyncProtocol.maxSubscribeDocs).contains(docs.count) else {
                throw DecodingError.dataCorruptedError(forKey: .docs, in: c, debugDescription: "1–\(SyncProtocol.maxSubscribeDocs) documents")
            }
            guard Set(docs.map(\.docId)).count == docs.count else { throw DecodingError.dataCorruptedError(forKey: .docs, in: c, debugDescription: "duplicate docId") }
            self = .subscribe(docs: docs)
        case "unsubscribe":
            let ids = try c.decode([String].self, forKey: .docIds)
            guard !ids.isEmpty, ids.allSatisfy(EntityID.isValid) else { throw DecodingError.dataCorruptedError(forKey: .docIds, in: c, debugDescription: "docIds") }
            self = .unsubscribe(docIds: ids)
        case "push":
            self = .push(docId: try V.uuid(c, .docId), clientMsgId: try V.shortId(c, .clientMsgId), payload: try V.bytes(c, .payload))
        case "snapshot":
            self = .snapshot(docId: try V.uuid(c, .docId), clientMsgId: try V.shortId(c, .clientMsgId),
                             baseSeq: try V.nonNegative(c, .baseSeq), payload: try V.bytes(c, .payload))
        case "awareness": self = .awareness(docId: try V.uuid(c, .docId), payload: try V.bytes(c, .payload))
        case let t: throw DecodingError.dataCorruptedError(forKey: .type, in: c, debugDescription: "unknown type \(t)")
        }
    }
}

public struct UpdateItem: Hashable, Sendable {
    public var seq: Int64
    public var payload: Data
    public var deviceId: String
}

public enum SyncErrorCode: String, Codable, Sendable {
    case badRequest = "bad_request"
    case unauthorized, forbidden, docNotFound = "doc_not_found", payloadTooLarge = "payload_too_large"
    case rateLimited = "rate_limited", protocolMismatch = "protocol_mismatch", `internal`
    /// D-53: this device was revoked (`reason`); the connection is closed with 4410.
    case deviceRevoked = "device_revoked"
}

/// Timing events of `SyncEngine` (`setTraceHandler`), e.g. for `os_signpost` intervals:
/// subscribe → caught up per document.
public enum SyncTraceEvent: Sendable, Equatable {
    /// `welcome` received; subscriptions follow.
    case connected
    /// One subscribe frame sent, in this order.
    case subscribed(docIds: [String])
    /// A document's catch-up finished (`upToDate`).
    case caughtUp(docId: String)
    /// Registered after the server did not know it (`doc_not_found`).
    case registered(docId: String)
    /// Not subscribed: its key is not on this device yet.
    case keyMissing(docId: String)
}

/// Server → client (§4).
public enum ServerMessage: Codable, Hashable, Sendable {
    case welcome(userId: String?, serverTime: String)
    case updates(docId: String, snapshot: (seq: Int64, payload: Data)?, items: [UpdateItem], upToDate: Bool)
    case update(docId: String, item: UpdateItem)
    case ack(docId: String, clientMsgId: String, seq: Int64)
    case awareness(docId: String, payload: Data, deviceId: String)
    /// `retryAfterMs` (`rate_limited` only, §7): do not resend or reconnect sooner.
    /// `reason` (`device_revoked` only, D-53).
    case error(code: SyncErrorCode, message: String, ref: String?, retryAfterMs: Int? = nil, reason: DeviceRevocationReason? = nil)

    enum CodingKeys: String, CodingKey { case type, userId, serverTime, protocolVersion = "protocol", docId, snapshot, items, upToDate, seq, payload, deviceId, clientMsgId, code, message, ref, retryAfterMs, reason }
    struct Item: Encodable { var seq: Int64; var payload: String; var deviceId: String }
    struct Snap: Encodable { var seq: Int64; var payload: String }

    public init(from decoder: any Decoder) throws {
        typealias V = SyncValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .type) {
        case "welcome":
            guard try c.decode(Int.self, forKey: .protocolVersion) == SyncProtocol.version else {
                throw DecodingError.dataCorruptedError(forKey: .protocolVersion, in: c, debugDescription: "protocol")
            }
            let userId = try c.decodeNil(forKey: .userId) ? nil : try V.uuid(c, .userId)
            self = .welcome(userId: userId, serverTime: try c.decode(String.self, forKey: .serverTime))
        case "updates":
            var snapshot: (seq: Int64, payload: Data)?
            if !(try c.decodeNil(forKey: .snapshot)) {
                let s = try c.nestedContainer(keyedBy: CodingKeys.self, forKey: .snapshot)
                snapshot = (try V.nonNegative(s, .seq), try V.bytes(s, .payload))
            }
            var itemsC = try c.nestedUnkeyedContainer(forKey: .items)
            var items: [UpdateItem] = []
            while !itemsC.isAtEnd {
                let i = try itemsC.nestedContainer(keyedBy: CodingKeys.self)
                items.append(UpdateItem(seq: try V.positive(i, .seq), payload: try V.bytes(i, .payload), deviceId: try V.shortId(i, .deviceId)))
            }
            self = .updates(docId: try V.uuid(c, .docId), snapshot: snapshot, items: items, upToDate: try c.decode(Bool.self, forKey: .upToDate))
        case "update":
            self = .update(docId: try V.uuid(c, .docId), item: UpdateItem(
                seq: try V.positive(c, .seq), payload: try V.bytes(c, .payload), deviceId: try V.shortId(c, .deviceId)))
        case "ack":
            self = .ack(docId: try V.uuid(c, .docId), clientMsgId: try V.shortId(c, .clientMsgId), seq: try V.positive(c, .seq))
        case "awareness":
            self = .awareness(docId: try V.uuid(c, .docId), payload: try V.bytes(c, .payload), deviceId: try V.shortId(c, .deviceId))
        case "error":
            self = .error(code: try c.decode(SyncErrorCode.self, forKey: .code), message: try c.decode(String.self, forKey: .message),
                          ref: try c.decodeIfPresent(String.self, forKey: .ref),
                          retryAfterMs: try c.decodeIfPresent(Int.self, forKey: .retryAfterMs).map { max(0, $0) },
                          reason: try c.decodeIfPresent(DeviceRevocationReason.self, forKey: .reason))
        case let t: throw DecodingError.dataCorruptedError(forKey: .type, in: c, debugDescription: "unknown type \(t)")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .welcome(let userId, let serverTime):
            try c.encode("welcome", forKey: .type)
            try c.encode(userId, forKey: .userId)
            try c.encode(serverTime, forKey: .serverTime)
            try c.encode(SyncProtocol.version, forKey: .protocolVersion)
        case .updates(let docId, let snapshot, let items, let upToDate):
            try c.encode("updates", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(snapshot.map { Snap(seq: $0.seq, payload: Base64URL.encode($0.payload)) }, forKey: .snapshot)
            try c.encode(items.map { Item(seq: $0.seq, payload: Base64URL.encode($0.payload), deviceId: $0.deviceId) }, forKey: .items)
            try c.encode(upToDate, forKey: .upToDate)
        case .update(let docId, let item):
            try c.encode("update", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(item.seq, forKey: .seq)
            try c.encode(Base64URL.encode(item.payload), forKey: .payload)
            try c.encode(item.deviceId, forKey: .deviceId)
        case .ack(let docId, let id, let seq):
            try c.encode("ack", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(id, forKey: .clientMsgId)
            try c.encode(seq, forKey: .seq)
        case .awareness(let docId, let payload, let deviceId):
            try c.encode("awareness", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(Base64URL.encode(payload), forKey: .payload)
            try c.encode(deviceId, forKey: .deviceId)
        case .error(let code, let message, let ref, let retryAfterMs, let reason):
            try c.encode("error", forKey: .type)
            try c.encode(code, forKey: .code)
            try c.encode(message, forKey: .message)
            try c.encodeIfPresent(ref, forKey: .ref)
            try c.encodeIfPresent(retryAfterMs, forKey: .retryAfterMs)
            try c.encodeIfPresent(reason, forKey: .reason)
        }
    }

    public static func == (a: ServerMessage, b: ServerMessage) -> Bool {
        (try? JSONEncoder.sync.encode(a)) == (try? JSONEncoder.sync.encode(b))
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(try? JSONEncoder.sync.encode(self))
    }
}

extension JSONEncoder {
    /// Deterministic encoder for sync frames.
    static var sync: JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return e
    }
}

public enum SyncFrame {
    public static func encode(_ message: ClientMessage) throws -> String {
        String(decoding: try JSONEncoder.sync.encode(message), as: UTF8.self)
    }

    /// nil for invalid JSON or an unknown message (ignored, like the TS parser).
    public static func decode(_ text: String) -> ServerMessage? {
        try? JSONDecoder().decode(ServerMessage.self, from: Data(text.utf8))
    }
}
