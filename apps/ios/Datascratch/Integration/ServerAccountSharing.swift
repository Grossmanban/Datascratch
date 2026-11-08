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
    @ObservationIgnored private let recreateLinks: (Set<ShareTarget>) async -> [ShareTarget: [SharedLink]]
    /// Members the owner allowed in (asked once per person): account id → the public key the
    /// yes was for. A key the server swaps in afterwards is asked about again.
    @ObservationIgnored private var confirmed: [ShareTarget: [String: String]] = [:]
    @ObservationIgnored private var declined: Set<String> = []
    /// Key changes waiting for the owner's answer about a member (`SharingError.notConfirmed`).
    @ObservationIgnored private var blockedRotations: Set<ShareTarget> = []
    @ObservationIgnored private var isRefreshing = false
    /// Asked to refresh while one ran: once more right after, never dropped (an invitation
    /// that came in mid-refresh waited for the next launch).
    @ObservationIgnored private var refreshAgain = false
    /// `account_changed` from the server, a burst gathered into one refresh.
    @ObservationIgnored private var changes: AccountChangeRouter?
    /// A shared space being joined after its invitation was accepted («Connecting to the space…»).
    private(set) var joiningSpace: String?
    /// Emails by account id, from owners and members seen (history authors).
    @ObservationIgnored private var names: [String: String] = [:]
    @ObservationIgnored var spaceOfNotebook: (String) -> String? = { _ in nil }
    private(set) var agentNotebooksInSpaces: Set<String> = []
    nonisolated private static let log = Logger(subsystem: "com.datascratch.app", category: "Sharing")

    init(connection: ServerConnection, recreateLinks: @escaping (Set<ShareTarget>) async -> [ShareTarget: [SharedLink]]) {
        self.connection = connection
        self.recreateLinks = recreateLinks
        // Owner duties wait for the account document (its `trust` record): run them once it is in.
        connection.onAccountSynced = { [weak self] in Task { await self?.refresh() } }
        changes = AccountChangeRouter { [weak self] refresh in
            switch refresh {
            case .invitations: await self?.refreshInvitations()
            case .everything: await self?.refresh()
            }
        }
        connection.onAccountChanged = { [weak self] what in self?.accountChanged(what) }
    }

    func accountChanged(_ what: [String]) {
        changes?.changed(what)
    }

    private var accounts: DSCore.AccountService { connection.accounts }
    private var api: APIClient { connection.api }

    // MARK: Refresh

    func refresh() async {
        if isRefreshing {
            refreshAgain = true
            return
        }
        isRefreshing = true
        defer { isRefreshing = false }
        guard await api.currentSession != nil else { return }
        repeat {
            refreshAgain = false
            await refreshOnce()
        } while refreshAgain
    }

    /// Only the invitations to this account (the server said they changed).
    func refreshInvitations() async {
        if let invitations = try? await api.incomingInvitations() {
            incoming = invitations.map(Self.incoming)
        }
    }

    private func refreshOnce() async {
        await refreshInvitations()
        if let items = try? await accounts.refreshSharedWithMe() {
            apply(items)
            // A shared notebook's new key (after the owner changed it): its documents that
            // waited for it sync now, not at the next reconnect.
            connection.noteKeysLearned()
        }
        await refreshSpaces()
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
        // D-62: a notebook moved out of a shared space has a key change of its own to finish;
        // shared notebooks were done above.
        let done = Set(items.filter { $0.target.kind == .notebook && $0.keyRotationPending }.map(\.target.id))
        if let pending = try? await accounts.pendingNotebookRotations() {
            for id in pending where !done.contains(id) {
                await continueRotation(of: ShareTarget(kind: .notebook, id: id))
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
        case .space:
            return try await accounts.ownerKey(spaceId: target.id)
        }
    }

    private func apply(_ items: [SharedItem]) {
        for item in items { names[item.owner.userId] = item.owner.email }
        sharedWithMe = items.map { item in
            SharedWithMe(target: Self.target(item.target), ownerEmail: item.owner.email,
                         role: item.role == .viewer ? .viewer : .editor, isReadable: item.wrappedKey != nil,
                         agentsMode: item.agentsMode == true, addedAt: DSDate.parseISO(item.addedAt))
        }
        publishShared()
        placeSpaces(items)
    }

    /// D-62: the shared spaces this account joined take their place among its spaces; those it
    /// no longer has leave this device, with their tabs and starred items.
    private func placeSpaces(_ items: [SharedItem]) {
        let core = connection.core
        // Its own space comes back in «Shared with me» for the owner too: never placed twice.
        let own = Set(core.account.spaces().map(\.id))
        do {
            let removed = try accounts.placeSharedSpaces(items.filter { !own.contains($0.target.id) }, in: core.account)
            for id in removed { core.forgetSpace(id) }
            core.reload()
        } catch {
            Self.log.error("placing shared spaces failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// The keys of the shared spaces (own and joined) and of their notebooks; their documents
    /// sync from now on.
    private func refreshSpaces() async {
        do {
            let spaces = try await accounts.refreshSharedSpaces()
            guard !spaces.isEmpty else {
                agentNotebooksInSpaces = []
                return
            }
            for space in spaces { _ = try? connection.core.spaceDocument(space.id) }
            // ✨ of the notebooks in spaces this account joined: their mode is the server's.
            let me = await api.currentSession?.userId
            var agents: Set<String> = []
            for space in spaces where space.ownerUserId != me {
                guard let notebooks = try? await accounts.loadSpaceNotebookKeys(space.id) else { continue }
                agents.formUnion(notebooks.filter { $0.mode == .agent }.map(\.notebookId))
            }
            agentNotebooksInSpaces = agents
            connection.noteKeysLearned()
            connection.core.reload()
        } catch {
            Self.log.error("shared spaces failed: \(error.localizedDescription, privacy: .public)")
        }
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
        // D-62: inviting to a personal space makes it shared first.
        if target.kind == .space, connection.core.account.spaces().first(where: { $0.id == target.id })?.shared == false {
            _ = try await makeShared(space: target.id)
        }
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
            case .space:
                // The space key and the key of every notebook in it (crypto.md §11.4).
                try await accounts.rotateSpaceKey(target.id, notebooks: connection.core.notebookDocuments(inSpace: target.id),
                                                  confirmed: confirmed)
                await spaceLinksChanged(target.id)
                return
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
            case .space:
                let notebooks = connection.core.notebookDocuments(inSpace: target.id)
                let before = try? await accounts.ownerKey(spaceId: target.id).version
                if try await accounts.resumeSpaceRotation(target.id, notebooks: notebooks, confirmed: confirmed) {
                    // Links are made anew only when the key changed now (not at every start
                    // while the notes still wait for theirs).
                    if let after = try? await accounts.ownerKey(spaceId: target.id).version, after != before {
                        await spaceLinksChanged(target.id)
                    }
                    _ = try await accounts.finishSpaceRotation(target.id, notebooks: notebooks)
                }
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
        await linksChanged([target])
    }

    /// The guest links of these notebooks and notes were made anew (their keys changed); the
    /// owner sends the new ones.
    private func linksChanged(_ targets: Set<ShareTarget>) async {
        for (target, links) in await recreateLinks(targets) where !links.isEmpty {
            refreshedLinks.removeAll { $0.target == target }
            refreshedLinks.append(RefreshedLinks(target: target, links: links))
        }
    }

    /// D-62 (crypto.md §11.4): a new space key gave every notebook of the space, and so every
    /// note, a new key — the guest links of all of them are made anew, as for a notebook.
    private func spaceLinksChanged(_ spaceId: String) async {
        let core = connection.core
        var targets: Set<ShareTarget> = []
        for notebook in core.notebookDocuments(inSpace: spaceId) {
            targets.insert(ShareTarget(kind: .notebook, id: notebook.notebookId))
            for note in notebook.notes(includeTrashed: true) { targets.insert(ShareTarget(kind: .note, id: note.id)) }
        }
        await linksChanged(targets)
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
        if invite.target.kind == .space {
            joiningSpace = invite.target.id
            defer { joiningSpace = nil }
            if let items = try? await accounts.refreshSharedWithMe() { apply(items) }
            await join(space: invite.target.id)
        } else if let items = try? await accounts.refreshSharedWithMe() {
            apply(items)
        }
    }

    /// Right after accepting (owner, 2026-11-08: the space's notebooks came «some time later»):
    /// the space key and its notebooks' keys now, the space document first in line, and back once
    /// its notebooks are here (or after a few seconds — an empty space has none to wait for).
    private func join(space spaceId: String) async {
        await refreshSpaces()
        connection.focus(spaceId)
        let core = connection.core
        for _ in 0..<24 where core.notebookDocuments(inSpace: spaceId).isEmpty {
            try? await Task.sleep(for: .milliseconds(250))
        }
        // Notebooks that arrived with the space document: their keys too.
        await refreshSpaces()
        core.reload()
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
        if target.kind == .space {
            try? connection.core.account.removeSharedSpace(id: target.id)
            connection.core.forgetSpace(target.id)
            connection.core.reload()
        }
    }

    // MARK: Shared spaces (D-62)

    func makeShared(space spaceId: String) async throws -> [String] {
        let core = connection.core
        do {
            let (document, kept) = try await accounts.shareSpace(spaceId, in: core.account)
            core.adopt(document)
            core.reload()
            return kept
        } catch {
            throw ServerAccountService.map(error)
        }
    }

    func createNotebook(inSharedSpace spaceId: String, name: String, icon: String, color: Tint) async throws {
        let core = connection.core
        do {
            let space = try core.spaceDocument(spaceId)
            let order = (space.notebooks().map(\.order).max() ?? 0) + 1
            let notebook = try await accounts.createNotebook(name: name, in: space, icon: icon, color: color.rawValue, order: order)
            core.adopt(notebook)
            core.reload()
        } catch {
            throw ServerAccountService.map(error)
        }
    }

    func moveNotebook(_ notebookId: String, toSpace spaceId: String) async throws {
        let core = connection.core
        do {
            if let from = core.sharedSpace(ofNotebook: notebookId) {
                // Out of a shared space: a new notebook key, the notes get theirs as for any
                // key change; the next refresh finishes it (`keyRotationPending`).
                let notebook = try core.notebookDocument(notebookId)
                let space = try core.spaceDocument(from)
                try await accounts.moveNotebookOutOfSpace(notebook, space: space, to: spaceId, account: core.account,
                                                          agentMode: space.notebook(id: notebookId)?.mode == .agent)
                _ = try? await accounts.finishNotebookRotation(notebook)
            } else {
                try await accounts.moveNotebookIntoSpace(notebookId, space: try core.spaceDocument(spaceId), account: core.account)
            }
            core.reload()
        } catch {
            throw ServerAccountService.map(error)
        }
    }

    // MARK: Mapping

    private static func target(_ target: SharingTarget) -> ShareTarget {
        let kind: ShareTarget.Kind = switch target.kind {
        case .notebook: .notebook
        case .note: .note
        case .space: .space
        }
        return ShareTarget(kind: kind, id: target.id)
    }

    private static func sharing(_ target: ShareTarget) -> SharingTarget {
        let kind: ShareTargetKind = switch target.kind {
        case .notebook: .notebook
        case .note: .note
        case .space: .space
        }
        return SharingTarget(kind: kind, id: target.id)
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
