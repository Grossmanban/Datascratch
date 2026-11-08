import Foundation

/// D-62: the server's `account_changed` on the sync socket (`what`: "invitations", "spaces",
/// "members", "keys", "notebooks", …), gathered for a moment and turned into one refresh. A burst
/// of changes (accepting an invitation touches members, keys and notebooks at once) is one
/// refresh, not five; only invitations is the cheap one (owner, 2026-11-08: an invitation showed
/// only after a relaunch, a joined space's notebooks came late).
final class AccountChangeRouter {
    enum Refresh: Equatable, Sendable {
        /// Only the list of invitations to this account.
        case invitations
        /// Shared with me, spaces, their keys and notebooks, owner duties.
        case everything
    }

    let delay: Duration
    private let perform: (Refresh) async -> Void
    private var pending: Set<String> = []
    private var scheduled: Task<Void, Never>?

    init(delay: Duration = .milliseconds(300), perform: @escaping (Refresh) async -> Void) {
        self.delay = delay
        self.perform = perform
    }

    /// Something of the account changed on the server; the refresh follows after `delay`.
    func changed(_ what: [String]) {
        pending.formUnion(what.isEmpty ? ["unknown"] : what)
        guard scheduled == nil else { return }
        let delay = delay
        scheduled = Task { [weak self] in
            try? await Task.sleep(for: delay)
            await self?.fire()
        }
    }

    private func fire() async {
        let what = pending
        pending = []
        scheduled = nil
        await perform(Self.route(what))
    }

    /// Only invitations: their list. Anything else (or a kind this build does not know): all.
    nonisolated static func route(_ what: Set<String>) -> Refresh {
        what == ["invitations"] ? .invitations : .everything
    }
}
