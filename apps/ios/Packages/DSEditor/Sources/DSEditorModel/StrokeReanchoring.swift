import DSInk
import Foundation

/// Keeps strokes on their characters when an editing command moves text into new items.
///
/// Over Yjs/y-prosemirror, splitting or merging paragraphs, changing a block type and moving blocks
/// re-create the moved text as new items; anchors to the old items would resolve as deleted (D-35)
/// and the ink would vanish. Commands therefore capture the positions of affected anchors before the
/// change and, in the same transaction, replace each affected stroke with a copy anchored to the new
/// characters (new `strokeId`, same points — `strokes.md` §4.1a). Undo brings back the original.
@MainActor
public struct StrokeReanchoring {
    struct Captured {
        var stroke: Stroke
        var positions: [TextPosition?]
    }

    private var captured: [Captured] = []
    private var blockStrokes: [Stroke] = []

    /// Captures strokes that touch any of `blocks` (text anchors or margin notes).
    public init(document: EditorDocument, blocks: Set<BlockID>) {
        guard !blocks.isEmpty else { return }
        for s in document.strokes {
            switch s.anchorKind {
            case .text:
                let positions = s.anchors.map { document.resolveAnchor($0) }
                if positions.contains(where: { $0.map { blocks.contains($0.block) } ?? false }) {
                    captured.append(Captured(stroke: s, positions: positions))
                }
            case .block:
                if let b = s.blockId, blocks.contains(b) { blockStrokes.append(s) }
            case .image, .drawing:
                break
            }
        }
    }

    public var isEmpty: Bool { captured.isEmpty && blockStrokes.isEmpty }

    /// Replaces captured strokes whose anchors moved.
    /// - Parameters:
    ///   - map: new position of a character that was at the given position before the change;
    ///     return nil to leave that anchor as it is (e.g. the character was deleted).
    ///   - mapBlock: new owner block for margin notes of a block that went away; nil keeps it.
    public func apply(to document: EditorDocument, map: (TextPosition) -> TextPosition?,
                      mapBlock: (BlockID) -> BlockID? = { _ in nil }) {
        for c in captured {
            var changed = false
            var anchors = c.stroke.anchors
            for (i, pos) in c.positions.enumerated() {
                guard let pos, let target = map(pos) else { continue }
                // Only rewrite anchors whose old character is gone now.
                if document.resolveAnchor(anchors[i]) == pos { continue }
                if let a = document.anchor(block: target.block, offset: target.offset) {
                    anchors[i] = a
                    changed = true
                }
            }
            guard changed else { continue }
            var copy = c.stroke
            copy.id = UUIDv7.generate()
            copy.anchors = anchors
            document.removeStroke(c.stroke.id)
            document.addStroke(copy)
        }
        // `blockId` is immutable: a margin note of a removed block becomes a copy on the new block.
        for s in blockStrokes {
            guard let old = s.blockId, document.block(old) == nil, let target = mapBlock(old) else { continue }
            var copy = s
            copy.id = UUIDv7.generate()
            copy.blockId = target
            document.removeStroke(s.id)
            document.addStroke(copy)
        }
    }
}
