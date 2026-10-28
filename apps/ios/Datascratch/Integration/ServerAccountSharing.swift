#if canImport(DSCore)
import DSCore
import Foundation
import Observation
import os

/// D-54 on the Datascratch server: invitations, members, «shared with me», keys for members
/// (wrapped by DSCore for each account, the server never reads them) and the key change after
/// someone lost access, with new guest links.
@Observable
final class ServerAccountSharingService: AccountSharingService {
    var isAvailable: Bool { true }
    private(set) var incoming: [IncomingInvite] = []
    private(set) var sharedWithMe: [SharedWithMe] = []
    private(set) var confirmations: [AccessConfirmation] = []
    private(set) var refreshedLinks: [RefreshedLinks] = []

    @ObservationIgnored private let connection: ServerConnection
    /// New guest links for a notebook or note whose key changed (`ServerSharingService`).
    @ObservationIgnored private let recreateLinks: (ShareTarget) async -> [SharedLink]
    /// Members the owner allowed in after they registered (asked once per person).
    @ObservationIgnored private var confirmed: [ShareTarget: Set<String>] = [:]
    @ObservationIgnored private var declined: Set<String> = []
    @ObservationIgnored private var isRefreshing = false
    /// Emails by account id, from owners and members seen (history authors).
    @ObservationIgnored private var names: [String: String] = [:]
    nonisolated private static let log = Logger(subsystem: "com.datascratch.app", category: "Sharing")

    init(connection: ServerConnection, recreateLinks: @escaping (ShareTarget) async -> [SharedLink]) {
        self.connection = connection
        self.recreateLinks = recreateLinks
    }

    private var accounts: DSCore.AccountService { connection.accounts }
    private var api: APIClient { connection.api }

    // MARK: Refresh

    func refresh() async {
        guard !isRefreshing, await api.currentSession != nil else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        if let invitations = try? await api.incomingInvitations() {
            incoming = invitations.map(Self.incoming)
        }
        if let items = try? await accounts.refreshSharedWithMe() {
            apply(items)
        }
        await ownerDuties()
    }

    /// What the owner's device does for what it shares: gives keys to those who accepted, asks
    /// about those who registered after the invitation, finishes key changes.
    private func ownerDuties() async {
        guard let items = try? await api.sharedByMe() else { return }
        for item in items {
            let target = Self.target(item.target)
            if item.keyRotationPending {
                await continueRotation(of: target)
            }
            if item.awaitingKey > 0 {
                await grantKeys(for: target)
            }
        }
    }

    private func grantKeys(for target: ShareTarget) async {
        do {
            guard let key = try await ownerKey(target) else { return }
            let waiting = try await accounts.grantPendingKeys(to: Self.sharing(target), key: key.key, version: key.version,
                                                             confirmed: confirmed[target] ?? [])
            for member in waiting where !declined.contains(member.userId) {
                let request = AccessConfirmation(target: target, member: Self.member(member))
                if !confirmations.contains(request) { confirmations.append(request) }
            }
        } catch {
            Self.log.error("giving keys for \(target.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    private func ownerKey(_ target: ShareTarget) async throws -> (key: Data, version: Int)? {
        switch target.kind {
        case .notebook:
            return try await accounts.ownerKey(notebookId: target.id)
        case .note:
            guard let own = connection.core.ownNoteMeta(target.id) else { return nil }
            return try await accounts.ownerKey(note: own.meta, notebookId: own.notebookId)
        }
    }

    private func apply(_ items: [SharedItem]) {
        for item in items { names[item.owner.userId] = item.owner.email }
        sharedWithMe = items.map { item in
            SharedWithMe(target: Self.target(item.target), ownerEmail: item.owner.email,
                         role: item.role == .viewer ? .viewer : .editor, isReadable: item.wrappedKey != nil,
                         agentsMode: item.agentsMode == true)
        }
        publishShared()
    }

    /// The library shows what can be read here; what is gone leaves this device.
    private func publishShared() {
        let readable = sharedWithMe.filter(\.isReadable)
        connection.core.setShared(notebooks: Set(readable.filter { $0.target.kind == .notebook }.map(\.target.id)),
                                  notes: Set(readable.filter { $0.target.kind == .note }.map(\.target.id)))
    }

    // MARK: Owner

    func people(of target: ShareTarget) async throws -> SharePeople {
        let sharing = Self.sharing(target)
        let me = await api.currentSession?.userId
        async let members = api.members(of: sharing)
        async let invitations = api.invitations(for: sharing)
        for member in try await members { names[member.userId] = member.email }
        let people = SharePeople(
            members: try await members.filter { $0.userId != me }.map(Self.member),
            invites: try await invitations.filter { $0.status == .pending }.map { invite in
                PendingInvite(id: invite.id, email: invite.email, role: invite.role == .viewer ? .viewer : .editor,
                              expiresAt: DSCore.DSDate.parseISO(invite.expiresAt), link: inviteLink(invite.id))
            })
        return people
    }

    func invite(_ email: String, role: AccessRole, to target: ShareTarget) async throws -> PendingInvite {
        let normalized = Credentials.normalizedEmail(email)
        guard Credentials.isValidEmail(normalized) else { throw AccountError.invalidEmail }
        do {
            let id = try await accounts.invite(normalized, role: Self.role(role), to: Self.sharing(target))
            return PendingInvite(id: id, email: normalized, role: role, expiresAt: Date().addingTimeInterval(30 * 86_400),
                                 link: inviteLink(id))
        } catch {
            throw ServerAccountService.map(error)
        }
    }

    func setRole(_ role: AccessRole, of member: ShareMember, in target: ShareTarget) async throws {
        do {
            try await api.setMemberRole(Self.role(role), userId: member.userId, in: Self.sharing(target))
        } catch {
            throw ServerAccountService.map(error)
        }
    }

    func remove(_ member: ShareMember, from target: ShareTarget) async throws {
        do {
            try await api.removeMember(userId: member.userId, from: Self.sharing(target))
        } catch {
            throw ServerAccountService.map(error)
        }
        // They keep what they already saw; nothing new reaches them (D-54).
        await rotate(target)
    }

    func revokeInvite(_ invite: PendingInvite, of target: ShareTarget) async throws {
        do {
            try await api.revokeInvitation(id: invite.id)
        } catch {
            throw ServerAccountService.map(error)
        }
    }

    func confirm(_ confirmation: AccessConfirmation, allow: Bool) async throws {
        confirmations.removeAll { $0 == confirmation }
        if allow {
            confirmed[confirmation.target, default: []].insert(confirmation.member.userId)
            await grantKeys(for: confirmation.target)
        } else {
            declined.insert(confirmation.member.userId)
            try? await api.removeMember(userId: confirmation.member.userId, from: Self.sharing(confirmation.target))
        }
    }

    func dismissRefreshedLinks(_ item: RefreshedLinks) {
        refreshedLinks.removeAll { $0 == item }
    }

    func name(ofUser userId: String) -> String? { names[userId] }

    /// A new key right after someone lost access (crypto.md §10.3); the index finishes syncing
    /// and the next refresh completes it. Guest links carry the old key: they are made anew.
    private func rotate(_ target: ShareTarget) async {
        do {
            switch target.kind {
            case .notebook:
                let notebook = try connection.core.notebookDocument(target.id)
                try await accounts.rotateNotebookKey(notebook, agentMode: connection.core.isAgentMode(notebookId: target.id))
            case .note:
                guard let own = connection.core.ownNoteMeta(target.id) else { return }
                try await accounts.rotateNoteKey(target.id, in: try connection.core.notebookDocument(own.notebookId))
            }
            await linksChanged(target)
        } catch {
            // `keyRotationPending` stays on the server: the next refresh does it.
            Self.log.error("key change of \(target.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// A key change left unfinished (this device or another of the owner's).
    private func continueRotation(of target: ShareTarget) async {
        do {
            switch target.kind {
            case .notebook:
                let notebook = try connection.core.notebookDocument(target.id)
                let agentMode = connection.core.isAgentMode(notebookId: target.id)
                if try await accounts.resumeNotebookRotation(notebook, agentMode: agentMode) {
                    _ = try await accounts.finishNotebookRotation(notebook)
                }
            case .note:
                guard let own = connection.core.ownNoteMeta(target.id) else { return }
                let notebook = try connection.core.notebookDocument(own.notebookId)
                try await accounts.syncSharedNoteMeta(target.id, in: notebook)
                try await accounts.rotateNoteKey(target.id, in: notebook)
                await linksChanged(target)
            }
        } catch {
            Self.log.error("finishing the key change of \(target.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    private func linksChanged(_ target: ShareTarget) async {
        let links = await recreateLinks(target)
        guard !links.isEmpty else { return }
        refreshedLinks.removeAll { $0.target == target }
        refreshedLinks.append(RefreshedLinks(target: target, links: links))
    }

    private func inviteLink(_ id: String) -> URL? {
        URL(string: "https://\(connection.webHost)/invite/\(id)")
    }

    // MARK: Member

    func accept(_ invite: IncomingInvite) async throws {
        do {
            _ = try await accounts.acceptInvitation(id: invite.id)
        } catch {
            throw ServerAccountService.map(error)
        }
        incoming.removeAll { $0.id == invite.id }
        if let items = try? await accounts.refreshSharedWithMe() { apply(items) }
    }

    func decline(_ invite: IncomingInvite) async throws {
        do {
            try await api.declineInvitation(id: invite.id)
        } catch {
            throw ServerAccountService.map(error)
        }
        incoming.removeAll { $0.id == invite.id }
    }

    func leave(_ target: ShareTarget) async throws {
        do {
            try await accounts.leave(Self.sharing(target))
        } catch {
            throw ServerAccountService.map(error)
        }
        sharedWithMe.removeAll { $0.target == target }
        publishShared()
    }

    // MARK: Mapping

    private static func target(_ target: SharingTarget) -> ShareTarget {
        ShareTarget(kind: target.kind == .notebook ? .notebook : .note, id: target.id)
    }

    private static func sharing(_ target: ShareTarget) -> SharingTarget {
        SharingTarget(kind: target.kind == .notebook ? .notebook : .note, id: target.id)
    }

    private static func role(_ role: AccessRole) -> MemberRole { role == .viewer ? .viewer : .editor }

    private static func member(_ member: Member) -> ShareMember {
        ShareMember(userId: member.userId, email: member.email, role: member.role == .viewer ? .viewer : .editor,
                    isAwaitingKey: member.status == .awaitingKey)
    }

    private static func incoming(_ invite: IncomingInvitation) -> IncomingInvite {
        IncomingInvite(id: invite.id, target: target(invite.target), fromEmail: invite.from.email,
                       role: invite.role == .viewer ? .viewer : .editor, expiresAt: DSCore.DSDate.parseISO(invite.expiresAt))
    }
}

#endif
