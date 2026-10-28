import DSInk
import Foundation

/// The editor's way into a note document, with a read-only switch (`spec/04-editor.md`, «Только
/// чтение»): a viewer of a shared note (D-54), or a note in a newer format (R-03).
///
/// While read-only, every change made through it is dropped (text, blocks, attributes, marks,
/// strokes, style, undo and redo); reads, anchors and observation go through. Changes that
/// reach the underlying document from elsewhere (sync) still arrive and are shown.
/// `EditorView` sends all of its edits through one of these, so no editor path can write while
/// read-only, whatever the interface offers.
@MainActor
public final class ReadOnlyDocument: EditorDocument {
    /// The wrapped document.
    public var base: EditorDocument
    /// Read-only by choice (the host's viewer mode). The base document's own `isReadOnly` (a newer
    /// format) applies on top.
    public var isLocked: Bool

    public init(_ base: EditorDocument, locked: Bool = false) {
        self.base = base
        isLocked = locked
    }

    public var isReadOnly: Bool { isLocked || base.isReadOnly }

    /// Rejected writes since creation (for tests and diagnostics).
    public private(set) var rejectedWrites = 0

    private func allowsWrite() -> Bool {
        guard isReadOnly else { return true }
        rejectedWrites += 1
        return false
    }

    // MARK: Structure

    public var blocks: [BlockNode] { base.blocks }
    public func block(_ id: BlockID) -> BlockNode? { base.block(id) }
    public func location(of id: BlockID) -> (parent: BlockID?, index: Int)? { base.location(of: id) }

    public func insertBlock(_ node: BlockNode, parent: BlockID?, at index: Int) {
        guard allowsWrite() else { return }
        base.insertBlock(node, parent: parent, at: index)
    }

    public func deleteBlock(_ id: BlockID) {
        guard allowsWrite() else { return }
        base.deleteBlock(id)
    }

    public func setAttributes(_ id: BlockID, _ attrs: [String: JSONValue?]) {
        guard allowsWrite() else { return }
        base.setAttributes(id, attrs)
    }

    // MARK: Inline content

    public func textLength(of block: BlockID) -> Int { base.textLength(of: block) }
    public func inline(of block: BlockID, range: Range<Int>?) -> [InlineElement] { base.inline(of: block, range: range) }

    public func insertText(_ text: String, marks: MarkSet, block: BlockID, at offset: Int) {
        guard allowsWrite() else { return }
        base.insertText(text, marks: marks, block: block, at: offset)
    }

    public func insertAtom(_ atom: InlineAtom, marks: MarkSet, block: BlockID, at offset: Int) {
        guard allowsWrite() else { return }
        base.insertAtom(atom, marks: marks, block: block, at: offset)
    }

    public func deleteText(block: BlockID, range: Range<Int>) {
        guard allowsWrite() else { return }
        base.deleteText(block: block, range: range)
    }

    public func setMark(_ name: String, value: JSONValue?, block: BlockID, range: Range<Int>) {
        guard allowsWrite() else { return }
        base.setMark(name, value: value, block: block, range: range)
    }

    // MARK: Positions

    public func anchor(block: BlockID, offset: Int) -> Data? { base.anchor(block: block, offset: offset) }
    public func resolveAnchor(_ anchor: Data) -> TextPosition? { base.resolveAnchor(anchor) }

    // MARK: Strokes

    public var strokes: [Stroke] { base.strokes }
    public func stroke(_ id: String) -> Stroke? { base.stroke(id) }

    public func addStroke(_ stroke: Stroke) {
        guard allowsWrite() else { return }
        base.addStroke(stroke)
    }

    public func removeStroke(_ id: String) {
        guard allowsWrite() else { return }
        base.removeStroke(id)
    }

    public func setStrokeAnchors(_ id: String, _ anchors: [Data]) {
        guard allowsWrite() else { return }
        base.setStrokeAnchors(id, anchors)
    }

    // MARK: Meta

    public var style: DocumentStyle { base.style }

    public func setStyle(_ style: DocumentStyle) {
        guard allowsWrite() else { return }
        base.setStyle(style)
    }

    // MARK: Transactions, undo, observation

    /// The body runs either way (its writes are dropped while read-only), so callers that read in
    /// it see the document as it is.
    public func transact(origin: ChangeOrigin, _ body: () -> Void) {
        guard !isReadOnly else {
            body()
            return
        }
        base.transact(origin: origin, body)
    }

    public var canUndo: Bool { !isReadOnly && base.canUndo }
    public var canRedo: Bool { !isReadOnly && base.canRedo }

    public func undo() {
        guard allowsWrite() else { return }
        base.undo()
    }

    public func redo() {
        guard allowsWrite() else { return }
        base.redo()
    }

    public func stopCapturing() { base.stopCapturing() }

    public func observe(_ handler: @escaping @MainActor (DocumentChange) -> Void) -> ObservationToken {
        base.observe(handler)
    }
}
