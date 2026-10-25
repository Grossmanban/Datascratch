import Foundation

/// Interface language of design-system strings (D-17: Russian and English).
public enum DSLanguage: String, Sendable, CaseIterable {
    case ru
    case en

    /// Russian when the preferred language is Russian, otherwise English.
    public static var current: DSLanguage {
        Locale.preferredLanguages.first?.hasPrefix("ru") == true ? .ru : .en
    }

    /// Russian for a Russian locale, otherwise English.
    public init(locale: Locale) {
        self = locale.language.languageCode?.identifier == "ru" ? .ru : .en
    }
}

/// Built-in strings of the design-system components.
enum DSStrings {
    static var expanded: String { tr("развёрнуто", "expanded") }
    static var collapsed: String { tr("свёрнуто", "collapsed") }
    static var expand: String { tr("Развернуть", "Expand") }
    static var collapse: String { tr("Свернуть", "Collapse") }
    static var done: String { tr("выполнено", "done") }
    static var notDone: String { tr("не выполнено", "not done") }
    static var cancelled: String { tr("отменено", "cancelled") }
    static var loading: String { tr("Загрузка", "Loading") }
    static var online: String { tr("в сети", "online") }
    static var away: String { tr("отошёл", "away") }

    static func width(_ width: DSPenWidth, _ language: DSLanguage = .current) -> String {
        switch width {
        case .fine: tr("Толщина: тонкая", "Width: fine", language)
        case .medium: tr("Толщина: средняя", "Width: medium", language)
        case .bold: tr("Толщина: толстая", "Width: bold", language)
        }
    }

    /// Spoken name of an ink / highlight token.
    static func colorName(_ token: String, _ language: DSLanguage = .current) -> String {
        let ru: [String: String] = [
            "black": "Чёрный", "blue": "Синий", "red": "Красный", "green": "Зелёный",
            "purple": "Фиолетовый", "brown": "Коричневый", "yellow": "Жёлтый", "pink": "Розовый",
        ]
        return language == .ru ? (ru[token] ?? token) : token.capitalized
    }

    static func tr(_ ru: String, _ en: String, _ language: DSLanguage = .current) -> String {
        language == .ru ? ru : en
    }
}
