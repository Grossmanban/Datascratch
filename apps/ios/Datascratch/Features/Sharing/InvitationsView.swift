import SwiftUI
import UIKit

/// D-54: invitations to this account — who invites, to what, with which role; accept or decline.
struct InvitationsView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var working: String?
    @State private var error: String?

    var body: some View {
        let invites = app.accountSharing.incoming
        NavigationStack {
            List {
                if let error {
                    Section { Text(error).foregroundStyle(Theme.Palette.danger) }
                }
                Section {
                    ForEach(invites) { invite in
                        InvitationCard(invite: invite, isWorking: working == invite.id) {
                            respond(invite, accept: true)
                        } onDecline: {
                            respond(invite, accept: false)
                        }
                    }
                } footer: {
                    if !invites.isEmpty {
                        Text("Accepted notebooks and documents appear in “Shared with me” in every space.")
                    }
                }
            }
            .overlay {
                if invites.isEmpty {
                    ContentUnavailableView("No invitations", systemImage: "envelope.open",
                                           description: Text("When someone shares a notebook or a document with you, it appears here."))
                }
            }
            .navigationTitle("Invitations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .task { await app.accountSharing.refresh() }
        }
        .accessibilityIdentifier("invitations")
    }

    private func respond(_ invite: IncomingInvite, accept: Bool) {
        working = invite.id
        error = nil
        Task {
            do {
                if accept {
                    try await app.accountSharing.accept(invite)
                } else {
                    try await app.accountSharing.decline(invite)
                }
                Haptics.success()
                if app.accountSharing.incoming.isEmpty { dismiss() }
            } catch {
                self.error = error.localizedDescription
            }
            working = nil
        }
    }
}

private struct InvitationCard: View {
    let invite: IncomingInvite
    let isWorking: Bool
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s3) {
            HStack(alignment: .top, spacing: Theme.Space.s3) {
                PersonBadge(email: invite.fromEmail)
                VStack(alignment: .leading, spacing: 3) {
                    Text(invite.fromEmail)
                        .font(Theme.Typography.body.weight(.semibold))
                        .lineLimit(1)
                        .truncationMode(.middle)
                    Text(invite.target.kind == .notebook ? LocalizedStringKey("invites you to a notebook")
                                                          : "invites you to a document")
                        .font(Theme.Typography.callout)
                        .foregroundStyle(Theme.Palette.textSecondary)
                    HStack(spacing: Theme.Space.s2) {
                        Label(invite.role.title, systemImage: invite.role.systemImage)
                        if let expiresAt = invite.expiresAt {
                            Text("·")
                            Text("until \(expiresAt.formatted(date: .abbreviated, time: .omitted))")
                        }
                    }
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textTertiary)
                }
            }
            HStack(spacing: Theme.Space.s3) {
                Button(action: onAccept) {
                    HStack {
                        if isWorking { ProgressView().controlSize(.small) }
                        Text("Accept")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier("invitation.accept")
                Button("Decline", role: .destructive, action: onDecline)
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("invitation.decline")
            }
            .disabled(isWorking)
            .controlSize(.regular)
        }
        .padding(.vertical, Theme.Space.s2)
        .accessibilityIdentifier("invitation")
    }
}

/// D-54 prompts for the owner, on the main window: someone who registered after the invitation
/// («… зарегистрировалась — открыть доступ?»), and new guest links after a key change.
struct SharingPrompts: ViewModifier {
    @Environment(AppModel.self) private var app
    /// Answered or put off in this session: not asked again until the next launch.
    @State private var handled: Set<String> = []

    func body(content: Content) -> some View {
        let sharing = app.accountSharing
        let confirmation = sharing.confirmations.first { !handled.contains($0.id) }
        content
            .alert(confirmation.map { String(localized: "\($0.member.email) signed up — give access?") } ?? "",
                   isPresented: Binding(get: { confirmation != nil }, set: { _ in })) {
                if let confirmation {
                    Button("Give Access") { respond(confirmation, allow: true) }
                    Button("Don’t Give Access", role: .destructive) { respond(confirmation, allow: false) }
                    Button("Later", role: .cancel) { handled.insert(confirmation.id) }
                }
            } message: {
                Text("This account was created after you sent the invitation. Give access only if it is really this person.")
            }
            .sheet(item: Binding(get: { sharing.refreshedLinks.first }, set: { item in
                if item == nil, let shown = sharing.refreshedLinks.first { sharing.dismissRefreshedLinks(shown) }
            })) { item in
                RefreshedLinksSheet(item: item)
            }
            .task { await sharing.refresh() }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                Task { await sharing.refresh() }
            }
    }

    private func respond(_ confirmation: AccessConfirmation, allow: Bool) {
        handled.insert(confirmation.id)
        Task { try? await app.accountSharing.confirm(confirmation, allow: allow) }
    }
}

/// «Ссылки обновлены — отправьте новые» (D-54): the old guest links stopped working with the key.
private struct RefreshedLinksSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let item: RefreshedLinks
    @State private var copiedId: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(item.links) { link in
                        ShareLinkRow(link: link, isCopied: copiedId == link.id) {
                            SecretPasteboard.copy(link.url)
                            withAnimation { copiedId = link.id }
                            Haptics.success()
                        } onRevoke: {
                            Task { try? await app.sharing.revoke(link.id) }
                        }
                    }
                } header: {
                    Text(title)
                } footer: {
                    Text("Someone lost access, so the key changed and the old guest links stopped working. Send these new ones to the people who should keep access.")
                }
            }
            .navigationTitle("Links Updated")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .accessibilityIdentifier("sharing.refreshedLinks")
    }

    private var title: String {
        switch item.target.kind {
        case .notebook: app.library.notebook(item.target.id)?.name ?? String(localized: "Notebook")
        case .note: app.library.note(item.target.id)?.title ?? String(localized: "Document")
        }
    }
}
