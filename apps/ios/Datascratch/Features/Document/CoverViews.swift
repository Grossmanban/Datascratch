import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// What a document's «Cover» menu asked for (spec/12 §12.7).
nonisolated enum CoverAction: Hashable, Sendable {
    case photo(noteId: String)
    case file(noteId: String)
    case reposition(noteId: String)

    nonisolated enum Kind: Sendable { case photo, file, reposition }

    var noteId: String {
        switch self {
        case .photo(let id), .file(let id), .reposition(let id): id
        }
    }

    var kind: Kind {
        switch self {
        case .photo: .photo
        case .file: .file
        case .reposition: .reposition
        }
    }
}

/// Compact document header: at most ~⅕ of the screen height (spec/12 §12.7).
struct CoverHeader: View {
    let note: NoteMeta

    static func height(for container: CGFloat) -> CGFloat { min(max(container * 0.2, 120), 200) }

    var body: some View {
        Group {
            if let cover = note.coverImage {
                CoverImageView(noteId: note.id, attachmentId: cover.attachmentId, offsetY: cover.offsetY)
            } else if let legacy = note.cover {
                legacy.gradient
            }
        }
        .containerRelativeFrame(.vertical) { length, _ in Self.height(for: length) }
        .frame(maxWidth: .infinity)
        .clipped()
        .overlay(alignment: .bottom) {
            LinearGradient(colors: [.clear, Theme.Palette.canvas.opacity(0.35)], startPoint: .top, endPoint: .bottom)
                .frame(height: 40)
        }
        .accessibilityHidden(true)
        .accessibilityIdentifier("document.cover")
    }

    static func hasCover(_ note: NoteMeta) -> Bool { note.coverImage != nil || note.cover != nil }
}

/// The cover image filling its frame, shifted vertically by `offsetY` (0 top … 1 bottom).
struct CoverImageView: View {
    @Environment(AppModel.self) private var app
    let noteId: String
    let attachmentId: String
    var offsetY: Double = 0.5

    var body: some View {
        let _ = app.covers.revision
        GeometryReader { proxy in
            if let image = app.covers.image(attachmentId, noteId: noteId) {
                let size = proxy.size
                let scale = max(size.width / max(image.size.width, 1), size.height / max(image.size.height, 1))
                let drawn = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                Image(uiImage: image)
                    .resizable()
                    .frame(width: drawn.width, height: drawn.height)
                    .offset(x: (size.width - drawn.width) / 2, y: -(drawn.height - size.height) * offsetY)
            } else {
                Theme.Palette.sidebar
            }
        }
        .clipped()
    }
}

/// Items of the «Cover» menu: the user's own image only (photos, files, pasteboard).
struct CoverMenuItems: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let note: NoteMeta

    var body: some View {
        Button("Choose Photo…", systemImage: "photo.on.rectangle") { scene.coverAction = .photo(noteId: note.id) }
        Button("Choose File…", systemImage: "folder") { scene.coverAction = .file(noteId: note.id) }
        Button("Paste Image", systemImage: "doc.on.clipboard") { paste() }
            .disabled(!UIPasteboard.general.hasImages)
        if CoverHeader.hasCover(note) {
            Divider()
            if note.coverImage != nil {
                Button("Reposition…", systemImage: "arrow.up.and.down") { scene.coverAction = .reposition(noteId: note.id) }
            }
            Button("Remove Cover", systemImage: "trash", role: .destructive) {
                app.library.removeCover(ofNote: note.id, images: app.covers)
            }
        }
    }

    private func paste() {
        guard let data = UIPasteboard.general.image.flatMap({ CoverImages.jpeg($0, maxPixels: CoverImages.maxCoverPixels, quality: 0.9) })
        else { return }
        CoverPickers.apply(data, noteId: note.id, app: app)
    }
}

/// Hosts the photo picker, file importer and reposition sheet for `scene.coverAction`.
struct CoverPickers: ViewModifier {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var photo: PhotosPickerItem?

    func body(content: Content) -> some View {
        content
            .photosPicker(isPresented: presented(.photo),
                          selection: $photo, matching: .images, preferredItemEncoding: .compatible)
            .fileImporter(isPresented: presented(.file),
                          allowedContentTypes: [.image]) { result in
                guard let noteId = lastNoteId, case .success(let url) = result else { return }
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                if let data = try? Data(contentsOf: url) { Self.apply(data, noteId: noteId, app: app) }
            }
            .sheet(isPresented: presented(.reposition)) {
                if let noteId = lastNoteId { CoverRepositionSheet(noteId: noteId) }
            }
            .onChange(of: scene.coverAction) { _, action in if let action { lastNoteId = action.noteId } }
            .onChange(of: photo) { _, item in
                guard let item, let noteId = lastNoteId else { return }
                photo = nil
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self) { Self.apply(data, noteId: noteId, app: app) }
                }
            }
    }

    @State private var lastNoteId: String?

    private func presented(_ kind: CoverAction.Kind) -> Binding<Bool> {
        Binding(get: { scene.coverAction?.kind == kind },
                set: { if !$0, scene.coverAction?.kind == kind { scene.coverAction = nil } })
    }

    static func apply(_ data: Data, noteId: String, app: AppModel) {
        Task {
            do {
                let added = try await app.covers.add(data, noteId: noteId)
                withAnimation(Theme.Motion.smooth) { app.library.setCover(added, ofNote: noteId, images: app.covers) }
                Haptics.success()
            } catch {
                Haptics.warning()
            }
        }
    }
}

extension View {
    func coverPickers() -> some View { modifier(CoverPickers()) }
}

/// Drag the image up or down to choose what the compact header shows.
struct CoverRepositionSheet: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let noteId: String
    @State private var offsetY: Double = 0.5
    @State private var start: Double?

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.Space.s4) {
                if let cover = app.library.note(noteId)?.coverImage {
                    CoverImageView(noteId: noteId, attachmentId: cover.attachmentId, offsetY: offsetY)
                        .frame(height: 180)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
                        .gesture(DragGesture().onChanged { value in
                            let base = start ?? offsetY
                            start = base
                            offsetY = min(1, max(0, base - value.translation.height / 300))
                        }.onEnded { _ in start = nil })
                        .accessibilityIdentifier("cover.reposition")
                    Text("Drag the image to choose what the header shows.")
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                    Slider(value: $offsetY, in: 0...1)
                        .accessibilityLabel("Image position")
                }
                Spacer()
            }
            .padding(Theme.Space.s5)
            .background(Theme.Palette.canvas)
            .navigationTitle("Reposition Cover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        app.library.updateNote(noteId) { $0.coverImage?.offsetY = offsetY }
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .onAppear { offsetY = app.library.note(noteId)?.coverImage?.offsetY ?? 0.5 }
    }
}
