import Foundation

/// D-49: the server is typed on the sign-in and sign-up screens; the build's address is only the
/// default. Only `https://` (plain `http://` for `localhost` while developing).
nonisolated enum ServerAddress {
    enum Problem: Error, Equatable {
        case empty
        case notHTTPS
        case invalid
    }

    /// A typed address as the server's base URL: `sync.example.org` → `https://sync.example.org`;
    /// a trailing `/` is dropped.
    static func parse(_ text: String) -> Result<URL, Problem> {
        var value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return .failure(.empty) }
        if !value.contains("://") { value = "https://" + value }
        while value.hasSuffix("/") { value.removeLast() }
        guard let components = URLComponents(string: value), let scheme = components.scheme?.lowercased(),
              let host = components.host, !host.isEmpty, !host.contains(" "),
              components.query == nil, components.fragment == nil, let url = components.url else {
            return .failure(.invalid)
        }
        let isLocal = host == "localhost" || host == "127.0.0.1" || host == "::1"
        switch scheme {
        case "https": return .success(url)
        case "http" where isLocal: return .success(url)
        case "http": return .failure(.notHTTPS)
        default: return .failure(.invalid)
        }
    }

    /// How an address is shown (no scheme for https).
    static func display(_ url: URL) -> String {
        let text = url.absoluteString
        return url.scheme == "https" ? String(text.dropFirst("https://".count)) : text
    }
}

/// What `GET /v1/health` told about a server before signing in.
nonisolated struct ServerInfo: Equatable, Sendable {
    var host: String
    var version: String
}
