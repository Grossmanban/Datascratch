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

/// Routes the app can open from URLs: Universal Links (the paths the web uses) and the
/// `datascratch://` scheme.
nonisolated enum AppRoute: Equatable, Sendable {
    /// `https://<server>/s/<shareId>#k=<key>`: a guest link (D-37).
    case share(shareId: String, key: String?)
    /// `https://<server>/invite/<id>` or `datascratch://invite/<id>`: an invitation to this
    /// account (D-54).
    case invitation(String)
    /// `datascratch://note/<noteId>` or `https://<server>/doc/<noteId>` (`/n/` before D-54).
    case note(String)
    /// `datascratch://today`
    case today
    /// A `[[Title]]` tapped in a document: open the note with that title, or offer to create it.
    case noteTitled(String)
    /// A link of another server than this account's (D-49): the app says so instead of
    /// looking for it here.
    case otherServer(host: String, url: URL)

    /// `webHost` is the account's server (`AppModel.linkHost`), read when the link is handled,
    /// so a link that started the app before sign-in is checked against the right server.
    static func parse(_ url: URL, webHost: String) -> AppRoute? {
        let parts = url.pathComponents.filter { $0 != "/" }
        if url.scheme == "datascratch" {
            let head = url.host() ?? parts.first
            let rest = url.host() == nil ? Array(parts.dropFirst()) : parts
            switch head {
            case "note": return rest.first.map(AppRoute.note)
            case "today": return .today
            case "invite": return rest.first.map(AppRoute.invitation)
            case "s": return rest.first.map { .share(shareId: $0, key: Self.key(from: url.fragment())) }
            default: return nil
            }
        }
        guard url.scheme == "https", let rawHost = url.host()?.lowercased(), parts.count >= 2 else { return nil }
        let route: AppRoute
        switch parts[0] {
        case "s": route = .share(shareId: parts[1], key: Self.key(from: url.fragment()))
        case "invite": route = .invitation(parts[1])
        case "doc", "n": route = .note(parts[1])
        default: return nil
        }
        let host = rawHost.hasPrefix("www.") ? String(rawHost.dropFirst(4)) : rawHost
        return host == webHost.lowercased() ? route : .otherServer(host: host, url: url)
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
