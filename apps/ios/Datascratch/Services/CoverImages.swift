import Observation
import UIKit

/// Where cover images go besides this device: the server's encrypted attachments
/// (crypto.md §6). Nil without a server.
protocol CoverAttachmentRemote: AnyObject {
    /// Stores the file as a new attachment of the note and returns its id.
    func addAttachment(_ data: Data, mime: String, noteId: String) async throws -> String
    func uploadAttachment(_ attachmentId: String, noteId: String) async
    /// Fetches an attachment that is not on this device yet.
    func downloadAttachment(_ attachmentId: String, noteId: String) async -> URL?
    func deleteAttachment(_ attachmentId: String) async
}

/// The user's own cover images (spec/12 §12.7): a full image for the document header
/// and a small thumbnail for cards, both stored as attachments of the note.
@Observable
final class CoverImages {
    nonisolated struct Added: Sendable {
        var cover: String
        var thumb: String
    }

    nonisolated enum CoverError: LocalizedError {
        case notAnImage

        var errorDescription: String? { String(localized: "This file is not an image.") }
    }

    /// Plaintext files named by attachment id (the same layout DSCore's
    /// `AttachmentManager` uses, so both see the same files).
    let directory: URL
    @ObservationIgnored weak var remote: (any CoverAttachmentRemote)?
    @ObservationIgnored private let cache = NSCache<NSString, UIImage>()
    /// Bumped when a file arrives, so headers waiting for a download redraw.
    private(set) var revision = 0
    @ObservationIgnored private var downloading: Set<String> = []

    static let maxCoverPixels: CGFloat = 2400
    static let thumbPixels: CGFloat = 480

    init(directory: URL) {
        self.directory = directory
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    static func appSupport() -> CoverImages {
        let base = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                                 appropriateFor: nil, create: true))
            ?? FileManager.default.temporaryDirectory
        return CoverImages(directory: base.appendingPathComponent("Attachments", isDirectory: true))
    }

    static func temporary() -> CoverImages {
        CoverImages(directory: FileManager.default.temporaryDirectory
            .appendingPathComponent("covers-\(UUID().uuidString)", isDirectory: true))
    }

    /// Scales the picked image down, stores the cover and its thumbnail, and queues
    /// both for upload when a server is connected.
    func add(_ data: Data, noteId: String) async throws -> Added {
        guard let image = UIImage(data: data) else { throw CoverError.notAnImage }
        guard let full = Self.jpeg(image, maxPixels: Self.maxCoverPixels, quality: 0.85),
              let thumb = Self.jpeg(image, maxPixels: Self.thumbPixels, quality: 0.8) else { throw CoverError.notAnImage }
        let coverId = try await store(full, noteId: noteId)
        let thumbId = try await store(thumb, noteId: noteId)
        if let remote {
            Task {
                await remote.uploadAttachment(coverId, noteId: noteId)
                await remote.uploadAttachment(thumbId, noteId: noteId)
            }
        }
        return Added(cover: coverId, thumb: thumbId)
    }

    private func store(_ data: Data, noteId: String) async throws -> String {
        if let remote {
            return try await remote.addAttachment(data, mime: "image/jpeg", noteId: noteId)
        }
        let id = UUIDv7.make()
        try data.write(to: url(id), options: [.atomic, .completeFileProtection])
        return id
    }

    /// The image if it is on this device; otherwise starts a download and returns nil
    /// (`revision` changes when it arrives).
    func image(_ attachmentId: String, noteId: String) -> UIImage? {
        if let cached = cache.object(forKey: attachmentId as NSString) { return cached }
        if let image = UIImage(contentsOfFile: url(attachmentId).path) {
            cache.setObject(image, forKey: attachmentId as NSString)
            return image
        }
        fetch(attachmentId, noteId: noteId)
        return nil
    }

    private func fetch(_ attachmentId: String, noteId: String) {
        guard let remote, !downloading.contains(attachmentId) else { return }
        downloading.insert(attachmentId)
        Task {
            _ = await remote.downloadAttachment(attachmentId, noteId: noteId)
            downloading.remove(attachmentId)
            revision += 1
        }
    }

    /// Forgets a replaced or removed cover here and on the server.
    func remove(_ ids: [String]) {
        for id in ids {
            cache.removeObject(forKey: id as NSString)
            try? FileManager.default.removeItem(at: url(id))
        }
        guard let remote else { return }
        Task { for id in ids { await remote.deleteAttachment(id) } }
    }

    private func url(_ id: String) -> URL { directory.appendingPathComponent(id) }

    nonisolated static func jpeg(_ image: UIImage, maxPixels: CGFloat, quality: CGFloat) -> Data? {
        let pixels = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
        let factor = min(1, maxPixels / max(pixels.width, pixels.height, 1))
        let target = CGSize(width: (pixels.width * factor).rounded(), height: (pixels.height * factor).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        // Drawing also applies the EXIF orientation.
        let scaled = UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
        return scaled.jpegData(compressionQuality: quality)
    }
}

extension LibraryStore {
    /// Sets the user's image as the note cover; the previous cover files are dropped.
    func setCover(_ added: CoverImages.Added, ofNote noteId: String, images: CoverImages) {
        let old = note(noteId).map { [$0.coverImage?.attachmentId, $0.coverThumb].compactMap { $0 } } ?? []
        updateNote(noteId) {
            $0.coverImage = NoteCover(attachmentId: added.cover)
            $0.coverThumb = added.thumb
            $0.cover = nil
        }
        images.remove(old)
    }

    func removeCover(ofNote noteId: String, images: CoverImages) {
        let old = note(noteId).map { [$0.coverImage?.attachmentId, $0.coverThumb].compactMap { $0 } } ?? []
        updateNote(noteId) {
            $0.coverImage = nil
            $0.coverThumb = nil
            $0.cover = nil
        }
        images.remove(old)
    }
}
