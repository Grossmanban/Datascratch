import DSCore
import DSEditor
import DSEditorCore
import Observation
import UIKit

/// Owns the editor and the demo document file.
@MainActor
@Observable
final class DemoModel {
    let editor: EditorView
    private(set) var document: InMemoryEditorDocument
    /// The app's document model, when the editor runs on it (`-coreDocument`).
    @ObservationIgnored private var coreDocument: CoreEditorDocument?
    var status = ""
    var showHUD = false
    var showPalette = false
    /// Bumped whenever the editor reports a change, so SwiftUI refreshes toolbar state.
    var revision = 0
    /// Editor scroll position (for the HUD and UI tests).
    var scrollOffset: CGFloat = 0

    let isUITesting = ProcessInfo.processInfo.arguments.contains("-uiTesting")
    let selectedTraits = !ProcessInfo.processInfo.arguments.contains("-noSelectedTraits")
    let hidesPalette = ProcessInfo.processInfo.arguments.contains("-noPalette")
    /// UI-test bisection (temporary): `-splitView`, `-noNavigation`.
    enum Navigation { case stack, split, none }
    let navigation: Navigation = {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-splitView") { return .split }
        if args.contains("-noNavigation") { return .none }
        return .stack
    }()
    private let images = DemoImages()

    static var fileURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("demo.dsnote.json")
    }

    init() {
        let args = ProcessInfo.processInfo.arguments
        let doc: InMemoryEditorDocument
        if args.contains("-large") {
            doc = SampleDocument.large()
        } else if !args.contains("-uiTesting"), let data = try? Data(contentsOf: Self.fileURL),
                  let loaded = try? InMemoryEditorDocument(fileData: data) {
            doc = loaded
        } else {
            doc = Self.sample(args)
        }
        document = doc
        if args.contains("-coreDocument"), let core = Self.coreDocument() {
            // UI-test bisection (temporary): the app's document model (Yrs) under the editor.
            coreDocument = core
            editor = EditorView(document: core)
        } else {
            editor = EditorView(document: doc)
        }
        // UI-test bisection (temporary): the app creates its editor in text mode.
        if args.contains("-startInText") { editor.tools.mode = .text }
        editor.attachmentResolver = images
        if args.contains("-fingerDrawing") || UIDevice.current.userInterfaceIdiom == .phone && args.contains("-fingerDrawingOnPhone") {
            editor.tools.allowsFingerDrawing = true
        }
        if args.contains("-hud") { showHUD = true }
        editor.onStateChange = { [weak self] in
            guard let self else { return }
            self.revision &+= 1
            if self.isUITesting { NSLog("DIAG state mode=%@", self.editor.tools.mode.rawValue) }
        }
        if args.contains("-uiTesting") {
            if !args.contains("-noDiagDump") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { Self.dumpGestureRecognizers() }
            }
        }
        // UI-test bisection switches (temporary): `-noScrollTracking`, `-noSelectedTraits`.
        if !args.contains("-noScrollTracking") {
            editor.onScroll = { [weak self] y in self?.scrollOffset = y }
        }
        if args.contains("-noKeyboardInset") { editor.adjustsForKeyboard = false }
        editor.onPaletteRequest = { [weak self] _ in self?.showPalette = true }
    }

    /// UI-test diagnostics: every gesture recognizer in the window that delays touches.
    /// The sample note, optionally without some block types (UI-test bisection switches:
    /// `-sampleTextOnly`, `-sampleNoTable`, `-sampleNoMermaid`; `-sampleEmpty` is a new note,
    /// like the one the app's UI test types into).
    static func sample(_ args: [String]) -> InMemoryEditorDocument {
        if args.contains("-sampleEmpty") { return InMemoryEditorDocument(blocks: [.title(""), .paragraph()]) }
        let doc = SampleDocument.make()
        let atoms: Set<String> = [NodeType.table, NodeType.mermaid, NodeType.mathBlock, NodeType.image, NodeType.drawing,
                                  NodeType.file, NodeType.pageCard, NodeType.horizontalRule]
        var drop: Set<String> = []
        if args.contains("-sampleTextOnly") { drop = atoms }
        if args.contains("-sampleNoTable") { drop.insert(NodeType.table) }
        if args.contains("-sampleNoMermaid") { drop.insert(NodeType.mermaid) }
        guard !drop.isEmpty else { return doc }
        return InMemoryEditorDocument(blocks: doc.blocks.filter { !drop.contains($0.type) })
    }

    /// A new note in the app's document model, as the app's UI test opens it.
    static func coreDocument() -> CoreEditorDocument? {
        let note = NoteDocument(noteId: UUID().uuidString.lowercased())
        guard (try? note.initialize(title: "")) != nil else { return nil }
        return CoreEditorDocument(note: note)
    }

    static func dumpGestureRecognizers() {
        let windows = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows)
        func walk(_ v: UIView, depth: Int) {
            for g in v.gestureRecognizers ?? [] where g.delaysTouchesBegan || g.delaysTouchesEnded {
                NSLog("DIAG recognizer %@ on %@ began=%d ended=%d enabled=%d cancels=%d", String(describing: type(of: g)),
                      String(describing: type(of: v)), g.delaysTouchesBegan ? 1 : 0, g.delaysTouchesEnded ? 1 : 0,
                      g.isEnabled ? 1 : 0, g.cancelsTouchesInView ? 1 : 0)
            }
            for sub in v.subviews { walk(sub, depth: depth + 1) }
        }
        for w in windows { walk(w, depth: 0) }
    }

    func save() {
        guard !isUITesting else { return }
        do {
            try document.fileData().write(to: Self.fileURL, options: .atomic)
            status = "Сохранено"
        } catch {
            status = "Ошибка сохранения: \(error.localizedDescription)"
        }
    }

    func reload() {
        guard let data = try? Data(contentsOf: Self.fileURL), let doc = try? InMemoryEditorDocument(fileData: data) else {
            status = "Нет сохранённого файла"
            return
        }
        document = doc
        editor.setDocument(doc)
        status = "Загружено из файла"
    }

    func reset() {
        document = SampleDocument.make()
        editor.setDocument(document)
        status = "Образец восстановлен"
    }

    func loadLarge() {
        document = SampleDocument.large()
        editor.setDocument(document)
        status = String(format: "10 000 слов открыто за %.0f мс", editor.lastOpenDuration * 1000)
    }

    var style: DocumentStyle { document.style }

    func setWidth(_ w: DocumentStyle.Width) {
        var s = document.style
        s.width = w
        editor.setStyle(s)
    }

    func setPaper(_ p: DocumentStyle.Paper) {
        var s = document.style
        s.paper = p
        editor.setStyle(s)
    }

    func setFont(_ f: DocumentStyle.Font) {
        var s = document.style
        s.font = f
        editor.setStyle(s)
    }
}

/// Generated images for image blocks in the demo.
@MainActor
final class DemoImages: EditorAttachmentResolver {
    private var cache: [String: UIImage] = [:]

    func image(for attachmentId: String) -> UIImage? {
        if let img = cache[attachmentId] { return img }
        let size = CGSize(width: 1200, height: 700)
        let img = UIGraphicsImageRenderer(size: size).image { ctx in
            let colors = [UIColor(red: 0.96, green: 0.87, blue: 0.70, alpha: 1).cgColor,
                          UIColor(red: 0.62, green: 0.75, blue: 0.86, alpha: 1).cgColor]
            let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: [0, 1])!
            ctx.cgContext.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size.width, y: size.height), options: [])
            UIColor.white.withAlphaComponent(0.6).setFill()
            UIBezierPath(ovalIn: CGRect(x: 820, y: 120, width: 180, height: 180)).fill()
        }
        cache[attachmentId] = img
        return img
    }

    private var notes: [String: String] = ["0192f3c4-0000-7000-8000-000000000001": "Идеи"]

    func noteTitle(for noteId: String) -> String? { notes[noteId] }

    func noteId(forLinkLabel label: String) -> String? {
        if let existing = notes.first(where: { $0.value == label })?.key { return existing }
        let id = UUIDv7.generate()
        notes[id] = label
        return id
    }
}
