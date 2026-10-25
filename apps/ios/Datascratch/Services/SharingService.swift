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

/// Routes the app can open from URLs: Universal Links and the `datascratch://` scheme.
nonisolated enum AppRoute: Equatable, Sendable {
    /// `https://<web-host>/s/<shareId>#k=<key>`
    case share(shareId: String, key: String?)
    /// `datascratch://note/<noteId>` or `https://<web-host>/n/<noteId>`
    case note(String)
    /// `datascratch://today`
    case today

    static func parse(_ url: URL, webHost: String) -> AppRoute? {
        let parts = url.pathComponents.filter { $0 != "/" }
        if url.scheme == "datascratch" {
            let head = url.host() ?? parts.first
            let rest = url.host() == nil ? Array(parts.dropFirst()) : parts
            switch head {
            case "note": return rest.first.map(AppRoute.note)
            case "today": return .today
            case "s": return rest.first.map { .share(shareId: $0, key: Self.key(from: url.fragment())) }
            default: return nil
            }
        }
        guard url.scheme == "https", let host = url.host(), host == webHost || host == "www." + webHost,
              parts.count >= 2 else { return nil }
        switch parts[0] {
        case "s": return .share(shareId: parts[1], key: Self.key(from: url.fragment()))
        case "n": return .note(parts[1])
        default: return nil
        }
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
        let id = ID.make()
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
