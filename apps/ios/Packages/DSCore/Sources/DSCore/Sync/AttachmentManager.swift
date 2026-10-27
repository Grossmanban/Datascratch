import Foundation

public enum AttachmentError: Error, Equatable, Sendable {
    /// Not a lowercase UUIDv7 (`EntityID.make()`).
    case invalidId(String)
    /// An attachment with this id is already stored.
    case alreadyExists(String)
    /// What the server reports does not add up (chunk count vs size, chunk sizes, the size we
    /// recorded) or exceeds `AttachmentManager.maxSize`; nothing is written.
    case invalidDownload(String)
}

/// Encrypted attachments (crypto.md §6, api.md «Вложения»): plaintext files are kept in a
/// local directory, uploaded as 1 MiB encrypted chunks with resume, downloaded on demand.
public actor AttachmentManager {
    public nonisolated let api: APIClient
    public nonisolated let store: LocalStore
    /// Where plaintext files live (inside the app container, Data Protection applies).
    public nonisolated let directory: URL
    /// Largest ciphertext accepted on download (api.md: attachment limit 200 MB).
    public nonisolated let maxSize: Int64

    public init(api: APIClient, store: LocalStore, directory: URL, maxSize: Int64 = 200 * 1_000_000) throws {
        self.api = api
        self.store = store
        self.directory = directory
        self.maxSize = maxSize
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    /// Local file of an attachment, if it is on this device.
    public func localURL(_ attachmentId: String) -> URL? {
        guard let url = try? fileURL(attachmentId) else { return nil }
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    /// The file of `attachmentId` inside `directory`. Ids come from note content (blocks,
    /// covers) written by other devices and agents: only a UUIDv7 is a file name, so an id like
    /// `../library.sqlite` never reaches outside the folder.
    private func fileURL(_ attachmentId: String) throws -> URL {
        guard EntityID.isValid(attachmentId) else { throw AttachmentError.invalidId(attachmentId) }
        return directory.appendingPathComponent(attachmentId)
    }

    /// Ciphertext size of a plaintext of `size` bytes (what the server is told).
    public static func ciphertextSize(plaintextSize size: Int) -> Int64 {
        let chunks = DSCrypto.chunkCount(plaintextSize: size)
        return Int64(size + chunks * DSCrypto.envelopeOverhead)
    }

    /// Stores a new attachment locally and queues it for upload. Returns its id (put it into
    /// the `image`/`file` block or the note cover).
    ///
    /// `id`: an id made beforehand with `EntityID.make()`, when the block must reference the
    /// attachment before its bytes exist (a pasted web page: the block is inserted at once, the
    /// image downloaded afterwards). Until `add` is called nothing about it is stored or sent;
    /// if the bytes never come, there is nothing to clean up (the block just has no file).
    public func add(_ data: Data, mime: String, noteId: String, id: String? = nil) throws -> String {
        let id = id ?? EntityID.make()
        guard EntityID.isValid(id) else { throw AttachmentError.invalidId(id) }
        guard try store.attachment(id) == nil else { throw AttachmentError.alreadyExists(id) }
        try data.write(to: try fileURL(id), options: .atomic)
        try store.saveAttachment(AttachmentRecord(
            attachmentId: id, noteId: noteId, mime: mime, size: Self.ciphertextSize(plaintextSize: data.count),
            chunkCount: DSCrypto.chunkCount(plaintextSize: data.count), state: .pendingUpload, localPath: id))
        return id
    }

    /// Uploads (or resumes) one attachment with the note key.
    public func upload(_ attachmentId: String, noteKey: Data) async throws {
        let file = try fileURL(attachmentId)
        guard let record = try store.attachment(attachmentId), record.localPath != nil else { return }
        let data = try Data(contentsOf: file)
        var uploaded = record.uploaded
        do {
            try await api.createAttachment(id: attachmentId, noteId: record.noteId, size: record.size, chunkCount: record.chunkCount, mime: record.mime)
        } catch APIError.server(409, _, _) {
            // Already created by an earlier attempt: ask what is there.
            uploaded = Set(try await api.attachmentStatus(id: attachmentId).uploadedChunks)
        }
        for index in 0..<record.chunkCount where !uploaded.contains(index) {
            let start = index * DSCrypto.attachmentChunkSize
            let chunk = data[start..<min(start + DSCrypto.attachmentChunkSize, data.count)]
            let sealed = try DSCrypto.sealChunk(chunk, key: noteKey, attachmentId: attachmentId, index: index, last: index == record.chunkCount - 1)
            try await api.uploadChunk(attachmentId: attachmentId, index: index, data: sealed)
            try store.markChunkUploaded(attachmentId: attachmentId, index: index)
        }
        try store.markAllUploaded(attachmentId: attachmentId, upTo: record.chunkCount)
    }

    /// Uploads every pending attachment whose note key is known. Errors are left for the
    /// next call (the chunks already uploaded are kept).
    public func uploadPending(noteKey: @Sendable (String) -> Data?) async {
        guard let pending = try? store.attachments(state: .pendingUpload) else { return }
        for record in pending {
            guard let key = noteKey(record.noteId) else { continue }
            try? await upload(record.attachmentId, noteKey: key)
        }
    }

    /// Downloads, verifies and stores an attachment; returns its local file. The server's
    /// description is checked first (chunk count matches the size, size within `maxSize` and
    /// equal to what this device recorded), each chunk is checked and decrypted as it arrives
    /// and written to disk, never the whole file in memory.
    @discardableResult
    public func download(_ attachmentId: String, noteId: String, noteKey: Data, mime: String = "application/octet-stream") async throws -> URL {
        let url = try fileURL(attachmentId)
        if FileManager.default.fileExists(atPath: url.path) { return url }
        let status = try await api.attachmentStatus(id: attachmentId)
        try Self.check(status, recordedSize: try store.attachment(attachmentId)?.size, maxSize: maxSize)
        let partial = directory.appendingPathComponent(".\(attachmentId).part")
        FileManager.default.createFile(atPath: partial.path, contents: nil)
        defer { try? FileManager.default.removeItem(at: partial) }
        let handle = try FileHandle(forWritingTo: partial)
        do {
            for index in 0..<status.chunkCount {
                let last = index == status.chunkCount - 1
                let sealed = try await api.downloadChunk(attachmentId: attachmentId, index: index)
                let plainSize = Self.plaintextSize(status)
                let expected = last ? plainSize - index * DSCrypto.attachmentChunkSize : DSCrypto.attachmentChunkSize
                guard sealed.count == expected + DSCrypto.envelopeOverhead else {
                    throw AttachmentError.invalidDownload("chunk \(index): \(sealed.count) bytes, expected \(expected + DSCrypto.envelopeOverhead)")
                }
                try handle.write(contentsOf: try DSCrypto.openChunk(sealed, key: noteKey, attachmentId: attachmentId, index: index, last: last))
            }
            try handle.close()
        } catch {
            try? handle.close()
            throw error
        }
        _ = try? FileManager.default.removeItem(at: url)
        try FileManager.default.moveItem(at: partial, to: url)
        var record = AttachmentRecord(attachmentId: attachmentId, noteId: noteId, mime: status.mime, size: status.size, chunkCount: status.chunkCount,
                                      state: .synced, localPath: attachmentId)
        record.uploaded = Set(0..<status.chunkCount)
        try store.saveAttachment(record)
        return url
    }

    static func plaintextSize(_ status: AttachmentStatus) -> Int {
        Int(status.size) - status.chunkCount * DSCrypto.envelopeOverhead
    }

    /// Whether the server's description of an attachment is consistent and acceptable.
    static func check(_ status: AttachmentStatus, recordedSize: Int64?, maxSize: Int64) throws {
        guard status.size > 0, status.size <= maxSize else { throw AttachmentError.invalidDownload("size \(status.size)") }
        let plain = plaintextSize(status)
        guard status.chunkCount >= 1, plain >= 0, DSCrypto.chunkCount(plaintextSize: plain) == status.chunkCount else {
            throw AttachmentError.invalidDownload("\(status.chunkCount) chunks for \(status.size) bytes")
        }
        if let recordedSize, recordedSize != status.size {
            throw AttachmentError.invalidDownload("size \(status.size), recorded \(recordedSize)")
        }
    }

    /// Deletes an attachment locally and on the server.
    public func delete(_ attachmentId: String) async throws {
        let file = try fileURL(attachmentId)
        try? FileManager.default.removeItem(at: file)
        try store.deleteAttachment(attachmentId)
        do {
            try await api.deleteAttachment(id: attachmentId)
        } catch APIError.server(404, _, _) {}
    }
}

extension AttachmentManager {
    /// «Удалить данные с этого устройства» / sign-out wipe: every local attachment file and
    /// record (nothing on the server).
    public func wipeLocal() throws {
        try Self.wipeLocal(directory: directory, store: store)
    }

    /// The same without a manager (signed out: no `APIClient`).
    public static func wipeLocal(directory: URL, store: LocalStore) throws {
        let fm = FileManager.default
        for url in (try? fm.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? [] {
            try fm.removeItem(at: url)
        }
        try store.deleteAllAttachments()
    }
}

extension LocalStore {
    /// Removes every attachment record (local wipe).
    public func deleteAllAttachments() throws {
        try db.write { _ = try AttachmentRecord.deleteAll($0) }
    }

    /// Marks all chunks uploaded (after a resumed upload completed).
    func markAllUploaded(attachmentId: String, upTo count: Int) throws {
        try db.write { db in
            guard var r = try AttachmentRecord.fetchOne(db, key: attachmentId) else { return }
            r.uploaded = Set(0..<count)
            r.state = .synced
            try r.update(db)
        }
    }
}
