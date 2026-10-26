import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import DSCore

/// Transport whose first calls fail as scripted, then answers from `handler`.
final class FlakyTransport: HTTPTransport, @unchecked Sendable {
    enum Failure { case notSent, maybeSent, status(Int) }

    let failures: Locked<[Failure]>
    let handler: @Sendable (URLRequest) -> (Int, Data)
    let requests = Locked<[URLRequest]>([])

    init(failures: [Failure], handler: @escaping @Sendable (URLRequest) -> (Int, Data)) {
        self.failures = Locked(failures)
        self.handler = handler
    }

    var count: Int { requests.withLock { $0.count } }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.withLock { $0.append(request) }
        let failure = failures.withLock { $0.isEmpty ? nil : $0.removeFirst() }
        let (status, data): (Int, Data)
        switch failure {
        case .notSent: throw TransportFailure(notSent: true, message: "TLS handshake failed")
        case .maybeSent: throw TransportFailure(notSent: false, message: "timed out")
        case .status(let s): (status, data) = (s, Data(#"{"error":{"code":"internal","message":"bad gateway"}}"#.utf8))
        case nil: (status, data) = handler(request)
        }
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

/// URLProtocol that fails the first `failures` requests like a TLS handshake that never
/// completes, then answers `GET /v1/health`.
final class FailingURLProtocol: URLProtocol, @unchecked Sendable {
    static let remaining = Locked(0)
    static let seen = Locked(0)

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.seen.withLock { $0 += 1 }
        if Self.remaining.withLock({ n in defer { n -= 1 }; return n > 0 }) {
            client?.urlProtocol(self, didFailWithError: URLError(.secureConnectionFailed))
            return
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: "HTTP/2", headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(#"{"ok":true,"version":"1"}"#.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

@Suite(.serialized) struct NetworkRetryTests {
    let base = URL(string: "https://example.com")!

    func api(_ transport: any HTTPTransport, signedIn: Bool = false, expired: Bool = false) async throws -> APIClient {
        let sessions = SecretSessionStore(store: InMemorySecretStore())
        if signedIn {
            let expires = Date().addingTimeInterval(expired ? -10 : 3600)
            try sessions.save(AuthSession(userId: Self.userId, deviceId: "d", accessToken: "t1", refreshToken: "r1", accessExpiresAt: DSDate.iso(expires),
                                          wrappedMasterKeyPassword: .init(Data([1])), accountDocId: Self.accountDocId))
        }
        let api = APIClient(baseURL: base, transport: transport, sessionStore: sessions)
        await api.setRetryTiming(timeouts: [1, 2, 3, 4], baseDelay: .milliseconds(5))
        return api
    }

    static let health = (200, Data(#"{"ok":true,"version":"1"}"#.utf8))
    static let userId = "0192f3c4-0000-7000-8000-00000000000a"
    static let accountDocId = "0192f3c4-0000-7000-8000-00000000000b"
    static func sessionJSON(_ token: String) -> Data {
        Data(#"{"userId":"\#(userId)","deviceId":"d","accessToken":"\#(token)","refreshToken":"r-\#(token)","accessExpiresAt":"\#(DSDate.iso(Date().addingTimeInterval(3600)))","wrappedMasterKeyPassword":"AQ","accountDocId":"\#(accountDocId)"}"#.utf8)
    }

    @Test func idempotentRequestsRetryUntilTheyGetThrough() async throws {
        let t = FlakyTransport(failures: [.maybeSent, .notSent, .status(503)]) { _ in Self.health }
        let api = try await api(t)
        #expect(try await api.health().ok)
        #expect(t.count == 4)
        // Each attempt gets its own (growing) idle timeout.
        #expect(t.requests.withLock { $0.map(\.timeoutInterval) } == [1, 2, 3, 4])
    }

    @Test func nonIdempotentRequestsRetryOnlyWhenCertainlyNotSent() async throws {
        let login = FlakyTransport(failures: [.notSent, .notSent]) { _ in (200, Self.sessionJSON("t")) }
        _ = try await api(login).login(email: "a@b.co", loginKey: Data(repeating: 1, count: 32), deviceName: "iPad")
        #expect(login.count == 3)

        // A timeout may have reached the server: a sign-in is not repeated (nor on 503).
        let timedOut = FlakyTransport(failures: [.maybeSent]) { _ in (200, Self.sessionJSON("t")) }
        await #expect(throws: APIError.transport("timed out")) {
            try await api(timedOut).login(email: "a@b.co", loginKey: Data(repeating: 1, count: 32), deviceName: "iPad")
        }
        #expect(timedOut.count == 1)
        let unavailable = FlakyTransport(failures: [.status(503)]) { _ in (200, Self.sessionJSON("t")) }
        await #expect(throws: APIError.self) {
            try await api(unavailable).login(email: "a@b.co", loginKey: Data(repeating: 1, count: 32), deviceName: "iPad")
        }
        #expect(unavailable.count == 1)

        // POST that is idempotent by id (document registration) is retried after a timeout.
        let register = FlakyTransport(failures: [.maybeSent]) { _ in (204, Data()) }
        try await api(register, signedIn: true).registerDoc(docId: EntityID.make(), kind: .note, notebookId: EntityID.make())
        #expect(register.count == 2)
    }

    /// A lost refresh response is retried (the server answers a repeat of the same token within
    /// 60 s with the same session, api.md); a refresh that keeps failing keeps the session.
    @Test func tokenRefreshIsRetried() async throws {
        let ok = FlakyTransport(failures: [.notSent]) { req in
            req.url!.path == "/v1/auth/refresh" ? (200, Self.sessionJSON("t2")) : (200, Data("[]".utf8))
        }
        let api1 = try await api(ok, signedIn: true, expired: true)
        _ = try await api1.devices()
        #expect(ok.requests.withLock { $0.map(\.url!.path) } == ["/v1/auth/refresh", "/v1/auth/refresh", "/v1/devices"])
        #expect(await api1.currentSession?.accessToken == "t2")

        let lost = FlakyTransport(failures: [.maybeSent]) { req in
            req.url!.path == "/v1/auth/refresh" ? (200, Self.sessionJSON("t3")) : (200, Data("[]".utf8))
        }
        let api2 = try await api(lost, signedIn: true, expired: true)
        _ = try await api2.devices()
        #expect(lost.requests.withLock { $0.map(\.url!.path) } == ["/v1/auth/refresh", "/v1/auth/refresh", "/v1/devices"])
        #expect(await api2.currentSession?.accessToken == "t3")

        let down = FlakyTransport(failures: [.maybeSent, .maybeSent, .maybeSent, .maybeSent]) { _ in (200, Self.sessionJSON("t4")) }
        let api3 = try await api(down, signedIn: true, expired: true)
        await #expect(throws: APIError.transport("timed out")) { _ = try await api3.devices() }
        #expect(await api3.isSignedIn)
    }

    /// The real URLSession path: a stub protocol fails the first handshakes.
    @Test func urlSessionTransportRetriesFailedHandshakes() async throws {
        FailingURLProtocol.remaining.withLock { $0 = 2 }
        FailingURLProtocol.seen.withLock { $0 = 0 }
        let config = DSNetwork.makeConfiguration()
        config.protocolClasses = [FailingURLProtocol.self]
        let transport = URLSessionTransport(session: URLSession(configuration: config))
        let api = try await api(transport)
        #expect(try await api.health().ok)
        #expect(FailingURLProtocol.seen.withLock { $0 } == 3)
    }

    @Test func handshakeErrorsClassifyAsNotSent() {
        #expect(URLSessionTransport.notSent(.secureConnectionFailed, requestStarted: nil))
        #expect(URLSessionTransport.notSent(.cannotConnectToHost, requestStarted: true))
        #expect(URLSessionTransport.notSent(.timedOut, requestStarted: false))
        #expect(!URLSessionTransport.notSent(.timedOut, requestStarted: true))
        #expect(!URLSessionTransport.notSent(.timedOut, requestStarted: nil))
        #expect(!URLSessionTransport.notSent(.networkConnectionLost, requestStarted: nil))
    }
}

/// WebSocket connection whose handshake never completes (nothing comes back).
final class StuckConnection: WebSocketConnection, @unchecked Sendable {
    let closed = AsyncStream<Void>.makeStream()

    func send(_ text: String) async throws {}
    func receive() async throws -> String {
        for await _ in closed.stream {}
        throw SyncClientError.closed
    }
    func sendPing() async throws {}
    func close() { closed.continuation.finish() }
}

/// The first `stuck` connections hang in the handshake, the rest go to the fake server.
struct StuckFirstFactory: WebSocketFactory {
    let server: FakeSyncServer
    let stuck: Locked<Int>

    func connect(to url: URL) async throws -> any WebSocketConnection {
        if stuck.withLock({ n in defer { n -= 1 }; return n > 0 }) { return StuckConnection() }
        return try await server.connect()
    }
}

@Suite struct SyncHandshakeTests {
    /// Two stuck handshakes: the client drops them after the handshake timeout and reconnects
    /// at once (well before the 10 s backoff), and the status never says offline meanwhile.
    /// The timeout leaves the real handshake room even on a loaded CI simulator.
    @Test func stuckHandshakesAreRetriedQuicklyAndShowAsSyncing() async throws {
        let server = FakeSyncServer()
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "A", clientVersion: "test")
        config.minBackoff = .seconds(10)
        config.handshakeTimeout = .seconds(1)
        config.quickRetryDelay = .milliseconds(20)
        let client = SyncClient(configuration: config, factory: StuckFirstFactory(server: server, stuck: Locked(2))) { .user(accessToken: "t") }
        let engine = SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in Data(repeating: 1, count: 32) }, register: nil)
        let seen = Locked<[SyncStatus.Summary]>([])
        let watcher = Task {
            for await status in await engine.statusUpdates() { seen.withLock { $0.append(status.summary) } }
        }
        let start = ContinuousClock.now
        await engine.start()
        #expect(try await eventually(timeout: .seconds(8)) { await client.isConnected })
        #expect(ContinuousClock.now - start < .seconds(5))
        try await Task.sleep(for: .milliseconds(50))
        watcher.cancel()
        let summaries = seen.withLock { $0 }
        // Before start the engine is offline; from then on only syncing until synced.
        #expect(!summaries.dropFirst().contains(.offline))
        #expect(summaries.last == .synced)
        await engine.stop()
    }

    /// Past the quick retries the status does say offline (the server is really unreachable).
    @Test func repeatedFailuresShowAsOffline() async throws {
        let server = FakeSyncServer()
        await server.setAccepting(false)
        var config = SyncClient.Configuration(url: URL(string: "wss://example.com/v1/sync")!, deviceId: "A", clientVersion: "test")
        config.minBackoff = .milliseconds(20)
        config.quickRetryDelay = .milliseconds(5)
        let client = SyncClient(configuration: config, factory: FakeFactory(server: server)) { .user(accessToken: "t") }
        let engine = SyncEngine(store: try LocalStore.inMemory(), client: client, keyFor: { _ in nil }, register: nil)
        await engine.start()
        #expect(try await eventually { await engine.status().summary == .offline })
        await server.setAccepting(true)
        #expect(try await eventually { await engine.status().summary == .synced })
        await engine.stop()
    }
}
