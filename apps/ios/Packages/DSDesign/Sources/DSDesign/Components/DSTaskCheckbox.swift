import SwiftUI

/// State of a task (`taskItem` in the document model).
public enum DSTaskState: String, Sendable, CaseIterable {
    case open
    case done
    case cancelled
}

/// Round task checkbox (Things-style): the circle fills with a spring and the
/// check draws itself; success haptic on completion. Toggles open ↔ done.
public struct DSTaskCheckbox: View {
    @Binding private var state: DSTaskState
    private let label: String
    private let size: CGFloat
    private let tint: Color
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(state: Binding<DSTaskState>, label: String, size: CGFloat = 22, tint: Color = .dsAccent) {
        _state = state
        self.label = label
        self.size = size
        self.tint = tint
    }

    private var isDone: Bool { state == .done }

    public var body: some View {
        Button {
            withAnimation(DSMotionToken.snappy.animation(reduceMotion: reduceMotion)) {
                state = state == .open ? .done : .open
            }
        } label: {
            ZStack {
                Circle()
                    .strokeBorder(isDone ? tint : Color.dsTertiary, lineWidth: 1.5)
                Circle()
                    .fill(tint)
                    .scaleEffect(isDone ? 1 : 0.2)
                    .opacity(isDone ? 1 : 0)
                DSCheckmark()
                    .trim(from: 0, to: isDone ? 1 : 0)
                    .stroke(Color.white, style: StrokeStyle(lineWidth: max(1.5, size / 11), lineCap: .round, lineJoin: .round))
                    .padding(size * 0.27)
                    .animation(isDone ? DSMotionToken.smooth.animation(reduceMotion: reduceMotion).delay(0.06) : nil, value: isDone)
                if state == .cancelled {
                    Image(systemName: "xmark")
                        .font(.system(size: size * 0.42, weight: .bold))
                        .foregroundStyle(.ds(.textTertiary))
                }
            }
            .frame(width: size, height: size)
            .contentShape(Circle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.86))
        .sensoryFeedback(.success, trigger: state) { _, new in new == .done }
        .accessibilityLabel(label)
        .accessibilityValue(state == .done ? DSStrings.done : (state == .cancelled ? DSStrings.cancelled : DSStrings.notDone))
        .accessibilityAddTraits(.isToggle)
    }
}

/// Check mark path in a unit rect.
public struct DSCheckmark: Shape {
    public init() {}

    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX + rect.width * 0.08, y: rect.minY + rect.height * 0.54))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.38, y: rect.minY + rect.height * 0.82))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.94, y: rect.minY + rect.height * 0.2))
        return path
    }
}

#Preview("Task checkbox — light") {
    TaskCheckboxPreview()
}

#Preview("Task checkbox — dark") {
    TaskCheckboxPreview()
        .preferredColorScheme(.dark)
}

private struct PreviewTask: Identifiable {
    let id: Int
    let title: String
    var state: DSTaskState
}

private struct TaskCheckboxPreview: View {
    @State private var tasks = [
        PreviewTask(id: 0, title: "Набросать обложку", state: .open),
        PreviewTask(id: 1, title: "Проверить перо на iPad", state: .done),
        PreviewTask(id: 2, title: "Старый план", state: .cancelled),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s3) {
            ForEach($tasks) { $task in
                HStack(spacing: DSSpace.s3) {
                    DSTaskCheckbox(state: $task.state, label: task.title)
                    Text(task.title)
                        .dsFont(.body)
                        .strikethrough(task.state == .cancelled)
                        .foregroundStyle(task.state == .open ? Color.dsPrimary : Color.dsTertiary)
                    Spacer()
                    DSDateChip(date: .now, language: .ru, isCompleted: task.state != .open)
                }
            }
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
