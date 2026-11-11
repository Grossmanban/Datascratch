import Foundation

// Messages of the WebSocket sync protocol (sync-protocol.md, versions 1–3; mirrors
// packages/shared/src/contracts/sync.ts). Text frames, one JSON object each, `type` field.
// Binary payloads are base64url without padding.

public enum SyncProtocol {
    /// Versions this client speaks (§2). It says `latest` in `hello`; the server answers in
    /// `welcome` with the version of the connection (≤ the client's). A server that does not
    /// know `latest` answers `protocol_mismatch`, and the client tries once more one lower.
    /// Version 2 adds `account_changed`; version 3 adds `resume` / `resumed` (§3.1).
    public static let min = 1
    public static let latest = 3
    /// First version with `resume` (§3.1).
    public static let resume = 3
    public static let version = latest
    public static let supported = min...latest
    public static let path = "/v1/sync"
    public static let pingInterval: Duration = .seconds(25)
    /// Decoded payload limits (§7). An update may be as big as a snapshot since 2026-11-11 (a big
    /// change is an ordinary `push` with its own `seq`); an older server that still refuses it
    /// with `payload_too_large` gets it as a snapshot instead (§5).
    public static let maxUpdateBytes = 16 * 1024 * 1024
    /// The server's limit (sync-protocol.md §7: 16 MiB, decoded bytes). It was 50 MiB here: a
    /// snapshot between the two was sent and refused instead of failing at once.
    public static let maxSnapshotBytes = 16 * 1024 * 1024
    /// Documents in one `subscribe` (§2): more go in several messages.
    public static let maxSubscribeDocs = 1000
    /// Entries in `resumed.docs` and in `resumed.removed` (§3.1, `MAX_RESUME_DOCS`).
    public static let maxResumeDocs = 1000
    /// Length of an account cursor (§3.1): an opaque string of the server.
    public static let cursorLength = 1...256
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

    /// An account cursor (§3.1): opaque, 1–256 characters (UTF-16 code units, as in TS).
    static func cursor<K: CodingKey>(_ c: KeyedDecodingContainer<K>, _ k: K) throws -> String {
        let s = try c.decode(String.self, forKey: k)
        guard SyncProtocol.cursorLength.contains(s.utf16.count) else { throw DecodingError.dataCorruptedError(forKey: k, in: c, debugDescription: "cursor: 1–256 characters") }
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
    case hello(auth: SyncAuth, deviceId: String, client: ClientInfo, protocolVersion: Int = SyncProtocol.latest)
    case subscribe(docs: [SubscribeEntry])
    case unsubscribe(docIds: [String])
    case push(docId: String, clientMsgId: String, payload: Data)
    case snapshot(docId: String, clientMsgId: String, baseSeq: Int64, payload: Data)
    case awareness(docId: String, payload: Data)
    /// Version 3, users only (§3.1): what changed in the account after `cursor` (nil: none yet).
    case resume(cursor: String?)

    enum CodingKeys: String, CodingKey { case type, protocolVersion = "protocol", auth, deviceId, client, docs, docIds, docId, clientMsgId, payload, baseSeq, cursor }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .hello(let auth, let deviceId, let client, let version):
            try c.encode("hello", forKey: .type)
            try c.encode(version, forKey: .protocolVersion)
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
        case .resume(let cursor):
            try c.encode("resume", forKey: .type)
            try c.encode(cursor, forKey: .cursor)
        }
    }

    public init(from decoder: any Decoder) throws {
        typealias V = SyncValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .type) {
        case "resume":
            // The field is required; null means «no cursor yet».
            guard c.contains(.cursor) else { throw DecodingError.keyNotFound(CodingKeys.cursor, .init(codingPath: c.codingPath, debugDescription: "cursor")) }
            self = .resume(cursor: try c.decodeNil(forKey: .cursor) ? nil : try V.cursor(c, .cursor))
        case "hello":
            let version = try c.decode(Int.self, forKey: .protocolVersion)
            guard SyncProtocol.supported.contains(version) else {
                throw DecodingError.dataCorruptedError(forKey: .protocolVersion, in: c, debugDescription: "protocol")
            }
            self = .hello(auth: try c.decode(SyncAuth.self, forKey: .auth), deviceId: try V.shortId(c, .deviceId),
                          client: try c.decode(ClientInfo.self, forKey: .client), protocolVersion: version)
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
    /// Who sent it, set by the server (D-54; older servers omit it).
    public var author: UpdateAuthor?

    public init(seq: Int64, payload: Data, deviceId: String, author: UpdateAuthor? = nil) {
        self.seq = seq
        self.payload = payload
        self.deviceId = deviceId
        self.author = author
    }
}

public enum SyncErrorCode: String, Codable, Sendable {
    case badRequest = "bad_request"
    case unauthorized, forbidden, docNotFound = "doc_not_found", payloadTooLarge = "payload_too_large"
    case rateLimited = "rate_limited", protocolMismatch = "protocol_mismatch", `internal`
    /// D-53: this device was revoked (`reason`); the connection is closed with 4410.
    case deviceRevoked = "device_revoked"
}

/// What changed for the account (`account_changed`, D-62).
public enum AccountChange: String, Codable, Hashable, Sendable, CaseIterable {
    case invitations, spaces, members, keys, notebooks
    /// Voice access or minutes changed (D-65): re-read `GET /voice/me`.
    case voice
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

/// One entry of `resumed.docs`: a document changed after the cursor and its last `seq` (0: no
/// updates yet).
public struct ResumedDoc: Codable, Hashable, Sendable {
    public var docId: String
    public var seq: Int64

    public init(docId: String, seq: Int64) {
        self.docId = docId
        self.seq = seq
    }

    enum CodingKeys: String, CodingKey { case docId, seq }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        docId = try SyncValidation.uuid(c, .docId)
        seq = try SyncValidation.nonNegative(c, .seq)
    }
}

/// Server → client (§4).
public enum ServerMessage: Codable, Hashable, Sendable {
    /// `protocolVersion`: the version of this connection (§2).
    case welcome(userId: String?, serverTime: String, protocolVersion: Int = SyncProtocol.latest)
    case updates(docId: String, snapshot: (seq: Int64, payload: Data)?, items: [UpdateItem], upToDate: Bool)
    case update(docId: String, item: UpdateItem)
    case ack(docId: String, clientMsgId: String, seq: Int64)
    case awareness(docId: String, payload: Data, deviceId: String)
    /// `retryAfterMs` (`rate_limited` only, §7): do not resend or reconnect sooner.
    /// `reason` (`device_revoked` only, D-53).
    case error(code: SyncErrorCode, message: String, ref: String?, retryAfterMs: Int? = nil, reason: DeviceRevocationReason? = nil)
    /// Something about this account changed on the server (D-62): an invitation came, a space
    /// or its members or keys changed, a notebook was shared or moved. The app refreshes what
    /// is named; values this client does not know are dropped (the set can end up empty).
    case accountChanged(Set<AccountChange>)
    /// Version 3 (§3.1): the answer to `resume`. `reset`: the cursor was not taken — subscribe
    /// everything as in version 1 (both lists are empty then). Otherwise the connection is
    /// subscribed to every readable document; `docs` changed after the cursor (with their last
    /// `seq`), `removed` were deleted or became unreadable.
    case resumed(reset: Bool, cursor: String, docs: [ResumedDoc], removed: [String])

    enum CodingKeys: String, CodingKey { case type, userId, serverTime, protocolVersion = "protocol", docId, snapshot, items, upToDate, seq, payload, deviceId, clientMsgId, code, message, ref, retryAfterMs, reason, author, what, reset, cursor, docs, removed }
    struct Item: Encodable { var seq: Int64; var payload: String; var deviceId: String; var author: UpdateAuthor? }
    struct Snap: Encodable { var seq: Int64; var payload: String }

    public init(from decoder: any Decoder) throws {
        typealias V = SyncValidation
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: .type) {
        case "welcome":
            let version = try c.decode(Int.self, forKey: .protocolVersion)
            guard SyncProtocol.supported.contains(version) else {
                throw DecodingError.dataCorruptedError(forKey: .protocolVersion, in: c, debugDescription: "protocol")
            }
            let userId = try c.decodeNil(forKey: .userId) ? nil : try V.uuid(c, .userId)
            self = .welcome(userId: userId, serverTime: try c.decode(String.self, forKey: .serverTime), protocolVersion: version)
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
                items.append(UpdateItem(seq: try V.positive(i, .seq), payload: try V.bytes(i, .payload), deviceId: try V.shortId(i, .deviceId),
                                        author: try i.decodeIfPresent(UpdateAuthor.self, forKey: .author)))
            }
            self = .updates(docId: try V.uuid(c, .docId), snapshot: snapshot, items: items, upToDate: try c.decode(Bool.self, forKey: .upToDate))
        case "update":
            self = .update(docId: try V.uuid(c, .docId), item: UpdateItem(
                seq: try V.positive(c, .seq), payload: try V.bytes(c, .payload), deviceId: try V.shortId(c, .deviceId),
                author: try c.decodeIfPresent(UpdateAuthor.self, forKey: .author)))
        case "ack":
            self = .ack(docId: try V.uuid(c, .docId), clientMsgId: try V.shortId(c, .clientMsgId), seq: try V.positive(c, .seq))
        case "awareness":
            self = .awareness(docId: try V.uuid(c, .docId), payload: try V.bytes(c, .payload), deviceId: try V.shortId(c, .deviceId))
        case "error":
            self = .error(code: try c.decode(SyncErrorCode.self, forKey: .code), message: try c.decode(String.self, forKey: .message),
                          ref: try c.decodeIfPresent(String.self, forKey: .ref),
                          retryAfterMs: try c.decodeIfPresent(Int.self, forKey: .retryAfterMs).map { max(0, $0) },
                          reason: try c.decodeIfPresent(DeviceRevocationReason.self, forKey: .reason))
        case "account_changed":
            // A list of at most 8 names (§4); names this client does not know are dropped (a newer
            // server may add some), so what is left can be empty: «something changed».
            let names = try c.decode([String].self, forKey: .what)
            guard names.count <= 8 else { throw DecodingError.dataCorruptedError(forKey: .what, in: c, debugDescription: "what: at most 8") }
            self = .accountChanged(Set(names.compactMap(AccountChange.init(rawValue:))))
        case "resumed":
            let reset = try c.decode(Bool.self, forKey: .reset)
            let cursor = try V.cursor(c, .cursor)
            let docs = try c.decode([ResumedDoc].self, forKey: .docs)
            let removed = try c.decode([String].self, forKey: .removed)
            guard docs.count <= SyncProtocol.maxResumeDocs, removed.count <= SyncProtocol.maxResumeDocs else {
                throw DecodingError.dataCorruptedError(forKey: .docs, in: c, debugDescription: "at most \(SyncProtocol.maxResumeDocs) documents")
            }
            guard removed.allSatisfy(EntityID.isValid) else { throw DecodingError.dataCorruptedError(forKey: .removed, in: c, debugDescription: "removed: UUIDs") }
            guard !reset || (docs.isEmpty && removed.isEmpty) else {
                throw DecodingError.dataCorruptedError(forKey: .reset, in: c, debugDescription: "a reset lists no documents")
            }
            self = .resumed(reset: reset, cursor: cursor, docs: docs, removed: removed)
        case let t: throw DecodingError.dataCorruptedError(forKey: .type, in: c, debugDescription: "unknown type \(t)")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .welcome(let userId, let serverTime, let version):
            try c.encode("welcome", forKey: .type)
            try c.encode(userId, forKey: .userId)
            try c.encode(serverTime, forKey: .serverTime)
            try c.encode(version, forKey: .protocolVersion)
        case .updates(let docId, let snapshot, let items, let upToDate):
            try c.encode("updates", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(snapshot.map { Snap(seq: $0.seq, payload: Base64URL.encode($0.payload)) }, forKey: .snapshot)
            try c.encode(items.map { Item(seq: $0.seq, payload: Base64URL.encode($0.payload), deviceId: $0.deviceId, author: $0.author) }, forKey: .items)
            try c.encode(upToDate, forKey: .upToDate)
        case .update(let docId, let item):
            try c.encode("update", forKey: .type)
            try c.encode(docId, forKey: .docId)
            try c.encode(item.seq, forKey: .seq)
            try c.encode(Base64URL.encode(item.payload), forKey: .payload)
            try c.encode(item.deviceId, forKey: .deviceId)
            try c.encodeIfPresent(item.author, forKey: .author)
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
        case .resumed(let reset, let cursor, let docs, let removed):
            try c.encode("resumed", forKey: .type)
            try c.encode(reset, forKey: .reset)
            try c.encode(cursor, forKey: .cursor)
            try c.encode(docs, forKey: .docs)
            try c.encode(removed, forKey: .removed)
        case .accountChanged(let what):
            try c.encode("account_changed", forKey: .type)
            try c.encode(what.map(\.rawValue).sorted(), forKey: .what)
        }
    }

    /// Types of server messages this client knows (frames of others are ignored, §4).
    static let knownTypes: Set<String> = ["welcome", "updates", "update", "ack", "awareness", "error", "account_changed", "resumed"]

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
    /// What a server frame is (§4): a message; a frame of a type this client does not know,
    /// which it ignores (a newer server); or a broken frame (not JSON, no type, bad fields).
    public enum Parsed: Equatable, Sendable {
        case message(ServerMessage)
        case ignored(type: String)
        case broken
    }

    public static func parse(_ text: String) -> Parsed {
        if let message = decode(text) { return .message(message) }
        struct Head: Decodable { var type: String }
        guard let head = try? JSONDecoder().decode(Head.self, from: Data(text.utf8)) else { return .broken }
        return ServerMessage.knownTypes.contains(head.type) ? .broken : .ignored(type: head.type)
    }

    public static func encode(_ message: ClientMessage) throws -> String {
        String(decoding: try JSONEncoder.sync.encode(message), as: UTF8.self)
    }

    /// nil for invalid JSON or an unknown message (ignored, like the TS parser).
    public static func decode(_ text: String) -> ServerMessage? {
        try? JSONDecoder().decode(ServerMessage.self, from: Data(text.utf8))
    }
}
