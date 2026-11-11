import Foundation
import Testing
@testable import DSEditorModel

/// A dictation placeholder's place follows the text around it and survives a round trip through
/// the host's storage; a deleted paragraph reports the anchor lost.
@MainActor
struct DictationAnchorTests {
    private func doc() -> InMemoryEditorDocument {
        InMemoryEditorDocument(blocks: [.title("Заметка"), .paragraph("Купить хлеб"), .paragraph("")])
    }

    @Test func followsEditsAroundIt() {
        let d = doc()
        let p = d.blocks[1].id
        // After «Купить» (offset 6).
        let a = DictationAnchor.at(TextPosition(block: p, offset: 6), in: d)
        #expect(a.after)
        d.transact { d.insertText("Срочно: ", marks: .empty, block: p, at: 0) }
        #expect(a.resolve(in: d) == TextPosition(block: p, offset: 6 + "Срочно: ".utf16.count))
        // Text typed right at the place goes after the placeholder: it stays after «Купить».
        let at = 6 + "Срочно: ".utf16.count
        d.transact { d.insertText(" бы", marks: .empty, block: p, at: at) }
        #expect(a.resolve(in: d) == TextPosition(block: p, offset: at))
    }

    @Test func startEndAndEmptyParagraphs() {
        let d = doc()
        let p = d.blocks[1].id, empty = d.blocks[2].id
        let start = DictationAnchor.at(TextPosition(block: p, offset: 0), in: d)
        #expect(!start.after && start.character != nil)
        let end = DictationAnchor.at(TextPosition(block: p, offset: 99), in: d)
        #expect(end.offset == "Купить хлеб".utf16.count && end.after)
        let none = DictationAnchor.at(TextPosition(block: empty, offset: 0), in: d)
        #expect(none.character == nil)
        d.transact { d.insertText("А ", marks: .empty, block: p, at: 0) }
        #expect(start.resolve(in: d) == TextPosition(block: p, offset: 2), "before the character it was before")
        #expect(end.resolve(in: d) == TextPosition(block: p, offset: "А Купить хлеб".utf16.count))
        #expect(none.resolve(in: d) == TextPosition(block: empty, offset: 0))
    }

    @Test func deletedCharacterFallsBackAndDeletedParagraphIsLost() {
        let d = doc()
        let p = d.blocks[1].id
        let a = DictationAnchor.at(TextPosition(block: p, offset: 6), in: d)
        d.transact { d.deleteText(block: p, range: 0..<"Купить".utf16.count) }
        #expect(a.resolve(in: d) == TextPosition(block: p, offset: d.textLength(of: p)), "the stored offset, clamped")
        d.transact { d.deleteBlock(p) }
        #expect(a.resolve(in: d) == nil, "anchor lost")
    }

    @Test func survivesTheHostsStorage() throws {
        let d = doc()
        let a = DictationAnchor.at(TextPosition(block: d.blocks[1].id, offset: 3), in: d)
        let back = try JSONDecoder().decode(DictationAnchor.self, from: JSONEncoder().encode(a))
        #expect(back == a)
        #expect(back.resolve(in: d) == TextPosition(block: d.blocks[1].id, offset: 3))
    }
}
