import DSEditor
import Observation
import UIKit

/// Owns the editor and the demo document file.
@MainActor
@Observable
final class DemoModel {
    let editor: EditorView
    private(set) var document: InMemoryEditorDocument
    var status = ""
    var showHUD = false
    var showPalette = false
    /// Title of a `[[Title]]` link that was tapped (the demo has one note: it offers to create it).
    var pendingNoteTitle: String?
    /// Bumped whenever the editor reports a change, so SwiftUI refreshes toolbar state.
    var revision = 0
    /// Editor scroll position (for the HUD and UI tests).
    var scrollOffset: CGFloat = 0

    let isUITesting = ProcessInfo.processInfo.arguments.contains("-uiTesting")
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
            doc = SampleDocument.make()
        }
        document = doc
        editor = EditorView(document: doc)
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
        editor.onScroll = { [weak self] y in self?.scrollOffset = y }
        editor.onPaletteRequest = { [weak self] _ in self?.showPalette = true }
        editor.onOpenNote = { [weak self] id in self?.status = "Ссылка на заметку \(id.prefix(8))…" }
        editor.onOpenNoteTitled = { [weak self] title in self?.pendingNoteTitle = title }
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
