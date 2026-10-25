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
}

public enum SyncAuth: Codable, Hashable, Sendable {
    case user(accessToken: String)
    case guest(shareId: String, guestToken: String)

    enum CodingKeys: String, CodingKey { case kind, accessToken, shareId, guestToken }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .kind) {
        case "user": self = .user(accessToken: try c.decode(String.self, forKey: .accessToken))
        case "guest": self = .guest(shareId: try c.decode(String.self, forKey: .shareId), guestToken: try c.decode(String.self, forKey: .guestToken))
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
}

public struct ClientInfo: Codable, Hashable, Sendable {
    public var platform: String
    public var version: String

    public init(platform: String = "ios", version: String) {
        self.platform = platform
        self.version = version
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
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func bytes(_ k: CodingKeys) throws -> Data {
            guard let d = Base64URL.decode(try c.decode(String.self, forKey: k)) else {
                throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "invalid base64url")
            }
            return d
        }
        switch try c.decode(String.self, forKey: .type) {
        case "hello":
            guard try c.decode(Int.self, forKey: .protocolVersion) == SyncProtocol.version else {
                throw DecodingError.dataCorruptedError(forKey: .protocolVersion, in: c, debugDescription: "protocol")
            }
            self = .hello(auth: try c.decode(SyncAuth.self, forKey: .auth), deviceId: try c.decode(String.self, forKey: .deviceId),
                          client: try c.decode(ClientInfo.self, forKey: .client))
        case "subscribe": self = .subscribe(docs: try c.decode([SubscribeEntry].self, forKey: .docs))
        case "unsubscribe": self = .unsubscribe(docIds: try c.decode([String].self, forKey: .docIds))
        case "push": self = .push(docId: try c.decode(String.self, forKey: .docId), clientMsgId: try c.decode(String.self, forKey: .clientMsgId), payload: try bytes(.payload))
        case "snapshot":
            self = .snapshot(docId: try c.decode(String.self, forKey: .docId), clientMsgId: try c.decode(String.self, forKey: .clientMsgId),
                             baseSeq: try c.decode(Int64.self, forKey: .baseSeq), payload: try bytes(.payload))
        case "awareness": self = .awareness(docId: try c.decode(String.self, forKey: .docId), payload: try bytes(.payload))
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
    case unauthorized, forbidden, docNotFound = "doc_not_found", payloadTooLarge = "payload_too_large"
    case rateLimited = "rate_limited", protocolMismatch = "protocol_mismatch", `internal`
}

/// Server → client (§4).
public enum ServerMessage: Codable, Hashable, Sendable {
    case welcome(userId: String?, serverTime: String)
    case updates(docId: String, snapshot: (seq: Int64, payload: Data)?, items: [UpdateItem], upToDate: Bool)
    case update(docId: String, item: UpdateItem)
    case ack(docId: String, clientMsgId: String, seq: Int64)
    case awareness(docId: String, payload: Data, deviceId: String)
    case error(code: SyncErrorCode, message: String, ref: String?)

    enum CodingKeys: String, CodingKey { case type, userId, serverTime, protocolVersion = "protocol", docId, snapshot, items, upToDate, seq, payload, deviceId, clientMsgId, code, message, ref }
    struct Item: Codable { var seq: Int64; var payload: String; var deviceId: String }
    struct Snap: Codable { var seq: Int64; var payload: String }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func bytes(_ s: String, _ k: CodingKeys) throws -> Data {
            guard let d = Base64URL.decode(s) else { throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "invalid base64url") }
            return d
        }
        switch try c.decode(String.self, forKey: .type) {
        case "welcome":
            guard try c.decode(Int.self, forKey: .protocolVersion) == SyncProtocol.version else {
                throw DecodingError.dataCorruptedError(forKey: .protocolVersion, in: c, debugDescription: "protocol")
            }
            self = .welcome(userId: try c.decodeIfPresent(String.self, forKey: .userId), serverTime: try c.decode(String.self, forKey: .serverTime))
        case "updates":
            let snap = try c.decodeIfPresent(Snap.self, forKey: .snapshot)
            let items = try c.decode([Item].self, forKey: .items)
            self = .updates(docId: try c.decode(String.self, forKey: .docId),
                            snapshot: try snap.map { ($0.seq, try bytes($0.payload, .snapshot)) },
                            items: try items.map { UpdateItem(seq: $0.seq, payload: try bytes($0.payload, .items), deviceId: $0.deviceId) },
                            upToDate: try c.decode(Bool.self, forKey: .upToDate))
        case "update":
            self = .update(docId: try c.decode(String.self, forKey: .docId), item: UpdateItem(
                seq: try c.decode(Int64.self, forKey: .seq), payload: try bytes(try c.decode(String.self, forKey: .payload), .payload),
                deviceId: try c.decode(String.self, forKey: .deviceId)))
        case "ack":
            self = .ack(docId: try c.decode(String.self, forKey: .docId), clientMsgId: try c.decode(String.self, forKey: .clientMsgId), seq: try c.decode(Int64.self, forKey: .seq))
        case "awareness":
            self = .awareness(docId: try c.decode(String.self, forKey: .docId), payload: try bytes(try c.decode(String.self, forKey: .payload), .payload),
                              deviceId: try c.decode(String.self, forKey: .deviceId))
        case "error":
            self = .error(code: try c.decode(SyncErrorCode.self, forKey: .code), message: try c.decode(String.self, forKey: .message),
                          ref: try c.decodeIfPresent(String.self, forKey: .ref))
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
        case .error(let code, let message, let ref):
            try c.encode("error", forKey: .type)
            try c.encode(code, forKey: .code)
            try c.encode(message, forKey: .message)
            try c.encodeIfPresent(ref, forKey: .ref)
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
