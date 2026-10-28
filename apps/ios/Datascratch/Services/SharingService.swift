import Foundation
import Observation

nonisolated enum SharePermission: String, Codable, CaseIterable, Sendable {
    case view, edit
}

nonisolated struct ShareTarget: Codable, Hashable, Sendable {
    nonisolated enum Kind: String, Codable, Sendable { case note, notebook }
    var kind: Kind
    var id: String
}

/// A share link (contracts/api.md §shares, contracts/crypto.md §7).
nonisolated struct SharedLink: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var target: ShareTarget
    var permission: SharePermission
    var expiresAt: Date?
    var createdAt: Date
    /// Full URL including `#k=<key>`; only the creating device knows the key part.
    var url: URL

    func isExpired(now: Date = Date()) -> Bool { expiresAt.map { $0 <= now } ?? false }
}

/// Routes the app can open from URLs (D-56): `ds://` links the web hands over («Открыть в
/// приложении»), which name their server, and the app's own `datascratch://`.
///
/// - `ds://invite/<id>?server=<host>` — an invitation to an account (D-54);
/// - `ds://share/<shareId>?server=<host>#k=<key>` — a guest link (D-37), the key only after `#`;
/// - `ds://note/<id>?server=<host>`, `ds://notebook/<id>?server=<host>` — a document or notebook.
///
/// `<host>` is `host[:port]` of the server, without a scheme.
nonisolated enum AppRoute: Equatable, Sendable {
    /// A guest link, opened as the web's guest page of `server` (any server: no account needed).
    case share(shareId: String, key: String?, server: String?)
    case invitation(String)
    case note(String)
    case notebook(String)
    /// `datascratch://today`
    case today
    /// A `[[Title]]` tapped in a document: open the note with that title, or offer to create it.
    case noteTitled(String)
    /// A link of another server than this account's (D-49), or with no account: the app says so
    /// and offers the web page instead.
    case otherServer(server: String, webURL: URL?)

    /// `server` is the account's (`AppModel.linkServer`), read when the link is handled — so a
    /// link that started the app before sign-in is checked against the server signed in to.
    static func parse(_ url: URL, server current: String?) -> AppRoute? {
        let parts = url.pathComponents.filter { $0 != "/" }
        switch url.scheme?.lowercased() {
        case "datascratch":
            let head = url.host() ?? parts.first
            let rest = url.host() == nil ? Array(parts.dropFirst()) : parts
            switch head {
            case "note": return rest.first.map(AppRoute.note)
            case "today": return .today
            default: return nil
            }
        case "ds":
            guard let kind = url.host()?.lowercased(), let id = parts.first, !id.isEmpty else { return nil }
            let server = linkServer(of: url)
            let route: AppRoute
            switch kind {
            case "share": return .share(shareId: id, key: key(from: url.fragment()), server: server)
            case "invite": route = .invitation(id)
            case "note": route = .note(id)
            case "notebook": route = .notebook(id)
            default: return nil
            }
            guard let server, server != current?.lowercased() else { return route }
            return .otherServer(server: server, webURL: webURL(server: server, kind: kind, id: id))
        default:
            return nil
        }
    }

    /// The `server` of a `ds://` link, as `host[:port]` in lower case.
    static func linkServer(of url: URL) -> String? {
        guard url.scheme?.lowercased() == "ds",
              let value = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?
                .first(where: { $0.name == "server" })?.value?.trimmingCharacters(in: .whitespaces).lowercased(),
              !value.isEmpty, !value.contains("/"), !value.contains("@") else { return nil }
        return value
    }

    /// `host[:port]` of a server address, as links name it.
    static func authority(of url: URL) -> String? {
        guard let host = url.host()?.lowercased() else { return nil }
        return url.port.map { "\(host):\($0)" } ?? host
    }

    /// The web page of a link on `server`: https, http only for a server on this machine.
    static func webURL(server: String, kind: String, id: String, key: String? = nil) -> URL? {
        let local = server.hasPrefix("localhost") || server.hasPrefix("127.0.0.1")
        let path: String
        switch kind {
        case "invite": path = "/invite/"
        case "share": path = "/s/"
        case "note": path = "/doc/"
        case "notebook": path = "/notebook/"
        default: return nil
        }
        guard var components = URLComponents(string: "\(local ? "http" : "https")://\(server)") else { return nil }
        components.path = path + id
        components.fragment = key.map { "k=\($0)" }
        return components.url
    }

    private static func key(from fragment: String?) -> String? {
        guard let fragment else { return nil }
        for pair in fragment.split(separator: "&") {
            let kv = pair.split(separator: "=", maxSplits: 1)
            if kv.count == 2, kv[0] == "k" { return String(kv[1]) }
        }
        return nil
    }
}

/// Share links. DSCore will call `/v1/shares`; the local stand-in only mints
/// links so the UI (create, copy, revoke) can be exercised.
protocol SharingService: AnyObject {
    var links: [SharedLink] { get }
    func createLink(for target: ShareTarget, permission: SharePermission, expiresAt: Date?) async throws -> SharedLink
    func revoke(_ linkId: String) async throws
}

@Observable
final class LocalSharingService: SharingService {
    private(set) var links: [SharedLink] = []
    @ObservationIgnored private let webHost: String

    init(webHost: String) {
        self.webHost = webHost
    }

    func createLink(for target: ShareTarget, permission: SharePermission, expiresAt: Date?) async throws -> SharedLink {
        let id = UUIDv7.make()
        let key = Base64URL.encode(Data((0..<32).map { _ in UInt8.random(in: 0...255) }))
        var components = URLComponents()
        components.scheme = "https"
        components.host = webHost
        components.path = "/s/\(id)"
        components.fragment = "k=\(key)"
        let link = SharedLink(id: id, target: target, permission: permission, expiresAt: expiresAt,
                             createdAt: Date(), url: components.url!)
        links.append(link)
        return link
    }

    func revoke(_ linkId: String) async throws {
        links.removeAll { $0.id == linkId }
    }
}

nonisolated enum Base64URL {
    static func encode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    static func decode(_ string: String) -> Data? {
        var base64 = string.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64.append("=") }
        return Data(base64Encoded: base64)
    }
}
