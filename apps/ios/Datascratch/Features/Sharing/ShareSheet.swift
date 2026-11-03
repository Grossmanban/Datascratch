import SwiftUI

/// Share a note or notebook (spec/08): with people by email (D-54) and by guest link (D-13, D-37).
/// Something shared with this account shows who shares it, the role, and «Leave».
struct ShareSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let target: ShareTarget

    @State private var permission: SharePermission = .edit
    @State private var hasExpiry = false
    @State private var expiry = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    @State private var isWorking = false
    @State private var error: String?
    @State private var copiedId: String?

    /// Shared with this account: the note itself, or the notebook it is in.
    private var sharedTarget: ShareTarget? {
        if app.accountSharing.role(for: target) != nil { return target }
        if target.kind == .note, let notebookId = app.library.note(target.id)?.notebookId {
            let notebook = ShareTarget(kind: .notebook, id: notebookId)
            if app.accountSharing.role(for: notebook) != nil { return notebook }
        }
        return nil
    }

    var body: some View {
        NavigationStack {
            Form {
                if let sharedTarget {
                    SharedWithMeSection(target: sharedTarget, isThis: sharedTarget == target) { dismiss() }
                } else {
                    if app.accountSharing.isAvailable {
                        SharePeopleSections(target: target)
                    }
                    linkSections
                }
            }
            .navigationTitle("Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }

    @ViewBuilder private var linkSections: some View {
        let links = app.sharing.links.filter { $0.target == target }
        Section {
            Picker("Access", selection: $permission) {
                Text("Can view").tag(SharePermission.view)
                Text("Can edit and draw").tag(SharePermission.edit)
            }
            Toggle("Expires", isOn: $hasExpiry.animation(Theme.Motion.snappy))
            if hasExpiry {
                DatePicker("Expires on", selection: $expiry, in: Date()..., displayedComponents: .date)
            }
            Button {
                create()
            } label: {
                HStack {
                    Label("Create Link", systemImage: "link.badge.plus")
                    Spacer()
                    if isWorking { ProgressView() }
                }
            }
            .disabled(isWorking)
            .accessibilityIdentifier("share.create")
        } header: {
            Text("Link for guests")
        } footer: {
            Text("Anyone with the link can open it in a browser without an account. The encryption key is part of the link after “#” and is never sent to the server. Links work until you revoke them.")
        }

        if let error {
            Section { Text(error).foregroundStyle(Theme.Palette.danger) }
        }

        if !links.isEmpty {
            Section("Active links") {
                ForEach(links) { link in
                    ShareLinkRow(link: link, isCopied: copiedId == link.id) {
                        SecretPasteboard.copy(link.url)
                        withAnimation { copiedId = link.id }
                        Haptics.success()
                    } onRevoke: {
                        Task { try? await app.sharing.revoke(link.id) }
                    }
                }
            }
        }
    }

    private func create() {
        isWorking = true
        error = nil
        Task {
            do {
                let link = try await app.sharing.createLink(for: target, permission: permission,
                                                            expiresAt: hasExpiry ? expiry : nil)
                SecretPasteboard.copy(link.url)
                copiedId = link.id
                Haptics.success()
            } catch {
                self.error = error.localizedDescription
            }
            isWorking = false
        }
    }
}

/// D-54, the owner: invite by email with a role, change roles, remove people, revoke invitations
/// that are not accepted yet (or copy their link for a messenger).
struct SharePeopleSections: View {
    @Environment(AppModel.self) private var app
    let target: ShareTarget

    @State private var email = ""
    @State private var role: AccessRole = .editor
    @State private var people = SharePeople()
    @State private var isLoading = true
    @State private var isInviting = false
    @State private var error: String?
    @State private var removing: ShareMember?
    @State private var copiedInvite: String?
    @FocusState private var emailFocused: Bool

    var body: some View {
        Section {
            HStack(spacing: Theme.Space.s2) {
                Image(systemName: "envelope")
                    .foregroundStyle(Theme.Palette.textTertiary)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($emailFocused)
                    .submitLabel(.send)
                    .onSubmit(invite)
                    .accessibilityIdentifier("share.email")
            }
            Picker("Role", selection: $role) {
                ForEach(AccessRole.allCases, id: \.self) { role in
                    Label(role.title, systemImage: role.systemImage).tag(role)
                }
            }
            .accessibilityIdentifier("share.role")
            Button(action: invite) {
                HStack {
                    Label("Invite", systemImage: "person.badge.plus")
                    Spacer()
                    if isInviting { ProgressView() }
                }
            }
            .disabled(email.trimmingCharacters(in: .whitespaces).isEmpty || isInviting)
            .accessibilityIdentifier("share.invite")
            if let error {
                Text(error)
                    .font(Theme.Typography.footnote)
                    .foregroundStyle(Theme.Palette.danger)
            }
        } header: {
            Text("People")
        } footer: {
            Text("They see it in “Shared with me” once they accept. Without an account the invitation waits until they sign up — you can copy its link. Keys are encrypted for each person; the server never reads them.")
        }
        .task { await load() }
        .confirmationDialog("Remove access?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }),
                            titleVisibility: .visible, presenting: removing) { member in
            Button("Remove \(member.email)", role: .destructive) { remove(member) }
        } message: { _ in
            Text("The key changes, so they can’t read anything new. What they have already seen can’t be taken back. Guest links are made anew — you’ll get the new ones to send.")
        }

        if !people.members.isEmpty {
            Section("With access") {
                ForEach(people.members) { member in
                    MemberRow(member: member, onRole: { setRole($0, of: member) }, onRemove: { removing = member })
                }
            }
        }

        if !people.invites.isEmpty {
            Section("Invited") {
                ForEach(people.invites) { invite in
                    InviteRow(invite: invite, isCopied: copiedInvite == invite.id) {
                        guard let link = invite.link else { return }
                        SecretPasteboard.copy(link)
                        withAnimation { copiedInvite = invite.id }
                        Haptics.success()
                    } onRevoke: {
                        revoke(invite)
                    }
                }
            }
        }

        if isLoading {
            Section { HStack { Spacer(); ProgressView(); Spacer() } }
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            people = try await app.accountSharing.people(of: target)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func invite() {
        let address = email.trimmingCharacters(in: .whitespaces)
        guard !address.isEmpty, !isInviting else { return }
        isInviting = true
        error = nil
        Task {
            do {
                let invite = try await app.accountSharing.invite(address, role: role, to: target)
                withAnimation(Theme.Motion.snappy) {
                    people.invites.removeAll { $0.email == invite.email }
                    people.invites.insert(invite, at: 0)
                }
                email = ""
                Haptics.success()
            } catch {
                self.error = error.localizedDescription
            }
            isInviting = false
        }
    }

    private func setRole(_ role: AccessRole, of member: ShareMember) {
        Task {
            do {
                try await app.accountSharing.setRole(role, of: member, in: target)
                if let index = people.members.firstIndex(of: member) { people.members[index].role = role }
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func remove(_ member: ShareMember) {
        Task {
            do {
                try await app.accountSharing.remove(member, from: target)
                withAnimation { people.members.removeAll { $0.userId == member.userId } }
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func revoke(_ invite: PendingInvite) {
        Task {
            do {
                try await app.accountSharing.revokeInvite(invite, of: target)
                withAnimation { people.invites.removeAll { $0.id == invite.id } }
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

private struct MemberRow: View {
    let member: ShareMember
    let onRole: (AccessRole) -> Void
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            PersonBadge(email: member.email)
            VStack(alignment: .leading, spacing: 2) {
                Text(member.email)
                    .font(Theme.Typography.body)
                    .lineLimit(1)
                    .truncationMode(.middle)
                if member.isAwaitingKey {
                    Text("Gets access when this device is online")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                }
            }
            Spacer(minLength: Theme.Space.s2)
            Menu {
                Picker("Role", selection: Binding(get: { member.role }, set: onRole)) {
                    ForEach(AccessRole.allCases, id: \.self) { role in
                        Label(role.title, systemImage: role.systemImage).tag(role)
                    }
                }
                Divider()
                Button("Remove Access", systemImage: "person.badge.minus", role: .destructive, action: onRemove)
            } label: {
                HStack(spacing: 4) {
                    Text(member.role.title)
                    Image(systemName: "chevron.up.chevron.down").font(.caption2)
                }
                .font(Theme.Typography.footnote.weight(.medium))
                .foregroundStyle(Theme.Palette.textSecondary)
            }
            .accessibilityIdentifier("share.member.role")
        }
        .accessibilityIdentifier("share.member")
    }
}

private struct InviteRow: View {
    let invite: PendingInvite
    let isCopied: Bool
    let onCopy: () -> Void
    let onRevoke: () -> Void

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            PersonBadge(email: invite.email, isPending: true)
            VStack(alignment: .leading, spacing: 2) {
                Text(invite.email)
                    .font(Theme.Typography.body)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Group {
                    if let expiresAt = invite.expiresAt {
                        Text("\(invite.role.title) · waiting until \(expiresAt.formatted(date: .abbreviated, time: .omitted))")
                    } else {
                        Text("\(invite.role.title) · waiting")
                    }
                }
                .font(Theme.Typography.caption)
                .foregroundStyle(Theme.Palette.textTertiary)
            }
            Spacer(minLength: Theme.Space.s2)
            Menu {
                if invite.link != nil {
                    Button(isCopied ? LocalizedStringKey("Copied") : "Copy Invitation Link", systemImage: isCopied ? "checkmark" : "link",
                           action: onCopy)
                }
                Button("Revoke Invitation", systemImage: "xmark.circle", role: .destructive, action: onRevoke)
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title3)
                    .foregroundStyle(Theme.Palette.textSecondary)
            }
            .accessibilityLabel("Invitation options")
        }
        .accessibilityIdentifier("share.invite.row")
    }
}

/// A round initial for a person (no avatars: emails only).
struct PersonBadge: View {
    let email: String
    var isPending = false

    var body: some View {
        Text(email.first.map { String($0).uppercased() } ?? "?")
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(isPending ? Theme.Palette.textTertiary : Theme.Palette.accent)
            .frame(width: 30, height: 30)
            .background(Circle().fill(isPending ? Theme.Palette.sidebar : Theme.Palette.accent.opacity(0.14)))
            .overlay {
                if isPending { Circle().strokeBorder(Theme.Palette.separator, style: StrokeStyle(lineWidth: 1, dash: [3, 3])) }
            }
            .accessibilityHidden(true)
    }
}

/// D-54, the member: who shares it and how, and «Leave».
struct SharedWithMeSection: View {
    @Environment(AppModel.self) private var app
    let target: ShareTarget
    /// False when this note is shared through its notebook.
    let isThis: Bool
    let onLeft: () -> Void

    @State private var confirmLeave = false
    @State private var error: String?

    var body: some View {
        let role = app.accountSharing.role(for: target) ?? .viewer
        Section {
            HStack(spacing: Theme.Space.s3) {
                PersonBadge(email: app.accountSharing.owner(of: target) ?? "?")
                VStack(alignment: .leading, spacing: 2) {
                    Text(app.accountSharing.owner(of: target) ?? "")
                        .font(Theme.Typography.body)
                    Text("Owner")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                }
            }
            LabeledContent("Your access") {
                Label(role.title, systemImage: role.systemImage)
            }
            .accessibilityIdentifier("share.myRole")
            if app.accountSharing.isOpenToAgents(target) {
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Open to AI agents")
                        Text("The owner’s AI agents can read it. Only the owner changes this.")
                            .font(Theme.Typography.caption)
                            .foregroundStyle(Theme.Palette.textTertiary)
                    }
                } icon: {
                    Image(systemName: "sparkles").foregroundStyle(Tint.purple.foreground)
                }
                .accessibilityIdentifier("share.agentsMode")
            }
            Button("Leave", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) { confirmLeave = true }
                .accessibilityIdentifier("share.leave")
            if let error {
                Text(error).font(Theme.Typography.footnote).foregroundStyle(Theme.Palette.danger)
            }
        } header: {
            Text(target.kind == .notebook ? (isThis ? "Shared notebook" : "In a shared notebook") : "Shared document")
        } footer: {
            Text("Only the owner manages access and guest links.")
        }
        .confirmationDialog(target.kind == .notebook ? "Leave this notebook?" : "Leave this document?",
                            isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Leave", role: .destructive) { leave() }
        } message: {
            Text("It disappears from this device. To get it back, the owner invites you again.")
        }
    }

    private func leave() {
        Task {
            do {
                try await app.accountSharing.leave(target)
                Haptics.success()
                onLeft()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

struct ShareLinkRow: View {
    let link: SharedLink
    let isCopied: Bool
    let onCopy: () -> Void
    let onRevoke: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s2) {
            HStack {
                Image(systemName: link.permission == .edit ? "pencil.and.scribble" : "eye")
                    .foregroundStyle(Theme.Palette.accent)
                Text(link.permission == .edit ? LocalizedStringKey("Can edit and draw") : "Can view")
                    .font(.headline)
                Spacer()
                if let expiresAt = link.expiresAt {
                    Text("until \(expiresAt.formatted(date: .abbreviated, time: .omitted))")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(link.isExpired() ? Theme.Palette.danger : Theme.Palette.textTertiary)
                } else {
                    Text("until revoked")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                }
            }
            Text(link.url.absoluteString)
                .font(Theme.Typography.caption.monospaced())
                .foregroundStyle(Theme.Palette.textSecondary)
                .lineLimit(1)
                .truncationMode(.middle)
                .textSelection(.enabled)
            HStack {
                Button(isCopied ? LocalizedStringKey("Copied") : "Copy Link",
                       systemImage: isCopied ? "checkmark" : "doc.on.doc", action: onCopy)
                ShareLinkButton(url: link.url)
                Spacer()
                Button("Revoke", role: .destructive, action: onRevoke)
            }
            .buttonStyle(.borderless)
            .font(Theme.Typography.footnote)
        }
        .padding(.vertical, Theme.Space.s1)
    }
}

/// System share sheet for a link.
struct ShareLinkButton: View {
    let url: URL
    var body: some View {
        SwiftUI.ShareLink(item: url) {
            Label("Send", systemImage: "square.and.arrow.up")
        }
    }
}

/// A guest link opened in the app (`ds://share`, D-37, D-56): the app has no guest mode, so the
/// web's guest page opens inside it (the key stays in the `#` part, never sent to the server).
/// A link without its key says so.
struct SharedLinkView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let shareId: String
    let key: String?
    /// The link's server; without one, the account's.
    let server: String?

    var body: some View {
        if let key, let server = server ?? app.linkServer,
           let url = AppRoute.webURL(server: server, kind: "share", id: shareId, key: key) {
            SafariView(url: url)
                .ignoresSafeArea()
        } else {
            NavigationStack {
                ContentUnavailableView {
                    Label("This link is incomplete", systemImage: "link.badge.plus")
                } description: {
                    Text("The part after “#” with the key is missing. Ask for the full link.")
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                }
            }
            .accessibilityIdentifier("sharedLink.incomplete")
        }
    }
}

/// ✨ on something shared with this account that the owner opened to their AI agents (D-54):
/// shown only, with the hint; the member cannot change it. `showsTitle`: «Open to AI agents»
/// beside it (the document's header).
struct SharedAgentsBadge: View {
    var kind: ShareTarget.Kind = .notebook
    var showsTitle = false

    var body: some View {
        Group {
            if showsTitle {
                Label("Open to AI agents", systemImage: "sparkles")
            } else {
                Image(systemName: "sparkles").font(.caption)
            }
        }
        .foregroundStyle(Tint.purple.foreground)
        .help(hint)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(hint)
        .accessibilityIdentifier("sharedAgents.badge")
    }

    private var hint: String {
        kind == .notebook ? String(localized: "The owner opened this notebook to AI agents")
                          : String(localized: "The owner opened this document to AI agents")
    }
}
