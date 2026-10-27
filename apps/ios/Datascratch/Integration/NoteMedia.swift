#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore) && canImport(DSDesign)
import DSEditor
import PhotosUI
import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// What the editor asks the app about a note's attachments and links: images come from this
/// device (a download starts when one is missing), note cards show their note's title.
@MainActor
final class NoteAttachments: EditorAttachmentResolver {
    private weak var app: AppModel?
    let noteId: String

    init(app: AppModel, noteId: String) {
        self.app = app
        self.noteId = noteId
    }

    func image(for attachmentId: String) -> UIImage? {
        app?.covers.image(attachmentId, noteId: noteId)
    }

    func noteTitle(for noteId: String) -> String? {
        app?.library.note(noteId)?.title
    }
}

/// Photos and files in a note's text (build 19): from the photo library, the camera, Files, the
/// clipboard, a drop on iPad, the «/» menu and «Insert». Each goes in as an `image` or `file`
/// block after the caret at once (the file on this device is the preview) and uploads in the
/// background, encrypted with the note key.
enum NoteMedia {
    /// «/» entries the app handles itself (the editor's own list has no attachments).
    static let slashItems: [SlashCommand] = [
        SlashCommand(id: "image", title: "Фото", systemImage: "photo",
                     keywords: ["photo", "image", "picture", "картинка", "изображение", "фото"], group: "Вставка"),
        SlashCommand(id: "file", title: "Файл", systemImage: "paperclip",
                     keywords: ["file", "attachment", "document", "вложение", "документ"], group: "Вставка"),
    ]

    /// The editor's «/» menu with «Фото» and «Файл» added where the query matches them.
    static func withMediaItems(_ menu: SlashMenuState) -> SlashMenuState {
        var menu = menu
        let query = menu.query.trimmingCharacters(in: .whitespaces)
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
        let extra = slashItems.filter { item in
            query.isEmpty || ([item.title] + item.keywords).contains {
                $0.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil).hasPrefix(query)
            }
        }
        menu.items += extra
        return menu
    }

    static func isMediaCommand(_ id: String) -> Bool { slashItems.contains { $0.id == id } }

    static func imageBlock(_ attachmentId: String) -> BlockNode {
        BlockNode(type: NodeType.image, attrs: ["attachmentId": .string(attachmentId)])
    }

    static func fileBlock(_ attachmentId: String, name: String, size: Int, mime: String) -> BlockNode {
        BlockNode(type: NodeType.file, attrs: ["attachmentId": .string(attachmentId), "name": .string(name),
                                               "size": .number(Double(size)), "mime": .string(mime)])
    }
}

extension NativeEditorModel {
    /// Photos picked, taken, pasted or dropped, in order. Returns how many went in.
    @discardableResult
    func insertImages(_ items: [Data]) async -> Int {
        guard let app else { return 0 }
        var inserted = 0
        for data in items {
            guard let added = try? await app.covers.addImage(data, noteId: noteId) else { continue }
            editor.insertBlock(NoteMedia.imageBlock(added.id))
            inserted += 1
        }
        if inserted < items.count { mediaError = String(localized: "Some of these files are not images.") }
        return inserted
    }

    /// Files from Files: images become photos, the rest file blocks.
    func insertFiles(_ urls: [URL]) async {
        guard let app else { return }
        for url in urls {
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            let type = UTType(filenameExtension: url.pathExtension) ?? .data
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            guard size <= CoverImages.maxFileBytes, let data = try? Data(contentsOf: url) else {
                mediaError = String(localized: "This file is too large to attach (up to 100 MB).")
                continue
            }
            if type.conforms(to: .image), await insertImages([data]) == 1 { continue }
            let mime = type.preferredMIMEType ?? "application/octet-stream"
            guard let id = try? await app.covers.addFile(data, mime: mime, noteId: noteId) else {
                mediaError = String(localized: "The file could not be attached.")
                continue
            }
            editor.insertBlock(NoteMedia.fileBlock(id, name: url.lastPathComponent, size: data.count, mime: mime))
        }
    }

    /// Images on the clipboard (copied in Photos, Safari, a screenshot).
    func insertPastedImages() async {
        let data = UIPasteboard.general.images?.compactMap { $0.jpegData(compressionQuality: 0.95) } ?? []
        await insertImages(data)
    }

    /// A «/» entry of `NoteMedia`: the typed "/query" goes, then the chooser opens.
    func applyMediaCommand(_ id: String) {
        // The editor removes "/query" when applying an entry; «Text» keeps a paragraph as it is.
        if editor.formatState.block == .paragraph {
            editor.applySlashCommand("paragraph")
        } else {
            editor.dismissSlashMenu()
        }
        slashMenu = nil
        mediaChooser = id == "file" ? .files : .photos
    }
}

/// The «Insert» entries for photos and files.
struct MediaInsertItems: View {
    let model: NativeEditorModel

    var body: some View {
        Button("Photo Library", systemImage: "photo.on.rectangle") { model.mediaChooser = .photos }
            .accessibilityIdentifier("insert.photos")
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            Button("Take Photo", systemImage: "camera") { model.mediaChooser = .camera }
        }
        Button("File", systemImage: "paperclip") { model.mediaChooser = .files }
        if UIPasteboard.general.hasImages {
            Button("Paste Image", systemImage: "doc.on.clipboard") { Task { await model.insertPastedImages() } }
        }
        // UI tests: a stand-in for the photo library (its sheet runs in another process).
        if ProcessInfo.processInfo.arguments.contains("-ui-testing-sample-photo") {
            Button("Sample Photo", systemImage: "photo") { Task { await model.insertImages([NoteMedia.samplePhoto()]) } }
                .accessibilityIdentifier("insert.samplePhoto")
        }
    }
}

extension NoteMedia {
    /// A 3000×2000 gradient, as a large photo would come from the library (UI tests).
    static func samplePhoto() -> Data {
        let size = CGSize(width: 3000, height: 2000)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
            let colors = [UIColor.systemOrange.cgColor, UIColor.systemPink.cgColor] as CFArray
            if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1]) {
                context.cgContext.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size.width, y: size.height), options: [])
            }
        }
        return image.jpegData(compressionQuality: 0.9) ?? Data()
    }
}

/// The photo library, camera and Files choosers of a note, and drops of images on iPad.
struct MediaPickers: ViewModifier {
    @Bindable var model: NativeEditorModel
    @State private var picked: [PhotosPickerItem] = []

    private func showing(_ chooser: NativeEditorModel.MediaChooser) -> Binding<Bool> {
        Binding(get: { model.mediaChooser == chooser },
                set: { if !$0, model.mediaChooser == chooser { model.mediaChooser = nil } })
    }

    func body(content: Content) -> some View {
        content
            .photosPicker(isPresented: showing(.photos), selection: $picked, maxSelectionCount: 20,
                          matching: .images, preferredItemEncoding: .compatible)
            .onChange(of: picked) { _, items in
                guard !items.isEmpty else { return }
                picked = []
                Task {
                    var data: [Data] = []
                    for item in items {
                        if let bytes = try? await item.loadTransferable(type: Data.self) { data.append(bytes) }
                    }
                    await model.insertImages(data)
                }
            }
            .fileImporter(isPresented: showing(.files), allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
                guard case .success(let urls) = result else { return }
                Task { await model.insertFiles(urls) }
            }
            .fullScreenCover(isPresented: showing(.camera)) {
                CameraPicker(onPhoto: { data in Task { await model.insertImages([data]) } },
                             onClose: { model.mediaChooser = nil })
                    .ignoresSafeArea()
            }
            .onDrop(of: [.image], isTargeted: nil) { providers in
                Task {
                    var data: [Data] = []
                    for provider in providers {
                        if let bytes = try? await provider.loadData(for: .image) { data.append(bytes) }
                    }
                    await model.insertImages(data)
                }
                return true
            }
            .alert("Can’t Attach", isPresented: Binding(get: { model.mediaError != nil }, set: { if !$0 { model.mediaError = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(model.mediaError ?? "")
            }
    }
}

private extension NSItemProvider {
    func loadData(for type: UTType) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            _ = loadDataRepresentation(for: type) { data, error in
                if let data { continuation.resume(returning: data) } else { continuation.resume(throwing: error ?? CocoaError(.fileReadUnknown)) }
            }
        }
    }
}

/// The camera, for one photo.
struct CameraPicker: UIViewControllerRepresentable {
    let onPhoto: (Data) -> Void
    let onClose: () -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage, let data = image.jpegData(compressionQuality: 0.95) {
                parent.onPhoto(data)
            }
            parent.onClose()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.onClose() }
    }
}
#endif
