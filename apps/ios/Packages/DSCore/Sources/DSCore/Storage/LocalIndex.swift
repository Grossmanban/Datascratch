import Foundation
import GRDB

/// A full-text search hit.
public struct SearchHit: Hashable, Sendable {
    public var noteId: String
    public var notebookId: String?
    public var title: String
    /// Matching fragment with `[` `]` around matched terms.
    public var snippet: String
}

/// Filter for the tasks index.
public struct TaskQuery: Sendable {
    public var states: Set<TaskState> = [.open]
    /// Tasks scheduled or due on or before this day (`YYYY-MM-DD`), inclusive.
    public var dueOnOrBefore: String?
    /// Tasks scheduled exactly on this day.
    public var scheduledOn: String?
    public var noteId: String?
    public var notebookId: String?
    /// Only tasks with neither `scheduled` nor `deadline`.
    public var unscheduledOnly = false

    public init(states: Set<TaskState> = [.open], dueOnOrBefore: String? = nil, scheduledOn: String? = nil, noteId: String? = nil,
                notebookId: String? = nil, unscheduledOnly: Bool = false) {
        self.states = states
        self.dueOnOrBefore = dueOnOrBefore
        self.scheduledOn = scheduledOn
        self.noteId = noteId
        self.notebookId = notebookId
        self.unscheduledOnly = unscheduledOnly
    }
}

/// Derived indexes (document-model.md §5): tasks, backlinks, tags, full-text search.
extension LocalStore {
    /// Replaces everything indexed for a note with `derived`.
    public func index(_ derived: NoteDerivedData, notebookId: String?, updatedAt: Date = Date()) throws {
        try index([(derived, notebookId)], updatedAt: updatedAt)
    }

    /// Indexes many notes in one transaction (first sync, rebuilds).
    public func index(_ batch: [(derived: NoteDerivedData, notebookId: String?)], updatedAt: Date = Date()) throws {
        try db.write { db in
          for (derived, notebookId) in batch {
            try db.execute(sql: """
                INSERT INTO noteIndex(noteId, notebookId, title, plainText, updatedAt) VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(noteId) DO UPDATE SET notebookId = excluded.notebookId, title = excluded.title,
                  plainText = excluded.plainText, updatedAt = excluded.updatedAt
                """, arguments: [derived.noteId, notebookId, derived.title, derived.plainText, updatedAt])
            try db.execute(sql: "DELETE FROM tasks WHERE noteId = ?", arguments: [derived.noteId])
            for t in derived.tasks {
                try db.execute(sql: """
                    INSERT OR REPLACE INTO tasks(taskId, noteId, notebookId, blockId, text, state, scheduled, deadline, completedAt, "order")
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, arguments: [t.taskId, t.noteId, notebookId, t.blockId, t.text, t.state.rawValue, t.scheduled, t.deadline, t.completedAt, t.order])
            }
            try db.execute(sql: "DELETE FROM noteLinks WHERE sourceNoteId = ?", arguments: [derived.noteId])
            for l in derived.links {
                try db.execute(sql: "INSERT INTO noteLinks(sourceNoteId, targetNoteId, blockId, label) VALUES(?, ?, ?, ?)",
                               arguments: [l.sourceNoteId, l.targetNoteId, l.blockId, l.label])
            }
            try db.execute(sql: "DELETE FROM noteTags WHERE noteId = ?", arguments: [derived.noteId])
            for tag in derived.tags {
                try db.execute(sql: "INSERT OR IGNORE INTO noteTags(noteId, tag) VALUES(?, ?)", arguments: [derived.noteId, tag])
            }
          }
        }
    }

    /// Removes a note from all indexes (trash purge, lost access).
    public func unindex(noteId: String) throws {
        try db.write { db in
            try db.execute(sql: "DELETE FROM noteIndex WHERE noteId = ?", arguments: [noteId])
            try db.execute(sql: "DELETE FROM tasks WHERE noteId = ?", arguments: [noteId])
            try db.execute(sql: "DELETE FROM noteLinks WHERE sourceNoteId = ?", arguments: [noteId])
            try db.execute(sql: "DELETE FROM noteTags WHERE noteId = ?", arguments: [noteId])
        }
    }

    /// Full-text search over titles and text (prefix matching on every word, diacritics
    /// ignored), best matches first.
    public func search(_ text: String, notebookId: String? = nil, limit: Int = 50) throws -> [SearchHit] {
        let words = text.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        guard !words.isEmpty else { return [] }
        let match = words.map { "\"\($0.replacingOccurrences(of: "\"", with: ""))\"*" }.joined(separator: " ")
        return try db.read { db in
            var sql = """
                SELECT noteIndex.noteId, noteIndex.notebookId, noteIndex.title,
                       snippet(noteSearch, 1, '[', ']', '…', 12) AS snippet
                FROM noteSearch JOIN noteIndex ON noteIndex.rowid = noteSearch.rowid
                WHERE noteSearch MATCH ?
                """
            var args: [any DatabaseValueConvertible] = [match]
            if let notebookId {
                sql += " AND noteIndex.notebookId = ?"
                args.append(notebookId)
            }
            sql += " ORDER BY bm25(noteSearch, 5.0, 1.0) LIMIT ?"
            args.append(limit)
            return try Row.fetchAll(db, sql: sql, arguments: StatementArguments(args)).map {
                SearchHit(noteId: $0["noteId"], notebookId: $0["notebookId"], title: $0["title"], snippet: $0["snippet"] ?? "")
            }
        }
    }

    public func tasks(_ query: TaskQuery = TaskQuery()) throws -> [TaskEntry] {
        try db.read { db in
            var conditions: [String] = []
            var args: [any DatabaseValueConvertible] = []
            if !query.states.isEmpty {
                conditions.append("state IN (\(query.states.map { _ in "?" }.joined(separator: ",")))")
                args += query.states.map(\.rawValue).sorted()
            }
            if let day = query.dueOnOrBefore {
                conditions.append("((scheduled IS NOT NULL AND scheduled <= ?) OR (deadline IS NOT NULL AND deadline <= ?))")
                args += [day, day]
            }
            if let day = query.scheduledOn {
                conditions.append("scheduled = ?")
                args.append(day)
            }
            if let id = query.noteId {
                conditions.append("noteId = ?")
                args.append(id)
            }
            if let id = query.notebookId {
                conditions.append("notebookId = ?")
                args.append(id)
            }
            if query.unscheduledOnly { conditions.append("scheduled IS NULL AND deadline IS NULL") }
            let whereClause = conditions.isEmpty ? "" : "WHERE " + conditions.joined(separator: " AND ")
            let sql = "SELECT * FROM tasks \(whereClause) ORDER BY COALESCE(scheduled, deadline, '9999'), noteId, \"order\""
            return try Row.fetchAll(db, sql: sql, arguments: StatementArguments(args)).map { row in
                TaskEntry(noteId: row["noteId"], taskId: row["taskId"], blockId: row["blockId"], text: row["text"],
                          state: TaskState(rawValue: row["state"]) ?? .open, scheduled: row["scheduled"], deadline: row["deadline"],
                          completedAt: row["completedAt"], order: row["order"])
            }
        }
    }

    /// Notes linking to `noteId`.
    public func backlinks(to noteId: String) throws -> [NoteLinkEntry] {
        try db.read { db in
            try Row.fetchAll(db, sql: "SELECT * FROM noteLinks WHERE targetNoteId = ? ORDER BY sourceNoteId", arguments: [noteId]).map {
                NoteLinkEntry(sourceNoteId: $0["sourceNoteId"], targetNoteId: $0["targetNoteId"], blockId: $0["blockId"], label: $0["label"])
            }
        }
    }

    /// All tags with note counts. Nested tags (`a/b`) are counted as written.
    public func tags() throws -> [(tag: String, count: Int)] {
        try db.read { db in
            try Row.fetchAll(db, sql: "SELECT tag, COUNT(*) AS n FROM noteTags GROUP BY tag ORDER BY tag").map { ($0["tag"], $0["n"]) }
        }
    }

    /// Notes with `tag` or any nested tag under it (`tag/...`).
    public func notes(withTag tag: String) throws -> [String] {
        try db.read { db in
            try String.fetchAll(db, sql: "SELECT DISTINCT noteId FROM noteTags WHERE tag = ? OR tag LIKE ? ESCAPE '\\' ORDER BY noteId",
                                arguments: [tag, tag.replacingOccurrences(of: "%", with: "\\%").replacingOccurrences(of: "_", with: "\\_") + "/%"])
        }
    }
}

// MARK: - Attachments

/// Local state of an attachment (crypto.md §6, api.md «Вложения»).
public struct AttachmentRecord: Codable, FetchableRecord, PersistableRecord, Hashable, Sendable {
    public enum State: String, Codable, Sendable {
        /// Created on this device, chunks not all uploaded yet.
        case pendingUpload
        /// On the server and available locally.
        case synced
        /// Known from a document, not downloaded yet.
        case remote
    }

    public static let databaseTableName = "attachments"
    public var attachmentId: String
    public var noteId: String
    public var mime: String
    /// Ciphertext size in bytes (what the server is told).
    public var size: Int64
    public var chunkCount: Int
    /// JSON array of uploaded chunk indices.
    public var uploadedChunks: String
    public var state: State
    /// Plaintext file path relative to the attachments directory.
    public var localPath: String?
    public var createdAt: Date

    public init(attachmentId: String, noteId: String, mime: String, size: Int64, chunkCount: Int, state: State, localPath: String?, createdAt: Date = Date()) {
        self.attachmentId = attachmentId
        self.noteId = noteId
        self.mime = mime
        self.size = size
        self.chunkCount = chunkCount
        self.uploadedChunks = "[]"
        self.state = state
        self.localPath = localPath
        self.createdAt = createdAt
    }

    public var uploaded: Set<Int> {
        get { Set((try? JSONDecoder().decode([Int].self, from: Data(uploadedChunks.utf8))) ?? []) }
        set { uploadedChunks = String(decoding: (try? JSONEncoder().encode(newValue.sorted())) ?? Data("[]".utf8), as: UTF8.self) }
    }

    public var missingChunks: [Int] { (0..<chunkCount).filter { !uploaded.contains($0) } }
}

extension LocalStore {
    public func saveAttachment(_ record: AttachmentRecord) throws {
        try db.write { try record.save($0) }
    }

    public func attachment(_ id: String) throws -> AttachmentRecord? {
        try db.read { try AttachmentRecord.fetchOne($0, key: id) }
    }

    public func attachments(state: AttachmentRecord.State) throws -> [AttachmentRecord] {
        try db.read { try AttachmentRecord.filter(Column("state") == state.rawValue).order(Column("createdAt")).fetchAll($0) }
    }

    /// Records an uploaded chunk; marks the attachment synced when all are there.
    public func markChunkUploaded(attachmentId: String, index: Int) throws {
        try db.write { db in
            guard var r = try AttachmentRecord.fetchOne(db, key: attachmentId) else { return }
            var set = r.uploaded
            set.insert(index)
            r.uploaded = set
            if set.count == r.chunkCount { r.state = .synced }
            try r.update(db)
        }
    }

    public func deleteAttachment(_ id: String) throws {
        try db.write { _ = try AttachmentRecord.deleteOne($0, key: id) }
    }
}
