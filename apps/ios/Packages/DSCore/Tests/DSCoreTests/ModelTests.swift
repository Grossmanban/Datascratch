import Foundation
import Testing
@testable import DSCore

@Suite struct NoteDocumentTests {
    func makeNote() throws -> NoteDocument {
        let note = NoteDocument(noteId: EntityID.make())
        try note.initialize(title: "Plan")
        return note
    }

    @Test func initializesTitleAndParagraph() throws {
        let note = try makeNote()
        let blocks = try note.blocks()
        #expect(blocks.map(\.type) == ["title", "paragraph"])
        #expect(try note.title() == "Plan")
        #expect(blocks.allSatisfy { $0.blockId.map(EntityID.isValid) == true })
        #expect(note.formatVersion == 1)
        #expect(!note.isReadOnly)
    }

    @Test func editsInlineTextAcrossRunsAndNodes() throws {
        let note = try makeNote()
        let p: [UInt32] = [1]
        try note.insertText("Hello world", at: 0, inBlock: p)
        try note.format(range: 6..<11, set: [.bold], inBlock: p)
        try note.insertInlineNode(name: "noteLink", attrs: ["noteId": "n2", "label": "Other"], at: 5, inBlock: p)
        var block = try #require(try note.block(at: p))
        #expect(block.text == "HelloOther world")
        #expect(block.inline == [
            .text("Hello", marks: []),
            .noteLink(noteId: "n2", label: "Other"),
            .text(" ", marks: []),
            .text("world", marks: [.bold]),
        ])
        // Delete "lo" + link + " " (offsets 3..<7).
        try note.deleteText(range: 3..<7, inBlock: p)
        block = try #require(try note.block(at: p))
        #expect(block.text == "Helworld")
        try note.format(range: 0..<8, remove: ["bold"], inBlock: p)
        block = try #require(try note.block(at: p))
        #expect(block.inline.allSatisfy { if case .text(_, let m) = $0 { m.isEmpty } else { false } })
    }

    @Test func tasksAndDerivedData() throws {
        let note = try makeNote()
        let task = Block.taskItem("Buy milk", scheduled: "2026-10-26", taskId: "t1")
        try note.appendBlocks([
            .container(BlockType.taskList, [task]),
            .paragraph([.text("see ", marks: []), .noteLink(noteId: "n9", label: "Shop"), .tag("home"), .tag("home")]),
        ])
        try note.updateTask(taskId: "t1", state: .done, now: Date(timeIntervalSince1970: 0))
        let d = try note.derived()
        #expect(d.title == "Plan")
        #expect(d.tasks.count == 1)
        #expect(d.tasks[0].state == .done)
        #expect(d.tasks[0].scheduled == "2026-10-26")
        #expect(d.tasks[0].completedAt == "1970-01-01T00:00:00.000Z")
        #expect(d.tasks[0].text == "Buy milk")
        #expect(d.links.map(\.targetNoteId) == ["n9"])
        #expect(d.tags == ["home"])
        #expect(d.plainText.contains("Buy milk"))
        #expect(try note.path(ofBlock: task.blockId!) == [2, 0])
    }

    @Test func strokesRoundTripAndResolveAnchors() throws {
        let note = try makeNote()
        try note.insertText("Hello world", at: 0, inBlock: [1])
        let anchors = try (6..<11).map { try note.crdt.relativePosition(at: [1, 0], index: UInt32($0)) }
        let points = (0..<5).map { StrokePoint(anchor: $0, x: 0.1, y: 0.2, pressure: 0.5, t: Float($0) * 8) }
        let stroke = Stroke(tool: .pen, color: "ink.blue", width: 2, anchorKind: .text, anchors: anchors, points: points, hint: .underline,
                            author: Author(kind: .user, id: "u1"), createdAt: 1)
        try note.addStrokes([stroke])
        let read = try #require(note.stroke(id: stroke.id))
        #expect(read == stroke)

        // Delete "wo": points on deleted anchors disappear, the rest stays one segment.
        try note.deleteText(range: 6..<8, inBlock: [1])
        let resolved = try note.crdt.resolve(relativePositions: read.anchors)
        #expect(resolved.map { $0?.deleted } == [true, true, false, false, false])
        #expect(resolved[2]?.index == 6)
        let segments = read.segments(resolved: resolved, line: { _ in 0 })
        #expect(segments == [ResolvedStrokeSegment(pointIndices: [2, 3, 4])])
        // Line break between anchors 3 and 4 splits the stroke; a 1-point tail is dropped.
        #expect(read.segments(resolved: resolved, line: { $0 < 4 ? 0 : 1 }) == [ResolvedStrokeSegment(pointIndices: [2, 3])])

        try note.removeStrokes(ids: [stroke.id])
        #expect(note.strokes().isEmpty)
    }

    @Test func metaAndComments() throws {
        let note = try makeNote()
        try note.setStyle(.init(font: "serif", width: "wide", paper: "dots"))
        let coverId = EntityID.make()
        try note.setCover(.init(attachmentId: coverId, offsetY: 0.3))
        try note.setBackdrop(.init(kind: .gradient, value: "dawn"))
        let meta = note.meta()
        #expect(meta.style.font == "serif")
        #expect(meta.cover?.attachmentId == coverId)
        #expect(meta.backdrop?.value == "dawn")

        let comment = Comment(blockId: "b1", anchor: (Data([1]), Data([2])), author: Author(kind: .guest, id: "g", name: "Guest"), text: "?")
        try note.addComment(comment)
        try note.resolveComment(id: comment.id, at: Date(timeIntervalSince1970: 0))
        let c = try #require(note.comments().first)
        #expect(c.anchor?.start == Data([1]))
        #expect(c.resolvedAt == "1970-01-01T00:00:00.000Z")
    }

    @Test func undoRestoresTextAndStrokeAnchors() throws {
        let note = try makeNote()
        try note.crdt.enableUndo(captureTimeout: .zero)
        try note.insertText("abc", at: 0, inBlock: [1])
        let anchor = try note.crdt.relativePosition(at: [1, 0], index: 1)
        note.crdt.stopCapturing()
        try note.deleteText(range: 0..<3, inBlock: [1])
        #expect(try note.crdt.resolve(relativePositions: [anchor])[0]?.deleted == true)
        #expect(note.crdt.undo())
        #expect(try note.crdt.resolve(relativePositions: [anchor])[0] == ResolvedIndex(path: [1, 0], index: 1, deleted: false))
    }
}

@Suite struct StrokeCodecTests {
    @Test func packsLittleEndianFloat32() throws {
        let p = StrokePoint(anchor: -1, x: 1, y: 0.5, pressure: 1, altitude: 0, azimuth: 0, roll: 0, t: 2)
        let data = StrokeCodec.pack([p])
        #expect(data.count == 32)
        #expect(Array(data.prefix(8)) == [0x00, 0x00, 0x80, 0xBF, 0x00, 0x00, 0x80, 0x3F])
        #expect(try StrokeCodec.unpack(data) == [p])
        #expect(throws: StrokeCodecError.invalidLength(3)) { try StrokeCodec.unpack(Data([1, 2, 3])) }
    }

    @Test func widthCurve() {
        #expect(abs(StrokeMetrics.pressureFactor(1) - 1) < 1e-9)
        #expect(abs(StrokeMetrics.pressureFactor(0) - 0.35) < 1e-9)
        let w = StrokeMetrics.width(base: 2, tool: .pencil, anchorKind: .text, pressure: 1, altitude: 0, scaleBase: 34)
        #expect(abs(w - 2 * 2 * 2.5) < 1e-9)
    }
}

@Suite struct IndexDocumentTests {
    /// D-45: `createdByAgent` reads in both record paths, tolerates junk, and «Понятно» clears it.
    @Test func noteCreatedByAgent() throws {
        let nb = NotebookDocument(notebookId: EntityID.make())
        try nb.initialize()
        let author = AgentAuthor(agentId: EntityID.make(), agentName: "Claude", at: "2026-10-26T09:00:00.000Z")
        let byAgent = NoteMeta(title: "From Claude", wrappedKey: "AQ", createdByAgent: author)
        let mine = NoteMeta(title: "Mine", wrappedKey: "AQ")
        try nb.putNote(byAgent)
        try nb.putNote(mine)
        #expect(nb.note(id: byAgent.id)?.createdByAgent == author)
        #expect(nb.notes().first { $0.id == byAgent.id }?.createdByAgent == author)
        #expect(nb.note(id: mine.id)?.createdByAgent == nil)

        // Written by another client with extra keys, or malformed: tolerated.
        try nb.updateNote(id: mine.id, ["createdByAgent": .object(entries: [
            "agentId": .string(value: "g"), "agentName": .string(value: "Bot"), "at": .string(value: "2026-10-26T09:00:00.000Z"), "future": .bool(value: true),
        ])])
        #expect(nb.notes().first { $0.id == mine.id }?.createdByAgent?.agentName == "Bot")
        try nb.updateNote(id: mine.id, ["createdByAgent": .string(value: "garbage")])
        #expect(nb.note(id: mine.id)?.createdByAgent == nil)
        #expect(nb.notes().first { $0.id == mine.id }?.createdByAgent == nil)

        try nb.clearCreatedByAgent(noteId: byAgent.id)
        #expect(nb.note(id: byAgent.id)?.createdByAgent == nil)
        #expect(nb.crdt.mapValue("notes", [byAgent.id, "createdByAgent"])?.isNull == true)
    }

    /// `meta` copy of the notebook (name, icon, colour, space) for agents.
    @Test func notebookMetaCopy() throws {
        let nb = NotebookDocument(notebookId: EntityID.make())
        try nb.initialize()
        #expect(nb.metaCopy == nil)
        let space = Space(name: "Work", icon: "💼", order: 1)
        let ref = NotebookRef(id: nb.notebookId, spaceId: space.id, name: "Plans", icon: "📒", color: "blue", order: 1, mode: .agent)
        try nb.setMetaCopy(.init(ref, space: space))
        #expect(nb.metaCopy == .init(name: "Plans", icon: "📒", color: "blue", spaceId: space.id, spaceName: "Work", spaceIcon: "💼"))
        #expect(nb.crdt.mapValue("meta", ["color"])?.stringValue == "blue")
        let before = nb.crdt.stateVector()
        try nb.setMetaCopy(.init(ref, space: space))
        #expect(nb.crdt.stateVector() == before)
    }

    @Test func notebookFoldersAndNotes() throws {
        let nb = NotebookDocument(notebookId: EntityID.make())
        try nb.initialize()
        let f1 = Folder(parentId: nil, name: "Work", order: 1)
        let f2 = Folder(parentId: f1.id, name: "Q4", order: 1)
        try nb.putFolder(f1)
        try nb.putFolder(f2)
        let note = NoteMeta(folderId: f2.id, title: "Draft", wrappedKey: "AAAA")
        try nb.putNote(note)
        #expect(nb.children(ofFolder: f1.id).map(\.id) == [f2.id])
        #expect(nb.notes(inFolder: f2.id).map(\.title) == ["Draft"])

        let derived = NoteDerivedData(noteId: note.id, blocks: [.title("Final"), .paragraph([.tag("q4")])])
        try nb.syncDerived(derived)
        #expect(nb.note(id: note.id)?.title == "Final")
        #expect(nb.tagCounts() == ["q4": 1])

        try nb.deleteFolder(id: f2.id)
        #expect(nb.note(id: note.id)?.folderId == f1.id)
        try nb.trashNote(id: note.id, at: Date(timeIntervalSince1970: 0))
        #expect(nb.notes().isEmpty)
        #expect(nb.expiredTrash(now: Date(timeIntervalSince1970: 31 * 86_400)).map(\.id) == [note.id])
    }

    @Test func concurrentFieldEditsMerge() throws {
        let a = NotebookDocument(notebookId: "nb", clientId: 1)
        let b = NotebookDocument(notebookId: "nb", clientId: 2)
        let note = NoteMeta(id: "n1", title: "T", wrappedKey: "k")
        try a.putNote(note)
        try b.crdt.applyUpdate(a.crdt.encodeStateAsUpdate())
        try a.updateNote(id: "n1", ["title": "From A"])
        try b.updateNote(id: "n1", ["order": 5])
        try b.crdt.applyUpdate(a.crdt.encodeStateAsUpdate(since: b.crdt.stateVector()))
        try a.crdt.applyUpdate(b.crdt.encodeStateAsUpdate(since: a.crdt.stateVector()))
        for doc in [a, b] {
            #expect(doc.note(id: "n1")?.title == "From A")
            #expect(doc.note(id: "n1")?.order == 5)
        }
    }

    @Test func accountSpacesStarredTabs() throws {
        let acc = AccountDocument(accountDocId: EntityID.make())
        try acc.initialize()
        let space = Space(name: "Personal", icon: "🏠", order: 1)
        try acc.putSpace(space)
        try acc.putNotebook(NotebookRef(spaceId: space.id, name: "Journal", order: 1))
        #expect(acc.notebooks(inSpace: space.id).map(\.name) == ["Journal"])

        let star = StarredItem(kind: .note, id: "n1")
        try acc.star(star)
        try acc.star(star)
        #expect(acc.starred() == [star])
        try acc.unstar(star)
        #expect(acc.starred().isEmpty)

        try acc.openTab(noteId: "n1")
        try acc.openTab(noteId: "n2")
        #expect(acc.tabs() == ["n1", "n2"])
        #expect(acc.activeTab == "n2")
        try acc.closeTab(noteId: "n2")
        #expect(acc.tabs() == ["n1"])
        #expect(acc.activeTab == "n1")
        try acc.setSetting("dailyNotebookId", "nb1")
        #expect(acc.dailyNotebookId == "nb1")
    }
}

@Suite struct UtilTests {
    @Test func uuidV7() {
        let id = EntityID.make(milliseconds: 0x0192_f3c4_0000)
        #expect(id.hasPrefix("0192f3c4-0000-7"))
        #expect(EntityID.isValid(id))
        #expect(!EntityID.isValid(id.uppercased()))
    }

    @Test func base64url() {
        let d = Data([0xfb, 0xff, 0x01])
        #expect(Base64URL.encode(d) == "-_8B")
        #expect(Base64URL.decode("-_8B") == d)
        #expect(Base64URL.decode("+/8B") == nil)
        #expect(Base64URL.decode("AQ") == Data([1]))
    }

    @Test func dates() {
        #expect(DSDate.iso(Date(timeIntervalSince1970: 0)) == "1970-01-01T00:00:00.000Z")
        #expect(DSDate.parseDay("2026-10-25") == DateComponents(year: 2026, month: 10, day: 25))
        #expect(DSDate.parseDay("2026-1-25") == nil)
    }
}

@Suite struct StrokeMaintenanceTests {
    @Test func undoRebasesAnchorsForOtherDevices() throws {
        let a = NoteDocument(noteId: "n", clientId: 1)
        try a.initialize(title: "")
        try a.crdt.enableUndo(captureTimeout: .zero)
        try a.insertText("abcdef", at: 0, inBlock: [1])
        let anchors = try (1..<4).map { try a.crdt.relativePosition(at: [1, 0], index: UInt32($0)) }
        let stroke = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text, anchors: anchors,
                            points: (0..<3).map { StrokePoint(anchor: $0, x: 0, y: 0, t: Float($0)) }, author: Author(kind: .user, id: "u"))
        try a.addStrokes([stroke])
        a.crdt.stopCapturing()
        try a.deleteText(range: 0..<6, inBlock: [1])
        #expect(try a.orphanedStrokeIds() == [stroke.id])
        #expect(try a.undo())
        #expect(try a.orphanedStrokeIds().isEmpty)

        let b = NoteDocument(noteId: "n", clientId: 2)
        try b.crdt.applyUpdate(a.crdt.encodeStateAsUpdate())
        let s = try #require(b.stroke(id: stroke.id))
        let resolved = try b.crdt.resolve(relativePositions: s.anchors)
        #expect(resolved.map { $0?.index } == [1, 2, 3])
        #expect(resolved.allSatisfy { $0?.deleted == false })
        // The rebase did not become an undo step: redo still works.
        #expect(a.crdt.canRedo)
    }

    @Test func purgesOldOrphans() throws {
        let store = try LocalStore.inMemory()
        let note = NoteDocument(noteId: "n")
        try note.initialize(title: "")
        try note.insertText("ab", at: 0, inBlock: [1])
        let anchor = try note.crdt.relativePosition(at: [1, 0], index: 0)
        let stroke = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text, anchors: [anchor],
                            points: [StrokePoint(anchor: 0, x: 0, y: 0, t: 0)], author: Author(kind: .user, id: "u"), createdAt: 0)
        try note.addStrokes([stroke])
        try note.deleteText(range: 0..<2, inBlock: [1])
        let now = Date(timeIntervalSince1970: 100 * 86_400)
        try store.updateOrphans(noteId: "n", orphaned: try note.orphanedStrokeIds(), now: now)
        #expect(try store.orphanedAt(noteId: "n", strokeId: stroke.id) == now)
        // Orphaned "now" → kept; 31 days later → purged.
        #expect(try note.purgeOrphanedStrokes(orphanedAt: { try? store.orphanedAt(noteId: "n", strokeId: $0) }, now: now).isEmpty)
        let later = now.addingTimeInterval(31 * 86_400)
        #expect(try note.purgeOrphanedStrokes(orphanedAt: { try? store.orphanedAt(noteId: "n", strokeId: $0) }, now: later) == [stroke.id])
        try store.updateOrphans(noteId: "n", orphaned: [])
        #expect(try store.orphanedAt(noteId: "n", strokeId: stroke.id) == nil)
    }
}

@Suite struct VersionRestoreTests {
    @Test func restoresContentAndRemapsAnchors() throws {
        let note = NoteDocument(noteId: "n")
        try note.initialize(title: "v1")
        try note.insertText("Hello world", at: 0, inBlock: [1])
        let anchors = try (6..<11).map { try note.crdt.relativePosition(at: [1, 0], index: UInt32($0)) }
        let stroke = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .text, anchors: anchors,
                            points: (0..<5).map { StrokePoint(anchor: $0, x: 0, y: 0, t: Float($0)) }, author: Author(kind: .user, id: "u"))
        try note.addStrokes([stroke])
        let version = try note.crdt.encodeStateAsUpdate()

        // Later edits: text replaced, stroke erased.
        try note.deleteText(range: 0..<11, inBlock: [1])
        try note.insertText("Something else", at: 0, inBlock: [1])
        try note.removeStrokes(ids: [stroke.id])

        try note.restoreVersion(state: version)
        #expect(try note.block(at: [1])?.text == "Hello world")
        let restored = try #require(note.stroke(id: stroke.id))
        let resolved = try note.crdt.resolve(relativePositions: restored.anchors)
        #expect(resolved.map { $0?.index } == [6, 7, 8, 9, 10])
        #expect(resolved.allSatisfy { $0?.deleted == false })

        // Another device sees the same.
        let other = NoteDocument(noteId: "n")
        try other.crdt.applyUpdate(try note.crdt.encodeStateAsUpdate())
        let r2 = try other.crdt.resolve(relativePositions: try #require(other.stroke(id: stroke.id)).anchors)
        #expect(r2.map { $0?.index } == [6, 7, 8, 9, 10])
    }
}

@Suite struct ShareLinkTests {
    @Test func roundTrip() throws {
        let key = DSCrypto.newKey()
        let id = EntityID.make()
        let link = ShareLink(host: URL(string: "https://notes.example.com")!, shareId: id, key: key)
        #expect(link.url.absoluteString == "https://notes.example.com/s/\(id)#k=\(Base64URL.encode(key))")
        #expect(ShareLink(url: link.url) == link)
        #expect(ShareLink(url: URL(string: "https://notes.example.com/s/\(id)")!) == nil)
    }
}

@Suite struct StrokeTransactionTests {
    @Test func strokesAndTextInOneTransaction() throws {
        let note = NoteDocument(noteId: "n")
        try note.initialize(title: "")
        try note.crdt.enableUndo(captureTimeout: .zero)
        let stroke = Stroke(tool: .pen, color: "ink.black", width: 2, anchorKind: .block, blockId: "b",
                            points: [StrokePoint(anchor: -1, x: 0, y: 0, t: 0)], author: Author(kind: .user, id: "u"))
        try note.crdt.transact { txn in
            txn.insertNodes([.text(chunks: [TextChunk(text: "hi", embed: nil, attributes: [:])])], into: [1], at: 0)
            txn.putStroke(stroke)
            txn.setStrokeAnchors(id: stroke.id, [Data([1])])
        }
        #expect(note.stroke(id: stroke.id)?.anchors == [Data([1])])
        #expect(try note.undo())
        #expect(note.strokes().isEmpty)
        #expect(try note.block(at: [1])?.text == "")
    }
}
