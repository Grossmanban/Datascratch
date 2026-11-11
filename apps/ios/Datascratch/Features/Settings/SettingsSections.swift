import SwiftUI
import UIKit
#if canImport(DSDesign)
import DSDesign
#endif

/// A settings row like iOS Settings: the icon in white on a tile of its colour (owner, D-15),
/// with the metrics of `DSSettingsRow`.
struct SettingsTileRow: View {
    enum Accessory { case chevron, external, none }

    private let title: String
    private let systemImage: String
    private let tint: Color
    private let value: String?
    private let trailing: AnyView?
    private let badge: String?
    private let accessory: Accessory

    init(_ title: String, systemImage: String, tint: Color, value: String? = nil, trailing: AnyView? = nil,
         badge: String? = nil, accessory: Accessory = .chevron) {
        self.title = title
        self.systemImage = systemImage
        self.tint = tint
        self.value = value
        self.trailing = trailing
        self.badge = badge
        self.accessory = accessory
    }

    var body: some View {
        HStack(spacing: DSSpace.s3) {
            Image(systemName: systemImage)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(tint.gradient))
                .accessibilityHidden(true)
            Text(title)
                .dsFont(.body)
                .foregroundStyle(Color.dsPrimary)
                .lineLimit(1)
            Spacer(minLength: DSSpace.s2)
            if let value {
                Text(value)
                    .dsFont(.callout)
                    .foregroundStyle(Color.dsSecondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            if let trailing { trailing }
            if let badge {
                Text(badge)
                    .dsFont(.caption)
                    .foregroundStyle(DSCalloutTone.warning.foreground)
                    .padding(.horizontal, DSSpace.s2)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(DSCalloutTone.warning.background))
            }
            switch accessory {
            case .chevron:
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.dsTertiary)
                    .accessibilityHidden(true)
            case .external:
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.dsTertiary)
                    .accessibilityHidden(true)
            case .none:
                EmptyView()
            }
        }
        .padding(.horizontal, DSSpace.s4)
        .padding(.vertical, DSSpace.s3)
        .frame(minHeight: 52)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

/// The Datascratch mark (the launch stroke, at rest) in the accent colour.
struct LaunchMarkGlyph: View {
    var body: some View {
        let color = Theme.Palette.accent
        Canvas { context, size in
            let box = InkLaunchView.box
            let scale = min(size.width / box.width, size.height / box.height)
            var path = Path()
            let points = InkLaunchView.samples(perSegment: 24)
            for (i, p) in points.enumerated() {
                let q = CGPoint(x: (p.x - box.minX) * scale, y: (p.y - box.minY) * scale)
                if i == 0 { path.move(to: q) } else { path.addLine(to: q) }
            }
            context.stroke(path, with: .color(color),
                           style: StrokeStyle(lineWidth: 4.2 * scale, lineCap: .round, lineJoin: .round))
        }
    }
}

// MARK: - Sync

struct SyncSettings: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        SettingsPage(title: String(localized: "Sync")) {
            DSSettingsSection(footer: app.sync.isLocalOnly
                              ? String(localized: "Notes are stored only on this device until you sign in to your server.")
                              : nil) {
                DSSettingsRow(String(localized: "Status"), systemImage: "arrow.triangle.2.circlepath",
                              accessory: .custom(AnyView(DSSyncChip(app.sync.dsState))))
                if let transfer = app.sync.transferLine {
                    DSSettingsRow(String(localized: "Photos"), systemImage: transfer.icon, value: transfer.text)
                }
                DSSettingsRow(String(localized: "Server"), systemImage: "server.rack",
                              value: app.serverURL.map(ServerAddress.display) ?? String(localized: "Not connected"))
                if case .notSent = app.sync.phase {
                    Button { app.sync.retryFailed() } label: {
                        DSSettingsRow(String(localized: "Retry"), systemImage: "arrow.clockwise", accessory: .chevron)
                    }
                    .buttonStyle(.dsSettingsRow)
                }
            }
            DSSettingsSection(footer: String(localized: "What sync is doing and what went wrong recently. The report has no note text, names or keys.")) {
                NavigationLink(value: SettingsRoute.diagnostics) {
                    SettingsTileRow(String(localized: "Diagnostics"), systemImage: "stethoscope", tint: .teal,
                                    value: app.sync.recentEvents.isEmpty ? nil : "\(app.sync.recentEvents.count)")
                }
                .accessibilityIdentifier("settings.diagnostics")
            }
            .buttonStyle(.dsSettingsRow)
        }
    }
}

// MARK: - Security

struct SecuritySettings: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        SettingsPage(title: String(localized: "Security")) {
            DSSettingsSection(footer: String(localized: "Your password also protects the encryption key. Your recovery key keeps working after a password change.")) {
                NavigationLink(value: SettingsRoute.recoveryKey) {
                    SettingsTileRow(String(localized: "Recovery Key"), systemImage: "key.fill", tint: .orange,
                                    badge: app.isRecoveryKeyConfirmed ? nil : String(localized: "Not checked"))
                }
                .accessibilityIdentifier("settings.recoveryKey")
                NavigationLink(value: SettingsRoute.changePassword) {
                    SettingsTileRow(String(localized: "Change Password"), systemImage: "lock.fill", tint: .red)
                }
                NavigationLink(value: SettingsRoute.securityLog) {
                    SettingsTileRow(String(localized: "Security Log"), systemImage: "list.bullet.rectangle.fill", tint: .gray)
                }
                .accessibilityIdentifier("settings.securityLog")
            }
            .buttonStyle(.dsSettingsRow)
            DSSettingsSection(String(localized: "Access")) {
                NavigationLink(value: SettingsRoute.devices) {
                    SettingsTileRow(String(localized: "Devices"), systemImage: "ipad.and.iphone", tint: .blue,
                                    value: app.access.devices.isEmpty ? nil : "\(app.access.devices.count)")
                }
                .accessibilityIdentifier("settings.devices")
            }
            .buttonStyle(.dsSettingsRow)
        }
    }
}

// MARK: - Diagnostics

/// «Диагностика» (spec/10): connection, outbox, keys, uploads, recent problems with times and
/// plain explanations; the report holds codes and ids only.
struct DiagnosticsView: View {
    @Environment(AppModel.self) private var app
    @State private var copied = false
    /// The sync engine's own report (build 46), refreshed while the screen is open.
    @State private var engine: SyncEngineReport?
    @State private var isSendingAgain = false

    private static let time: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .short
        f.timeStyle = .medium
        return f
    }()

    var body: some View {
        let snapshot = app.diagnosticsSnapshot()
        SettingsPage(title: String(localized: "Diagnostics")) {
            DSSettingsSection(String(localized: "Connection")) {
                DSSettingsRow(String(localized: "Sync"), systemImage: "arrow.triangle.2.circlepath",
                              accessory: .custom(AnyView(DSSyncChip(app.sync.dsState))))
                DSSettingsRow(String(localized: "Network"), systemImage: "wifi",
                              value: snapshot.isOnline ? String(localized: "Online") : String(localized: "Offline"))
                DSSettingsRow(String(localized: "Server"), systemImage: "server.rack",
                              value: snapshot.hasServer ? String(localized: "Connected") : String(localized: "This device only"))
            }
            DSSettingsSection(String(localized: "Outbox")) {
                DSSettingsRow(String(localized: "Changes to send"), systemImage: "tray.and.arrow.up",
                              value: "\(snapshot.pendingChanges)")
                    .accessibilityIdentifier("diagnostics.pending")
                DSSettingsRow(String(localized: "Waiting for a key"), systemImage: "key",
                              value: "\(snapshot.heldChanges)")
                DSSettingsRow(String(localized: "Not delivered"), systemImage: "exclamationmark.arrow.triangle.2.circlepath",
                              value: "\(snapshot.notSentDocuments)")
            }
            if let engine {
                DSSettingsSection(String(localized: "Sync Engine"),
                                  footer: String(localized: "Connections that keep growing on a steady network mean the connection keeps dropping.")) {
                    DSSettingsRow(String(localized: "Connection"), systemImage: "bolt.horizontal", value: engine.connection)
                        .accessibilityIdentifier("diagnostics.engine.connection")
                    DSSettingsRow(String(localized: "Connections opened"), systemImage: "arrow.triangle.2.circlepath",
                                  value: "\(engine.connectionsOpened)")
                    DSSettingsRow(String(localized: "Waiting to be sent"),
                                  subtitle: engine.oldestPendingAge().map { String(localized: "Oldest: \(Self.age($0))") },
                                  systemImage: "tray.and.arrow.up", value: "\(engine.pending.reduce(0) { $0 + $1.count })")
                        .accessibilityIdentifier("diagnostics.engine.pending")
                    DSSettingsRow(String(localized: "Sent, not confirmed"), systemImage: "paperplane", value: "\(engine.inFlight)")
                    DSSettingsRow(String(localized: "Catching up"), systemImage: "arrow.down.circle",
                                  value: "\(engine.catchingUp) · \(engine.queuedSubscriptions) · \(engine.live)")
                    DSSettingsRow(String(localized: "Refused by the server"), systemImage: "xmark.octagon", value: "\(engine.failed)")
                    DSSettingsRow(String(localized: "Set aside (unreadable)"), systemImage: "exclamationmark.lock",
                                  value: "\(engine.unreadable) · \(engine.quarantined)")
                    if let error = engine.lastError {
                        DSSettingsRow(String(localized: "Last error"), subtitle: engine.lastErrorAt.map { Self.time.string(from: $0) },
                                      systemImage: "exclamationmark.triangle", value: error)
                    }
                    Button {
                        isSendingAgain = true
                        Task {
                            await app.sync.sendAgain?()
                            engine = await app.sync.loadEngineReport?()
                            isSendingAgain = false
                        }
                    } label: {
                        SettingsTileRow(String(localized: "Send Again"), systemImage: "arrow.up.circle", tint: .orange, accessory: .none)
                    }
                    .buttonStyle(.dsSettingsRow)
                    .disabled(isSendingAgain)
                    .accessibilityIdentifier("diagnostics.sendAgain")
                }
                DSSettingsSection(String(localized: "Sync Log")) {
                    if engine.events.isEmpty {
                        DSSettingsRow(String(localized: "No events yet"), systemImage: "list.bullet")
                    } else {
                        ForEach(engine.events.reversed().prefix(30)) { event in
                            DSSettingsRow(event.kind, subtitle: "\(Self.time.string(from: event.at))\(event.detail.isEmpty ? "" : " · \(event.detail)")",
                                          systemImage: Self.symbol(event.kind))
                                .accessibilityIdentifier("diagnostics.engine.event")
                        }
                    }
                }
            }
            DSSettingsSection(String(localized: "Keys and Uploads")) {
                DSSettingsRow(String(localized: "Notebooks without a key"), systemImage: "lock.trianglebadge.exclamationmark",
                              value: "\(snapshot.unreadableNotebookIds.count)")
                DSSettingsRow(String(localized: "Recovery Key"), systemImage: "key.viewfinder",
                              value: snapshot.recoveryKeyConfirmed ? String(localized: "Checked") : String(localized: "Not checked"))
                DSSettingsRow(String(localized: "Photos sent"), systemImage: "arrow.up.circle",
                              value: "\(snapshot.uploads.sent) / \(snapshot.uploads.toSend)")
                DSSettingsRow(String(localized: "Photos received"), systemImage: "arrow.down.circle",
                              value: "\(snapshot.uploads.received) / \(snapshot.uploads.toReceive)")
            }
            DSSettingsSection(String(localized: "Recent Problems")) {
                if snapshot.events.isEmpty {
                    DSSettingsRow(String(localized: "Nothing went wrong"), systemImage: "checkmark.seal")
                        .accessibilityIdentifier("diagnostics.noEvents")
                } else {
                    ForEach(snapshot.events.prefix(20)) { event in
                        DSSettingsRow(DiagnosticCode.explanation(event.code),
                                      subtitle: "\(Self.time.string(from: event.date)) · \(event.code)\(event.detail.map { " · \($0)" } ?? "")",
                                      systemImage: "clock")
                            .accessibilityIdentifier("diagnostics.event")
                    }
                }
            }
            DSSettingsSection(footer: String(localized: "The report lists states, codes, document ids, times, the app version and the device model — no note text, names, addresses or keys.")) {
                Button { app.checkSyncNow() } label: {
                    SettingsTileRow(String(localized: "Check Now"), systemImage: "arrow.clockwise", tint: .green, accessory: .none)
                }
                .accessibilityIdentifier("diagnostics.check")
                Button {
                    UIPasteboard.general.string = report(snapshot)
                    copied = true
                } label: {
                    SettingsTileRow(copied ? String(localized: "Copied") : String(localized: "Copy Report"),
                                    systemImage: copied ? "checkmark" : "doc.on.doc", tint: .blue, accessory: .none)
                }
                .accessibilityIdentifier("diagnostics.copy")
                ShareLink(item: report(snapshot), subject: Text(verbatim: "Datascratch diagnostics")) {
                    SettingsTileRow(String(localized: "Share Report"), systemImage: "square.and.arrow.up", tint: .indigo, accessory: .none)
                }
                .accessibilityIdentifier("diagnostics.share")
            }
            .buttonStyle(.dsSettingsRow)
        }
        .task {
            // While the screen is open: the engine's numbers move (waiting, catching up).
            while !Task.isCancelled {
                engine = await app.sync.loadEngineReport?()
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    private func report(_ snapshot: DiagnosticsSnapshot) -> String {
        guard let engine else { return snapshot.report() }
        return snapshot.report() + "\n" + engine.lines().joined(separator: "\n") + "\n"
    }

    static func age(_ seconds: TimeInterval) -> String {
        let s = Int(seconds)
        if s < 60 { return "\(s) s" }
        if s < 3600 { return "\(s / 60) min" }
        return "\(s / 3600) h \(s % 3600 / 60) min"
    }

    static func symbol(_ kind: String) -> String {
        switch kind {
        case "connected": "checkmark.circle"
        case "disconnected", "connectionLost": "wifi.exclamationmark"
        case "serverError", "failed": "exclamationmark.triangle"
        default: "info.circle"
        }
    }
}
