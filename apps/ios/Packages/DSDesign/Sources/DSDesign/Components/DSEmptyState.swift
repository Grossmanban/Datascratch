import SwiftUI

/// Calm empty state: tinted symbol, serif title, short message, optional action.
public struct DSEmptyState: View {
    private let systemImage: String
    private let title: String
    private let message: String?
    private let tint: DSTintToken
    private let actionTitle: String?
    private let action: (() -> Void)?

    public init(
        systemImage: String,
        title: String,
        message: String? = nil,
        tint: DSTintToken = .gray,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.systemImage = systemImage
        self.title = title
        self.message = message
        self.tint = tint
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        VStack(spacing: DSSpace.s3) {
            Image(systemName: systemImage)
                .font(.system(size: 28, weight: .regular))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(tint.foreground)
                .frame(width: 64, height: 64)
                .background(Circle().fill(tint.background))
                .padding(.bottom, DSSpace.s1)
                .accessibilityHidden(true)
            Text(title)
                .dsFont(.h2)
                .foregroundStyle(.ds(.textPrimary))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            if let message {
                Text(message)
                    .dsFont(.callout)
                    .foregroundStyle(.ds(.textSecondary))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: 360)
            }
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(.ds(.secondary))
                    .padding(.top, DSSpace.s2)
            }
        }
        .padding(.vertical, DSSpace.s8)
        .padding(.horizontal, DSSpace.s4)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
    }
}

#Preview("Empty state — light") {
    DSEmptyState(
        systemImage: "checkmark.circle",
        title: "Всё сделано",
        message: "Задач на сегодня нет. Отдохните или запланируйте что-нибудь на завтра.",
        tint: .green,
        actionTitle: "Новая задача"
    ) {}
    .background(.ds(.bgCanvas))
}

#Preview("Empty state — dark") {
    DSEmptyState(systemImage: "doc.text", title: "Пока пусто", message: "Создайте первый документ.", tint: .blue)
        .background(.ds(.bgCanvas))
        .preferredColorScheme(.dark)
}
