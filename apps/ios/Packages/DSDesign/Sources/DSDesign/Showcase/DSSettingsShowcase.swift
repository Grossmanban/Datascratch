import SwiftUI

/// Reference "Quiet Paper" Settings and Account screens built from DSDesign
/// components (for ios-app and for CI snapshots). Static sample data.
public struct DSSettingsSampleScreen: View {
    public enum Kind: Sendable, Hashable {
        case settings
        case account
    }

    private let kind: Kind
    private let now: Date

    public init(kind: Kind, now: Date = .now) {
        self.kind = kind
        self.now = now
    }

    public var body: some View {
        ScrollView {
            DSSettingsSampleContent(kind: kind, now: now)
        }
        .background(Color.dsCanvas)
    }
}

/// Scroll-free content of `DSSettingsSampleScreen` (ImageRenderer cannot draw ScrollView).
public struct DSSettingsSampleContent: View {
    private let kind: DSSettingsSampleScreen.Kind
    private let now: Date

    public init(kind: DSSettingsSampleScreen.Kind, now: Date = .now) {
        self.kind = kind
        self.now = now
    }

    private var syncedAt: Date { now.addingTimeInterval(-120) }

    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s6) {
            Text(kind == .settings ? "Настройки" : "Аккаунт")
                .dsFont(.title)
                .foregroundStyle(Color.dsPrimary)
                .padding(.leading, DSSpace.s1)
            switch kind {
            case .settings: settings
            case .account: account
            }
        }
        .padding(.horizontal, DSSpace.s5)
        .padding(.top, DSSpace.s6)
        .padding(.bottom, DSSpace.s10)
        .frame(maxWidth: 640)
        .frame(maxWidth: .infinity)
        .background(Color.dsCanvas)
    }

    @ViewBuilder
    private var settings: some View {
        Button {} label: {
            DSProfileHeader(name: "Анна Петрова", email: "anna@example.com", sync: .synced(syncedAt), now: now,
                            linkTitle: "Аккаунт и безопасность")
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.vertical, -DSSpace.s4)
        DSCallout(
            tone: .warning,
            title: "Проверьте ключ восстановления",
            message: "Это единственный способ вернуться к заметкам, если забудете пароль.",
            systemImage: "key",
            actionTitle: "Проверить"
        ) {}
        DSSettingsSection("Доступ") {
            Button {} label: { DSSettingsRow("Устройства", systemImage: "ipad.and.iphone", value: "3", accessory: .chevron) }
            Button {} label: { DSSettingsRow("Доступ для агентов", systemImage: "sparkles", accessory: .chevron) }
        }
        .buttonStyle(.dsSettingsRow)
        DSSettingsSection("Приложение") {
            Button {} label: { DSSettingsRow("Перо и рисование", systemImage: "pencil.tip", accessory: .chevron) }
            Button {} label: { DSSettingsRow("Внешний вид", systemImage: "circle.lefthalf.filled", value: "Системный", accessory: .chevron) }
        }
        .buttonStyle(.dsSettingsRow)
        DSSettingsSection {
            Button {} label: { DSSettingsRow("О Datascratch", systemImage: "info.circle", accessory: .chevron) }
        }
        .buttonStyle(.dsSettingsRow)
    }

    @ViewBuilder
    private var account: some View {
        DSSettingsSection("Синхронизация") {
            DSSettingsRow("Состояние", systemImage: "arrow.triangle.2.circlepath", accessory: .custom(AnyView(DSSyncChip(.synced(syncedAt), now: now))))
            DSSettingsRow("Сервер", systemImage: "server.rack", value: "datascratch.example.com")
        }
        DSSettingsSection(
            "Безопасность",
            footer: "Пароль защищает и ключ шифрования. Ключ восстановления продолжит работать после смены пароля."
        ) {
            Button {} label: { DSSettingsRow("Ключ восстановления", systemImage: "key", accessory: .badgeLink("Не проверен", .warning)) }
            Button {} label: { DSSettingsRow("Сменить пароль", systemImage: "lock", accessory: .chevron) }
            Button {} label: { DSSettingsRow("Журнал безопасности", systemImage: "list.bullet.rectangle", accessory: .chevron) }
        }
        .buttonStyle(.dsSettingsRow)
        DSSettingsSection(footer: "Чтобы войти снова, понадобится пароль.") {
            Button {} label: { DSSettingsRow("Выйти", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) }
        }
        .buttonStyle(.dsSettingsRow)
    }
}

#Preview("Settings — light") {
    DSSettingsSampleScreen(kind: .settings)
}

#Preview("Settings — dark") {
    DSSettingsSampleScreen(kind: .settings)
        .preferredColorScheme(.dark)
}

#Preview("Account — light") {
    DSSettingsSampleScreen(kind: .account)
}

#Preview("Account — dark") {
    DSSettingsSampleScreen(kind: .account)
        .preferredColorScheme(.dark)
}
