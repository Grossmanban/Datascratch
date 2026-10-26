import Foundation

/// A record stored as a nested `Y.Map` under its id in a root map (spaces, notebooks,
/// folders, notes, tags). Each field merges independently between devices.
public protocol MapRecord: Hashable, Sendable {
    var id: String { get }
    var fields: [String: YValue] { get }
    init?(id: String, fields: [String: YValue])
}

extension CRDTDocument {
    func records<R: MapRecord & Decodable>(_ root: String, as type: R.Type = R.self) -> [R] {
        // Fast path: one FFI call returns the whole map as JSON, decoded straight into records
        // (no YValue tree, no NSDictionary bridging).
        guard let json = (try? raw.mapJson(root: root, path: [])) ?? nil else { return [] }
        if let decoded = try? JSONDecoder().decode([String: Lenient<R>].self, from: Data(json.utf8)) {
            return decoded.values.compactMap(\.value)
        }
        return []
    }

    func record<R: MapRecord>(_ root: String, id: String, as type: R.Type = R.self) -> R? {
        mapValue(root, [id])?.entries.flatMap { R(id: id, fields: $0) }
    }
}

extension CRDTTransaction {
    /// Creates or fully replaces a record.
    mutating func put<R: MapRecord>(_ root: String, _ record: R) {
        set(root, key: record.id, .sharedMap(entries: record.fields))
    }

    /// Updates single fields of an existing record (concurrent edits of other fields survive).
    mutating func update(_ root: String, id: String, _ fields: [String: YValue]) {
        for (k, v) in fields.sorted(by: { $0.key < $1.key }) {
            set(root, [id], key: k, v)
        }
    }
}

private func str(_ f: [String: YValue], _ k: String) -> String? { f[k]?.stringValue }
private func num(_ f: [String: YValue], _ k: String) -> Double? { f[k]?.doubleValue }

/// `Space` (document-model.md §2).
public struct Space: MapRecord {
    public var id: String
    public var name: String
    /// Emoji or SF Symbol name.
    public var icon: String?
    /// Color token.
    public var color: String?
    public var order: Double
    public var createdAt: String

    public init(id: String = EntityID.make(), name: String, icon: String? = nil, color: String? = nil, order: Double, createdAt: String = DSDate.iso(Date())) {
        self.id = id
        self.name = name
        self.icon = icon
        self.color = color
        self.order = order
        self.createdAt = createdAt
    }

    public var fields: [String: YValue] {
        ["id": .string(value: id), "name": .string(value: name), "icon": .optionalString(icon), "color": .optionalString(color),
         "order": .number(value: order), "createdAt": .string(value: createdAt)]
    }

    public init?(id: String, fields f: [String: YValue]) {
        self.init(id: id, name: str(f, "name") ?? "", icon: str(f, "icon"), color: str(f, "color"), order: num(f, "order") ?? 0, createdAt: str(f, "createdAt") ?? "")
    }
}

/// Notebook mode (D-09).
public enum NotebookMode: String, Codable, Sendable { case `private`, agent }

/// `NotebookRef` in the account document (document-model.md §2).
public struct NotebookRef: MapRecord {
    public var id: String
    public var spaceId: String
    public var name: String
    public var icon: String?
    public var color: String?
    public var order: Double
    public var mode: NotebookMode
    public var createdAt: String

    public init(id: String = EntityID.make(), spaceId: String, name: String, icon: String? = nil, color: String? = nil, order: Double,
                mode: NotebookMode = .private, createdAt: String = DSDate.iso(Date())) {
        self.id = id
        self.spaceId = spaceId
        self.name = name
        self.icon = icon
        self.color = color
        self.order = order
        self.mode = mode
        self.createdAt = createdAt
    }

    public var fields: [String: YValue] {
        ["id": .string(value: id), "spaceId": .string(value: spaceId), "name": .string(value: name), "icon": .optionalString(icon),
         "color": .optionalString(color), "order": .number(value: order), "mode": .string(value: mode.rawValue), "createdAt": .string(value: createdAt)]
    }

    public init?(id: String, fields f: [String: YValue]) {
        guard let spaceId = str(f, "spaceId") else { return nil }
        self.init(id: id, spaceId: spaceId, name: str(f, "name") ?? "", icon: str(f, "icon"), color: str(f, "color"), order: num(f, "order") ?? 0,
                  mode: str(f, "mode").flatMap(NotebookMode.init(rawValue:)) ?? .private, createdAt: str(f, "createdAt") ?? "")
    }
}

/// `Folder` (document-model.md §3).
public struct Folder: MapRecord {
    public var id: String
    /// nil = notebook root.
    public var parentId: String?
    public var name: String
    public var icon: String?
    public var color: String?
    public var order: Double
    public var createdAt: String

    public init(id: String = EntityID.make(), parentId: String?, name: String, icon: String? = nil, color: String? = nil, order: Double, createdAt: String = DSDate.iso(Date())) {
        self.id = id
        self.parentId = parentId
        self.name = name
        self.icon = icon
        self.color = color
        self.order = order
        self.createdAt = createdAt
    }

    public var fields: [String: YValue] {
        ["id": .string(value: id), "parentId": .optionalString(parentId), "name": .string(value: name), "icon": .optionalString(icon),
         "color": .optionalString(color), "order": .number(value: order), "createdAt": .string(value: createdAt)]
    }

    public init?(id: String, fields f: [String: YValue]) {
        self.init(id: id, parentId: str(f, "parentId"), name: str(f, "name") ?? "", icon: str(f, "icon"), color: str(f, "color"),
                  order: num(f, "order") ?? 0, createdAt: str(f, "createdAt") ?? "")
    }
}

public enum NoteKind: String, Codable, Sendable { case note, daily, inbox }

/// The agent that created a note as a whole (`NoteMeta.createdByAgent`, D-45).
public struct AgentAuthor: Hashable, Sendable, Decodable {
    /// Grant id of the agent.
    public var agentId: String
    public var agentName: String
    /// ISO date-time.
    public var at: String

    public init(agentId: String, agentName: String, at: String) {
        self.agentId = agentId
        self.agentName = agentName
        self.at = at
    }

    /// Absent, null or malformed → nil.
    init?(_ value: YValue?) {
        guard let e = value?.entries, let id = e["agentId"]?.stringValue, let name = e["agentName"]?.stringValue,
              let at = e["at"]?.stringValue else { return nil }
        self.init(agentId: id, agentName: name, at: at)
    }

    var value: YValue {
        .object(entries: ["agentId": .string(value: agentId), "agentName": .string(value: agentName), "at": .string(value: at)])
    }
}

/// `NoteMeta` in the notebook document (document-model.md §3).
public struct NoteMeta: MapRecord {
    public var id: String
    public var folderId: String?
    public var parentNoteId: String?
    public var title: String
    public var kind: NoteKind
    public var dailyDate: String?
    public var tags: [String]
    public var icon: String?
    public var coverThumb: String?
    /// noteKey wrapped by notebookKey, base64url (crypto.md).
    public var wrappedKey: String
    public var createdAt: String
    public var updatedAt: String
    public var trashedAt: String?
    public var order: Double
    /// Set when an agent created the whole note (D-45): clients show «Создано агентом» until
    /// the user dismisses it (`NotebookDocument.clearCreatedByAgent`).
    public var createdByAgent: AgentAuthor?

    public init(id: String = EntityID.make(), folderId: String? = nil, parentNoteId: String? = nil, title: String = "", kind: NoteKind = .note,
                dailyDate: String? = nil, tags: [String] = [], icon: String? = nil, coverThumb: String? = nil, wrappedKey: String,
                createdAt: String = DSDate.iso(Date()), updatedAt: String? = nil, trashedAt: String? = nil, order: Double = 0,
                createdByAgent: AgentAuthor? = nil) {
        self.id = id
        self.folderId = folderId
        self.parentNoteId = parentNoteId
        self.title = title
        self.kind = kind
        self.dailyDate = dailyDate
        self.tags = tags
        self.icon = icon
        self.coverThumb = coverThumb
        self.wrappedKey = wrappedKey
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.trashedAt = trashedAt
        self.order = order
        self.createdByAgent = createdByAgent
    }

    /// `createdByAgent` is written only when set (absent = null, as other clients write it).
    public var fields: [String: YValue] {
        var f: [String: YValue] = [
            "id": .string(value: id), "folderId": .optionalString(folderId), "parentNoteId": .optionalString(parentNoteId),
            "title": .string(value: title), "kind": .string(value: kind.rawValue), "dailyDate": .optionalString(dailyDate),
            "tags": .list(items: tags.map { .string(value: $0) }), "icon": .optionalString(icon), "coverThumb": .optionalString(coverThumb),
            "wrappedKey": .string(value: wrappedKey), "createdAt": .string(value: createdAt), "updatedAt": .string(value: updatedAt),
            "trashedAt": .optionalString(trashedAt), "order": .number(value: order),
        ]
        if let createdByAgent { f["createdByAgent"] = createdByAgent.value }
        return f
    }

    public init?(id: String, fields f: [String: YValue]) {
        self.init(id: id, folderId: str(f, "folderId"), parentNoteId: str(f, "parentNoteId"), title: str(f, "title") ?? "",
                  kind: str(f, "kind").flatMap(NoteKind.init(rawValue:)) ?? .note, dailyDate: str(f, "dailyDate"),
                  tags: f["tags"]?.items?.compactMap(\.stringValue) ?? [], icon: str(f, "icon"), coverThumb: str(f, "coverThumb"),
                  wrappedKey: str(f, "wrappedKey") ?? "", createdAt: str(f, "createdAt") ?? "", updatedAt: str(f, "updatedAt"),
                  trashedAt: str(f, "trashedAt"), order: num(f, "order") ?? 0, createdByAgent: AgentAuthor(f["createdByAgent"]))
    }

    public var isTrashed: Bool { trashedAt != nil }
}

/// Optional tag properties (`tags` map of the notebook document).
public struct TagProperties: MapRecord {
    /// Tag name (the map key).
    public var id: String
    public var color: String?
    public var icon: String?

    public init(name: String, color: String? = nil, icon: String? = nil) {
        self.id = name
        self.color = color
        self.icon = icon
    }

    public var fields: [String: YValue] { ["color": .optionalString(color), "icon": .optionalString(icon)] }

    public init?(id: String, fields f: [String: YValue]) {
        self.init(name: id, color: str(f, "color"), icon: str(f, "icon"))
    }
}

/// An entry of `starred` in the account document.
public struct StarredItem: Hashable, Sendable, Codable {
    public enum Kind: String, Codable, Sendable { case note, folder, notebook }
    public var kind: Kind
    public var id: String

    public init(kind: Kind, id: String) {
        self.kind = kind
        self.id = id
    }

    var value: YValue { .object(entries: ["kind": .string(value: kind.rawValue), "id": .string(value: id)]) }

    init?(value: YValue) {
        guard let k = value["kind"]?.stringValue.flatMap(Kind.init(rawValue:)), let id = value["id"]?.stringValue else { return nil }
        self.init(kind: k, id: id)
    }
}

// MARK: - Fast decoding from `Y.Map.toJSON()`

/// Skips entries that are not records (e.g. a stray primitive under a record key).
struct Lenient<R: Decodable>: Decodable {
    let value: R?
    init(from decoder: any Decoder) throws { value = try? R(from: decoder) }
}

/// Decodes a record straight from the JSON of its map (key = record id), without building
/// `YValue`s. Missing or mistyped fields fall back like `init(id:fields:)` does.
struct RecordJSON {
    let c: KeyedDecodingContainer<AnyKey>
    let id: String

    struct AnyKey: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }

    init(_ decoder: any Decoder) throws {
        c = try decoder.container(keyedBy: AnyKey.self)
        id = decoder.codingPath.last?.stringValue ?? ""
    }

    func str(_ k: String) -> String? { (try? c.decodeIfPresent(String.self, forKey: AnyKey(stringValue: k))) ?? nil }
    func num(_ k: String) -> Double? { (try? c.decodeIfPresent(Double.self, forKey: AnyKey(stringValue: k))) ?? nil }
    func strings(_ k: String) -> [String] { ((try? c.decodeIfPresent([String].self, forKey: AnyKey(stringValue: k))) ?? nil) ?? [] }
    /// Absent, null or not decodable → nil.
    func object<T: Decodable>(_ k: String, as type: T.Type = T.self) -> T? { (try? c.decodeIfPresent(T.self, forKey: AnyKey(stringValue: k))) ?? nil }
}

extension Space: Decodable {
    public init(from decoder: any Decoder) throws {
        let r = try RecordJSON(decoder)
        self.init(id: r.id, name: r.str("name") ?? "", icon: r.str("icon"), color: r.str("color"), order: r.num("order") ?? 0, createdAt: r.str("createdAt") ?? "")
    }
}

extension NotebookRef: Decodable {
    public init(from decoder: any Decoder) throws {
        let r = try RecordJSON(decoder)
        self.init(id: r.id, spaceId: r.str("spaceId") ?? "", name: r.str("name") ?? "", icon: r.str("icon"), color: r.str("color"), order: r.num("order") ?? 0,
                  mode: r.str("mode").flatMap(NotebookMode.init(rawValue:)) ?? .private, createdAt: r.str("createdAt") ?? "")
    }
}

extension Folder: Decodable {
    public init(from decoder: any Decoder) throws {
        let r = try RecordJSON(decoder)
        self.init(id: r.id, parentId: r.str("parentId"), name: r.str("name") ?? "", icon: r.str("icon"), color: r.str("color"),
                  order: r.num("order") ?? 0, createdAt: r.str("createdAt") ?? "")
    }
}

extension NoteMeta: Decodable {
    public init(from decoder: any Decoder) throws {
        let r = try RecordJSON(decoder)
        self.init(id: r.id, folderId: r.str("folderId"), parentNoteId: r.str("parentNoteId"), title: r.str("title") ?? "",
                  kind: r.str("kind").flatMap(NoteKind.init(rawValue:)) ?? .note, dailyDate: r.str("dailyDate"), tags: r.strings("tags"),
                  icon: r.str("icon"), coverThumb: r.str("coverThumb"), wrappedKey: r.str("wrappedKey") ?? "",
                  createdAt: r.str("createdAt") ?? "", updatedAt: r.str("updatedAt"), trashedAt: r.str("trashedAt"), order: r.num("order") ?? 0,
                  createdByAgent: r.object("createdByAgent"))
    }
}

extension TagProperties: Decodable {
    public init(from decoder: any Decoder) throws {
        let r = try RecordJSON(decoder)
        self.init(name: r.id, color: r.str("color"), icon: r.str("icon"))
    }
}
