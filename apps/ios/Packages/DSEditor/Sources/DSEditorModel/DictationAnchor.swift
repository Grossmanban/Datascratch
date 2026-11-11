import Foundation

/// Where a dictation placeholder stands in the text (`spec/04-editor.md`, «Голос: заглушка в
/// тексте»): the character before it (or after it, at the start of a paragraph) as a CRDT anchor,
/// so the place follows edits around it, and the block and offset as a fallback. Codable: the
/// host keeps it with the recording and restores the placeholder when the note is opened again.
public struct DictationAnchor: Codable, Hashable, Sendable {
    /// The paragraph and the offset in it when the anchor was last resolved.
    public var block: BlockID
    public var offset: Int
    /// The anchored character (`EditorDocument.anchor`), nil in an empty paragraph.
    public var character: Data?
    /// The place is just after the anchored character (else just before it).
    public var after: Bool

    public init(block: BlockID, offset: Int, character: Data?, after: Bool) {
        self.block = block
        self.offset = offset
        self.character = character
        self.after = after
    }

    /// The anchor of a caret position.
    @MainActor
    public static func at(_ position: TextPosition, in document: EditorDocument) -> DictationAnchor {
        let length = document.textLength(of: position.block)
        let offset = max(0, min(position.offset, length))
        if offset > 0, let a = document.anchor(block: position.block, offset: offset - 1) {
            return DictationAnchor(block: position.block, offset: offset, character: a, after: true)
        }
        if offset < length, let a = document.anchor(block: position.block, offset: offset) {
            return DictationAnchor(block: position.block, offset: offset, character: a, after: false)
        }
        return DictationAnchor(block: position.block, offset: offset, character: nil, after: false)
    }

    /// The current position: the anchored character's place, else the stored offset in the same
    /// paragraph (clamped); nil when the paragraph is gone ("anchor lost": the host falls back to
    /// the caret).
    @MainActor
    public func resolve(in document: EditorDocument) -> TextPosition? {
        if let character, let p = document.resolveAnchor(character) {
            return TextPosition(block: p.block, offset: p.offset + (after ? 1 : 0))
        }
        guard document.block(block) != nil else { return nil }
        return TextPosition(block: block, offset: max(0, min(offset, document.textLength(of: block))))
    }
}
