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

    public init(session: URLSession = .shared) { self.session = session }

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
/// pings every 25 s, typed sending. Document logic lives in `SyncEngine`.
public actor SyncClient {
    public struct Configuration: Sendable {
        /// `wss://host/v1/sync`.
        public var url: URL
        public var deviceId: String
        public var clientVersion: String
        public var minBackoff: Duration = .seconds(1)
        public var maxBackoff: Duration = .seconds(30)

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
            do {
                try await connectOnce()
            } catch let SyncClientError.server(code, message) where code == .protocolMismatch {
                await setState(.stopped(reason: message))
                return
            } catch {
                // Fall through to backoff.
            }
            connection?.close()
            connection = nil
            if Task.isCancelled { break }
            let delay = backoff()
            await setState(.waiting(retryIn: delay))
            try? await Task.sleep(for: delay)
        }
        await setState(.disconnected)
    }

    private func backoff() -> Duration {
        attempt += 1
        let base = Double(configuration.minBackoff.components.seconds) * pow(2, Double(min(attempt - 1, 10)))
        let capped = min(base, Double(configuration.maxBackoff.components.seconds))
        return .milliseconds(Int(capped * 1000 * Double.random(in: 0.8...1.2)))
    }

    private func connectOnce() async throws {
        await setState(.connecting)
        let conn = try await factory.connect(to: configuration.url)
        connection = conn
        let hello = ClientMessage.hello(auth: try await auth(), deviceId: configuration.deviceId,
                                        client: ClientInfo(platform: "ios", version: configuration.clientVersion))
        try await conn.send(try SyncFrame.encode(hello))

        // Until `welcome` nothing else is accepted (§3).
        guard let first = SyncFrame.decode(try await conn.receive()) else { throw SyncClientError.closed }
        switch first {
        case .welcome(let userId, _):
            attempt = 0
            await setState(.connected(userId: userId))
            await delegate?.syncClientDidConnect(self, userId: userId)
        case .error(let code, let message, _):
            throw SyncClientError.server(code, message)
        default:
            throw SyncClientError.closed
        }

        let pinger = Task { [conn] in
            while !Task.isCancelled {
                try? await Task.sleep(for: SyncProtocol.pingInterval)
                if Task.isCancelled { break }
                try? await conn.sendPing()
            }
        }
        defer { pinger.cancel() }

        while !Task.isCancelled {
            let text = try await conn.receive()
            guard let message = SyncFrame.decode(text) else { continue }
            if case .error(let code, let message, nil) = message, code == .unauthorized || code == .protocolMismatch {
                // Connection-level error: reconnect with fresh credentials (or stop).
                throw SyncClientError.server(code, message)
            }
            await delegate?.syncClient(self, didReceive: message)
        }
    }

    private func setState(_ s: SyncConnectionState) async {
        guard s != state else { return }
        state = s
        await delegate?.syncClient(self, didChangeState: s)
    }
}
