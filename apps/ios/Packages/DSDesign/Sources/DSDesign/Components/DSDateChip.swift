import SwiftUI

/// Label and tone of a task date: "Сегодня" / "Завтра" / weekday / "12 ноя", red when overdue.
/// Pure value logic so it is testable and identical to the web `DateChip`.
public struct DSDateChipModel: Sendable, Equatable {
    public enum Tone: Sendable, Equatable {
        /// Any other date.
        case normal
        /// Scheduled for today.
        case today
        /// Deadline today or tomorrow.
        case soon
        /// In the past and not completed.
        case overdue
        /// Task already completed or cancelled.
        case done
    }

    public let label: String
    public let tone: Tone
    /// Whole calendar days from `now` to the date (negative = past).
    public let dayOffset: Int

    public init(
        date: Date,
        now: Date = .now,
        calendar: Calendar = .current,
        language: DSLanguage = .current,
        isDeadline: Bool = false,
        isCompleted: Bool = false
    ) {
        let offset = calendar.dateComponents(
            [.day],
            from: calendar.startOfDay(for: now),
            to: calendar.startOfDay(for: date)
        ).day ?? 0
        dayOffset = offset
        label = Self.label(date: date, now: now, offset: offset, calendar: calendar, language: language)
        if isCompleted {
            tone = .done
        } else if offset < 0 {
            tone = .overdue
        } else if isDeadline && offset <= 1 {
            tone = .soon
        } else if offset == 0 {
            tone = .today
        } else {
            tone = .normal
        }
    }

    static let monthsRu = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
    static let monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    // Calendar weekday numbering: 1 = Sunday.
    static let weekdaysRu = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
    static let weekdaysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    static func label(date: Date, now: Date, offset: Int, calendar: Calendar, language: DSLanguage) -> String {
        let ru = language == .ru
        switch offset {
        case 0: return ru ? "Сегодня" : "Today"
        case 1: return ru ? "Завтра" : "Tomorrow"
        case -1: return ru ? "Вчера" : "Yesterday"
        case 2...6:
            let weekday = calendar.component(.weekday, from: date) - 1
            return (ru ? weekdaysRu : weekdaysEn)[weekday]
        default:
            let parts = calendar.dateComponents([.year, .month, .day], from: date)
            let day = parts.day ?? 1
            let month = (ru ? monthsRu : monthsEn)[(parts.month ?? 1) - 1]
            let sameYear = parts.year == calendar.component(.year, from: now)
            if ru {
                return sameYear ? "\(day) \(month)" : "\(day) \(month) \(parts.year ?? 0)"
            }
            return sameYear ? "\(month) \(day)" : "\(month) \(day), \(parts.year ?? 0)"
        }
    }
}

/// Compact date chip for tasks (scheduled date or deadline).
public struct DSDateChip: View {
    private let date: Date
    private let now: Date
    private let calendar: Calendar
    private let language: DSLanguage?
    private let isDeadline: Bool
    private let isCompleted: Bool
    @Environment(\.locale) private var locale

    /// - Parameter language: `nil` follows the environment locale.
    public init(
        date: Date,
        now: Date = .now,
        calendar: Calendar = .current,
        language: DSLanguage? = nil,
        isDeadline: Bool = false,
        isCompleted: Bool = false
    ) {
        self.date = date
        self.now = now
        self.calendar = calendar
        self.language = language
        self.isDeadline = isDeadline
        self.isCompleted = isCompleted
    }

    private var model: DSDateChipModel {
        DSDateChipModel(
            date: date,
            now: now,
            calendar: calendar,
            language: language ?? DSLanguage(locale: locale),
            isDeadline: isDeadline,
            isCompleted: isCompleted
        )
    }

    private var color: Color {
        switch model.tone {
        case .normal: Color.dsSecondary
        case .today: Color.dsAccent
        case .soon: Color.dsWarning
        case .overdue: Color.dsDanger
        case .done: Color.dsTertiary
        }
    }

    public var body: some View {
        HStack(spacing: 4) {
            Image(systemName: isDeadline ? "flag.fill" : "calendar")
                .font(.system(size: 10, weight: .semibold))
            Text(model.label)
                .dsFont(.caption)
                .lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, DSSpace.s2)
        .padding(.vertical, 3)
        .background(Capsule().fill(color.opacity(0.12)))
        .accessibilityElement(children: .combine)
    }
}

#Preview("Date chips — light") {
    DateChipPreview()
}

#Preview("Date chips — dark") {
    DateChipPreview()
        .preferredColorScheme(.dark)
}

private struct DateChipPreview: View {
    var body: some View {
        let day: TimeInterval = 86_400
        VStack(alignment: .leading, spacing: DSSpace.s3) {
            HStack {
                DSDateChip(date: .now, language: .ru)
                DSDateChip(date: .now + day, language: .ru)
                DSDateChip(date: .now - day, language: .ru)
            }
            HStack {
                DSDateChip(date: .now + day * 3, language: .en)
                DSDateChip(date: .now + day * 40, language: .en, isDeadline: true)
                DSDateChip(date: .now + day, language: .en, isDeadline: true)
                DSDateChip(date: .now - day * 2, language: .en, isCompleted: true)
            }
        }
        .padding(DSSpace.s6)
        .background(.ds(.bgCanvas))
    }
}
