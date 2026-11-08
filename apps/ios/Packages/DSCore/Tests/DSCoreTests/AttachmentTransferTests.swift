import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// Chunk transfers in parallel (2026-11-05: pasted photos took a minute or more, one ~0.5 s
/// request per chunk at a time).
@Suite struct AttachmentTransferTests {
    /// The REST fake with a delay per chunk request; counts chunk requests in flight and can
    /// refuse one chunk once (a connection lost mid-upload).
    final class SlowServer: HTTPTransport, @unchecked Sendable {
        let inner = FakeRESTServer()
        let counters = Locked((inFlight: 0, maxInFlight: 0, puts: 0, gets: 0))
        let failOnce = Locked<Int?>(nil)

        func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
            let parts = request.url!.path.split(separator: "/")
            guard parts.count == 5, parts[1] == "attachments", let index = Int(parts[4]) else { return try await inner.send(request) }
            let isPut = request.httpMethod == "PUT"
            counters.withLock {
                $0.inFlight += 1
                $0.maxInFlight = max($0.maxInFlight, $0.inFlight)
                if isPut { $0.puts += 1 } else { $0.gets += 1 }
            }
            defer { counters.withLock { $0.inFlight -= 1 } }
            try await Task.sleep(for: .milliseconds(30))
            if isPut, failOnce.withLock({ f in defer { if f == index { f = nil } }; return f == index }) {
                let body = try JSONSerialization.data(withJSONObject: ["error": ["code": "internal", "message": "lost"]])
                return (body, HTTPURLResponse(url: request.url!, statusCode: 500, httpVersion: nil, headerFields: nil)!)
            }
            return try await inner.send(request)
        }
    }

    func device(_ server: SlowServer, email: String) async throws -> AccountService {
        let api = APIClient(baseURL: URL(string: "https://example.com")!, transport: server, sessionStore: SecretSessionStore(store: InMemorySecretStore()))
        let service = AccountService(api: api, keys: KeyRing(store: InMemorySecretStore()), store: try LocalStore.inMemory())
        _ = try await service.signup(email: email, password: "pw")
        return service
    }

    func folder() -> URL { FileManager.default.temporaryDirectory.appendingPathComponent(EntityID.make()) }

    @Test func parallelUploadResumesAfterABreakAndDownloadsInOrder() async throws {
        let server = SlowServer()
        let a = try await device(server, email: "up@example.com")
        let dirA = folder(), dirB = folder()
        defer { try? FileManager.default.removeItem(at: dirA); try? FileManager.default.removeItem(at: dirB) }
        let files = try AttachmentManager(api: a.api, store: a.store, directory: dirA)
        let chunks = 7
        let bytes = Data((0..<(chunks * DSCrypto.attachmentChunkSize - 100)).map { UInt8(truncatingIfNeeded: $0 * 31) })
        let key = DSCrypto.newKey()
        let noteId = EntityID.make()
        let id = try await files.add(bytes, mime: "image/jpeg", noteId: noteId)

        // The connection breaks at chunk 4: what got through is kept.
        server.failOnce.withLock { $0 = 4 }
        await #expect(throws: (any Error).self) { try await files.upload(id, noteKey: key) }
        let onServer = Set(server.inner.state.withLock { $0.attachments[id]?.chunks.keys.map { $0 } ?? [] })
        let recorded = try #require(try a.store.attachment(id)).uploaded
        #expect(!onServer.contains(4) && onServer.count < chunks)
        #expect(recorded.isSubset(of: onServer) && !recorded.isEmpty)
        #expect(server.counters.withLock { $0.maxInFlight } == AttachmentManager.parallelRequests)
        #expect(await files.progress().uploads.isActive == false)

        // Resume: only what the server does not have is sent.
        let putsBefore = server.counters.withLock { $0.puts }
        try await files.upload(id, noteKey: key)
        #expect(server.counters.withLock { $0.puts } - putsBefore == chunks - onServer.count)
        #expect(try a.store.attachment(id)?.state == .synced)
        #expect(server.inner.state.withLock { $0.attachments[id]?.chunks.count } == chunks)

        // Another device: chunks fetched in parallel, written in order.
        server.counters.withLock { $0.maxInFlight = 0 }
        let other = try AttachmentManager(api: a.api, store: try LocalStore.inMemory(), directory: dirB)
        async let first = other.download(id, noteId: noteId, noteKey: key)
        async let same = other.download(id, noteId: noteId, noteKey: key)
        let (url1, url2) = try await (first, same)
        #expect(url1 == url2)
        #expect(try Data(contentsOf: url1) == bytes)
        #expect(server.counters.withLock { $0.gets } == chunks)
        #expect(server.counters.withLock { $0.maxInFlight } == AttachmentManager.parallelRequests)
    }

    /// «Отправляются фото: 3 из 8»: several attachments go together and the progress counts
    /// them as one batch.
    @Test func pendingUploadsGoTogetherWithProgress() async throws {
        let server = SlowServer()
        let a = try await device(server, email: "batch@example.com")
        let dir = folder()
        defer { try? FileManager.default.removeItem(at: dir) }
        let files = try AttachmentManager(api: a.api, store: a.store, directory: dir)
        let key = DSCrypto.newKey()
        let noteId = EntityID.make()
        for i in 0..<4 { _ = try await files.add(Data(repeating: UInt8(i), count: 300_000), mime: "image/jpeg", noteId: noteId) }

        let seen = Locked<[AttachmentTransferProgress.Direction]>([])
        let updates = await files.progressUpdates()
        let watcher = Task { for await p in updates { seen.withLock { $0.append(p.uploads) } } }
        await files.uploadPending { _ in key }
        #expect(try a.store.attachments(state: .pendingUpload).isEmpty)
        // One photo of one chunk each: they still went three at a time.
        #expect(server.counters.withLock { $0.maxInFlight } == AttachmentManager.parallelRequests)
        let all: Int64 = 4 * (300_000 + Int64(DSCrypto.envelopeOverhead))
        let finished = AttachmentTransferProgress.Direction(done: 4, total: 4, bytesDone: all, bytesTotal: all)
        #expect(try await eventually { seen.withLock { $0.last } == finished })
        #expect(seen.withLock { $0.contains { $0.total == 4 && $0.done < 4 } })
        #expect(seen.withLock { $0.allSatisfy { $0.done <= $0.total && $0.bytesDone <= $0.bytesTotal } })
        // The batch is over: the next upload starts a new one.
        #expect(await files.progress().uploads == .init())
        watcher.cancel()
    }
}
