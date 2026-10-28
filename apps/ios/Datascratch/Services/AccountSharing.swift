import Foundation
import Observation

/// D-54: what someone may do with a notebook or note shared with their account.
nonisolated enum AccessRole: String, Codable, CaseIterable, Sendable {
    /// «Может редактировать»: read, edit, draw, create and delete notes in a shared notebook.
    case editor
    /// «Только чтение»: read, search, copy, export. The server refuses changes.
    case viewer

    var title: String {
        switch self {
        case .editor: String(localized: "Can edit")
        case .viewer: String(localized: "View only")
        }
    }

    var systemImage: String {
        switch self {
        case .editor: "pencil"
        case .viewer: "eye"
        }
    }
}

/// Someone with access to a notebook or note this account owns.
nonisolated struct ShareMember: Identifiable, Hashable, Sendable {
    var id: String { userId }
    var userId: String
    var email: String
    var role: AccessRole
    /// Accepted; the owner's device has not given the key yet (it does when online).
    var isAwaitingKey: Bool
}

/// An invitation the owner sent that is not accepted yet (it waits for the person, or for their
/// account to be created).
nonisolated struct PendingInvite: Identifiable, Hashable, Sendable {
    var id: String
    var email: String
    var role: AccessRole
    var expiresAt: Date?
    /// `https://<server>/invite/<id>`: for a messenger when the person has no account yet.
    var link: URL?
}

/// Who has a notebook or note, as the «Поделиться» window shows it.
nonisolated struct SharePeople: Hashable, Sendable {
    var members: [ShareMember] = []
    var invites: [PendingInvite] = []
}

/// An invitation to this account: who, what, which role (spec/08).
nonisolated struct IncomingInvite: Identifiable, Hashable, Sendable {
    var id: String
    var target: ShareTarget
    var fromEmail: String
    var role: AccessRole
    var expiresAt: Date?
}

/// A notebook or note another account shares with this one («Общие со мной»).
nonisolated struct SharedWithMe: Identifiable, Hashable, Sendable {
    var id: String { target.id }
    var target: ShareTarget
    var ownerEmail: String
    var role: AccessRole
    /// The owner's device has given the key: the content can be read on this device.
    var isReadable: Bool
}

/// D-54: someone registered after the owner invited them. Their access opens only once the
/// owner confirms («<почта> зарегистрировалась — открыть доступ?»): email is not verified, so
/// an invitation cannot be taken over by registering someone else's address first.
nonisolated struct AccessConfirmation: Identifiable, Hashable, Sendable {
    var id: String { "\(target.id)-\(member.userId)" }
    var target: ShareTarget
    var member: ShareMember
}

/// D-54: after someone lost access the key changed, so the guest links of that notebook or note
/// were made anew; the owner sends the new ones.
nonisolated struct RefreshedLinks: Identifiable, Hashable, Sendable {
    var id: String { target.id }
    var target: ShareTarget
    var links: [SharedLink]
}

/// Sharing with other accounts by email (D-54, spec/08). Only the owner manages access.
protocol AccountSharingService: AnyObject {
    /// Sharing needs a server account; without one the «People» part of Share is not shown.
    var isAvailable: Bool { get }
    var incoming: [IncomingInvite] { get }
    var sharedWithMe: [SharedWithMe] { get }
    var confirmations: [AccessConfirmation] { get }
    var refreshedLinks: [RefreshedLinks] { get }

    /// Invitations, «shared with me», keys to give and key changes to finish (on start, when
    /// back online, when the sidebar appears).
    func refresh() async
    func people(of target: ShareTarget) async throws -> SharePeople
    func invite(_ email: String, role: AccessRole, to target: ShareTarget) async throws -> PendingInvite
    func setRole(_ role: AccessRole, of member: ShareMember, in target: ShareTarget) async throws
    /// The owner removes someone; the key changes so they read nothing new.
    func remove(_ member: ShareMember, from target: ShareTarget) async throws
    func revokeInvite(_ invite: PendingInvite, of target: ShareTarget) async throws
    func accept(_ invite: IncomingInvite) async throws
    func decline(_ invite: IncomingInvite) async throws
    /// «Выйти»: leave a notebook or note shared with this account.
    func leave(_ target: ShareTarget) async throws
    func confirm(_ confirmation: AccessConfirmation, allow: Bool) async throws
    func dismissRefreshedLinks(_ item: RefreshedLinks)
    /// The email of an account seen in sharing (an owner, a member), for the history's authors.
    func name(ofUser userId: String) -> String?
}

extension AccountSharingService {
    /// The role this account has for something shared with it; nil for its own.
    func role(for target: ShareTarget) -> AccessRole? {
        sharedWithMe.first { $0.target == target }?.role
    }

    /// The role for a note: shared on its own, or through its shared notebook.
    func role(forNote noteId: String, notebookId: String) -> AccessRole? {
        role(for: ShareTarget(kind: .note, id: noteId)) ?? role(for: ShareTarget(kind: .notebook, id: notebookId))
    }

    func owner(of target: ShareTarget) -> String? {
        sharedWithMe.first { $0.target == target }?.ownerEmail
    }
}

/// Without a server: nothing is shared. UI tests (`-ui-testing-sharing`) get an invitation, a
/// notebook shared «view only», and people on the first notebook, so the screens can be driven.
@Observable
final class LocalAccountSharingService: AccountSharingService {
    let isAvailable: Bool
    private(set) var incoming: [IncomingInvite] = []
    private(set) var sharedWithMe: [SharedWithMe] = []
    private(set) var confirmations: [AccessConfirmation] = []
    private(set) var refreshedLinks: [RefreshedLinks] = []
    @ObservationIgnored private var people: [ShareTarget: SharePeople] = [:]
    @ObservationIgnored private let webHost: String

    init(webHost: String, demo: Bool = false) {
        self.webHost = webHost
        isAvailable = demo
    }

    /// UI tests: `invitedTo` is offered as an invitation, `viewOnly` is shared with this
    /// account «view only», `owned` has a member and a pending invite.
    func seedForTesting(invitationId: String = UUIDv7.make(), invitedTo: ShareTarget?, viewOnly: ShareTarget?, owned: ShareTarget?) {
        if let invitedTo {
            incoming = [IncomingInvite(id: invitationId, target: invitedTo, fromEmail: "anna@example.org", role: .editor,
                                       expiresAt: Date().addingTimeInterval(30 * 86_400))]
        }
        if let viewOnly {
            sharedWithMe = [SharedWithMe(target: viewOnly, ownerEmail: "boris@example.org", role: .viewer, isReadable: true)]
        }
        if let owned {
            let member = ShareMember(userId: UUIDv7.make(), email: "masha@example.org", role: .editor, isAwaitingKey: false)
            people[owned] = SharePeople(members: [member], invites: [])
        }
    }

    func refresh() async {}

    func people(of target: ShareTarget) async throws -> SharePeople { people[target] ?? SharePeople() }

    func invite(_ email: String, role: AccessRole, to target: ShareTarget) async throws -> PendingInvite {
        let id = UUIDv7.make()
        let invite = PendingInvite(id: id, email: email, role: role, expiresAt: Date().addingTimeInterval(30 * 86_400),
                                   link: URL(string: "https://\(webHost)/invite/\(id)"))
        people[target, default: SharePeople()].invites.append(invite)
        return invite
    }

    func setRole(_ role: AccessRole, of member: ShareMember, in target: ShareTarget) async throws {
        guard let index = people[target]?.members.firstIndex(of: member) else { return }
        people[target]?.members[index].role = role
    }

    func remove(_ member: ShareMember, from target: ShareTarget) async throws {
        people[target]?.members.removeAll { $0.userId == member.userId }
    }

    func revokeInvite(_ invite: PendingInvite, of target: ShareTarget) async throws {
        people[target]?.invites.removeAll { $0.id == invite.id }
    }

    func accept(_ invite: IncomingInvite) async throws {
        incoming.removeAll { $0.id == invite.id }
        sharedWithMe.append(SharedWithMe(target: invite.target, ownerEmail: invite.fromEmail, role: invite.role, isReadable: true))
    }

    func decline(_ invite: IncomingInvite) async throws {
        incoming.removeAll { $0.id == invite.id }
    }

    func leave(_ target: ShareTarget) async throws {
        sharedWithMe.removeAll { $0.target == target }
    }

    func confirm(_ confirmation: AccessConfirmation, allow: Bool) async throws {
        confirmations.removeAll { $0 == confirmation }
    }

    func dismissRefreshedLinks(_ item: RefreshedLinks) {
        refreshedLinks.removeAll { $0 == item }
    }

    func name(ofUser userId: String) -> String? {
        people.values.flatMap(\.members).first { $0.userId == userId }?.email
    }
}
