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

    /// Chunk requests in flight at once, over every upload and download of this manager. A
    /// mobile link answers each request in ~0.5 s: one chunk at a time left it idle most of
    /// the time and several pasted photos took a minute or more (2026-11-05).
    public static let parallelRequests = 3
    private let requests = RequestLimiter(parallelRequests)

    /// Uploads running now, so a retry (the app back in the foreground) joins an upload in
    /// progress instead of sending the same chunks twice.
    private var running: [String: Task<Void, any Error>] = [:]
    /// Downloads running now (two views asking for the same image share one).
    private var fetching: [String: Task<URL, any Error>] = [:]

    /// Uploads (or resumes) one attachment with the note key.
    public func upload(_ attachmentId: String, noteKey: Data) async throws {
        if let task = running[attachmentId] { return try await task.value }
        let task = Task { try await self.performUpload(attachmentId, noteKey: noteKey) }
        running[attachmentId] = task
        defer { running[attachmentId] = nil }
        try await task.value
    }

    private func performUpload(_ attachmentId: String, noteKey: Data) async throws {
        let file = try fileURL(attachmentId)
        guard let record = try store.attachment(attachmentId), record.localPath != nil else { return }
        let data = try Data(contentsOf: file)
        var uploaded = record.uploaded
        let chunkCount = record.chunkCount
        transfers.started(.upload, attachmentId, bytes: record.size)
        publishProgress()
        var finished = false
        defer {
            transfers.ended(.upload, attachmentId, completed: finished)
            publishProgress()
        }
        do {
            try await requests.run { [api] in
                try await api.createAttachment(id: attachmentId, noteId: record.noteId, size: record.size, chunkCount: chunkCount, mime: record.mime)
            }
        } catch APIError.server(409, _, _) {
            // Already created by an earlier attempt: ask what is there.
            uploaded = Set(try await requests.run { [api] in try await api.attachmentStatus(id: attachmentId).uploadedChunks })
        }
        transfers.advanced(.upload, attachmentId, by: Int64(uploaded.count) * Int64(DSCrypto.attachmentChunkSize + DSCrypto.envelopeOverhead))
        // Every missing chunk at once; the limiter lets `parallelRequests` through. A chunk is
        // recorded as soon as it is accepted, so a broken upload resumes with the rest.
        let api = api, store = store, requests = requests
        try await withThrowingTaskGroup(of: Int.self) { group in
            for index in 0..<chunkCount where !uploaded.contains(index) {
                group.addTask {
                    let start = index * DSCrypto.attachmentChunkSize
                    let chunk = data[start..<min(start + DSCrypto.attachmentChunkSize, data.count)]
                    let sealed = try DSCrypto.sealChunk(chunk, key: noteKey, attachmentId: attachmentId, index: index, last: index == chunkCount - 1)
                    try await requests.run { try await api.uploadChunk(attachmentId: attachmentId, index: index, data: sealed) }
                    try store.markChunkUploaded(attachmentId: attachmentId, index: index)
                    return sealed.count
                }
            }
            for try await bytes in group {
                transfers.advanced(.upload, attachmentId, by: Int64(bytes))
                publishProgress()
            }
        }
        try store.markAllUploaded(attachmentId: attachmentId, upTo: chunkCount)
        finished = true
    }

    /// Uploads every pending attachment whose note key is known, together (the chunk requests
    /// share `parallelRequests`). Errors are left for the next call (the chunks already
    /// uploaded are kept).
    public func uploadPending(noteKey: @Sendable (String) -> Data?) async {
        guard let pending = try? store.attachments(state: .pendingUpload) else { return }
        let jobs = pending.compactMap { record in noteKey(record.noteId).map { (record.attachmentId, $0) } }
        await withTaskGroup(of: Void.self) { group in
            for (id, key) in jobs {
                group.addTask { try? await self.upload(id, noteKey: key) }
            }
        }
    }

    /// Downloads, verifies and stores an attachment; returns its local file. The server's
    /// description is checked first (chunk count matches the size, size within `maxSize` and
    /// equal to what this device recorded); chunks are fetched `parallelRequests` at a time,
    /// each checked and decrypted, and written in order — never the whole file in memory.
    @discardableResult
    public func download(_ attachmentId: String, noteId: String, noteKey: Data, mime: String = "application/octet-stream") async throws -> URL {
        let url = try fileURL(attachmentId)
        if FileManager.default.fileExists(atPath: url.path) { return url }
        if let task = fetching[attachmentId] { return try await task.value }
        let task = Task { try await self.performDownload(attachmentId, noteId: noteId, noteKey: noteKey, to: url) }
        fetching[attachmentId] = task
        defer { fetching[attachmentId] = nil }
        return try await task.value
    }

    private func performDownload(_ attachmentId: String, noteId: String, noteKey: Data, to url: URL) async throws -> URL {
        let status = try await requests.run { [api] in try await api.attachmentStatus(id: attachmentId) }
        try Self.check(status, recordedSize: try store.attachment(attachmentId)?.size, maxSize: maxSize)
        transfers.started(.download, attachmentId, bytes: status.size)
        publishProgress()
        var finished = false
        defer {
            transfers.ended(.download, attachmentId, completed: finished)
            publishProgress()
        }
        let partial = directory.appendingPathComponent(".\(attachmentId).part")
        FileManager.default.createFile(atPath: partial.path, contents: nil)
        defer { try? FileManager.default.removeItem(at: partial) }
        let handle = try FileHandle(forWritingTo: partial)
        let plainSize = Self.plaintextSize(status)
        let count = status.chunkCount
        let api = api, requests = requests
        do {
            try await withThrowingTaskGroup(of: (Int, Data).self) { group in
                // A window of chunks ahead of the one written next: memory stays at a few chunks.
                let window = Self.parallelRequests + 1
                var requested = 0
                func request(_ index: Int) {
                    group.addTask {
                        let last = index == count - 1
                        let sealed = try await requests.run { try await api.downloadChunk(attachmentId: attachmentId, index: index) }
                        let expected = last ? plainSize - index * DSCrypto.attachmentChunkSize : DSCrypto.attachmentChunkSize
                        guard sealed.count == expected + DSCrypto.envelopeOverhead else {
                            throw AttachmentError.invalidDownload("chunk \(index): \(sealed.count) bytes, expected \(expected + DSCrypto.envelopeOverhead)")
                        }
                        return (index, try DSCrypto.openChunk(sealed, key: noteKey, attachmentId: attachmentId, index: index, last: last))
                    }
                }
                while requested < min(window, count) { request(requested); requested += 1 }
                var ready: [Int: Data] = [:]
                var next = 0
                while next < count, let (index, plain) = try await group.next() {
                    ready[index] = plain
                    while let chunk = ready.removeValue(forKey: next) {
                        try handle.write(contentsOf: chunk)
                        transfers.advanced(.download, attachmentId, by: Int64(chunk.count + DSCrypto.envelopeOverhead))
                        next += 1
                        if requested < count { request(requested); requested += 1 }
                    }
                    publishProgress()
                }
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
        finished = true
        return url
    }

    // MARK: Progress

    private var transfers = TransferLedger()
    private var progressContinuations: [UUID: AsyncStream<AttachmentTransferProgress>.Continuation] = [:]

    /// What is being sent and fetched now («Отправляются фото: 3 из 8»).
    public func progress() -> AttachmentTransferProgress { transfers.progress }

    /// The progress after every chunk and every start or end of a transfer.
    public func progressUpdates() -> AsyncStream<AttachmentTransferProgress> {
        let (stream, continuation) = AsyncStream<AttachmentTransferProgress>.makeStream(bufferingPolicy: .bufferingNewest(1))
        let id = UUID()
        progressContinuations[id] = continuation
        continuation.yield(transfers.progress)
        continuation.onTermination = { [weak self] _ in Task { await self?.removeProgress(id) } }
        return stream
    }

    private func removeProgress(_ id: UUID) { progressContinuations[id] = nil }

    private func publishProgress() {
        let p = transfers.progress
        for c in progressContinuations.values { c.yield(p) }
        transfers.closeBatchesIfIdle()
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

/// Uploads or downloads of attachments now under way, counted per batch: a batch starts with
/// the first transfer after an idle moment and ends when none is left, so «3 of 8» counts the
/// photos pasted together, not every photo since launch.
public struct AttachmentTransferProgress: Sendable, Equatable {
    public struct Direction: Sendable, Equatable {
        /// Attachments of this batch finished.
        public var done: Int = 0
        /// Attachments of this batch: finished plus under way.
        public var total: Int = 0
        /// Encrypted bytes transferred, of `bytesTotal`.
        public var bytesDone: Int64 = 0
        public var bytesTotal: Int64 = 0
        public var isActive: Bool { done < total }
        /// Attachments still to go.
        public var remaining: Int { total - done }
    }

    public var uploads = Direction()
    public var downloads = Direction()
}

enum TransferDirection { case upload, download }

struct TransferLedger {
    private var active: [TransferDirection: [String: (bytes: Int64, done: Int64)]] = [:]
    private var finished: [TransferDirection: (count: Int, bytes: Int64)] = [:]

    mutating func started(_ d: TransferDirection, _ id: String, bytes: Int64) {
        active[d, default: [:]][id] = (bytes, 0)
    }

    mutating func advanced(_ d: TransferDirection, _ id: String, by bytes: Int64) {
        guard var t = active[d]?[id] else { return }
        t.done = min(t.bytes, t.done + bytes)
        active[d]?[id] = t
    }

    mutating func ended(_ d: TransferDirection, _ id: String, completed: Bool) {
        guard let t = active[d]?.removeValue(forKey: id) else { return }
        // A failed transfer leaves the batch (it is retried later as part of another one).
        if completed {
            finished[d, default: (0, 0)].count += 1
            finished[d, default: (0, 0)].bytes += t.bytes
        }
    }

    /// Once a direction has nothing under way, its next transfer starts a new batch.
    mutating func closeBatchesIfIdle() {
        for d in [TransferDirection.upload, .download] where active[d]?.isEmpty ?? true { finished[d] = nil }
    }

    var progress: AttachmentTransferProgress {
        func direction(_ d: TransferDirection) -> AttachmentTransferProgress.Direction {
            let now = active[d] ?? [:]
            let past = finished[d] ?? (0, 0)
            return .init(done: past.count, total: past.count + now.count,
                         bytesDone: past.bytes + now.values.reduce(0) { $0 + $1.done },
                         bytesTotal: past.bytes + now.values.reduce(0) { $0 + $1.bytes })
        }
        return AttachmentTransferProgress(uploads: direction(.upload), downloads: direction(.download))
    }
}

/// Lets at most `limit` operations run at once; the others wait in order.
actor RequestLimiter {
    private let limit: Int
    private var inUse = 0
    private var waiting: [CheckedContinuation<Void, Never>] = []

    init(_ limit: Int) { self.limit = limit }

    func run<T: Sendable>(_ body: @Sendable () async throws -> T) async throws -> T {
        await acquire()
        defer { release() }
        // A transfer that failed meanwhile cancels its other chunks: they give their turn back.
        try Task.checkCancellation()
        return try await body()
    }

    private func acquire() async {
        if inUse < limit {
            inUse += 1
            return
        }
        await withCheckedContinuation { waiting.append($0) }
    }

    private func release() {
        if waiting.isEmpty {
            inUse -= 1
        } else {
            waiting.removeFirst().resume()
        }
    }
}

