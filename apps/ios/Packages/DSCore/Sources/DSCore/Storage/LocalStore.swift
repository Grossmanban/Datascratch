import Foundation
import GRDB

/// Local SQLite database (GRDB): document updates, outgoing queue, sync state, derived indexes
/// (tasks, links, tags, full-text search) and attachments.
///
/// Updates are stored as plaintext Yjs updates: the file lives in the app container under iOS
/// Data Protection; encryption happens when sending (`SyncEngine`).
///
/// All methods are synchronous and thread-safe (GRDB serializes writes); call them from a
/// background task for large work.
public final class LocalStore: Sendable {
    public let db: any DatabaseWriter

    /// Opens (creating if needed) the database at `url`.
    public convenience init(url: URL) throws {
        var config = Configuration()
        config.foreignKeysEnabled = true
        config.prepareDatabase { db in
            // WAL (DatabasePool) + NORMAL: durable across app crashes, one fsync per checkpoint
            // instead of per commit — first sync writes thousands of small transactions.
            try db.execute(sql: "PRAGMA synchronous = NORMAL")
        }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try self.init(writer: DatabasePool(path: url.path, configuration: config))
        #if os(iOS)
        // Readable after first unlock so that background sync works.
        try? (url as NSURL).setResourceValue(URLFileProtection.completeUntilFirstUserAuthentication, forKey: .fileProtectionKey)
        #endif
    }

    /// In-memory database (tests, previews).
    public static func inMemory() throws -> LocalStore {
        var config = Configuration()
        config.foreignKeysEnabled = true
        return try LocalStore(writer: DatabaseQueue(configuration: config))
    }

    init(writer: any DatabaseWriter) throws {
        db = writer
        try Self.migrator.migrate(writer)
    }

    // MARK: Schema

    static var migrator: DatabaseMigrator {
        var m = DatabaseMigrator()
        m.registerMigration("v1") { db in
            try db.create(table: "documents") { t in
                t.primaryKey("docId", .text)
                t.column("kind", .text).notNull()
                t.column("notebookId", .text)
                t.column("lastSeq", .integer).notNull().defaults(to: 0)
                t.column("snapshotSeq", .integer).notNull().defaults(to: 0)
                t.column("updatesSinceSnapshot", .integer).notNull().defaults(to: 0)
                t.column("bytesSinceSnapshot", .integer).notNull().defaults(to: 0)
                t.column("registered", .boolean).notNull().defaults(to: false)
                t.column("createdAt", .datetime).notNull()
                t.column("updatedAt", .datetime).notNull()
            }
            try db.create(table: "docUpdates") { t in
                t.autoIncrementedPrimaryKey("id")
                t.column("docId", .text).notNull().indexed().references("documents", onDelete: .cascade)
                t.column("data", .blob).notNull()
                t.column("seq", .integer)
                t.column("clientMsgId", .text).indexed()
                t.column("origin", .text).notNull()
                t.column("createdAt", .datetime).notNull()
            }
            try db.create(table: "outbox") { t in
                t.autoIncrementedPrimaryKey("id")
                t.column("docId", .text).notNull().indexed().references("documents", onDelete: .cascade)
                t.column("clientMsgId", .text).notNull().unique()
                t.column("kind", .text).notNull()
                t.column("payload", .blob).notNull()
                t.column("baseSeq", .integer)
                t.column("attempts", .integer).notNull().defaults(to: 0)
                t.column("lastError", .text)
                t.column("createdAt", .datetime).notNull()
            }
            try db.create(table: "kv") { t in
                t.primaryKey("key", .text)
                t.column("value", .blob)
            }
            try db.create(table: "noteIndex") { t in
                t.primaryKey("noteId", .text)
                t.column("notebookId", .text).indexed()
                t.column("title", .text).notNull()
                t.column("plainText", .text).notNull()
                t.column("updatedAt", .datetime).notNull()
            }
            try db.create(virtualTable: "noteSearch", using: FTS5()) { t in
                t.synchronize(withTable: "noteIndex")
                t.tokenizer = .unicode61(diacritics: .remove)
                t.prefixes = [2, 3]
                t.column("title")
                t.column("plainText")
            }
            try db.create(table: "tasks") { t in
                t.primaryKey("taskId", .text)
                t.column("noteId", .text).notNull().indexed()
                t.column("notebookId", .text)
                t.column("blockId", .text)
                t.column("text", .text).notNull()
                t.column("state", .text).notNull().indexed()
                t.column("scheduled", .text).indexed()
                t.column("deadline", .text).indexed()
                t.column("completedAt", .text)
            }
            try db.create(table: "noteLinks") { t in
                t.column("sourceNoteId", .text).notNull().indexed()
                t.column("targetNoteId", .text).notNull().indexed()
                t.column("blockId", .text)
                t.column("label", .text).notNull()
            }
            try db.create(table: "noteTags") { t in
                t.column("noteId", .text).notNull().indexed()
                t.column("tag", .text).notNull().indexed()
                t.primaryKey(["noteId", "tag"])
            }
            try db.create(table: "attachments") { t in
                t.primaryKey("attachmentId", .text)
                t.column("noteId", .text).notNull().indexed()
                t.column("mime", .text).notNull()
                t.column("size", .integer).notNull()
                t.column("chunkCount", .integer).notNull()
                t.column("uploadedChunks", .text).notNull().defaults(to: "[]")
                t.column("state", .text).notNull()
                t.column("localPath", .text)
                t.column("createdAt", .datetime).notNull()
            }
        }
        m.registerMigration("v2-stroke-orphans") { db in
            // strokes.md §4.2: when this device first saw all anchors of a stroke deleted.
            try db.create(table: "strokeOrphans") { t in
                t.column("noteId", .text).notNull()
                t.column("strokeId", .text).notNull()
                t.column("orphanedAt", .datetime).notNull()
                t.primaryKey(["noteId", "strokeId"])
            }
        }
        m.registerMigration("v3-local-edits") { db in
            // Snapshot on close after ≥ 30 local edits (sync-protocol.md §5, spec/06).
            try db.alter(table: "documents") { t in
                t.add(column: "localEditsSinceSnapshot", .integer).notNull().defaults(to: 0)
            }
        }
        return m
    }
}

// MARK: - Documents and updates

/// Sync bookkeeping of one document.
public struct DocumentRecord: Codable, FetchableRecord, PersistableRecord, Hashable, Sendable {
    public static let databaseTableName = "documents"
    public var docId: String
    public var kind: DocKind
    public var notebookId: String?
    /// Last server `seq` applied locally.
    public var lastSeq: Int64
    /// `baseSeq` of the last snapshot uploaded or received.
    public var snapshotSeq: Int64
    public var updatesSinceSnapshot: Int
    public var bytesSinceSnapshot: Int
    /// Local edits (outgoing updates) since the last snapshot this device made.
    public var localEditsSinceSnapshot: Int
    /// Registered on the server (`POST /v1/docs`).
    public var registered: Bool
    public var createdAt: Date
    public var updatedAt: Date

    public init(docId: String, kind: DocKind, notebookId: String?, now: Date = Date()) {
        self.docId = docId
        self.kind = kind
        self.notebookId = notebookId
        lastSeq = 0
        snapshotSeq = 0
        updatesSinceSnapshot = 0
        bytesSinceSnapshot = 0
        localEditsSinceSnapshot = 0
        registered = false
        createdAt = now
        updatedAt = now
    }
}

extension DocKind: DatabaseValueConvertible {}

public struct StoredUpdate: Codable, FetchableRecord, MutablePersistableRecord, Hashable, Sendable {
    public static let databaseTableName = "docUpdates"
    public var id: Int64?
    public var docId: String
    public var data: Data
    /// Server seq once known (received, or acknowledged for local updates).
    public var seq: Int64?
    /// For local updates: the outbox message that carries it.
    public var clientMsgId: String?
    public var origin: String
    public var createdAt: Date

    public mutating func didInsert(_ inserted: InsertionSuccess) { id = inserted.rowID }
}

/// A queued outgoing message (`push` or `snapshot`), kept until the server `ack`s it.
public struct OutboxItem: Codable, FetchableRecord, MutablePersistableRecord, Hashable, Sendable {
    public enum Kind: String, Codable, Sendable { case push, snapshot }
    public static let databaseTableName = "outbox"
    public var id: Int64?
    public var docId: String
    public var clientMsgId: String
    public var kind: Kind
    /// Plaintext Yjs update; encrypted when sent.
    public var payload: Data
    public var baseSeq: Int64?
    public var attempts: Int
    public var lastError: String?
    public var createdAt: Date

    public mutating func didInsert(_ inserted: InsertionSuccess) { id = inserted.rowID }
}

/// Snapshot thresholds (sync-protocol.md §5).
public enum SnapshotPolicy {
    public static let maxUpdates = 500
    public static let maxBytes = 1_000_000
}

extension LocalStore {
    /// Creates the bookkeeping row if missing.
    @discardableResult
    public func ensureDocument(docId: String, kind: DocKind, notebookId: String?) throws -> DocumentRecord {
        try db.write { db in
            if let existing = try DocumentRecord.fetchOne(db, key: docId) { return existing }
            let record = DocumentRecord(docId: docId, kind: kind, notebookId: notebookId)
            try record.insert(db)
            return record
        }
    }

    public func document(_ docId: String) throws -> DocumentRecord? {
        try db.read { try DocumentRecord.fetchOne($0, key: docId) }
    }

    public func documents(kind: DocKind? = nil) throws -> [DocumentRecord] {
        try db.read { db in
            var request = DocumentRecord.all()
            if let kind { request = request.filter(Column("kind") == kind.rawValue) }
            return try request.fetchAll(db)
        }
    }

    public func setRegistered(_ docId: String, _ registered: Bool = true) throws {
        try db.write { try $0.execute(sql: "UPDATE documents SET registered = ? WHERE docId = ?", arguments: [registered, docId]) }
    }

    /// Stores a local update and queues it for sending, atomically.
    public func appendLocalUpdate(docId: String, update: Data, origin: TransactionOrigin, now: Date = Date()) throws {
        try db.write { db in
            let clientMsgId = EntityID.make(now: now)
            var stored = StoredUpdate(id: nil, docId: docId, data: update, seq: nil, clientMsgId: clientMsgId, origin: origin.description, createdAt: now)
            try stored.insert(db)
            var item = OutboxItem(id: nil, docId: docId, clientMsgId: clientMsgId, kind: .push, payload: update,
                                  baseSeq: nil, attempts: 0, lastError: nil, createdAt: now)
            try item.insert(db)
            try db.execute(sql: "UPDATE documents SET updatedAt = ?, localEditsSinceSnapshot = localEditsSinceSnapshot + 1 WHERE docId = ?",
                           arguments: [now, docId])
        }
    }

    /// Stores updates received from the server and advances `lastSeq`. `seq`s at or below
    /// `lastSeq` are ignored (duplicates after reconnect).
    /// Returns the items actually stored (new ones), in order.
    @discardableResult
    public func appendRemoteUpdates(docId: String, items: [(seq: Int64, data: Data)], now: Date = Date()) throws -> [(seq: Int64, data: Data)] {
        try db.write { db in
            guard var doc = try DocumentRecord.fetchOne(db, key: docId) else { return [] }
            var added: [(seq: Int64, data: Data)] = []
            for item in items where item.seq > doc.lastSeq {
                added.append(item)
                var stored = StoredUpdate(id: nil, docId: docId, data: item.data, seq: item.seq, clientMsgId: nil, origin: "remote", createdAt: now)
                try stored.insert(db)
                doc.lastSeq = item.seq
                doc.updatesSinceSnapshot += 1
                doc.bytesSinceSnapshot += item.data.count
            }
            doc.updatedAt = now
            try doc.update(db)
            return added
        }
    }

    /// Replaces the stored history by a server snapshot (`updates` with `snapshot`).
    /// Returns false when the snapshot is not newer than what is stored.
    @discardableResult
    public func applyRemoteSnapshot(docId: String, seq: Int64, state: Data, now: Date = Date()) throws -> Bool {
        try db.write { db in
            guard var doc = try DocumentRecord.fetchOne(db, key: docId), seq > doc.lastSeq else { return false }
            // The snapshot contains everything up to `seq`; unacknowledged local updates and
            // later ones stay.
            try db.execute(sql: "DELETE FROM docUpdates WHERE docId = ? AND seq IS NOT NULL AND seq <= ?", arguments: [docId, seq])
            var stored = StoredUpdate(id: nil, docId: docId, data: state, seq: seq, clientMsgId: nil, origin: "remote", createdAt: now)
            try stored.insert(db)
            doc.lastSeq = max(doc.lastSeq, seq)
            doc.snapshotSeq = seq
            doc.updatesSinceSnapshot = 0
            doc.bytesSinceSnapshot = 0
            doc.updatedAt = now
            try doc.update(db)
            return true
        }
    }

    /// All stored updates of a document in order (apply them with `origin: .storage`).
    public func updates(docId: String) throws -> [Data] {
        try db.read { db in
            try Data.fetchAll(db, sql: "SELECT data FROM docUpdates WHERE docId = ? ORDER BY id", arguments: [docId])
        }
    }

    /// Merges the stored updates of a document into one row (local compaction; does not change
    /// what the server has).
    public func compact(docId: String, now: Date = Date()) throws {
        try db.write { db in
            let rows = try StoredUpdate.filter(Column("docId") == docId).order(Column("id")).fetchAll(db)
            let pending = rows.filter { $0.seq == nil && $0.clientMsgId != nil }
            guard pending.count < rows.count else { return }
            // Unacknowledged local updates stay separate (they are matched on ack).
            let settled = rows.filter { !($0.seq == nil && $0.clientMsgId != nil) }
            guard settled.count > 1 else { return }
            let merged = try CRDTUpdates.merge(settled.map(\.data))
            for row in settled { try row.delete(db) }
            var stored = StoredUpdate(id: nil, docId: docId, data: merged, seq: settled.compactMap(\.seq).max(), clientMsgId: nil, origin: "storage", createdAt: now)
            try stored.insert(db)
        }
    }

    /// Local edits needed to snapshot a document when it is closed (sync-protocol.md §5).
    public static let snapshotOnCloseEdits = 30

    /// Whether a snapshot should be uploaded (sync-protocol.md §5).
    public func needsSnapshot(docId: String) throws -> Bool {
        guard let doc = try document(docId) else { return false }
        return doc.updatesSinceSnapshot > SnapshotPolicy.maxUpdates || doc.bytesSinceSnapshot > SnapshotPolicy.maxBytes
    }

    // MARK: Outbox

    public func enqueueSnapshot(docId: String, state: Data, baseSeq: Int64, now: Date = Date()) throws -> OutboxItem {
        try db.write { db in
            try db.execute(sql: "UPDATE documents SET localEditsSinceSnapshot = 0 WHERE docId = ?", arguments: [docId])
            var item = OutboxItem(id: nil, docId: docId, clientMsgId: EntityID.make(now: now), kind: .snapshot, payload: state,
                                  baseSeq: baseSeq, attempts: 0, lastError: nil, createdAt: now)
            try item.insert(db)
            return item
        }
    }

    /// Pending outgoing messages, oldest first.
    public func pendingOutbox(docId: String? = nil, limit: Int = 100) throws -> [OutboxItem] {
        try db.read { db in
            var request = OutboxItem.order(Column("id")).limit(limit)
            if let docId { request = request.filter(Column("docId") == docId) }
            return try request.fetchAll(db)
        }
    }

    public func outboxCount() throws -> Int {
        try db.read { try OutboxItem.fetchCount($0) }
    }

    /// Handles `ack`: removes the item; for pushes, records the server seq on the stored update;
    /// for snapshots, resets the snapshot counters.
    public func acknowledge(clientMsgId: String, seq: Int64) throws {
        try db.write { db in
            guard let item = try OutboxItem.filter(Column("clientMsgId") == clientMsgId).fetchOne(db) else { return }
            try item.delete(db)
            try db.execute(sql: "UPDATE docUpdates SET seq = ? WHERE clientMsgId = ?", arguments: [seq, clientMsgId])
            guard var doc = try DocumentRecord.fetchOne(db, key: item.docId) else { return }
            // lastSeq = max(seq) over updates/update/ack (sync-protocol.md §4).
            doc.lastSeq = max(doc.lastSeq, seq)
            switch item.kind {
            case .push:
                // Own updates count towards the snapshot threshold too.
                doc.updatesSinceSnapshot += 1
                doc.bytesSinceSnapshot += item.payload.count
            case .snapshot:
                doc.snapshotSeq = max(doc.snapshotSeq, item.baseSeq ?? seq)
                doc.updatesSinceSnapshot = 0
                doc.bytesSinceSnapshot = 0
            }
            try doc.update(db)
        }
    }

    public func markFailed(clientMsgId: String, error: String) throws {
        try db.write {
            try $0.execute(sql: "UPDATE outbox SET attempts = attempts + 1, lastError = ? WHERE clientMsgId = ?", arguments: [error, clientMsgId])
        }
    }

    // MARK: Key-value

    public func value(_ key: String) throws -> Data? {
        try db.read { try Data.fetchOne($0, sql: "SELECT value FROM kv WHERE key = ?", arguments: [key]) }
    }

    public func setValue(_ value: Data?, for key: String) throws {
        try db.write { db in
            if let value {
                try db.execute(sql: "INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", arguments: [key, value])
            } else {
                try db.execute(sql: "DELETE FROM kv WHERE key = ?", arguments: [key])
            }
        }
    }

    public func string(_ key: String) throws -> String? { try value(key).map { String(decoding: $0, as: UTF8.self) } }

    public func setString(_ value: String?, for key: String) throws { try setValue(value.map { Data($0.utf8) }, for: key) }

    /// Stable id of this installation (`deviceId` in `hello`).
    public func deviceId() throws -> String {
        if let id = try string("deviceId") { return id }
        let id = EntityID.make()
        try setString(id, for: "deviceId")
        return id
    }

    // MARK: Orphaned strokes (strokes.md §4.2)

    /// Records the current set of orphaned strokes of a note: new ones get `now` as
    /// `orphanedAt`, strokes no longer orphaned lose their mark.
    public func updateOrphans(noteId: String, orphaned: Set<String>, now: Date = Date()) throws {
        try db.write { db in
            let known = Set(try String.fetchAll(db, sql: "SELECT strokeId FROM strokeOrphans WHERE noteId = ?", arguments: [noteId]))
            for id in known.subtracting(orphaned) {
                try db.execute(sql: "DELETE FROM strokeOrphans WHERE noteId = ? AND strokeId = ?", arguments: [noteId, id])
            }
            for id in orphaned.subtracting(known) {
                try db.execute(sql: "INSERT INTO strokeOrphans(noteId, strokeId, orphanedAt) VALUES(?, ?, ?)", arguments: [noteId, id, now])
            }
        }
    }

    public func orphanedAt(noteId: String, strokeId: String) throws -> Date? {
        try db.read { try Date.fetchOne($0, sql: "SELECT orphanedAt FROM strokeOrphans WHERE noteId = ? AND strokeId = ?", arguments: [noteId, strokeId]) }
    }

    /// Removes a document and everything derived from it.
    public func deleteDocument(_ docId: String) throws {
        try db.write { db in
            _ = try DocumentRecord.deleteOne(db, key: docId)
            try db.execute(sql: "DELETE FROM noteIndex WHERE noteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM tasks WHERE noteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM noteLinks WHERE sourceNoteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM noteTags WHERE noteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM strokeOrphans WHERE noteId = ?", arguments: [docId])
        }
    }
}
