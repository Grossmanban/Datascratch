import Darwin
import Foundation

/// Downloads the images of a pasted web page. The page is the sender's, so its addresses are
/// untrusted: https only, at most `maxBytes`, `timeout` seconds and `maxRedirects` redirects, and
/// never an address of this device or its network (loopback, private, link-local, `.local`),
/// checked after DNS resolution and again on every redirect. An ephemeral session: no cookies,
/// no cache.
nonisolated enum RemoteImageFetcher {
    static let maxBytes = 20 * 1024 * 1024
    static let maxImagesPerPaste = 50
    static let timeout: TimeInterval = 15
    static let maxRedirects = 3

    nonisolated enum FetchError: Error {
        case refused
        case tooLarge
        case badResponse
    }

    static let session: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = timeout
        configuration.timeoutIntervalForResource = timeout
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        return URLSession(configuration: configuration)
    }()

    static func fetch(_ url: URL) async throws -> Data {
        guard await isAllowed(url) else { throw FetchError.refused }
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: timeout)
        let (bytes, response) = try await session.bytes(for: request, delegate: RedirectGuard())
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw FetchError.badResponse }
        if response.expectedContentLength > Int64(maxBytes) { throw FetchError.tooLarge }
        var data = Data()
        data.reserveCapacity(Int(max(0, min(response.expectedContentLength, Int64(maxBytes)))))
        for try await byte in bytes {
            data.append(byte)
            if data.count > maxBytes { throw FetchError.tooLarge }
        }
        return data
    }

    /// https, a host name that is not local, and every address it resolves to is public.
    static func isAllowed(_ url: URL) async -> Bool {
        guard url.scheme?.lowercased() == "https", let host = url.host()?.lowercased(), !host.isEmpty,
              host != "localhost", !host.hasSuffix(".local"), !host.hasSuffix(".localhost") else { return false }
        let addresses = await Task.detached { resolve(host) }.value
        return !addresses.isEmpty && addresses.allSatisfy(isPublic)
    }

    /// The host's IPv4 (4 bytes) and IPv6 (16 bytes) addresses.
    static func resolve(_ host: String) -> [[UInt8]] {
        var hints = addrinfo()
        hints.ai_family = AF_UNSPEC
        hints.ai_socktype = SOCK_STREAM
        var list: UnsafeMutablePointer<addrinfo>?
        guard getaddrinfo(host, nil, &hints, &list) == 0, let first = list else { return [] }
        defer { freeaddrinfo(first) }
        var addresses: [[UInt8]] = []
        var cursor: UnsafeMutablePointer<addrinfo>? = first
        while let info = cursor {
            if let address = info.pointee.ai_addr {
                switch Int32(address.pointee.sa_family) {
                case AF_INET:
                    address.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { sin in
                        addresses.append(withUnsafeBytes(of: sin.pointee.sin_addr) { Array($0) })
                    }
                case AF_INET6:
                    address.withMemoryRebound(to: sockaddr_in6.self, capacity: 1) { sin6 in
                        addresses.append(withUnsafeBytes(of: sin6.pointee.sin6_addr) { Array($0) })
                    }
                default: break
                }
            }
            cursor = info.pointee.ai_next
        }
        return addresses
    }

    /// Not this device, its network or a reserved range (RFC 1918, 6598, 3927, 4193, 4291).
    static func isPublic(_ address: [UInt8]) -> Bool {
        if address.count == 4 {
            let (a, b) = (address[0], address[1])
            switch a {
            case 0, 10, 127: return false
            case 100 where (64...127).contains(b): return false
            case 169 where b == 254: return false
            case 172 where (16...31).contains(b): return false
            case 192 where b == 168: return false
            case 192 where b == 0 && address[2] == 0: return false
            case 198 where b == 18 || b == 19: return false
            case 224...255: return false
            default: return true
            }
        }
        guard address.count == 16 else { return false }
        if address.allSatisfy({ $0 == 0 }) { return false }                                   // ::
        if address[0..<15].allSatisfy({ $0 == 0 }) && address[15] == 1 { return false }       // ::1
        if address[0] & 0xfe == 0xfc { return false }                                          // fc00::/7
        if address[0] == 0xfe && address[1] & 0xc0 == 0x80 { return false }                   // fe80::/10
        if address[0] == 0xff { return false }                                                 // multicast
        if address[0..<10].allSatisfy({ $0 == 0 }) && address[10] == 0xff && address[11] == 0xff {
            return isPublic(Array(address[12..<16]))                                           // ::ffff:a.b.c.d
        }
        return true
    }

    /// Follows at most `maxRedirects` redirects, each to an allowed address.
    nonisolated final class RedirectGuard: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
        private let lock = NSLock()
        private var count = 0

        func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                        newRequest request: URLRequest) async -> URLRequest? {
            let redirects = lock.withLock { count += 1; return count }
            guard redirects <= RemoteImageFetcher.maxRedirects, let url = request.url,
                  await RemoteImageFetcher.isAllowed(url) else { return nil }
            return request
        }
    }
}
