#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore) && canImport(DSDesign)
import DSCore
import DSEditor
import PhotosUI
import QuickLook
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
            let preview = app.covers.image(added.id, noteId: noteId)
            if let block = replacing {
                editor.replaceImage(block, attachmentId: added.id, preview: preview)
                replacing = nil
            } else {
                editor.insertImage(attachmentId: added.id, preview: preview)
            }
            showUpload(of: added.id)
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

    /// A quiet ring on the photo while it goes up (spinning: DSCore reports no chunk progress).
    private func showUpload(of attachmentId: String) {
        guard let app, app.covers.uploading.contains(attachmentId) else { return }
        editor.setImageProgress(attachmentId: attachmentId, 0)
        Task { [weak self] in
            await app.covers.uploadEnded(attachmentId)
            self?.editor.setImageProgress(attachmentId: attachmentId, nil)
        }
    }

    /// Images inside a pasted web page or rich text: each gets its id at once (the new block refers
    /// to it); the bytes come with the paste or are downloaded (http/https), then are stored under
    /// that id and go up like any photo. A failed download leaves the image as a link.
    func receivePastedImages(_ images: [PastedImage]) -> [String?] {
        guard let app else { return images.map { _ in nil } }
        let noteId = self.noteId
        return images.map { image -> String? in
            if case .url(let url) = image.source, !["http", "https"].contains(url.scheme?.lowercased() ?? "") { return nil }
            let id = EntityID.make()
            Task { [weak self] in
                var data: Data?
                switch image.source {
                case .data(let bytes): data = bytes
                case .url(let url): data = try? await URLSession.shared.data(from: url).0
                }
                guard let data, (try? await app.covers.addImage(data, noteId: noteId, id: id)) != nil else {
                    self?.editor.imageFailed(attachmentId: id)
                    return
                }
                self?.editor.imageDidLoad(attachmentId: id)
                self?.showUpload(of: id)
            }
            return id
        }
    }

    /// Images pasted or dropped into the text (the editor put the caret at the drop point).
    func receiveImages(_ providers: [NSItemProvider]) {
        Task {
            var data: [Data] = []
            for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                if let bytes = try? await provider.loadData(for: .image) { data.append(bytes) }
            }
            await insertImages(data)
        }
    }

    /// The long-press entries of a photo, between the editor's «Width» and «Delete».
    func imageMenu(block: BlockID, attachmentId: String) -> [UIMenuElement] {
        [
            UIAction(title: String(localized: "Caption…"), image: UIImage(systemName: "text.below.photo")) { [weak self] _ in
                self?.captionTarget = block
            },
            UIAction(title: String(localized: "Replace…"), image: UIImage(systemName: "photo.badge.arrow.down")) { [weak self] _ in
                self?.replacing = block
                self?.mediaChooser = .photos
            },
            UIAction(title: String(localized: "Share…"), image: UIImage(systemName: "square.and.arrow.up")) { [weak self] _ in
                self?.share(attachmentId, name: "Photo.jpg")
            },
        ]
    }

    /// A file block tapped: Quick Look, under the file's own name.
    func openFile(attachmentId: String) {
        let blocks = (try? app?.core?.noteDocument(noteId, notebookId: notebookId).blocks()) ?? []
        func find(_ list: [Block]) -> Block? {
            for block in list {
                if block.attrs["attachmentId"]?.stringValue == attachmentId { return block }
                if let inner = find(block.children) { return inner }
            }
            return nil
        }
        let name = find(blocks)?.attrs["name"]?.stringValue ?? attachmentId
        share(attachmentId, name: name, preview: true)
    }

    /// The file of an attachment, named for sharing or Quick Look (it is stored under its id).
    func share(_ attachmentId: String, name: String, preview: Bool = false) {
        guard let app else { return }
        let noteId = self.noteId
        Task { [weak self] in
            guard let file = await app.covers.file(attachmentId, noteId: noteId) else {
                self?.mediaError = String(localized: "The file is not on this device yet. Try again when online.")
                return
            }
            let named = FileManager.default.temporaryDirectory.appendingPathComponent(attachmentId, isDirectory: true)
                .appendingPathComponent(name)
            try? FileManager.default.createDirectory(at: named.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? FileManager.default.removeItem(at: named)
            try? FileManager.default.copyItem(at: file, to: named)
            if preview { self?.previewing = named } else { self?.sharing = named }
        }
    }

    /// Images on the clipboard (copied in Photos, Safari, a screenshot).
    func insertPastedImages() async {
        let data = UIPasteboard.general.images?.compactMap { $0.jpegData(compressionQuality: 0.95) } ?? []
        await insertImages(data)
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
    @State private var caption = ""

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
            .fullScreenCover(item: Binding(get: { model.viewingImage.map(ViewedImage.init) }, set: { model.viewingImage = $0?.id })) { image in
                ImageViewer(image: model.app?.covers.image(image.id, noteId: model.noteId)) { model.viewingImage = nil }
            }
            .sheet(item: Binding(get: { model.sharing.map(SharedFile.init) }, set: { model.sharing = $0?.url })) { file in
                ActivityView(items: [file.url])
            }
            .quickLookPreview(Binding(get: { model.previewing }, set: { model.previewing = $0 }))
            .alert("Caption", isPresented: Binding(get: { model.captionTarget != nil }, set: { if !$0 { model.captionTarget = nil } })) {
                TextField("Caption", text: $caption)
                Button("Save") {
                    if let block = model.captionTarget {
                        model.editor.setImageAttributes(block, caption: caption.isEmpty ? nil : caption, alt: nil)
                    }
                    caption = ""
                }
                Button("Cancel", role: .cancel) { caption = "" }
            }
            .alert("Can’t Attach", isPresented: Binding(get: { model.mediaError != nil }, set: { if !$0 { model.mediaError = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(model.mediaError ?? "")
            }
    }
}

private struct ViewedImage: Identifiable { let id: String }
private struct SharedFile: Identifiable { let url: URL; var id: URL { url } }

/// A photo on the whole screen: pinch and double-tap to zoom, swipe down or «Done» to close.
struct ImageViewer: View {
    let image: UIImage?
    let onClose: () -> Void
    @State private var scale: CGFloat = 1
    @State private var settled: CGFloat = 1
    @State private var drag: CGSize = .zero

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .scaleEffect(scale)
                    .offset(drag)
                    .gesture(MagnifyGesture()
                        .onChanged { scale = max(1, settled * $0.magnification) }
                        .onEnded { _ in settled = scale })
                    .simultaneousGesture(DragGesture()
                        .onChanged { drag = $0.translation }
                        .onEnded { value in
                            if scale <= 1, value.translation.height > 120 { onClose() }
                            withAnimation(Theme.Motion.snappy) { drag = .zero }
                        })
                    .onTapGesture(count: 2) {
                        withAnimation(Theme.Motion.snappy) { scale = scale > 1 ? 1 : 2.5; settled = scale }
                    }
                    .accessibilityLabel("Photo")
                    .accessibilityIdentifier("imageViewer.image")
            } else {
                ProgressView().tint(.white)
            }
            Button("Done", action: onClose)
                .buttonStyle(.glass)
                .padding(Theme.Space.s4)
                .accessibilityIdentifier("imageViewer.done")
        }
    }
}

/// The system share sheet.
struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
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
