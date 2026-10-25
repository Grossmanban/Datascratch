import DSInk
import Foundation

/// What the editor needs from a note document (`document-model.md` §4, `strokes.md`).
///
/// Offsets are in UTF-16 code units; an inline atom counts as one unit. Implementations must keep
/// Yjs semantics: inserted characters get stable identities, deleted characters keep their identity
/// (so relative positions to them can tell they are deleted, D-35), and undo restores them.
/// `InMemoryEditorDocument` is the reference implementation; DSCore provides the Yrs-backed one.
@MainActor
public protocol EditorDocument: AnyObject {
    // MARK: Structure

    /// Top-level blocks (`title` first).
    var blocks: [BlockNode] { get }
    func block(_ id: BlockID) -> BlockNode?
    /// Parent block (nil for top level) and index among live siblings.
    func location(of id: BlockID) -> (parent: BlockID?, index: Int)?
    func insertBlock(_ node: BlockNode, parent: BlockID?, at index: Int)
    func deleteBlock(_ id: BlockID)
    /// Sets (non-nil) or removes (nil) attributes.
    func setAttributes(_ id: BlockID, _ attrs: [String: JSONValue?])

    // MARK: Inline content

    func textLength(of block: BlockID) -> Int
    func inline(of block: BlockID, range: Range<Int>?) -> [InlineElement]
    func insertText(_ text: String, marks: MarkSet, block: BlockID, at offset: Int)
    func insertAtom(_ atom: InlineAtom, marks: MarkSet, block: BlockID, at offset: Int)
    func deleteText(block: BlockID, range: Range<Int>)
    /// Sets (non-nil) or removes (nil) one mark on a range.
    func setMark(_ name: String, value: JSONValue?, block: BlockID, range: Range<Int>)

    // MARK: Positions

    /// Encoded relative position of the character at `offset` (assoc 0) — a stroke anchor.
    func anchor(block: BlockID, offset: Int) -> Data?
    /// Current position of an anchored character; nil when the character is deleted (D-35).
    func resolveAnchor(_ anchor: Data) -> TextPosition?

    // MARK: Strokes

    /// All strokes, in insertion order.
    var strokes: [Stroke] { get }
    func stroke(_ id: String) -> Stroke?
    func addStroke(_ stroke: Stroke)
    func removeStroke(_ id: String)

    // MARK: Meta

    var style: DocumentStyle { get }
    func setStyle(_ style: DocumentStyle)

    // MARK: Transactions, undo, observation

    /// Groups changes into one transaction (one change notification, one undo step when local).
    func transact(origin: ChangeOrigin, _ body: () -> Void)
    var canUndo: Bool { get }
    var canRedo: Bool { get }
    func undo()
    func redo()
    /// The next local change starts a new undo step even if it happens right away.
    func stopCapturing()
    func observe(_ handler: @escaping @MainActor (DocumentChange) -> Void) -> ObservationToken
}

/// Keeps an observation alive; dropping it (or calling `cancel`) stops it.
@MainActor
public final class ObservationToken {
    private var onCancel: (() -> Void)?

    public init(_ onCancel: @escaping () -> Void) { self.onCancel = onCancel }

    public func cancel() {
        onCancel?()
        onCancel = nil
    }

    isolated deinit { cancel() }
}

public extension EditorDocument {
    func transact(_ body: () -> Void) { transact(origin: .local, body) }

    /// Depth-first list of all blocks.
    var allBlocks: [BlockNode] {
        var out: [BlockNode] = []
        func walk(_ nodes: [BlockNode]) {
            for n in nodes {
                out.append(n)
                walk(n.children)
            }
        }
        walk(blocks)
        return out
    }

    func plainText(of block: BlockID) -> String { self.block(block)?.plainText ?? "" }

    /// Text of a textblock with one U+FFFC per inline atom, so UTF-16 offsets match document offsets.
    func flatText(of block: BlockID) -> String {
        inline(of: block, range: nil).map { el in
            switch el {
            case .text(let s, _): s
            case .atom: "\u{FFFC}"
            }
        }.joined()
    }
}
