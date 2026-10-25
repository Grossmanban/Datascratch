import Foundation

// App-side mirror of contracts/document-model.md (account + notebook index).
// These are plain values; until the DSCore package (Yrs documents, GRDB,
// encryption) lands, `LibraryStore` keeps them in a local JSON file.

nonisolated enum Tint: String, Codable, CaseIterable, Sendable {
    case red, orange, yellow, green, teal, blue, indigo, purple, pink, gray
}

nonisolated enum NotebookMode: String, Codable, CaseIterable, Sendable {
    case `private`
    case agent
}

nonisolated enum Backdrop: String, Codable, CaseIterable, Sendable {
    case none, sand, dusk, mist, meadow, ember
}

nonisolated struct Space: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var icon: String
    var color: Tint
    var order: Double
    var createdAt: Date
}

nonisolated struct Notebook: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var spaceId: String
    var name: String
    var icon: String
    var color: Tint
    var order: Double
    var mode: NotebookMode
    var createdAt: Date
}

nonisolated struct Folder: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var notebookId: String
    var parentId: String?
    var name: String
    var icon: String
    var color: Tint
    var order: Double
    var createdAt: Date
}

nonisolated enum NoteKind: String, Codable, Sendable {
    case note, daily, inbox
}

nonisolated struct NoteStyle: Codable, Hashable, Sendable {
    nonisolated enum Font: String, Codable, CaseIterable, Sendable { case serif, sans, mono }
    nonisolated enum Width: String, Codable, CaseIterable, Sendable { case normal, wide, full }
    nonisolated enum Paper: String, Codable, CaseIterable, Sendable { case plain, dots, grid, lines }

    var font: Font = .serif
    var width: Width = .normal
    var paper: Paper = .plain
}

nonisolated struct NoteMeta: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var notebookId: String
    var folderId: String?
    var parentNoteId: String?
    var title: String
    var kind: NoteKind
    /// `YYYY-MM-DD` for daily notes.
    var dailyDate: String?
    var tags: [String]
    var icon: String?
    /// Stand-in for `coverThumb` (an attachment) until attachments sync: a gradient cover.
    var cover: Backdrop?
    var backdrop: Backdrop
    var style: NoteStyle
    var snippet: String
    var createdAt: Date
    var updatedAt: Date
    var trashedAt: Date?
    var order: Double

    var isTrashed: Bool { trashedAt != nil }
}

nonisolated enum TaskState: String, Codable, CaseIterable, Sendable {
    case open, done, cancelled
}

/// Attributes of a `taskItem` block (contracts/document-model.md §4.2).
nonisolated struct TaskAttributes: Codable, Hashable, Sendable {
    var taskId: String
    var state: TaskState = .open
    /// `YYYY-MM-DD`
    var scheduled: String?
    /// `YYYY-MM-DD`
    var deadline: String?
    var completedAt: Date?
}

/// Simplified block used by the stand-in editor. The real document is a
/// Yjs XmlFragment owned by DSCore/DSEditor.
nonisolated struct NoteBlock: Codable, Identifiable, Hashable, Sendable {
    nonisolated enum Kind: String, Codable, CaseIterable, Sendable {
        case paragraph, heading1, heading2, heading3, bullet, task, quote, divider
    }

    var id: String
    var kind: Kind
    var text: String
    var task: TaskAttributes?

    static func paragraph(_ text: String = "") -> NoteBlock {
        NoteBlock(id: ID.make(), kind: .paragraph, text: text, task: nil)
    }

    static func task(_ text: String, scheduled: String? = nil) -> NoteBlock {
        NoteBlock(id: ID.make(), kind: .task, text: text,
                  task: TaskAttributes(taskId: ID.make(), scheduled: scheduled))
    }
}

nonisolated struct NoteBody: Codable, Hashable, Sendable {
    var blocks: [NoteBlock]

    static let empty = NoteBody(blocks: [.paragraph()])

    /// Plain text of the first non-empty blocks, for cards and search.
    var plainText: String {
        blocks.map(\.text).filter { !$0.isEmpty }.joined(separator: "\n")
    }

    /// `#tag` names (without `#`, nesting with `/`).
    var tags: [String] {
        var seen = Set<String>()
        var result: [String] = []
        for block in blocks {
            for tag in TextScanner.tags(in: block.text) where seen.insert(tag).inserted {
                result.append(tag)
            }
        }
        return result
    }

    /// Titles referenced as `[[Title]]`.
    var linkedTitles: [String] {
        blocks.flatMap { TextScanner.wikiLinks(in: $0.text) }
    }
}

nonisolated struct NoteVersion: Codable, Identifiable, Hashable, Sendable {
    var id: Int
    var createdAt: Date
    var title: String
    var body: NoteBody
}

nonisolated struct StarRef: Codable, Hashable, Sendable {
    nonisolated enum Kind: String, Codable, Sendable { case note, folder, notebook }
    var kind: Kind
    var id: String
}

nonisolated enum TextScanner {
    static func tags(in text: String) -> [String] {
        var result: [String] = []
        var current: String?
        var previous: Character = " "
        for ch in text {
            if var tag = current {
                if ch.isLetter || ch.isNumber || ch == "/" || ch == "-" || ch == "_" {
                    tag.append(ch)
                    current = tag
                } else {
                    if !tag.isEmpty { result.append(tag.lowercased()) }
                    current = nil
                }
            }
            if current == nil, ch == "#", previous.isWhitespace || previous == "(" {
                current = ""
            }
            previous = ch
        }
        if let tag = current, !tag.isEmpty { result.append(tag.lowercased()) }
        return result.map { $0.trimmingCharacters(in: CharacterSet(charactersIn: "/")) }
            .filter { !$0.isEmpty }
    }

    static func wikiLinks(in text: String) -> [String] {
        var result: [String] = []
        var rest = Substring(text)
        while let open = rest.range(of: "[[") {
            let after = rest[open.upperBound...]
            guard let close = after.range(of: "]]") else { break }
            let title = after[..<close.lowerBound].trimmingCharacters(in: .whitespaces)
            if !title.isEmpty { result.append(title) }
            rest = after[close.upperBound...]
        }
        return result
    }
}

/// Local-calendar `YYYY-MM-DD` keys (contracts/document-model.md §1).
nonisolated enum DayKey {
    static func from(_ date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func date(_ key: String, calendar: Calendar = .current) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func adding(days: Int, to key: String, calendar: Calendar = .current) -> String {
        guard let date = date(key, calendar: calendar),
              let shifted = calendar.date(byAdding: .day, value: days, to: date) else { return key }
        return from(shifted, calendar: calendar)
    }

    /// Monday of the week after `key` ("next week" in the task menu).
    static func nextWeek(from key: String, calendar: Calendar = .current) -> String {
        guard let date = date(key, calendar: calendar) else { return key }
        let weekday = calendar.component(.weekday, from: date) // 1 = Sunday
        let daysToMonday = (9 - weekday) % 7
        return adding(days: daysToMonday == 0 ? 7 : daysToMonday, to: key, calendar: calendar)
    }
}

nonisolated enum ID {
    /// UUIDv7 in lowercase with dashes (contracts/document-model.md §1).
    static func make(date: Date = Date()) -> String {
        uuidV7(date).uuidString.lowercased()
    }

    static func uuidV7(_ date: Date) -> UUID {
        var b = [UInt8](repeating: 0, count: 16)
        let ms = UInt64(max(0, date.timeIntervalSince1970 * 1000))
        for i in 0..<6 {
            b[i] = UInt8(truncatingIfNeeded: ms >> UInt64(8 * (5 - i)))
        }
        for i in 6..<16 { b[i] = UInt8.random(in: 0...255) }
        b[6] = (b[6] & 0x0F) | 0x70
        b[8] = (b[8] & 0x3F) | 0x80
        return UUID(uuid: (b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
                           b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15]))
    }
}
