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
        m.registerMigration("v4-task-order") { db in
            // Position among the note's tasks (document-model.md §5). Rows were inserted in
            // document order, so rowid order gives it until the note is indexed again.
            try db.alter(table: "tasks") { t in
                t.add(column: "order", .integer).notNull().defaults(to: 0)
            }
            try db.execute(sql: """
                UPDATE tasks SET "order" = (SELECT COUNT(*) FROM tasks AS t2 WHERE t2.noteId = tasks.noteId AND t2.rowid < tasks.rowid)
                """)
        }
        m.registerMigration("v5-index-version") { db in
            // Incremental indexing: every stored update (not local compaction, origin
            // "storage") bumps contentVersion; reindexChanged() catches indexedVersion up.
            // Existing notes start pending, so the first launch reindexes them once.
            try db.alter(table: "documents") { t in
                t.add(column: "contentVersion", .integer).notNull().defaults(to: 1)
                t.add(column: "indexedVersion", .integer).notNull().defaults(to: 0)
            }
            try db.execute(sql: """
                CREATE TRIGGER docUpdatesContentVersion AFTER INSERT ON docUpdates WHEN NEW.origin != 'storage'
                BEGIN UPDATE documents SET contentVersion = contentVersion + 1 WHERE docId = NEW.docId; END
                """)
        }
        m.registerMigration("v6-outbox-failed") { db in
            // Messages that cannot be delivered (registration refused, payload too large, …)
            // leave the queue's pending part; the app shows them and offers a retry.
            try db.alter(table: "outbox") { t in
                t.add(column: "failed", .boolean).notNull().defaults(to: false)
            }
            // Leftovers of documents deleted earlier (they could never be sent).
            try db.execute(sql: "DELETE FROM outbox WHERE docId NOT IN (SELECT docId FROM documents)")
            try db.execute(sql: "DELETE FROM docUpdates WHERE docId NOT IN (SELECT docId FROM documents)")
        }
        m.registerMigration("v7-quarantine") { db in
            // Remote items that could not be read (wrong key) or applied: kept aside so the
            // document keeps syncing past them; retried after a key repair.
            try db.create(table: "quarantine") { t in
                t.column("docId", .text).notNull().indexed().references("documents", onDelete: .cascade)
                t.column("seq", .integer).notNull()
                t.column("deviceId", .text).notNull()
                t.column("payload", .blob).notNull()
                t.column("reason", .text).notNull()
                t.column("at", .datetime).notNull()
                t.primaryKey(["docId", "seq"])
            }
        }
        m.registerMigration("v8-snapshot-times") { db in
            // Versions after short edits too (spec/06, 2026-11-09): when this device last made a
            // snapshot, and when the first local edit after it was made.
            try db.alter(table: "documents") { t in
                t.add(column: "lastSnapshotAt", .datetime)
                t.add(column: "firstEditSinceSnapshotAt", .datetime)
            }
        }
        m.registerMigration("v9-requeue-connection-failures") { db in
            // Until 2026-11-11 a send that hit a closing connection counted as a failed delivery;
            // five drops on flaky 4G moved a document's edits to «failed», never retried by
            // themselves (owner, build 46: a note made on the phone never reached the server).
            // Only server answers count now; messages failed by the connection go back.
            try LocalStore.requeueConnectionFailures(db)
        }
        m.registerMigration("v10-requeue-oversized-pushes") { db in
            // Build 46 queued the whole state of every note at each launch (`open` stored the
            // content loaded from this store as a new local update); for big, much-edited notes
            // that was over 2 MiB and failed at once as «payload_too_large (local)». The send
            // loop now trims big pushes to what the server lacks: give them another go.
            try db.execute(sql: "UPDATE outbox SET failed = 0, attempts = 0 WHERE failed AND lastError = 'payload_too_large (local)' AND kind = 'push'")
        }
        m.registerMigration("v11-resume-covered") { db in
            // Sync protocol 3 (sync-protocol.md §3.1): the cursor epoch under which this document
            // is known to have every change up to the stored account cursor.
            try db.alter(table: "documents") { t in t.add(column: "covered", .text) }
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
    /// When this device last queued a snapshot of the document.
    public var lastSnapshotAt: Date?
    /// When the first local edit after that snapshot was made (nil: none yet).
    public var firstEditSinceSnapshotAt: Date?
    /// Protocol 3 (§3.1): the epoch of the account cursor that covers this document — every
    /// change of it up to the stored cursor is here. Nil: not covered, subscribed on resume.
    public var covered: String?
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
        lastSnapshotAt = nil
        firstEditSinceSnapshotAt = nil
        covered = nil
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
/// A remote update or snapshot that could not be read (wrong key) or applied.
public struct QuarantinedItem: Hashable, Sendable {
    public var docId: String
    public var seq: Int64
    /// Who wrote it (`deviceId` of the update).
    public var deviceId: String
    /// Still encrypted, as received.
    public var payload: Data
    public var reason: String

    public init(docId: String, seq: Int64, deviceId: String, payload: Data, reason: String) {
        self.docId = docId
        self.seq = seq
        self.deviceId = deviceId
        self.payload = payload
        self.reason = reason
    }
}

/// Unreadable remote data of one document, for a calm per-notebook warning.
public struct UnreadableSync: Hashable, Sendable {
    public var docId: String
    /// The notebook it belongs to (the notebook itself for a notebook document).
    public var notebookId: String?
    public var count: Int
    public var firstSeq: Int64
    public var lastSeq: Int64
    public var deviceIds: [String]
    public var reason: String
}

/// Protocol 3 (§3.1): the stored account cursor and the epoch it belongs to (a random label of
/// this client, new at every `reset`).
public struct ResumeState: Codable, Hashable, Sendable {
    public var cursor: String
    public var epoch: String

    public init(cursor: String, epoch: String) {
        self.cursor = cursor
        self.epoch = epoch
    }
}

/// Messages of one document still to be sent (Diagnostics → Sync).
public struct PendingSync: Hashable, Sendable {
    public var docId: String
    public var count: Int
    /// When the oldest of them was made: how long it has waited.
    public var oldest: Date
    /// Last error met while sending them, if any (a server code).
    public var lastError: String?
}

/// Messages of one document that could not be delivered.
public struct FailedSync: Hashable, Sendable {
    public var docId: String
    /// Last error (`register: forbidden`, `payload_too_large`, …).
    public var reason: String
    public var count: Int
}

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

/// When snapshots — the versions of the history — are made (spec/06, sync-protocol.md §5).
public enum SnapshotPolicy {
    /// Size thresholds: compaction.
    public static let maxUpdates = 500
    public static let maxBytes = 1_000_000
    /// Leaving a document (close, switch, background) snapshots it when it has at least one
    /// local edit and the last snapshot of this device is at least this old.
    public static let leaveInterval: TimeInterval = 2 * 60
    /// While editing: a snapshot once the first edit after the last one is this old.
    public static let editingInterval: TimeInterval = 10 * 60

    /// Rule 1 (leaving).
    public static func onLeave(_ doc: DocumentRecord, now: Date) -> Bool {
        guard doc.localEditsSinceSnapshot > 0 else { return false }
        guard let last = doc.lastSnapshotAt else { return true }
        return now.timeIntervalSince(last) >= leaveInterval
    }

    /// Rule 2 (while editing).
    public static func whileEditing(_ doc: DocumentRecord, now: Date) -> Bool {
        guard doc.localEditsSinceSnapshot > 0, let first = doc.firstEditSinceSnapshotAt else { return false }
        return now.timeIntervalSince(first) >= editingInterval
    }

    /// Rule 3 (before a suggestion or a voice insert): skipped only when a snapshot of this
    /// device already holds the current state (nothing arrived or was edited since).
    public static func beforeChange(_ doc: DocumentRecord) -> Bool {
        doc.lastSnapshotAt == nil || doc.localEditsSinceSnapshot > 0 || doc.updatesSinceSnapshot > 0
    }
}

/// Why a snapshot is made (logs and tests; the protocol does not carry it).
public enum SnapshotReason: String, Sendable, Hashable {
    /// > 500 updates or > 1 MB since the last snapshot.
    case size
    /// Leaving the document (close, switch, background).
    case leave
    /// Every 10 minutes of editing.
    case editing
    /// Before applying a suggestion (voice «Оформить», `agentEdit` replaceWithSuggestion).
    case beforeSuggestion
    /// Before a voice insert.
    case beforeVoiceInsert
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

    /// Updates the notebook of a document (after a move).
    public func setNotebook(_ docId: String, notebookId: String) throws {
        try db.write {
            try $0.execute(sql: "UPDATE documents SET notebookId = ? WHERE docId = ?", arguments: [notebookId, docId])
            try $0.execute(sql: "UPDATE noteIndex SET notebookId = ? WHERE noteId = ?", arguments: [notebookId, docId])
            try $0.execute(sql: "UPDATE tasks SET notebookId = ? WHERE noteId = ?", arguments: [notebookId, docId])
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
            try db.execute(sql: """
                UPDATE documents SET updatedAt = ?, localEditsSinceSnapshot = localEditsSinceSnapshot + 1,
                    firstEditSinceSnapshotAt = COALESCE(firstEditSinceSnapshotAt, ?)
                WHERE docId = ?
                """, arguments: [now, now, docId])
        }
    }

    /// Stores updates received from the server and advances `lastSeq`. `seq`s at or below
    /// `lastSeq` are ignored (duplicates after reconnect).
    /// Returns the items actually stored (new ones), in order.
    ///
    /// `quarantine`: items that could not be read or applied — set aside (`quarantined`), and
    /// `lastSeq` moves past them so the rest of the document keeps syncing.
    @discardableResult
    public func appendRemoteUpdates(docId: String, items: [(seq: Int64, data: Data)], quarantine: [QuarantinedItem] = [],
                                    now: Date = Date()) throws -> [(seq: Int64, data: Data)] {
        try db.write { db in
            guard var doc = try DocumentRecord.fetchOne(db, key: docId) else { return [] }
            return try Self.append(db, &doc, items: items, quarantine: quarantine, now: now)
        }
    }

    /// Protocol 3 (§3.1): a live update of a document whose catch-up is still on its way (the
    /// account subscription delivers it first). Stored and applied, but `lastSeq` does not
    /// move — a drop before the catch-up answer must not leave a hole — and it is not taken as
    /// known to the server (no `seq` on the row): the catch-up brings it again, harmlessly.
    public func storeEarlyRemoteUpdates(docId: String, items: [(seq: Int64, data: Data)], now: Date = Date()) throws -> [(seq: Int64, data: Data)] {
        try db.write { db in
            guard try DocumentRecord.fetchOne(db, key: docId) != nil else { return [] }
            for item in items {
                var stored = StoredUpdate(id: nil, docId: docId, data: item.data, seq: nil, clientMsgId: nil, origin: "remote", createdAt: now)
                try stored.insert(db)
            }
            return items
        }
    }

    // MARK: Resume (protocol 3)

    /// The stored account cursor and its epoch (§3.1); nil before the first `resume` commits.
    public func resumeState() throws -> ResumeState? {
        try value(Self.resumeKey).flatMap { try? JSONDecoder().decode(ResumeState.self, from: $0) }
    }

    /// Stores the cursor after the documents' coverage: `covered` = `epoch` for `coveredIds`, nil
    /// for every other document — in one transaction with the cursor, so a crash cannot leave
    /// a cursor that claims more than the documents have.
    public func commitResume(_ state: ResumeState, coveredIds: Set<String>) throws {
        try db.write { db in
            try db.execute(sql: "UPDATE documents SET covered = NULL")
            let ids = Array(coveredIds)
            for start in stride(from: 0, to: ids.count, by: 500) {
                let chunk = Array(ids[start..<min(start + 500, ids.count)])
                try DocumentRecord.filter(chunk.contains(Column("docId"))).updateAll(db, Column("covered").set(to: state.epoch))
            }
            try db.execute(sql: "INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                           arguments: [Self.resumeKey, try JSONEncoder().encode(state)])
        }
    }

    /// A document caught up after the cursor was stored on this connection: covered by it.
    public func setCovered(docId: String, epoch: String?) throws {
        try db.write { try $0.execute(sql: "UPDATE documents SET covered = ? WHERE docId = ?", arguments: [epoch, docId]) }
    }

    /// Forgets the cursor (a later `resume` starts from nothing: `reset`).
    public func clearResumeState() throws { try setValue(nil, for: Self.resumeKey) }

    static let resumeKey = "sync.resume"

    static func append(_ db: Database, _ doc: inout DocumentRecord, items: [(seq: Int64, data: Data)], quarantine: [QuarantinedItem],
                       now: Date) throws -> [(seq: Int64, data: Data)] {
            let docId = doc.docId
            let from = doc.lastSeq
            for q in quarantine where q.seq > from {
                try db.execute(sql: """
                    INSERT OR REPLACE INTO quarantine(docId, seq, deviceId, payload, reason, at) VALUES(?, ?, ?, ?, ?, ?)
                    """, arguments: [docId, q.seq, q.deviceId, q.payload, q.reason, now])
                doc.lastSeq = max(doc.lastSeq, q.seq)
            }
            var added: [(seq: Int64, data: Data)] = []
            for item in items where item.seq > from {
                added.append(item)
                var stored = StoredUpdate(id: nil, docId: docId, data: item.data, seq: item.seq, clientMsgId: nil, origin: "remote", createdAt: now)
                try stored.insert(db)
                doc.lastSeq = max(doc.lastSeq, item.seq)
                doc.updatesSinceSnapshot += 1
                doc.bytesSinceSnapshot += item.data.count
            }
            doc.updatedAt = now
            try doc.update(db)
            return added
    }

    /// Replaces the stored history by a server snapshot (`updates` with `snapshot`).
    /// Returns false when the snapshot is not newer than what is stored.
    @discardableResult
    public func applyRemoteSnapshot(docId: String, seq: Int64, state: Data, now: Date = Date()) throws -> Bool {
        try db.write { db in
            guard var doc = try DocumentRecord.fetchOne(db, key: docId) else { return false }
            guard seq > doc.lastSeq else {
                // A snapshot forwarded to a live subscription (sync-protocol §5, 2026-11-11): its
                // `baseSeq` is behind us, but it may carry a big change sent as a snapshot. Kept
                // and applied as an update; nothing is replaced.
                var stored = StoredUpdate(id: nil, docId: docId, data: state, seq: seq, clientMsgId: nil, origin: "remote", createdAt: now)
                try stored.insert(db)
                return true
            }
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

    /// State vector of what the server is known to have of `docId`: the stored updates that
    /// carry a server `seq` (remote ones, acknowledged own ones, snapshots). Nil when none.
    public func serverStateVector(docId: String) throws -> Data? {
        try serverState(docId: docId).map { try CRDTUpdates.stateVector(of: $0) }
    }

    /// What the server is known to have of `docId`, merged into one update (nil when nothing
    /// carries a server `seq`).
    public func serverState(docId: String) throws -> Data? {
        let rows = try db.read { db in
            try Data.fetchAll(db, sql: "SELECT data FROM docUpdates WHERE docId = ? AND seq IS NOT NULL ORDER BY id", arguments: [docId])
        }
        guard !rows.isEmpty else { return nil }
        return try CRDTUpdates.merge(rows)
    }

    /// Origin of the stored update behind a queued message (`system`: content the engine stored
    /// itself, e.g. a document's whole state; older builds queued one per note per launch).
    public func queuedOrigin(clientMsgId: String) throws -> String? {
        try db.read { try String.fetchOne($0, sql: "SELECT origin FROM docUpdates WHERE clientMsgId = ? LIMIT 1", arguments: [clientMsgId]) }
    }

    /// Replaces the payload of a queued message (and of its stored update) — a big push trimmed
    /// to what the server lacks.
    public func replaceQueuedPayload(clientMsgId: String, with payload: Data) throws {
        try db.write { db in
            try db.execute(sql: "UPDATE outbox SET payload = ? WHERE clientMsgId = ?", arguments: [payload, clientMsgId])
            try db.execute(sql: "UPDATE docUpdates SET data = ? WHERE clientMsgId = ? AND seq IS NULL", arguments: [payload, clientMsgId])
        }
    }

    /// Drops a queued push the server already has in full (or that a queued snapshot carries):
    /// the message leaves the queue and its stored update stays as local content.
    public func dropRedundantPush(clientMsgId: String) throws {
        try db.write { db in
            try db.execute(sql: "DELETE FROM outbox WHERE clientMsgId = ?", arguments: [clientMsgId])
            try db.execute(sql: "UPDATE docUpdates SET clientMsgId = NULL WHERE clientMsgId = ? AND seq IS NULL", arguments: [clientMsgId])
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

    /// Remote items set aside, oldest first.
    public func quarantined(docId: String? = nil) throws -> [QuarantinedItem] {
        try db.read { db in
            try Row.fetchAll(db, sql: "SELECT * FROM quarantine \(docId == nil ? "" : "WHERE docId = ?") ORDER BY docId, seq",
                             arguments: docId.map { [$0] } ?? []).map {
                QuarantinedItem(docId: $0["docId"], seq: $0["seq"], deviceId: $0["deviceId"], payload: $0["payload"], reason: $0["reason"])
            }
        }
    }

    /// Per document (and its notebook): what could not be read.
    public func unreadable() throws -> [UnreadableSync] {
        try db.read { db in
            try Row.fetchAll(db, sql: """
                SELECT q.docId, d.notebookId, d.kind, COUNT(*) AS n, MIN(q.seq) AS first, MAX(q.seq) AS last,
                       GROUP_CONCAT(DISTINCT q.deviceId) AS devices, MAX(q.reason) AS reason
                FROM quarantine q JOIN documents d ON d.docId = q.docId GROUP BY q.docId ORDER BY MIN(q.at)
                """).map {
                UnreadableSync(docId: $0["docId"], notebookId: $0["kind"] == DocKind.notebook.rawValue ? $0["docId"] : $0["notebookId"],
                               count: $0["n"], firstSeq: $0["first"], lastSeq: $0["last"],
                               deviceIds: ($0["devices"] as String? ?? "").split(separator: ",").map(String.init).sorted(), reason: $0["reason"])
            }
        }
    }

    /// Forgets the quarantine of a document and moves `lastSeq` back so that the items are
    /// fetched again (after a key repair). Returns false when there was nothing.
    @discardableResult
    public func releaseQuarantine(docId: String) throws -> Bool {
        try db.write { db in
            guard let first = try Int64.fetchOne(db, sql: "SELECT MIN(seq) FROM quarantine WHERE docId = ?", arguments: [docId]) else { return false }
            try db.execute(sql: "DELETE FROM quarantine WHERE docId = ?", arguments: [docId])
            try db.execute(sql: "UPDATE documents SET lastSeq = MIN(lastSeq, ?) WHERE docId = ?", arguments: [first - 1, docId])
            return true
        }
    }

    /// Fetch the document again from the start on the next subscription (key repair). Stored
    /// updates stay; seqs seen again are stored again, which is harmless for a CRDT.
    public func resetLastSeq(docId: String) throws {
        try db.write { db in
            try db.execute(sql: "UPDATE documents SET lastSeq = 0 WHERE docId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM quarantine WHERE docId = ?", arguments: [docId])
        }
    }

    /// Drops snapshots of a document still waiting to be sent (one built before a key repair's
    /// catch-up would miss what the catch-up brought).
    public func discardQueuedSnapshots(docId: String) throws {
        try db.write { try $0.execute(sql: "DELETE FROM outbox WHERE docId = ? AND kind = 'snapshot'", arguments: [docId]) }
    }

    /// Notebooks that never reached the server (their documents are not registered).
    public func unsentNotebookIds() throws -> [String] {
        try db.read { try String.fetchAll($0, sql: "SELECT docId FROM documents WHERE kind = 'notebook' AND NOT registered ORDER BY createdAt") }
    }

    /// What signing out would leave unsent: queued messages (failed ones too) plus notebooks
    /// not on the server yet (spec/07, the warning before signing out).
    public func unsentChangeCount() throws -> Int {
        try db.read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM outbox") ?? 0 } + (try unsentNotebookIds().count)
    }

    /// Documents with local edits since this device's last snapshot (the leave rule, spec/06).
    public func documentsWithLocalEdits() throws -> [DocumentRecord] {
        try db.read { try DocumentRecord.fetchAll($0, sql: "SELECT * FROM documents WHERE localEditsSinceSnapshot > 0") }
    }

    /// Whether a snapshot should be uploaded (sync-protocol.md §5).
    public func needsSnapshot(docId: String) throws -> Bool {
        guard let doc = try document(docId) else { return false }
        return doc.updatesSinceSnapshot > SnapshotPolicy.maxUpdates || doc.bytesSinceSnapshot > SnapshotPolicy.maxBytes
    }

    // MARK: Outbox

    public func enqueueSnapshot(docId: String, state: Data, baseSeq: Int64, now: Date = Date()) throws -> OutboxItem {
        try db.write { db in
            try db.execute(sql: """
                UPDATE documents SET localEditsSinceSnapshot = 0, lastSnapshotAt = ?, firstEditSinceSnapshotAt = NULL
                WHERE docId = ?
                """, arguments: [now, docId])
            var item = OutboxItem(id: nil, docId: docId, clientMsgId: EntityID.make(now: now), kind: .snapshot, payload: state,
                                  baseSeq: baseSeq, attempts: 0, lastError: nil, createdAt: now)
            try item.insert(db)
            return item
        }
    }

    /// Pending outgoing messages, oldest first.
    /// Queued messages still to be sent (not failed), oldest first.
    public func pendingOutbox(docId: String? = nil, limit: Int = 100) throws -> [OutboxItem] {
        try db.read { db in
            var request = OutboxItem.filter(Column("failed") == false).order(Column("id")).limit(limit)
            if let docId { request = request.filter(Column("docId") == docId) }
            return try request.fetchAll(db)
        }
    }

    /// The queued message with this id (failed ones included).
    public func outboxItem(clientMsgId: String) throws -> OutboxItem? {
        try db.read { try OutboxItem.filter(Column("clientMsgId") == clientMsgId).fetchOne($0) }
    }

    /// Whether `docId` has messages still to be sent (failed ones not included).
    public func hasPendingOutbox(docId: String) throws -> Bool {
        try db.read { try Bool.fetchOne($0, sql: "SELECT EXISTS(SELECT 1 FROM outbox WHERE docId = ? AND NOT failed)", arguments: [docId]) ?? false }
    }

    /// Queued messages of these documents only, oldest first: the send loop asks for the
    /// documents it can send now, so one that cannot (no key, still catching up, refused) never
    /// fills the page and blocks the rest (owner, build 46).
    public func pendingOutbox(docIds: Set<String>, limit: Int) throws -> [OutboxItem] {
        guard !docIds.isEmpty else { return [] }
        return try db.read { db in
            var items: [OutboxItem] = []
            // SQLite caps bound parameters; documents with a queue are few, but chunk anyway.
            let ids = Array(docIds)
            for start in stride(from: 0, to: ids.count, by: 500) {
                let chunk = Array(ids[start..<min(start + 500, ids.count)])
                items += try OutboxItem.filter(Column("failed") == false && chunk.contains(Column("docId")))
                    .order(Column("id")).limit(limit).fetchAll(db)
            }
            return Array(items.sorted { ($0.id ?? 0) < ($1.id ?? 0) }.prefix(limit))
        }
    }

    /// Messages still to be sent per document, with the age of the oldest (Diagnostics), oldest
    /// first.
    public func pendingOutboxSummary() throws -> [PendingSync] {
        try db.read { db in
            try Row.fetchAll(db, sql: """
                SELECT docId, COUNT(*) AS n, MIN(createdAt) AS oldest,
                    (SELECT lastError FROM outbox AS o2 WHERE o2.docId = outbox.docId AND NOT o2.failed AND o2.lastError IS NOT NULL ORDER BY id DESC LIMIT 1) AS err
                FROM outbox WHERE NOT failed GROUP BY docId ORDER BY MIN(id)
                """).map { PendingSync(docId: $0["docId"], count: $0["n"], oldest: $0["oldest"], lastError: $0["err"]) }
        }
    }

    /// When the oldest message still to be sent was made (nil: none).
    public func oldestPendingAt() throws -> Date? {
        try db.read { try Date.fetchOne($0, sql: "SELECT MIN(createdAt) FROM outbox WHERE NOT failed") }
    }

    /// Puts back messages that «failed» only because the connection broke under them (before
    /// 2026-11-11 those counted as delivery attempts). Returns how many.
    @discardableResult
    public func requeueConnectionFailures() throws -> Int {
        try db.write { db in
            try Self.requeueConnectionFailures(db)
            return db.changesCount
        }
    }

    static func requeueConnectionFailures(_ db: Database) throws {
        try db.execute(sql: """
            UPDATE outbox SET failed = 0, attempts = 0
            WHERE failed AND (lastError = 'closed' OR lastError = 'notConnected' OR lastError LIKE 'connection:%'
                OR lastError LIKE '%NSURLErrorDomain%' OR lastError LIKE '%NSPOSIXErrorDomain%' OR lastError LIKE '%URLError%')
            """)
    }

    /// Messages still to be sent (failed ones not included), per document.
    public func pendingOutboxCounts() throws -> [String: Int] {
        try db.read { db in
            Dictionary(uniqueKeysWithValues: try Row.fetchAll(db, sql: "SELECT docId, COUNT(*) AS n FROM outbox WHERE NOT failed GROUP BY docId")
                .map { ($0["docId"] as String, $0["n"] as Int) })
        }
    }

    /// Messages still to be sent (failed ones not included).
    public func outboxCount() throws -> Int {
        try db.read { try OutboxItem.filter(Column("failed") == false).fetchCount($0) }
    }

    /// Delivery attempts after which a message counts as failed (errors that may pass, such as
    /// `doc_not_found` before re-registration, are retried until then).
    public static let maxSendAttempts = 5

    /// Messages that could not be delivered, per document (latest reason).
    public func failedOutbox() throws -> [FailedSync] {
        try db.read { db in
            try Row.fetchAll(db, sql: """
                SELECT docId, COUNT(*) AS n, (SELECT lastError FROM outbox AS o2 WHERE o2.docId = outbox.docId AND o2.failed ORDER BY id DESC LIMIT 1) AS reason
                FROM outbox WHERE failed GROUP BY docId ORDER BY MIN(id)
                """).map { FailedSync(docId: $0["docId"], reason: $0["reason"] ?? "", count: $0["n"]) }
        }
    }

    /// Fails every queued message of a document (its registration was refused).
    public func failOutbox(docId: String, reason: String) throws {
        try db.write {
            try $0.execute(sql: "UPDATE outbox SET failed = 1, lastError = ? WHERE docId = ? AND NOT failed", arguments: [reason, docId])
        }
    }

    /// Puts failed messages (of one document or all) back into the queue.
    public func retryFailed(docId: String? = nil) throws {
        try db.write { db in
            if let docId {
                try db.execute(sql: "UPDATE outbox SET failed = 0, attempts = 0 WHERE failed AND docId = ?", arguments: [docId])
            } else {
                try db.execute(sql: "UPDATE outbox SET failed = 0, attempts = 0 WHERE failed")
            }
        }
    }

    /// Drops queued messages of a document (all, or only failed ones). Its local updates stay
    /// in the store: the document keeps its content here, and a later snapshot carries it.
    public func discardOutbox(docId: String, onlyFailed: Bool = false) throws {
        try db.write {
            try $0.execute(sql: "DELETE FROM outbox WHERE docId = ?\(onlyFailed ? " AND failed" : "")", arguments: [docId])
        }
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

    /// Records a failed delivery. `permanent` (or reaching `maxSendAttempts`) moves the message
    /// out of the pending queue into `failedOutbox()`.
    public func markFailed(clientMsgId: String, error: String, permanent: Bool = false) throws {
        try db.write {
            try $0.execute(sql: """
                UPDATE outbox SET attempts = attempts + 1, lastError = ?, failed = (? OR attempts + 1 >= ?) WHERE clientMsgId = ?
                """, arguments: [error, permanent, Self.maxSendAttempts, clientMsgId])
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
            // Foreign keys cascade too; explicit so that nothing of it can stay queued.
            try db.execute(sql: "DELETE FROM outbox WHERE docId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM docUpdates WHERE docId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM noteIndex WHERE noteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM tasks WHERE noteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM noteLinks WHERE sourceNoteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM noteTags WHERE noteId = ?", arguments: [docId])
            try db.execute(sql: "DELETE FROM strokeOrphans WHERE noteId = ?", arguments: [docId])
        }
    }
}
