#if canImport(UIKit)
import DSEditorModel
import DSInk
import UIKit

/// Ties pen input, the living-stroke model and rendering together.
@MainActor
final class InkController {
    unowned let textView: UITextView
    let geometry: TextGeometry
    let over: InkCanvas
    let under: InkCanvas
    let tools: InkToolState
    var document: EditorDocument
    var projection: () -> Projection
    var commands: EditorCommands { EditorCommands(document: document) }
    /// Called after a pen gesture changed the text (the editor re-renders).
    var onTextChangedByGesture: ((TextPosition?) -> Void)?
    /// Called when lasso selection ends: selected strokes, text range and selection bounds.
    var onLassoSelection: ((Set<String>, Range<Int>?, CGRect) -> Void)?
    /// Performance counters for the demo HUD.
    private(set) var lastRefreshDuration: TimeInterval = 0
    private(set) var renderedStrokeCount = 0

    private enum Target {
        case text(scale: CGFloat)
        case block(blockId: BlockID, origin: CGPoint, width: CGFloat, kind: AnchorKind)
    }

    private struct Session {
        var target: Target
        var samples: [PenSample] = []
        var predicted: [PenSample] = []
        var startTime: TimeInterval
        var tool: InkTool
        var paint: InkPaint
        var lastMoveTime: TimeInterval
        var holdAnchor: CGPoint
        var pendingGesture: StrokeHint?
    }

    private var session: Session?
    private var eraserPath: [CGPoint] = []
    private var erased: Set<String> = []
    private var pixelRuns: [String: [Range<Int>]] = [:]
    private var lassoPath: [CGPoint] = []
    private var holdTimer: Timer?
    /// Resolved segments of the strokes currently drawn (for hit testing).
    private(set) var resolved: [String: [[ResolvedInkPoint]]] = [:]
    private var renderedById: [String: RenderedStroke] = [:]
    private(set) var selectedStrokes: Set<String> = []
    private var generation = 0
    private var renderedGeneration = -1
    private var renderedWindow: Range<Int>?

    init(textView: UITextView, geometry: TextGeometry, over: InkCanvas, under: InkCanvas, tools: InkToolState,
         document: EditorDocument, projection: @escaping () -> Projection) {
        self.textView = textView
        self.geometry = geometry
        self.over = over
        self.under = under
        self.tools = tools
        self.document = document
        self.projection = projection
    }

    // MARK: - Rendering

    /// Layout or content changed: everything must be re-placed.
    func invalidateLayout() {
        generation += 1
        geometry.invalidate()
    }

    /// Re-renders visible strokes if layout changed or the viewport moved far enough.
    func refreshIfNeeded(force: Bool = false) {
        let window = renderWindow()
        if !force, renderedGeneration == generation, let w = renderedWindow, let nw = window,
           nw.lowerBound >= w.lowerBound, nw.upperBound <= w.upperBound {
            return
        }
        refresh(window: window)
    }

    /// Offsets of text laid out around the viewport, widened so short scrolls need no work.
    private func renderWindow() -> Range<Int>? {
        guard let vp = geometry.viewportOffsetRange() else { return nil }
        let span = max(2000, vp.count)
        return max(0, vp.lowerBound - span)..<(vp.upperBound + span)
    }

    func refresh(window: Range<Int>? = nil) {
        let start = CACurrentMediaTime()
        let p = projection()
        let window = window ?? renderWindow()
        var overStrokes: [RenderedStroke] = []
        var underStrokes: [RenderedStroke] = []
        resolved.removeAll(keepingCapacity: true)
        renderedById.removeAll(keepingCapacity: true)
        let column = geometry.columnFrame
        for stroke in document.strokes where !stroke.hidden {
            guard let segments = place(stroke, projection: p, window: window, column: column), !segments.isEmpty else { continue }
            resolved[stroke.id] = segments
            let r = render(stroke, segments: segments)
            renderedById[stroke.id] = r
            if stroke.tool.drawsUnderText { underStrokes.append(r) } else { overStrokes.append(r) }
        }
        over.apply(overStrokes)
        under.apply(underStrokes)
        renderedGeneration = generation
        renderedWindow = window
        renderedStrokeCount = overStrokes.count + underStrokes.count
        if !erased.isEmpty { applyEraserPreview() }
        over.setHighlighted(selectedStrokes, color: EditorTheme.selectionTint)
        lastRefreshDuration = CACurrentMediaTime() - start
    }

    /// Places a stroke in the current layout; nil when it is outside the window or detached (D-35).
    private func place(_ stroke: Stroke, projection p: Projection, window: Range<Int>?, column: CGRect) -> [[ResolvedInkPoint]]? {
        switch stroke.anchorKind {
        case .text:
            let offsets: [Int?] = stroke.anchors.map { a in
                guard let pos = document.resolveAnchor(a) else { return nil }
                return p.offset(block: pos.block, offset: pos.offset)
            }
            let live = offsets.compactMap { $0 }
            guard !live.isEmpty else { return nil }
            if let window, !live.contains(where: { window.contains($0) }) { return nil }
            let placements = offsets.map { $0.flatMap { geometry.placement(at: $0) } }
            return LivingStrokeResolver.segments(points: stroke.points, placements: placements)
        case .block:
            guard let block = stroke.blockId, let off = p.offset(block: block, offset: 0) else { return nil }
            if let window, !window.contains(off) { return nil }
            guard let frame = geometry.paragraphFrame(at: off) else { return nil }
            let seg = LivingStrokeResolver.blockSegment(points: stroke.points, blockOrigin: CGPoint(x: column.minX, y: frame.minY),
                                                        blockWidth: column.width)
            return seg.count >= 1 ? [seg] : nil
        case .image, .drawing:
            guard let block = stroke.blockId, let off = p.offset(block: block, offset: 0) else { return nil }
            if let window, !window.contains(off) { return nil }
            guard let frame = geometry.segmentFrame(off..<(off + 1)) else { return nil }
            let seg = LivingStrokeResolver.blockSegment(points: stroke.points, blockOrigin: frame.origin, blockWidth: frame.width)
            return seg.count >= 1 ? [seg] : nil
        }
    }

    private func render(_ stroke: Stroke, segments: [[ResolvedInkPoint]]) -> RenderedStroke {
        let polys = segments.map { InkOutline.polygon(InkOutline.widthPoints($0, tool: stroke.tool, baseWidth: stroke.width)) }
        let path = InkCanvas.path(from: polys)
        return RenderedStroke(id: stroke.id, path: path, color: EditorTheme.color(token: stroke.color),
                              opacity: Float(stroke.opacity), underText: stroke.tool.drawsUnderText, bounds: path.boundingBox)
    }

    // MARK: - Pen input

    func penBegan(_ s: PenSample) {
        switch tools.mode {
        case .text:
            return
        case .strokeEraser, .pixelEraser:
            eraserPath = [s.location]
            erased = []
            pixelRuns = [:]
            eraserMoved()
        case .lasso:
            if !selectedStrokes.isEmpty, let poly = selectionPolygon, InkGeometry.contains(polygon: poly, point: s.location) {
                dragStart = s.location
                dragDelta = .zero
            } else {
                clearSelection()
                lassoPath = [s.location]
            }
        case .pen, .pencil, .marker, .highlighter:
            guard let tool = tools.mode.inkTool else { return }
            let paint = tools.paints[tool] ?? .defaults(for: tool)
            session = Session(target: target(at: s.location), samples: [s], startTime: s.timestamp, tool: tool, paint: paint,
                              lastMoveTime: s.timestamp, holdAnchor: s.location)
            updateLive()
            scheduleHold()
        }
    }

    func penMoved(_ committed: [PenSample], predicted: [PenSample]) {
        switch tools.mode {
        case .strokeEraser, .pixelEraser:
            eraserPath += committed.map(\.location)
            eraserMoved()
        case .lasso:
            if let start = dragStart, let last = (committed + predicted).last?.location {
                dragDelta = CGPoint(x: last.x - start.x, y: last.y - start.y)
                previewDrag()
                return
            }
            lassoPath += committed.map(\.location)
            over.updateSelection(path: lassoCGPath(lassoPath + predicted.map(\.location), closed: false), color: EditorTheme.selectionTint)
        default:
            guard var s = session else { return }
            s.samples += committed
            s.predicted = predicted
            if let last = committed.last {
                if hypot(last.location.x - s.holdAnchor.x, last.location.y - s.holdAnchor.y) > 4 {
                    s.holdAnchor = last.location
                    s.lastMoveTime = last.timestamp
                    if s.pendingGesture != nil {
                        s.pendingGesture = nil
                        over.updateSelection(path: nil, color: .clear)
                    }
                }
            }
            session = s
            updateLive()
            scheduleHold()
        }
    }

    func penEstimatedUpdate(_ update: PenSample) {
        guard var s = session, let idx = update.estimationIndex else { return }
        if let i = s.samples.lastIndex(where: { $0.estimationIndex == idx }) {
            s.samples[i].pressure = update.pressure
            s.samples[i].altitude = update.altitude
            s.samples[i].azimuth = update.azimuth
            s.samples[i].roll = update.roll
            session = s
        }
    }

    func penEnded(cancelled: Bool) {
        holdTimer?.invalidate()
        switch tools.mode {
        case .strokeEraser, .pixelEraser:
            if !cancelled { commitEraser() } else { erased = []; over.setHidden([]); under.setHidden([]) }
            eraserPath = []
        case .lasso:
            if dragStart != nil {
                if !cancelled { commitDrag() } else { refresh() }
                dragStart = nil
                return
            }
            if !cancelled { finishLasso() } else { over.updateSelection(path: nil, color: .clear) }
            lassoPath = []
        default:
            guard let s = session else { return }
            session = nil
            if !cancelled {
                if let g = s.pendingGesture, applyGesture(g, session: s) {
                    // Gesture consumed the stroke.
                } else {
                    commitStroke(s)
                }
            }
            over.updateLive(path: nil, color: .clear, opacity: 1, underText: false)
            under.updateLive(path: nil, color: .clear, opacity: 1, underText: false)
            over.updateSelection(path: nil, color: .clear)
        }
    }

    private func target(at point: CGPoint) -> Target {
        let p = projection()
        let column = geometry.columnFrame
        if let off = geometry.paragraphOffset(at: point) {
            let (i, _) = p.position(at: off)
            if p.paragraphs.indices.contains(i), case .atom(let type) = p.paragraphs[i].kind,
               type == NodeType.drawing || type == NodeType.image,
               let frame = geometry.segmentFrame(p.starts[i]..<(p.starts[i] + 1)), frame.insetBy(dx: -2, dy: -2).contains(point) {
                return .block(blockId: p.paragraphs[i].blockId, origin: frame.origin, width: frame.width,
                              kind: type == NodeType.drawing ? .drawing : .image)
            }
            if point.x < column.minX - 6 || point.x > column.maxX + 6, p.paragraphs.indices.contains(i),
               let frame = geometry.paragraphFrame(at: p.starts[i]) {
                return .block(blockId: p.paragraphs[i].blockId, origin: CGPoint(x: column.minX, y: frame.minY), width: column.width, kind: .block)
            }
        }
        let scale = (geometry.characterHit(at: point)?.placement.fontSize ?? 17) / 17
        return .text(scale: scale)
    }

    private func scale(for target: Target) -> CGFloat {
        switch target {
        case .text(let s): s
        case .block(_, _, let width, _): width / 600
        }
    }

    private func updateLive() {
        guard let s = session else { return }
        let all = s.samples + s.predicted
        let sc = scale(for: s.target)
        let pts = all.enumerated().map { i, p in
            ResolvedInkPoint(location: p.location, pressure: p.pressure, altitude: p.altitude, azimuth: p.azimuth, roll: p.roll,
                             scale: sc, sourceIndex: i)
        }
        let poly = InkOutline.polygon(InkOutline.widthPoints(pts, tool: s.tool, baseWidth: s.paint.width))
        let path = InkCanvas.path(from: [poly])
        let canvas = s.tool.drawsUnderText ? under : over
        canvas.updateLive(path: path, color: EditorTheme.color(token: s.paint.color), opacity: Float(s.paint.opacity),
                          underText: s.tool.drawsUnderText)
    }

    /// Light smoothing of the committed samples (3-point average on positions), endpoints kept.
    private func smoothed(_ samples: [PenSample]) -> [PenSample] {
        guard samples.count > 3 else { return samples }
        var out = samples
        for i in 1..<(samples.count - 1) {
            let a = samples[i - 1].location, b = samples[i].location, c = samples[i + 1].location
            out[i].location = CGPoint(x: (a.x + 2 * b.x + c.x) / 4, y: (a.y + 2 * b.y + c.y) / 4)
        }
        return out
    }

    private func commitStroke(_ s: Session) {
        let samples = smoothed(s.samples)
        let p = projection()
        var stroke: Stroke?
        switch s.target {
        case .text:
            var builder = TextAnchorBuilder()
            for sample in samples {
                guard let hit = geometry.characterHit(at: sample.location) else { continue }
                builder.append(sample.inkSample(start: s.startTime), hit: hit)
            }
            var anchors: [Data] = []
            var ok = !builder.anchorOffsets.isEmpty
            for off in builder.anchorOffsets {
                guard let pos = p.textPosition(at: off), let a = document.anchor(block: pos.block, offset: pos.offset) else {
                    ok = false
                    break
                }
                anchors.append(a)
            }
            if ok {
                let line = builder.anchorOffsets.first.flatMap { geometry.lineMetrics(at: $0) }
                let hint = StrokeShapeClassifier.classify(samples.map(\.location), tool: s.tool, line: line)
                stroke = Stroke(tool: s.tool, color: s.paint.color, width: s.paint.width, opacity: s.paint.opacity,
                                anchorKind: .text, anchors: anchors, points: builder.points, hint: hint)
            } else if let off = geometry.paragraphOffset(at: samples[0].location) {
                // No text to hold on to (empty note): fall back to a margin note of the paragraph.
                let (i, _) = p.position(at: off)
                let column = geometry.columnFrame
                if p.paragraphs.indices.contains(i), let frame = geometry.paragraphFrame(at: p.starts[i]) {
                    stroke = blockStroke(s, samples: samples, blockId: p.paragraphs[i].blockId,
                                         origin: CGPoint(x: column.minX, y: frame.minY), width: column.width, kind: .block)
                }
            }
        case .block(let blockId, let origin, let width, let kind):
            stroke = blockStroke(s, samples: samples, blockId: blockId, origin: origin, width: width, kind: kind)
        }
        guard let stroke else { return }
        document.stopCapturing()
        document.addStroke(stroke)
        document.stopCapturing()
        // Draw immediately so there is no flicker between the live and the committed layer.
        refresh()
    }

    private func blockStroke(_ s: Session, samples: [PenSample], blockId: BlockID, origin: CGPoint, width: CGFloat, kind: AnchorKind) -> Stroke {
        var b = BlockAnchorBuilder(blockOrigin: origin, blockWidth: width)
        for sample in samples { b.append(sample.inkSample(start: s.startTime)) }
        let hint = StrokeShapeClassifier.classify(samples.map(\.location), tool: s.tool)
        return Stroke(tool: s.tool, color: s.paint.color, width: s.paint.width, opacity: s.paint.opacity, anchorKind: kind,
                      blockId: blockId, points: b.points, hint: hint)
    }

    // MARK: - Draw-and-hold gestures

    private func scheduleHold() {
        holdTimer?.invalidate()
        guard tools.gesturesEnabled, session?.tool != .highlighter else { return }
        holdTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated { self?.holdFired() }
        }
    }

    private func holdFired() {
        guard var s = session, case .text = s.target, s.samples.count > 4 else { return }
        let pts = s.samples.map(\.location)
        let hit = geometry.characterHit(at: pts[pts.count / 2])
        let line = hit.flatMap { geometry.lineMetrics(at: $0.offset) }
        let hint = StrokeShapeClassifier.classify(pts, tool: s.tool, line: line)
        guard [.scribble, .underline, .strike].contains(hint), let range = gestureRange(pts), !range.isEmpty else { return }
        s.pendingGesture = hint
        session = s
        // Preview: outline the words the gesture will act on.
        if let first = geometry.segmentFrame(range.lowerBound..<(range.lowerBound + 1)),
           let last = geometry.segmentFrame((range.upperBound - 1)..<range.upperBound) {
            let rect = first.union(last).insetBy(dx: -3, dy: -2)
            over.updateSelection(path: UIBezierPath(roundedRect: rect, cornerRadius: 4).cgPath,
                                 color: hint == .scribble ? .systemRed : EditorTheme.selectionTint)
        }
        UICanvasFeedbackGenerator(view: textView).alignmentOccurred(at: pts.last ?? .zero)
    }

    /// Text range covered by a gesture stroke, expanded to whole words.
    private func gestureRange(_ pts: [CGPoint]) -> Range<Int>? {
        let offsets = pts.compactMap { geometry.characterHit(at: $0)?.offset }
        guard let lo = offsets.min(), let hi = offsets.max() else { return nil }
        let text = textView.textStorage.string as NSString
        func isWord(_ i: Int) -> Bool {
            guard i >= 0, i < text.length else { return false }
            let c = text.character(at: i)
            guard let scalar = Unicode.Scalar(c) else { return true }
            return CharacterSet.alphanumerics.contains(scalar) || c == 0x2D || c == 0x27
        }
        var a = lo, b = hi + 1
        while a > 0, isWord(a - 1), isWord(a) { a -= 1 }
        while b < text.length, isWord(b), isWord(b - 1) { b += 1 }
        return a..<b
    }

    private func applyGesture(_ hint: StrokeHint, session s: Session) -> Bool {
        guard let range = gestureRange(s.samples.map(\.location)) else { return false }
        let cmd = commands
        switch hint {
        case .scribble:
            let caret = cmd.replace(range, with: "")
            onTextChangedByGesture?(caret)
        case .underline:
            document.stopCapturing()
            cmd.setMark(MarkName.underline, value: MarkSet.plain, range: range)
            document.stopCapturing()
            onTextChangedByGesture?(nil)
        case .strike:
            document.stopCapturing()
            cmd.setMark(MarkName.strike, value: MarkSet.plain, range: range)
            document.stopCapturing()
            onTextChangedByGesture?(nil)
        default:
            return false
        }
        UICanvasFeedbackGenerator(view: textView).pathCompleted(at: s.samples.last?.location ?? .zero)
        return true
    }

    // MARK: - Eraser

    var eraserRadius: CGFloat { tools.mode == .pixelEraser ? 10 : 6 }

    private func eraserMoved() {
        let tail = Array(eraserPath.suffix(2))
        for (id, segments) in resolved {
            if tools.mode == .strokeEraser {
                guard !erased.contains(id) else { continue }
                if InkGeometry.eraserTouches(segments: segments, eraserPath: tail, radius: eraserRadius) { erased.insert(id) }
            } else {
                guard erased.contains(id) || InkGeometry.eraserTouches(segments: segments, eraserPath: tail, radius: eraserRadius),
                      let stroke = document.stroke(id) else { continue }
                erased.insert(id)
                pixelRuns[id] = InkGeometry.survivingRuns(pointCount: stroke.points.count, resolved: segments.flatMap { $0 },
                                                          eraserPath: eraserPath, radius: eraserRadius)
            }
        }
        applyEraserPreview()
    }

    private func applyEraserPreview() {
        if tools.mode == .pixelEraser {
            // Show what remains of each touched stroke.
            var overStrokes = renderedById.values.filter { !$0.underText && !erased.contains($0.id) }
            var underStrokes = renderedById.values.filter { $0.underText && !erased.contains($0.id) }
            for id in erased {
                guard let stroke = document.stroke(id), let segs = resolved[id], let runs = pixelRuns[id] else { continue }
                let keep = runs.flatMap { Array($0) }
                let keepSet = Set(keep)
                let pieces: [[ResolvedInkPoint]] = segs.flatMap { seg -> [[ResolvedInkPoint]] in
                    var out: [[ResolvedInkPoint]] = []
                    var cur: [ResolvedInkPoint] = []
                    for p in seg {
                        if keepSet.contains(p.sourceIndex) { cur.append(p) } else { if cur.count > 1 { out.append(cur) }; cur = [] }
                    }
                    if cur.count > 1 { out.append(cur) }
                    return out
                }
                var r = render(stroke, segments: pieces)
                r.id = id
                if r.underText { underStrokes.append(r) } else { overStrokes.append(r) }
            }
            over.apply(overStrokes)
            under.apply(underStrokes)
        } else {
            over.setHidden(erased)
            under.setHidden(erased)
        }
    }

    private func commitEraser() {
        guard !erased.isEmpty else { return }
        let ids = erased
        let runs = pixelRuns
        let mode = tools.mode
        erased = []
        pixelRuns = [:]
        document.stopCapturing()
        document.transact {
            for id in ids {
                guard let stroke = document.stroke(id) else { continue }
                document.removeStroke(id)
                if mode == .pixelEraser {
                    for r in runs[id] ?? [] { document.addStroke(stroke.slice(r)) }
                }
            }
        }
        document.stopCapturing()
        over.setHidden([])
        under.setHidden([])
        refresh()
    }

    // MARK: - Lasso

    private func lassoCGPath(_ pts: [CGPoint], closed: Bool) -> CGPath? {
        guard pts.count > 1 else { return nil }
        let p = CGMutablePath()
        p.addLines(between: pts)
        if closed { p.closeSubpath() }
        return p
    }

    private var selectionPolygon: [CGPoint]?
    private var dragStart: CGPoint?
    private var dragDelta: CGPoint = .zero

    /// Shows selected strokes and the loop moved by the drag (layers translated, nothing re-laid out).
    private func previewDrag() {
        guard let poly = selectionPolygon else { return }
        let moved = poly.map { CGPoint(x: $0.x + dragDelta.x, y: $0.y + dragDelta.y) }
        over.updateSelection(path: lassoCGPath(moved, closed: true), color: EditorTheme.selectionTint)
        let t = CGAffineTransform(translationX: dragDelta.x, y: dragDelta.y)
        var overStrokes: [RenderedStroke] = []
        var underStrokes: [RenderedStroke] = []
        for r in renderedById.values {
            var copy = r
            if selectedStrokes.contains(r.id), let p = r.path.copy(using: [t]) { copy.path = p }
            if copy.underText { underStrokes.append(copy) } else { overStrokes.append(copy) }
        }
        over.apply(overStrokes)
        under.apply(underStrokes)
    }

    /// Drops dragged strokes: each becomes a copy anchored where it now lies (points are immutable,
    /// so a moved stroke is a new stroke; one undo step).
    private func commitDrag() {
        let delta = dragDelta
        guard hypot(delta.x, delta.y) > 1 else { return refresh() }
        let p = projection()
        var newIds: Set<String> = []
        document.stopCapturing()
        document.transact {
            for id in selectedStrokes {
                guard let stroke = document.stroke(id), let segs = resolved[id] else { continue }
                let pts = segs.flatMap { $0 }.sorted { $0.sourceIndex < $1.sourceIndex }
                var copy = stroke
                copy.id = UUIDv7.generate()
                if stroke.anchorKind == .text {
                    var b = TextAnchorBuilder()
                    for rp in pts {
                        let loc = CGPoint(x: rp.location.x + delta.x, y: rp.location.y + delta.y)
                        guard let hit = geometry.characterHit(at: loc) else { continue }
                        let src = stroke.points[rp.sourceIndex]
                        b.append(InkSample(location: loc, pressure: rp.pressure, altitude: rp.altitude, azimuth: rp.azimuth,
                                           roll: rp.roll, time: TimeInterval(src.t) / 1000), hit: hit)
                    }
                    let anchors = b.anchorOffsets.compactMap { off in p.textPosition(at: off).flatMap { document.anchor(block: $0.block, offset: $0.offset) } }
                    guard anchors.count == b.anchorOffsets.count, !anchors.isEmpty else { continue }
                    copy.anchors = anchors
                    copy.points = b.points
                } else {
                    // Block, image and drawing strokes move inside their block (fractions of its width).
                    let width = segs.first?.first.map { $0.scale * CGFloat(InkWidth.referenceBlockWidth) } ?? 600
                    copy.points = stroke.points.map { pt in
                        var q = pt
                        q.x += Float(delta.x / width)
                        q.y += Float(delta.y / width)
                        return q
                    }
                }
                document.removeStroke(id)
                document.addStroke(copy)
                newIds.insert(copy.id)
            }
        }
        document.stopCapturing()
        selectedStrokes = newIds
        selectionPolygon = selectionPolygon?.map { CGPoint(x: $0.x + delta.x, y: $0.y + delta.y) }
        refresh()
        if let poly = selectionPolygon { over.updateSelection(path: lassoCGPath(poly, closed: true), color: EditorTheme.selectionTint) }
    }

    private func finishLasso() {
        let poly = lassoPath
        guard poly.count > 3 else {
            over.updateSelection(path: nil, color: .clear)
            return
        }
        var ids: Set<String> = []
        for (id, segs) in resolved where InkGeometry.lassoSelects(polygon: poly, points: segs.flatMap { $0.map(\.location) }) {
            ids.insert(id)
        }
        // Text: characters whose glyph centers are inside the loop.
        var lo = Int.max, hi = Int.min
        let bounds = InkOutline.bounds(poly)
        if let vp = geometry.viewportOffsetRange() {
            let text = textView.textStorage.string as NSString
            for off in vp where off < text.length {
                let c = text.character(at: off)
                if c == 0x0A || c == 0x2028 { continue }
                guard let pl = geometry.placement(at: off) else { continue }
                let center = CGPoint(x: pl.origin.x + pl.fontSize * 0.25, y: pl.origin.y - pl.fontSize * 0.3)
                guard bounds.contains(center), InkGeometry.contains(polygon: poly, point: center) else { continue }
                lo = min(lo, off)
                hi = max(hi, off)
            }
        }
        let range: Range<Int>? = lo <= hi ? lo..<(hi + 1) : nil
        selectedStrokes = ids
        selectionPolygon = ids.isEmpty ? nil : poly
        over.setHighlighted(ids, color: EditorTheme.selectionTint)
        over.updateSelection(path: lassoCGPath(poly, closed: true), color: EditorTheme.selectionTint)
        onLassoSelection?(ids, range, bounds)
    }

    func clearSelection() {
        selectedStrokes = []
        selectionPolygon = nil
        over.setHighlighted([], color: .clear)
        over.updateSelection(path: nil, color: .clear)
    }

    /// Replaces selected strokes with recolored copies (strokes are immutable).
    func recolorSelection(_ token: String) {
        let ids = selectedStrokes
        var newIds: Set<String> = []
        document.stopCapturing()
        document.transact {
            for id in ids {
                guard var s = document.stroke(id) else { continue }
                document.removeStroke(id)
                s.id = UUIDv7.generate()
                s.color = token
                document.addStroke(s)
                newIds.insert(s.id)
            }
        }
        document.stopCapturing()
        selectedStrokes = newIds
        refresh()
    }

    func deleteSelectedStrokes() {
        let ids = selectedStrokes
        document.transact { for id in ids { document.removeStroke(id) } }
        clearSelection()
    }

    // MARK: - Hover

    func hoverPreview(at point: CGPoint?) -> (center: CGPoint, radius: CGFloat, color: UIColor)? {
        guard let point else { return nil }
        if tools.mode.isEraser { return (point, eraserRadius, EditorTheme.secondaryText) }
        guard let paint = tools.currentPaint, let tool = tools.mode.inkTool else { return nil }
        let sc = (geometry.characterHit(at: point)?.placement.fontSize ?? 17) / 17
        let w = InkWidth.width(base: paint.width, tool: tool, pressure: 0.6, altitude: .pi / 2, scale: Double(sc))
        return (point, max(2, CGFloat(w) / 2), EditorTheme.color(token: paint.color))
    }
}
#endif
