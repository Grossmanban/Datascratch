import SwiftUI

// MARK: - Section

/// Settings section: sentence-case title, rows in a paper card split by hairlines, footer.
public struct DSSettingsSection<Content: View>: View {
    private let title: String?
    private let footer: String?
    private let dividerInset: CGFloat
    private let content: Content

    /// - Parameter dividerInset: where hairlines start (aligned with row titles after the icon tile).
    public init(_ title: String? = nil, footer: String? = nil, dividerInset: CGFloat = 56, @ViewBuilder content: () -> Content) {
        self.title = title
        self.footer = footer
        self.dividerInset = dividerInset
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s2) {
            if let title {
                Text(title)
                    .dsFont(.footnote)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.dsSecondary)
                    .padding(.leading, DSSpace.s1)
                    .accessibilityAddTraits(.isHeader)
            }
            VStack(spacing: 0) {
                Group(subviews: content) { subviews in
                    ForEach(subviews) { subview in
                        subview
                        if subview.id != subviews.last?.id {
                            Rectangle()
                                .fill(Color.dsSeparator)
                                .frame(height: 0.5)
                                .padding(.leading, dividerInset)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous)
                    .fill(Color.dsSurface)
            )
            .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous)
                    .strokeBorder(Color.dsSeparator, lineWidth: 0.5)
            )
            if let footer {
                Text(footer)
                    .dsFont(.caption)
                    .foregroundStyle(Color.dsTertiary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, DSSpace.s1)
            }
        }
    }
}

// MARK: - Row

/// Trailing element of a settings row.
public enum DSSettingsAccessory {
    case none
    case chevron
    case toggle(Binding<Bool>)
    case badge(String, DSCalloutTone)
    case check
    case custom(AnyView)
}

public enum DSSettingsRole: Sendable, Hashable {
    case normal
    case destructive
}

/// One settings row: neutral icon tile, title, optional subtitle, value and accessory.
/// Wrap in `NavigationLink` / `Button` with `.buttonStyle(.dsSettingsRow)` for press feedback.
public struct DSSettingsRow: View {
    private let title: String
    private let subtitle: String?
    private let systemImage: String?
    private let value: String?
    private let accessory: DSSettingsAccessory
    private let role: DSSettingsRole

    public init(
        _ title: String,
        subtitle: String? = nil,
        systemImage: String? = nil,
        value: String? = nil,
        accessory: DSSettingsAccessory = .none,
        role: DSSettingsRole = .normal
    ) {
        self.title = title
        self.subtitle = subtitle
        self.systemImage = systemImage
        self.value = value
        self.accessory = accessory
        self.role = role
    }

    private var destructive: Bool { role == .destructive }

    public var body: some View {
        HStack(spacing: DSSpace.s3) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(destructive ? Color.dsDanger : Color.dsSecondary)
                    .frame(width: 28, height: 28)
                    .background(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(destructive ? Color.dsDanger.opacity(0.10) : Color.dsPrimary.opacity(0.06))
                    )
                    .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .dsFont(.body)
                    .foregroundStyle(destructive ? Color.dsDanger : Color.dsPrimary)
                if let subtitle {
                    Text(subtitle)
                        .dsFont(.footnote)
                        .foregroundStyle(Color.dsSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: DSSpace.s2)
            if let value {
                Text(value)
                    .dsFont(.callout)
                    .foregroundStyle(Color.dsSecondary)
                    .lineLimit(1)
            }
            trailing
        }
        .padding(.horizontal, DSSpace.s4)
        .padding(.vertical, DSSpace.s3)
        .frame(minHeight: 52)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private var trailing: some View {
        switch accessory {
        case .none:
            EmptyView()
        case .chevron:
            if !destructive {
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.dsTertiary)
                    .accessibilityHidden(true)
            }
        case let .toggle(isOn):
            Toggle(title, isOn: isOn)
                .labelsHidden()
                .tint(Color.dsSuccess)
        case let .badge(text, tone):
            Text(text)
                .dsFont(.caption)
                .foregroundStyle(tone.foreground)
                .padding(.horizontal, DSSpace.s2)
                .padding(.vertical, 3)
                .background(Capsule().fill(tone.background))
        case .check:
            Image(systemName: "checkmark")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.dsAccent)
        case let .custom(view):
            view
        }
    }
}

/// Full-row press highlight for settings rows used as `NavigationLink` / `Button` labels.
public struct DSSettingsRowButtonStyle: ButtonStyle {
    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(Color.dsPrimary.opacity(configuration.isPressed ? 0.05 : 0))
            .contentShape(Rectangle())
    }
}

extension ButtonStyle where Self == DSSettingsRowButtonStyle {
    public static var dsSettingsRow: DSSettingsRowButtonStyle { DSSettingsRowButtonStyle() }
}

// MARK: - Sync state

/// Sync status of the account, shown as a chip.
public enum DSSyncState: Sendable, Hashable {
    case synced(Date?)
    case syncing
    case localOnly
    case offline
    case error(String)
}

/// Capsule with the sync status: icon, label, tone.
public struct DSSyncChip: View {
    private let state: DSSyncState
    private let now: Date
    @Environment(\.locale) private var locale
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var spin = false

    public init(_ state: DSSyncState, now: Date = .now) {
        self.state = state
        self.now = now
    }

    private var tone: Color {
        switch state {
        case .synced: Color.dsSuccess
        case .syncing: Color.dsAccent
        case .localOnly, .offline: Color.dsSecondary
        case .error: Color.dsDanger
        }
    }

    private var systemImage: String {
        switch state {
        case .synced: "checkmark.icloud"
        case .syncing: "arrow.triangle.2.circlepath"
        case .localOnly: "iphone"
        case .offline: "icloud.slash"
        case .error: "exclamationmark.icloud"
        }
    }

    /// Label text (pure, testable).
    public nonisolated static func label(_ state: DSSyncState, now: Date, language: DSLanguage) -> String {
        let ru = language == .ru
        switch state {
        case let .synced(date):
            let base = ru ? "Синхронизировано" : "Synced"
            guard let date else { return base }
            let formatter = RelativeDateTimeFormatter()
            formatter.locale = Locale(identifier: ru ? "ru_RU" : "en_US")
            formatter.unitsStyle = .short
            return "\(base) · \(formatter.localizedString(for: date, relativeTo: now))"
        case .syncing: return ru ? "Синхронизация…" : "Syncing…"
        case .localOnly: return ru ? "Только на этом устройстве" : "Only on this device"
        case .offline: return ru ? "Нет сети" : "Offline"
        case .error: return ru ? "Ошибка синхронизации" : "Sync error"
        }
    }

    public var body: some View {
        HStack(spacing: 5) {
            Image(systemName: systemImage)
                .font(.system(size: 12, weight: .semibold))
                .rotationEffect(.degrees(state == .syncing && spin ? 360 : 0))
            Text(Self.label(state, now: now, language: DSLanguage(locale: locale)))
                .dsFont(.caption)
                .lineLimit(1)
        }
        .foregroundStyle(tone)
        .padding(.horizontal, DSSpace.s3)
        .padding(.vertical, 5)
        .background(Capsule().fill(tone.opacity(0.12)))
        .onAppear {
            guard state == .syncing, !reduceMotion else { return }
            withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) { spin = true }
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Profile header

/// Account header on the paper: avatar, name, e-mail, sync chip.
public struct DSProfileHeader: View {
    private let name: String?
    private let email: String
    private let image: Image?
    private let sync: DSSyncState
    private let now: Date

    public init(name: String?, email: String, image: Image? = nil, sync: DSSyncState, now: Date = .now) {
        self.name = name
        self.email = email
        self.image = image
        self.sync = sync
        self.now = now
    }

    private var displayName: String {
        if let name, !name.isEmpty { return name }
        return email
    }

    public var body: some View {
        VStack(spacing: DSSpace.s2) {
            DSAvatar(name: displayName, image: image, size: 72)
                .padding(.bottom, DSSpace.s1)
            Text(displayName)
                .dsFont(.h2)
                .foregroundStyle(Color.dsPrimary)
                .multilineTextAlignment(.center)
            if name?.isEmpty == false {
                Text(email)
                    .dsFont(.callout)
                    .foregroundStyle(Color.dsSecondary)
            }
            DSSyncChip(sync, now: now)
                .padding(.top, DSSpace.s1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpace.s6)
    }
}

// MARK: - Callout

/// Tinted callout for important notices (e.g. "Check your recovery key").
public struct DSCallout: View {
    private let tone: DSCalloutTone
    private let title: String
    private let message: String?
    private let systemImage: String?
    private let actionTitle: String?
    private let action: (() -> Void)?

    public init(
        tone: DSCalloutTone,
        title: String,
        message: String? = nil,
        systemImage: String? = nil,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.tone = tone
        self.title = title
        self.message = message
        self.systemImage = systemImage
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        HStack(alignment: .top, spacing: DSSpace.s3) {
            Image(systemName: systemImage ?? tone.systemImage)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(tone.foreground)
                .frame(width: 24)
                .padding(.top, 1)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: DSSpace.s1) {
                Text(title)
                    .dsFont(.callout)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.dsPrimary)
                if let message {
                    Text(message)
                        .dsFont(.footnote)
                        .foregroundStyle(Color.dsSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let actionTitle, let action {
                    Button(action: action) {
                        Text(actionTitle)
                            .dsFont(.footnote)
                            .fontWeight(.semibold)
                            .foregroundStyle(tone.foreground)
                            .padding(.horizontal, DSSpace.s3)
                            .padding(.vertical, 6)
                            .background(Capsule().fill(tone.foreground.opacity(0.12)))
                    }
                    .buttonStyle(DSPressableStyle(scale: 0.96))
                    .padding(.top, DSSpace.s1)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(DSSpace.s4)
        .background(
            RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous)
                .fill(tone.background)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous)
                .strokeBorder(tone.foreground.opacity(0.15), lineWidth: 0.5)
        )
        .accessibilityElement(children: .contain)
    }
}

#Preview("Settings rows — light") {
    SettingsComponentsPreview()
}

#Preview("Settings rows — dark") {
    SettingsComponentsPreview()
        .preferredColorScheme(.dark)
}

private struct SettingsComponentsPreview: View {
    @State private var finger = false

    var body: some View {
        ScrollView {
            VStack(spacing: DSSpace.s6) {
                DSCallout(
                    tone: .warning,
                    title: "Проверьте ключ восстановления",
                    message: "Это единственный способ вернуться к заметкам, если забудете пароль.",
                    actionTitle: "Проверить"
                ) {}
                DSSettingsSection("Перо", footer: "Без пальца рисует только Apple Pencil.") {
                    DSSettingsRow("Рисовать пальцем", systemImage: "hand.point.up.left", accessory: .toggle($finger))
                    DSSettingsRow("Ключ восстановления", systemImage: "key", accessory: .badge("Не проверен", .warning))
                    DSSettingsRow("Устройства", systemImage: "ipad.and.iphone", value: "3", accessory: .chevron)
                }
                DSSettingsSection {
                    DSSettingsRow("Выйти", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive)
                }
            }
            .padding(DSSpace.s5)
        }
        .background(Color.dsCanvas)
    }
}
