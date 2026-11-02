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
    /// Members the owner allowed in (asked once per person): account id → the public key the
    /// yes was for. A key the server swaps in afterwards is asked about again.
    @ObservationIgnored private var confirmed: [ShareTarget: [String: String]] = [:]
    @ObservationIgnored private var declined: Set<String> = []
    /// Key changes waiting for the owner's answer about a member (`SharingError.notConfirmed`).
    @ObservationIgnored private var blockedRotations: Set<ShareTarget> = []
    @ObservationIgnored private var isRefreshing = false
    /// Emails by account id, from owners and members seen (history authors).
    @ObservationIgnored private var names: [String: String] = [:]
    nonisolated private static let log = Logger(subsystem: "com.datascratch.app", category: "Sharing")

    init(connection: ServerConnection, recreateLinks: @escaping (ShareTarget) async -> [SharedLink]) {
        self.connection = connection
        self.recreateLinks = recreateLinks
        // Owner duties wait for the account document (its `trust` record): run them once it is in.
        connection.onAccountSynced = { [weak self] in Task { await self?.refresh() } }
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
    /// about those who registered after the invitation or whom this account has no record of
    /// (the account document's `trust`), finishes key changes. The record lives in the account
    /// document, so nothing is decided before it has synced; members from before the record
    /// are taken over once (`migrateMemberTrust`).
    private func ownerDuties() async {
        guard await trustReady(), let items = try? await api.sharedByMe() else { return }
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
                                                             confirmed: confirmed[target] ?? [:])
            ask(waiting, about: target)
        } catch {
            Self.log.error("giving keys for \(target.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// Whether members can be checked: the account document has synced (its `trust` record is
    /// the one other devices wrote) and members from before the record were taken over.
    private func trustReady() async -> Bool {
        guard connection.isAccountSynced, accounts.trustRecord != nil else { return false }
        do {
            try await accounts.migrateMemberTrust()
            return true
        } catch {
            Self.log.error("taking over the members known so far failed: \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    /// Puts members the owner must decide about in front of them (once per person and key).
    private func ask(_ members: [MemberConfirmation], about target: ShareTarget) {
        for waiting in members where !declined.contains(waiting.member.userId) {
            let request = AccessConfirmation(target: target, member: Self.member(waiting.member), reason: Self.reason(waiting.reason),
                                             publicKey: waiting.publicKey)
            guard !confirmations.contains(request) else { continue }
            confirmations.removeAll { $0.target == target && $0.member.userId == waiting.member.userId }
            confirmations.append(request)
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
            guard let publicKey = confirmation.publicKey else { return }
            confirmed[confirmation.target, default: [:]][confirmation.member.userId] = publicKey
            await grantKeys(for: confirmation.target)
            if blockedRotations.remove(confirmation.target) != nil { await continueRotation(of: confirmation.target) }
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
        // Not before members can be checked: `keyRotationPending` stays, the next refresh does it.
        guard await trustReady() else { return }
        let confirmed = confirmed[target] ?? [:]
        do {
            switch target.kind {
            case .notebook:
                let notebook = try connection.core.notebookDocument(target.id)
                try await accounts.rotateNotebookKey(notebook, agentMode: connection.core.isAgentMode(notebookId: target.id),
                                                     confirmed: confirmed)
            case .note:
                guard let own = connection.core.ownNoteMeta(target.id) else { return }
                try await accounts.rotateNoteKey(target.id, in: try connection.core.notebookDocument(own.notebookId), confirmed: confirmed)
            }
            await linksChanged(target)
        } catch SharingError.notConfirmed(let members) {
            rotationBlocked(target, by: members)
        } catch {
            // `keyRotationPending` stays on the server: the next refresh does it.
            Self.log.error("key change of \(target.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// A key change left unfinished (this device or another of the owner's).
    private func continueRotation(of target: ShareTarget) async {
        let confirmed = confirmed[target] ?? [:]
        do {
            switch target.kind {
            case .notebook:
                let notebook = try connection.core.notebookDocument(target.id)
                let agentMode = connection.core.isAgentMode(notebookId: target.id)
                if try await accounts.resumeNotebookRotation(notebook, agentMode: agentMode, confirmed: confirmed) {
                    _ = try await accounts.finishNotebookRotation(notebook)
                }
            case .note:
                guard let own = connection.core.ownNoteMeta(target.id) else { return }
                let notebook = try connection.core.notebookDocument(own.notebookId)
                try await accounts.syncSharedNoteMeta(target.id, in: notebook)
                try await accounts.rotateNoteKey(target.id, in: notebook, confirmed: confirmed)
                await linksChanged(target)
            }
        } catch SharingError.notConfirmed(let members) {
            rotationBlocked(target, by: members)
        } catch {
            Self.log.error("finishing the key change of \(target.id, privacy: .public) failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// The new key would reach members this account does not know: nothing was sent. The owner
    /// is asked; a yes runs the key change again, a no removes them (the next pass rotates
    /// without them, `keyRotationPending` stays on the server meanwhile).
    private func rotationBlocked(_ target: ShareTarget, by members: [MemberConfirmation]) {
        Self.log.error("key change of \(target.id, privacy: .public) waits for the owner: \(members.count) unknown member(s)")
        blockedRotations.insert(target)
        ask(members, about: target)
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

    private static func reason(_ reason: ConfirmReason) -> AccessConfirmation.Reason {
        switch reason {
        case .lateAccount: .lateAccount
        case .notInvited: .notInvited
        case .keyChanged: .keyChanged
        }
    }

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
