import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// One WebSocket connection carrying text frames.
public protocol WebSocketConnection: Sendable {
    func send(_ text: String) async throws
    /// Next text frame; throws when the connection closes.
    func receive() async throws -> String
    func sendPing() async throws
    func close()
}

/// Opens connections (URLSession in the app, an in-memory server in tests).
public protocol WebSocketFactory: Sendable {
    func connect(to url: URL) async throws -> any WebSocketConnection
}

/// `URLSessionWebSocketTask`-based connections.
public struct URLSessionWebSocketFactory: WebSocketFactory {
    let session: URLSession

    public init(session: URLSession = DSNetwork.session) { self.session = session }

    public func connect(to url: URL) async throws -> any WebSocketConnection {
        let task = session.webSocketTask(with: url)
        task.maximumMessageSize = SyncProtocol.maxSnapshotBytes * 2
        task.resume()
        return URLSessionWebSocket(task: task)
    }
}

final class URLSessionWebSocket: WebSocketConnection, @unchecked Sendable {
    let task: URLSessionWebSocketTask

    init(task: URLSessionWebSocketTask) { self.task = task }

    func send(_ text: String) async throws { try await task.send(.string(text)) }

    func receive() async throws -> String {
        switch try await task.receive() {
        case .string(let s): return s
        case .data(let d): return String(decoding: d, as: UTF8.self)
        @unknown default: return ""
        }
    }

    func sendPing() async throws {
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, any Error>) in
            task.sendPing { error in
                if let error { c.resume(throwing: error) } else { c.resume() }
            }
        }
    }

    func close() { task.cancel(with: .normalClosure, reason: nil) }
}

public enum SyncConnectionState: Equatable, Sendable {
    case disconnected
    case connecting
    /// After `welcome`.
    case connected(userId: String?)
    /// Waiting before the next reconnect attempt.
    case waiting(retryIn: Duration)
    /// Stopped for good (protocol mismatch, signed out).
    case stopped(reason: String)
}

public enum SyncClientError: Error, Equatable {
    case notConnected
    case closed
    case server(SyncErrorCode, String)
}

/// Receives connection events. Called on the client's actor; implementations should be quick.
public protocol SyncClientDelegate: AnyObject, Sendable {
    /// After `welcome`: (re)subscribe and flush the outbox.
    func syncClientDidConnect(_ client: SyncClient, userId: String?) async
    func syncClient(_ client: SyncClient, didReceive message: ServerMessage) async
    func syncClient(_ client: SyncClient, didChangeState state: SyncConnectionState) async
}

/// The WebSocket side of sync-protocol.md: `hello`/`welcome`, reconnection with backoff,
/// pings every 25 s (no pong in 10 s = dead connection, replaced), typed sending. Document logic lives in `SyncEngine`.
public actor SyncClient {
    public struct Configuration: Sendable {
        /// `wss://host/v1/sync`.
        public var url: URL
        public var deviceId: String
        public var clientVersion: String
        public var minBackoff: Duration = .seconds(1)
        public var maxBackoff: Duration = .seconds(30)
        /// From opening the connection to `welcome`; a handshake that hangs longer is dropped
        /// and retried on a new connection.
        public var handshakeTimeout: Duration = .seconds(6)
        /// Failed handshakes retried almost at once (a stuck connection is usually a one-off on
        /// flaky networks) before the exponential backoff starts.
        public var quickRetries = 2
        public var quickRetryDelay: Duration = .milliseconds(300)
        public var pingInterval: Duration = SyncProtocol.pingInterval
        /// No pong this long after a ping: the connection died silently (the app was suspended,
        /// the network changed, a NAT entry expired) and is replaced by a new one.
        public var pongTimeout: Duration = .seconds(10)

        public init(url: URL, deviceId: String, clientVersion: String) {
            self.url = url
            self.deviceId = deviceId
            self.clientVersion = clientVersion
        }

        /// `https://host` → `wss://host/v1/sync`.
        public static func url(forServer base: URL) -> URL {
            var c = URLComponents(url: base, resolvingAgainstBaseURL: false)!
            c.scheme = c.scheme == "http" ? "ws" : "wss"
            c.path = (c.path.hasSuffix("/") ? String(c.path.dropLast()) : c.path) + SyncProtocol.path
            return c.url!
        }
    }

    public let configuration: Configuration
    private let factory: any WebSocketFactory
    /// Fresh credentials for every `hello` (refreshes the access token as needed).
    private let auth: @Sendable () async throws -> SyncAuth
    private weak var delegate: (any SyncClientDelegate)?

    private var connection: (any WebSocketConnection)?
    private var runTask: Task<Void, Never>?
    public private(set) var state: SyncConnectionState = .disconnected
    private var attempt = 0
    /// The wait before the next connection attempt; `reconnectNow` cuts it short.
    private var retryWait: Task<Void, Never>?
    /// `rate_limited` with `retryAfterMs`: no new connection before this.
    private var notBefore: ContinuousClock.Instant?
    /// Connection attempts that failed in a row (0 once connected).
    public private(set) var consecutiveFailures = 0

    public init(configuration: Configuration, factory: any WebSocketFactory = URLSessionWebSocketFactory(),
                auth: @escaping @Sendable () async throws -> SyncAuth) {
        self.configuration = configuration
        self.factory = factory
        self.auth = auth
    }

    public func setDelegate(_ delegate: any SyncClientDelegate) {
        self.delegate = delegate
    }

    /// Connects and keeps reconnecting until `stop()`.
    public func start() {
        guard runTask == nil else { return }
        runTask = Task { await self.run() }
    }

    public func stop() {
        runTask?.cancel()
        runTask = nil
        connection?.close()
        connection = nil
        Task { await setState(.disconnected) }
    }

    /// Reconnect now (e.g. network became reachable, app returned to foreground).
    public func reconnectNow() {
        connection?.close()
        attempt = 0
        consecutiveFailures = 0
        retryWait?.cancel()
    }

    /// App returned to the foreground: a connection that died silently while suspended is
    /// replaced at once (instead of at the next ping, or never if the socket hangs), and a
    /// pending reconnect is not waited for.
    public func checkConnection() {
        guard isConnected, let conn = connection else {
            attempt = 0
            retryWait?.cancel()
            return
        }
        let timeout = configuration.pongTimeout
        Task { if await !Self.ping(conn, timeout: timeout) { conn.close() } }
    }

    /// Whether a pong came back in time. Not structured: a ping on a dead socket may never
    /// return, and a task group would wait for it.
    static func ping(_ conn: any WebSocketConnection, timeout: Duration) async -> Bool {
        let done = Locked(false)
        return await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
            @Sendable func finish(_ alive: Bool) {
                if done.withLock({ let first = !$0; $0 = true; return first }) { c.resume(returning: alive) }
            }
            Task { finish((try? await conn.sendPing()) != nil) }
            Task {
                try? await Task.sleep(for: timeout)
                finish(false)
            }
        }
    }

    public var isConnected: Bool {
        if case .connected = state { return true }
        return false
    }

    public func send(_ message: ClientMessage) async throws {
        guard isConnected, let connection else { throw SyncClientError.notConnected }
        try await connection.send(try SyncFrame.encode(message))
    }

    // MARK: Loop

    private func run() async {
        while !Task.isCancelled {
            var welcomedAt: ContinuousClock.Instant?
            do {
                try await connectOnce { welcomedAt = .now }
            } catch let SyncClientError.server(code, message) where code == .protocolMismatch {
                await setState(.stopped(reason: message))
                return
            } catch {
                // Fall through to the retry.
            }
            connection?.close()
            connection = nil
            if Task.isCancelled { break }
            if let notBefore, notBefore > .now {
                // The server asked us to wait (rate_limited, retryAfterMs).
                try? await Task.sleep(until: notBefore)
                self.notBefore = nil
                if Task.isCancelled { break }
            }
            if let welcomedAt, ContinuousClock.now - welcomedAt > .seconds(5) {
                // A working connection dropped: reconnect at once. (One dropped right after
                // `welcome` counts as a failure, so a server closing at once is not hammered.)
                consecutiveFailures = 0
                attempt = 0
                continue
            }
            consecutiveFailures += 1
            if consecutiveFailures <= configuration.quickRetries {
                // Stays `.connecting`: one stuck handshake is not "offline".
                let quick = configuration.quickRetryDelay
                try? await Task.sleep(for: quick * Double.random(in: 0.5...1.5))
                continue
            }
            let delay = backoff()
            let wait = Task { _ = try? await Task.sleep(for: delay) }
            retryWait = wait   // before the state shows `.waiting`, so `reconnectNow` can cut it short
            await setState(.waiting(retryIn: delay))
            await wait.value
            retryWait = nil
        }
        await setState(.disconnected)
    }

    private func backoff() -> Duration {
        attempt += 1
        // Whole durations: `components.seconds` alone dropped the fraction, so a backoff under a
        // second (tests) became zero and reconnects spun without pause.
        let base = configuration.minBackoff * pow(2, Double(min(attempt - 1, 10)))
        return min(base, configuration.maxBackoff) * Double.random(in: 0.8...1.2)
    }

    private func connectOnce(welcomed: () -> Void) async throws {
        await setState(.connecting)
        let conn = try await factory.connect(to: configuration.url)
        connection = conn
        // The TLS/WebSocket handshake happens on the first send/receive; if it hangs, closing
        // the connection makes them throw.
        let timeout = configuration.handshakeTimeout
        let watchdog = Task {
            try await Task.sleep(for: timeout)
            conn.close()
        }
        defer { watchdog.cancel() }
        let hello = ClientMessage.hello(auth: try await auth(), deviceId: configuration.deviceId,
                                        client: ClientInfo(platform: "ios", version: configuration.clientVersion))
        try await conn.send(try SyncFrame.encode(hello))

        // Until `welcome` nothing else is accepted (§3).
        guard let first = SyncFrame.decode(try await conn.receive()) else { throw SyncClientError.closed }
        watchdog.cancel()
        switch first {
        case .welcome(let userId, _):
            welcomed()
            await setState(.connected(userId: userId))
            await delegate?.syncClientDidConnect(self, userId: userId)
        case .error(let code, let message, _, let retryAfterMs):
            rateLimited(code, retryAfterMs)
            throw SyncClientError.server(code, message)
        default:
            throw SyncClientError.closed
        }

        let (interval, pongTimeout) = (configuration.pingInterval, configuration.pongTimeout)
        let pinger = Task { [conn] in
            while !Task.isCancelled {
                try? await Task.sleep(for: interval)
                if Task.isCancelled { break }
                // A dead connection: closing it makes `receive` throw, and we reconnect.
                if await !Self.ping(conn, timeout: pongTimeout) {
                    if !Task.isCancelled { conn.close() }
                    break
                }
            }
        }
        defer { pinger.cancel() }

        while !Task.isCancelled {
            let text = try await conn.receive()
            guard let message = SyncFrame.decode(text) else { continue }
            if case .error(let code, _, nil, let retryAfterMs) = message { rateLimited(code, retryAfterMs) }
            if case .error(let code, let message, nil, _) = message, code == .unauthorized || code == .protocolMismatch {
                // Connection-level error: reconnect with fresh credentials (or stop).
                throw SyncClientError.server(code, message)
            }
            await delegate?.syncClient(self, didReceive: message)
        }
    }

    private func rateLimited(_ code: SyncErrorCode, _ retryAfterMs: Int?) {
        guard code == .rateLimited, let retryAfterMs else { return }
        notBefore = .now + .milliseconds(min(retryAfterMs, 600_000))
    }

    private func setState(_ s: SyncConnectionState) async {
        guard s != state else { return }
        state = s
        await delegate?.syncClient(self, didChangeState: s)
    }
}
