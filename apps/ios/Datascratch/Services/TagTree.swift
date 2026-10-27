import Foundation

/// A tag of the sidebar's tree (§12.6): `работа/клиенты` is the child `клиенты` of `работа`.
/// `path` is the full tag (what the tag list filters by: the tag and its children), `count` the
/// documents carrying it or a child of it, `lastUsed` the latest of their edits.
nonisolated struct TagNode: Identifiable, Hashable, Sendable {
    var path: String
    var name: String
    var count: Int
    var lastUsed: Date
    var children: [TagNode]

    var id: String { path }

    /// The tree of the documents' tags: top level by recent use, children by name.
    static func tree(of documents: [(tags: [String], updatedAt: Date)]) -> [TagNode] {
        var notes: [String: Int] = [:]
        var latest: [String: Date] = [:]
        for document in documents {
            var paths = Set<String>()
            for tag in document.tags {
                let parts = tag.split(separator: "/", omittingEmptySubsequences: true)
                for end in parts.indices { paths.insert(parts[...end].joined(separator: "/")) }
            }
            for path in paths {
                notes[path, default: 0] += 1
                latest[path] = max(latest[path] ?? .distantPast, document.updatedAt)
            }
        }
        func children(of parent: String?) -> [TagNode] {
            notes.keys
                .filter { path in
                    guard let parent else { return !path.contains("/") }
                    return path.hasPrefix(parent + "/") && !path.dropFirst(parent.count + 1).contains("/")
                }
                .map { path in
                    TagNode(path: path, name: String(path.split(separator: "/").last ?? Substring(path)),
                            count: notes[path] ?? 0, lastUsed: latest[path] ?? .distantPast, children: children(of: path))
                }
                .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
        }
        return children(of: nil).sorted { ($0.lastUsed, $1.name) > ($1.lastUsed, $0.name) }
    }

    /// Every tag of the tree, parents before their children (the «All Tags» sheet).
    static func flattened(_ nodes: [TagNode]) -> [TagNode] {
        nodes.flatMap { [$0] + flattened($0.children) }
    }
}

/// The first rows of a long sidebar section (§12.6): up to `limit`, plus the rows that must stay
/// visible (the open notebook) even when they come later; the rest is counted for «N more».
nonisolated enum SidebarLimit {
    static let rows = 7

    static func visible<T>(_ items: [T], limit: Int = rows, showAll: Bool, keep: (T) -> Bool = { _ in false }) -> (rows: [T], hidden: Int) {
        guard !showAll, items.count > limit else { return (items, 0) }
        let shown = items.enumerated().filter { $0.offset < limit || keep($0.element) }.map(\.element)
        return (shown, items.count - shown.count)
    }
}
