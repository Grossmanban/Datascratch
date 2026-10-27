import Foundation

/// Who changed a note since the version before (D-54: the history shows who and when).
nonisolated enum HistoryAuthor: Hashable, Sendable {
    case me
    case user(id: String)
    case guest
    case agent
}

/// One saved version of a note.
nonisolated struct HistoryVersion: Identifiable, Hashable, Sendable {
    var id: Int64
    var createdAt: Date
    var authors: [HistoryAuthor]
}

/// The versions of a note: snapshots on the server (with their authors), or kept on this device
/// without one.
protocol NoteHistorySource: AnyObject {
    func versions(of noteId: String, notebookId: String) async throws -> [HistoryVersion]
    func body(of noteId: String, notebookId: String, at version: HistoryVersion) async throws -> NoteBody
    /// The version's text and drawings become the note again, as a new edit (the history keeps
    /// what was there).
    func restore(_ version: HistoryVersion, of noteId: String, notebookId: String) async throws
}

/// Versions kept on this device (`LibraryStore.recordVersion`): no authors, all this account's.
final class LocalNoteHistory: NoteHistorySource {
    private let library: LibraryStore

    init(library: LibraryStore) {
        self.library = library
    }

    func versions(of noteId: String, notebookId: String) async throws -> [HistoryVersion] {
        library.versions(of: noteId).map { HistoryVersion(id: Int64($0.id), createdAt: $0.createdAt, authors: [.me]) }
    }

    func body(of noteId: String, notebookId: String, at version: HistoryVersion) async throws -> NoteBody {
        library.versions(of: noteId).first { Int64($0.id) == version.id }?.body ?? NoteBody(blocks: [])
    }

    func restore(_ version: HistoryVersion, of noteId: String, notebookId: String) async throws {
        guard let saved = library.versions(of: noteId).first(where: { Int64($0.id) == version.id }) else { return }
        library.restore(version: saved, ofNote: noteId)
    }
}

/// What changed between two versions, line by line and, inside a changed line, word by word
/// (D-54: added is highlighted, removed is struck through).
nonisolated enum TextDiff {
    nonisolated enum Change: Hashable, Sendable {
        case same, added, removed
    }

    nonisolated struct Segment: Hashable, Sendable {
        var text: String
        var change: Change
    }

    /// One line of the comparison.
    nonisolated struct Line: Hashable, Sendable {
        var segments: [Segment]

        var change: Change {
            let kinds = Set(segments.map(\.change))
            return kinds == [.added] ? .added : kinds == [.removed] ? .removed : kinds.isSubset(of: [.same]) ? .same : .added
        }
    }

    /// The lines of a body as the comparison shows them (task boxes and list marks included).
    static func lines(of body: NoteBody) -> [String] {
        body.blocks.compactMap { block in
            switch block.kind {
            case .divider: return "———"
            case .task: return (block.task?.state == .done ? "☑ " : "☐ ") + block.text
            case .bullet: return "• " + block.text
            case .quote: return "“" + block.text + "”"
            default: return block.text.isEmpty ? nil : block.text
            }
        }
    }

    /// `old` → `new`. Lines replaced one for one are compared word by word.
    static func compare(_ old: [String], _ new: [String]) -> [Line] {
        var result: [Line] = []
        var pendingRemoved: [String] = []
        var pendingAdded: [String] = []

        func flush() {
            let pairs = min(pendingRemoved.count, pendingAdded.count)
            for index in 0..<pairs {
                result.append(Line(segments: words(pendingRemoved[index], pendingAdded[index])))
            }
            for line in pendingRemoved.dropFirst(pairs) { result.append(Line(segments: [Segment(text: line, change: .removed)])) }
            for line in pendingAdded.dropFirst(pairs) { result.append(Line(segments: [Segment(text: line, change: .added)])) }
            pendingRemoved.removeAll()
            pendingAdded.removeAll()
        }

        for step in script(old, new) {
            switch step {
            case .same(let line):
                flush()
                result.append(Line(segments: [Segment(text: line, change: .same)]))
            case .removed(let line): pendingRemoved.append(line)
            case .added(let line): pendingAdded.append(line)
            }
        }
        flush()
        return result
    }

    /// Word by word inside one changed line; neighbouring pieces of one kind are joined.
    static func words(_ old: String, _ new: String) -> [Segment] {
        let a = tokens(old), b = tokens(new)
        var segments: [Segment] = []
        for step in script(a, b) {
            let (text, change): (String, Change) = switch step {
            case .same(let t): (t, .same)
            case .removed(let t): (t, .removed)
            case .added(let t): (t, .added)
            }
            if let last = segments.last, last.change == change {
                segments[segments.count - 1].text += text
            } else {
                segments.append(Segment(text: text, change: change))
            }
        }
        return segments
    }

    private enum Step<T> {
        case same(T), removed(T), added(T)
    }

    /// Longest common subsequence; removals come before additions at each change.
    private static func script<T: Equatable>(_ a: [T], _ b: [T]) -> [Step<T>] {
        let n = a.count, m = b.count
        guard n > 0 || m > 0 else { return [] }
        // Lengths of the common subsequence of a[i...] and b[j...].
        var table = Array(repeating: Array(repeating: 0, count: m + 1), count: n + 1)
        if n > 0, m > 0 {
            for i in stride(from: n - 1, through: 0, by: -1) {
                for j in stride(from: m - 1, through: 0, by: -1) {
                    table[i][j] = a[i] == b[j] ? table[i + 1][j + 1] + 1 : max(table[i + 1][j], table[i][j + 1])
                }
            }
        }
        var steps: [Step<T>] = []
        var i = 0, j = 0
        while i < n, j < m {
            if a[i] == b[j] {
                steps.append(.same(a[i])); i += 1; j += 1
            } else if table[i + 1][j] >= table[i][j + 1] {
                steps.append(.removed(a[i])); i += 1
            } else {
                steps.append(.added(b[j])); j += 1
            }
        }
        while i < n { steps.append(.removed(a[i])); i += 1 }
        while j < m { steps.append(.added(b[j])); j += 1 }
        return steps
    }

    /// Words with the spaces after them, so joined pieces read as the text did.
    private static func tokens(_ text: String) -> [String] {
        var tokens: [String] = []
        var current = ""
        for character in text {
            current.append(character)
            if character.isWhitespace {
                tokens.append(current)
                current = ""
            }
        }
        if !current.isEmpty { tokens.append(current) }
        return tokens
    }
}
