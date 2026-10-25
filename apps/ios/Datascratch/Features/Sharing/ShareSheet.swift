import SwiftUI

/// Create and revoke share links for a note or notebook (D-13, D-37, spec/08).
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

    var body: some View {
        let links = app.sharing.links.filter { $0.target == target }
        NavigationStack {
            Form {
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
                    Text(target.kind == .note ? LocalizedStringKey("Share this document") : "Share this notebook")
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
                                UIPasteboard.general.url = link.url
                                withAnimation { copiedId = link.id }
                                Haptics.success()
                            } onRevoke: {
                                Task { try? await app.sharing.revoke(link.id) }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
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
                UIPasteboard.general.url = link.url
                copiedId = link.id
                Haptics.success()
            } catch {
                self.error = error.localizedDescription
            }
            isWorking = false
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

/// Shown when a share link is opened in the app (Universal Link).
struct SharedLinkView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let shareId: String
    let key: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.Space.s4) {
                Image(systemName: "link.circle")
                    .font(.system(size: 54, weight: .light))
                    .foregroundStyle(Theme.Palette.accent)
                Text("Shared document")
                    .font(Theme.Typography.h2)
                if key == nil {
                    Text("This link is incomplete: the part after “#” with the key is missing. Ask for the full link.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Theme.Palette.danger)
                } else if app.sync.isLocalOnly {
                    Text("Opening shared documents needs a connection to the Datascratch server. You can open the link in the browser meanwhile.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Theme.Palette.textSecondary)
                    if let url = webURL {
                        Link(destination: url) {
                            Label("Open in Browser", systemImage: "safari")
                        }
                        .prominentGlass()
                    }
                } else {
                    ProgressView("Connecting…")
                }
            }
            .padding(Theme.Space.s8)
            .frame(maxWidth: 480)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
        }
    }

    private var webURL: URL? {
        var components = URLComponents()
        components.scheme = "https"
        components.host = app.webHost
        components.path = "/s/\(shareId)"
        components.fragment = key.map { "k=\($0)" }
        return components.url
    }
}
