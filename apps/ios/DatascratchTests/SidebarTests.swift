import Foundation
import Testing
@testable import Datascratch

/// §12.6: the sidebar of a space with many notebooks and tags.
@MainActor
struct SidebarTests {
    @Test func tagsFormATreeByTheirSlashes() {
        let old = Date(timeIntervalSince1970: 1_000)
        let new = Date(timeIntervalSince1970: 2_000)
        let tree = TagNode.tree(of: [
            (["работа/клиенты", "дом"], old),
            (["работа/клиенты/акме"], new),
            (["работа"], old),
        ])
        // Top level by recent use: «работа» was used last (through its grandchild).
        #expect(tree.map(\.path) == ["работа", "дом"])
        let work = tree[0]
        #expect(work.count == 3)
        #expect(work.children.map(\.name) == ["клиенты"])
        #expect(work.children[0].path == "работа/клиенты")
        #expect(work.children[0].count == 2)
        #expect(work.children[0].children.map(\.path) == ["работа/клиенты/акме"])
        #expect(TagNode.flattened(tree).map(\.path) == ["работа", "работа/клиенты", "работа/клиенты/акме", "дом"])
    }

    @Test func longSectionsShowSevenRowsAndKeepTheOpenOne() {
        let items = Array(1...12)
        let first = SidebarLimit.visible(items, showAll: false)
        #expect(first.rows == [1, 2, 3, 4, 5, 6, 7])
        #expect(first.hidden == 5)
        let keeping = SidebarLimit.visible(items, showAll: false) { $0 == 11 }
        #expect(keeping.rows == [1, 2, 3, 4, 5, 6, 7, 11])
        #expect(keeping.hidden == 4)
        #expect(SidebarLimit.visible(items, showAll: true).hidden == 0)
        #expect(SidebarLimit.visible(Array(1...7), showAll: false).hidden == 0)
    }

    @Test func notebooksKeepTheirManualOrder() {
        let store = LibraryStore(persistence: .inMemory)
        let space = store.createSpace(name: "S")
        let a = store.createNotebook(in: space.id, name: "A", mode: .private)
        let b = store.createNotebook(in: space.id, name: "B", mode: .private)
        let c = store.createNotebook(in: space.id, name: "C", mode: .private)
        store.moveNotebooks(inSpace: space.id, from: IndexSet(integer: 2), to: 0)
        #expect(store.notebooks(in: space.id).map(\.id) == [c.id, a.id, b.id])
        store.moveNotebooks(inSpace: space.id, from: IndexSet(integer: 0), to: 3)
        #expect(store.notebooks(in: space.id).map(\.id) == [a.id, b.id, c.id])
    }
}
