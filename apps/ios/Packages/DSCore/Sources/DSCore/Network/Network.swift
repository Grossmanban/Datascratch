import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Networking defaults. One session for REST and WebSocket, so connections (HTTP/2 keep-alive)
/// are reused and fewer TLS handshakes happen; timeouts that give up on a stuck connection
/// quickly instead of waiting for connectivity.
public enum DSNetwork {
    public static func makeConfiguration() -> URLSessionConfiguration {
        let c = URLSessionConfiguration.default
        // Idle timeouts: a request with no progress for this long fails (and is retried,
        // `APIClient`). Slow but moving transfers are not cut.
        c.timeoutIntervalForRequest = 10
        c.timeoutIntervalForResource = 300
        #if canImport(Darwin)
        c.waitsForConnectivity = false
        #endif
        c.httpMaximumConnectionsPerHost = 6
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.urlCache = nil
        return c
    }

    public static let session = URLSession(configuration: makeConfiguration())
}

/// A request failed below HTTP (no response).
public struct TransportFailure: Error, Equatable, Sendable, CustomStringConvertible {
    /// The request certainly did not reach the server (no connection, TLS handshake failed or
    /// never finished): retrying is safe for any request, including the one-time token refresh.
    public var notSent: Bool
    public var message: String

    public init(notSent: Bool, message: String) {
        self.notSent = notSent
        self.message = message
    }

    public var description: String { message }
}

/// `HTTPTransport` over `URLSession` that tells failures before sending (connection, handshake)
/// from failures after it, using the task metrics on Apple platforms.
public struct URLSessionTransport: HTTPTransport {
    public let session: URLSession

    public init(session: URLSession = DSNetwork.session) {
        self.session = session
    }

    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let metrics = RequestMetrics()
        do {
            #if canImport(Darwin)
            let (data, response) = try await session.data(for: request, delegate: metrics)
            #else
            let (data, response) = try await session.data(for: request)
            #endif
            guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse("not HTTP") }
            return (data, http)
        } catch let error as URLError {
            throw TransportFailure(notSent: Self.notSent(error.code, requestStarted: metrics.requestStarted),
                                   message: "URLError \(error.code.rawValue): \(error.localizedDescription)")
        }
    }

    /// Errors that happen before the request is written; otherwise the metrics decide (no
    /// transaction started its request = nothing was sent, e.g. a TLS handshake that hung).
    static func notSent(_ code: URLError.Code, requestStarted: Bool?) -> Bool {
        switch code {
        case .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed, .notConnectedToInternet, .secureConnectionFailed,
             .serverCertificateUntrusted, .serverCertificateHasBadDate, .serverCertificateNotYetValid, .serverCertificateHasUnknownRoot,
             .clientCertificateRejected, .clientCertificateRequired, .internationalRoamingOff, .dataNotAllowed, .callIsActive:
            return true
        default:
            return requestStarted == false
        }
    }
}

/// Whether any transaction of a task started sending its request (`nil` = unknown).
final class RequestMetrics: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    private let started = Locked<Bool?>(nil)

    var requestStarted: Bool? { started.withLock { $0 } }

    func urlSession(_ session: URLSession, task: URLSessionTask, didFinishCollecting metrics: URLSessionTaskMetrics) {
        let any = metrics.transactionMetrics.contains { $0.requestStartDate != nil }
        started.withLock { $0 = any }
    }
}
