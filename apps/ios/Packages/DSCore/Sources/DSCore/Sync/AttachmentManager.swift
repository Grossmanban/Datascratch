import Foundation

/// Encrypted attachments (crypto.md §6, api.md «Вложения»): plaintext files are kept in a
/// local directory, uploaded as 1 MiB encrypted chunks with resume, downloaded on demand.
public actor AttachmentManager {
    public nonisolated let api: APIClient
    public nonisolated let store: LocalStore
    /// Where plaintext files live (inside the app container, Data Protection applies).
    public nonisolated let directory: URL

    public init(api: APIClient, store: LocalStore, directory: URL) throws {
        self.api = api
        self.store = store
        self.directory = directory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    /// Local file of an attachment, if it is on this device.
    public func localURL(_ attachmentId: String) -> URL? {
        let url = directory.appendingPathComponent(attachmentId)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    /// Ciphertext size of a plaintext of `size` bytes (what the server is told).
    public static func ciphertextSize(plaintextSize size: Int) -> Int64 {
        let chunks = DSCrypto.chunkCount(plaintextSize: size)
        return Int64(size + chunks * DSCrypto.envelopeOverhead)
    }

    /// Stores a new attachment locally and queues it for upload. Returns its id (put it into
    /// the `image`/`file` block or the note cover).
    public func add(_ data: Data, mime: String, noteId: String) throws -> String {
        let id = EntityID.make()
        try data.write(to: directory.appendingPathComponent(id), options: .atomic)
        try store.saveAttachment(AttachmentRecord(
            attachmentId: id, noteId: noteId, mime: mime, size: Self.ciphertextSize(plaintextSize: data.count),
            chunkCount: DSCrypto.chunkCount(plaintextSize: data.count), state: .pendingUpload, localPath: id))
        return id
    }

    /// Uploads (or resumes) one attachment with the note key.
    public func upload(_ attachmentId: String, noteKey: Data) async throws {
        guard let record = try store.attachment(attachmentId), let path = record.localPath else { return }
        let data = try Data(contentsOf: directory.appendingPathComponent(path))
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

    /// Downloads, verifies and stores an attachment; returns its local file.
    @discardableResult
    public func download(_ attachmentId: String, noteId: String, noteKey: Data, mime: String = "application/octet-stream") async throws -> URL {
        if let url = localURL(attachmentId) { return url }
        let status = try await api.attachmentStatus(id: attachmentId)
        var chunks: [Data] = []
        for index in 0..<status.chunkCount {
            chunks.append(try await api.downloadChunk(attachmentId: attachmentId, index: index))
        }
        let data = try DSCrypto.openAttachment(chunks, key: noteKey, attachmentId: attachmentId)
        let url = directory.appendingPathComponent(attachmentId)
        try data.write(to: url, options: .atomic)
        var record = AttachmentRecord(attachmentId: attachmentId, noteId: noteId, mime: status.mime, size: status.size, chunkCount: status.chunkCount,
                                      state: .synced, localPath: attachmentId)
        record.uploaded = Set(0..<status.chunkCount)
        try store.saveAttachment(record)
        return url
    }

    /// Deletes an attachment locally and on the server.
    public func delete(_ attachmentId: String) async throws {
        try? FileManager.default.removeItem(at: directory.appendingPathComponent(attachmentId))
        try store.deleteAttachment(attachmentId)
        do {
            try await api.deleteAttachment(id: attachmentId)
        } catch APIError.server(404, _, _) {}
    }
}

extension LocalStore {
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
