import SwiftUI

/// Tokens for external AI agents (MCP/REST, spec/09). Only notebooks in
/// "open to agents" mode can be granted.
struct AgentTokensSettings: View {
    @Environment(AppModel.self) private var app
    @State private var isCreating = false

    var body: some View {
        let tokens = app.access.agentTokens
        List {
            Section {
                if tokens.isEmpty {
                    Text("No tokens yet.")
                        .foregroundStyle(Theme.Palette.textTertiary)
                }
                ForEach(tokens) { token in
                    VStack(alignment: .leading, spacing: Theme.Space.s1) {
                        HStack {
                            Text(token.name).font(.headline)
                            Spacer()
                            Text(token.permission == .readWrite ? LocalizedStringKey("Read & write") : "Read only")
                                .font(Theme.Typography.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Tint.purple.background, in: Capsule())
                                .foregroundStyle(Tint.purple.foreground)
                        }
                        Text(notebookNames(token.notebookIds))
                            .font(Theme.Typography.footnote)
                            .foregroundStyle(Theme.Palette.textSecondary)
                        if let expiresAt = token.expiresAt {
                            Text("Expires \(expiresAt.formatted(date: .abbreviated, time: .omitted))")
                                .font(Theme.Typography.caption)
                                .foregroundStyle(Theme.Palette.textTertiary)
                        }
                    }
                    .swipeActions {
                        Button("Revoke", role: .destructive) {
                            Task { try? await app.access.revokeAgentToken(token.id) }
                        }
                    }
                    .contextMenu {
                        Button("Revoke", systemImage: "xmark.octagon", role: .destructive) {
                            Task { try? await app.access.revokeAgentToken(token.id) }
                        }
                    }
                }
            } footer: {
                Text("Agents such as Claude or ChatGPT connect through MCP with a token. They see only the notebooks you allow, and only notebooks open to agents. Every action is logged.")
            }
        }
        .navigationTitle("Agent Access")
        .toolbar {
            Button {
                isCreating = true
            } label: {
                Image(systemName: "plus")
            }
            .accessibilityLabel("New Token")
            .accessibilityIdentifier("agents.newToken")
        }
        .sheet(isPresented: $isCreating) { NewAgentTokenSheet() }
    }

    private func notebookNames(_ ids: [String]) -> String {
        ids.compactMap { app.library.notebook($0)?.name }.joined(separator: ", ")
    }
}

struct NewAgentTokenSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var selected: Set<String> = []
    @State private var permission: AgentPermission = .read
    @State private var hasExpiry = false
    @State private var expiry = Calendar.current.date(byAdding: .month, value: 3, to: Date()) ?? Date()
    @State private var secret: String?
    @State private var copied = false

    var body: some View {
        let agentNotebooks = app.library.data.notebooks.filter { $0.mode == .agent }
        NavigationStack {
            Form {
                if let secret {
                    Section {
                        Text(secret)
                            .font(.system(.body, design: .monospaced))
                            .textSelection(.enabled)
                        Button(copied ? LocalizedStringKey("Copied") : "Copy Token",
                               systemImage: copied ? "checkmark" : "doc.on.doc") {
                            UIPasteboard.general.string = secret
                            copied = true
                        }
                    } header: {
                        Text("Your token")
                    } footer: {
                        Text("Copy it now — it is shown only once. Paste it into the agent's MCP settings.")
                    }
                } else {
                    Section("Name") {
                        TextField("For example, Claude on my Mac", text: $name)
                    }
                    Section {
                        if agentNotebooks.isEmpty {
                            Text("No notebooks are open to agents. Change a notebook's encryption mode first.")
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                        ForEach(agentNotebooks) { notebook in
                            Toggle(isOn: Binding(
                                get: { selected.contains(notebook.id) },
                                set: { if $0 { selected.insert(notebook.id) } else { selected.remove(notebook.id) } }
                            )) {
                                Label(notebook.name, systemImage: notebook.icon)
                            }
                        }
                    } header: {
                        Text("Notebooks")
                    }
                    Section("Permission") {
                        Picker("Permission", selection: $permission) {
                            Text("Read only").tag(AgentPermission.read)
                            Text("Read & write").tag(AgentPermission.readWrite)
                        }
                        .pickerStyle(.segmented)
                        Toggle("Expires", isOn: $hasExpiry)
                        if hasExpiry {
                            DatePicker("Expires on", selection: $expiry, in: Date()..., displayedComponents: .date)
                        }
                    }
                }
            }
            .navigationTitle("New Token")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if secret == nil {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Create") { create() }
                            .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || selected.isEmpty)
                    }
                } else {
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
                }
            }
        }
        .interactiveDismissDisabled(secret != nil && !copied)
    }

    private func create() {
        Task {
            secret = try? await app.access.createAgentToken(
                name: name.trimmingCharacters(in: .whitespaces), notebookIds: Array(selected),
                permission: permission, expiresAt: hasExpiry ? expiry : nil)
        }
    }
}
