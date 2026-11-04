import SwiftUI

/// D-62: who works in a space. Its owner invites by email with a role, changes roles, removes
/// people — a personal space becomes shared with the first invitation. A member sees the owner,
/// their role and «Leave».
struct SpaceMembersSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @Environment(\.dismiss) private var dismiss
    let spaceId: String

    private var space: Space? { app.library.spaces.first { $0.id == spaceId } }
    private var target: ShareTarget { ShareTarget(kind: .space, id: spaceId) }

    var body: some View {
        NavigationStack {
            Form {
                if let space {
                    Section {
                        SpaceHeader(space: space)
                    }
                    if space.isJoined {
                        SharedWithMeSection(target: target, isThis: true) {
                            if let personal = app.library.spaces.first(where: { !$0.isJoined }) {
                                scene.switchSpace(to: personal.id)
                                scene.sidebar = .allDocuments
                            }
                            dismiss()
                        }
                    } else {
                        if !space.isShared {
                            Section {
                                Label {
                                    Text("Everyone you invite works in this space with you: they see all of its notebooks, with their history. Notebooks you already share with people of their own stay personal.")
                                        .font(Theme.Typography.callout)
                                        .foregroundStyle(Theme.Palette.textSecondary)
                                } icon: {
                                    Image(systemName: "person.2").foregroundStyle(Theme.Palette.accent)
                                }
                            }
                        }
                        SharePeopleSections(target: target)
                    }
                }
            }
            .navigationTitle(space?.isShared == true ? LocalizedStringKey("Space Members") : "Invite to Space")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .accessibilityIdentifier("spaceMembers")
    }
}

/// The space at the top of its members sheet: its tile, its name and whose it is.
private struct SpaceHeader: View {
    @Environment(AppModel.self) private var app
    let space: Space

    var body: some View {
        HStack(spacing: Theme.Space.s3) {
            SpaceTile(space: space, size: 44)
            VStack(alignment: .leading, spacing: 3) {
                Text(space.name)
                    .font(.system(.title3, design: .serif).weight(.semibold))
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .lineLimit(1)
                Text(subtitle)
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textTertiary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if space.isShared { SpaceMembersAvatars(spaceId: space.id) }
        }
        .padding(.vertical, Theme.Space.s1)
    }

    private var subtitle: String {
        switch space.sharing {
        case .owned: String(localized: "Shared space · yours")
        case .joined:
            if let owner = app.accountSharing.owner(of: ShareTarget(kind: .space, id: space.id)) {
                String(localized: "Shared space · \(owner)")
            } else {
                String(localized: "Shared space")
            }
        case nil: String(localized: "Personal space")
        }
    }
}

/// The people of a shared space, overlapping, as in the space switcher: the owner first, then
/// up to two members, then how many more.
struct SpaceMembersAvatars: View {
    @Environment(AppModel.self) private var app
    let spaceId: String
    var size: CGFloat = 22
    @State private var emails: [String] = []

    var body: some View {
        HStack(spacing: -size * 0.3) {
            ForEach(Array(emails.prefix(3).enumerated()), id: \.offset) { _, email in
                PersonBadge(email: email, size: size)
                    .background(Circle().fill(Theme.Palette.canvas).padding(-1.5))
            }
            if emails.count > 3 {
                Text(verbatim: "+\(emails.count - 3)")
                    .font(.system(size: size * 0.45, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .padding(.leading, size * 0.4)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(emails.joined(separator: ", ")))
        .accessibilityIdentifier("space.members")
        .task(id: spaceId) { await load() }
    }

    private func load() async {
        let target = ShareTarget(kind: .space, id: spaceId)
        var list: [String] = []
        if let owner = app.accountSharing.owner(of: target) { list.append(owner) }
        if let people = try? await app.accountSharing.people(of: target) {
            list += people.members.map(\.email)
        }
        var seen = Set<String>()
        emails = list.filter { seen.insert($0.lowercased()).inserted }
    }
}

/// In «Share» of a notebook or note of a shared space: people come with the whole space.
struct SpaceAccessSection: View {
    @Environment(SceneModel.self) private var scene
    let space: Space

    var body: some View {
        Section {
            HStack(spacing: Theme.Space.s3) {
                SpaceTile(space: space, size: 30)
                VStack(alignment: .leading, spacing: 2) {
                    Text(space.name)
                        .font(Theme.Typography.body.weight(.semibold))
                    Text("Everyone in this space sees it.")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textTertiary)
                }
                Spacer(minLength: 0)
                SpaceMembersAvatars(spaceId: space.id)
            }
            Button("Space Members…", systemImage: "person.2") { scene.sheet = .spaceMembers(space.id) }
                .accessibilityIdentifier("share.spaceMembers")
        } header: {
            Text("In a shared space")
        } footer: {
            Text("People are invited to the whole space, not to one notebook.")
        }
    }
}
