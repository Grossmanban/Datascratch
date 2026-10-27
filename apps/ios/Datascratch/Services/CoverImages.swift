import ImageIO
import Observation
import UIKit
import UniformTypeIdentifiers

/// Where cover images go besides this device: the server's encrypted attachments
/// (crypto.md §6). Nil without a server.
protocol CoverAttachmentRemote: AnyObject {
    /// Stores the file as a new attachment of the note and returns its id (`id` when the
    /// document already refers to one made beforehand, e.g. a pasted web image).
    func addAttachment(_ data: Data, mime: String, noteId: String, id: String?) async throws -> String
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
        case tooLarge

        var errorDescription: String? {
            switch self {
            case .notAnImage: String(localized: "This file is not an image.")
            case .tooLarge: String(localized: "This image is too large (over 50 megapixels).")
            }
        }
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
    /// Photos in a note's text: the long side at most this (a 48 MP photo stays readable, ~1 MB).
    static let maxPhotoPixels: CGFloat = 2560
    /// Files the app will attach (larger ones are refused before reading them twice).
    static let maxFileBytes = 100 * 1024 * 1024

    /// Attachments added on this device and still going up to the server.
    private(set) var uploading: Set<String> = []
    @ObservationIgnored private var uploads: [String: Task<Void, Never>] = [:]
    /// Posted with the attachment id as `object` when a missing file has arrived (a download).
    static let didArrive = Notification.Name("CoverImages.didArrive")

    nonisolated struct AddedImage: Sendable {
        var id: String
        var pixelSize: CGSize
    }

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
        let (fullPixels, thumbPixels) = (Self.maxCoverPixels, Self.thumbPixels)
        let (full, thumb) = try await Task.detached(priority: .userInitiated) {
            (try Self.jpeg(data, maxPixels: fullPixels, quality: 0.85),
             try Self.jpeg(data, maxPixels: thumbPixels, quality: 0.8))
        }.value
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

    /// A photo for the note's text: scaled to `maxPhotoPixels` and stored as JPEG (HEIC and PNG
    /// too: every client reads JPEG), shown at once from this device, encrypted with the note key
    /// and uploaded in the background (crypto.md §6). Offline, DSCore keeps it and uploads it once
    /// connected.
    func addImage(_ data: Data, noteId: String, id presetId: String? = nil) async throws -> AddedImage {
        // Decoded off the main thread, never at full size (ImageIO thumbnail of the file).
        let maxPixels = Self.maxPhotoPixels
        let jpeg = try await Task.detached(priority: .userInitiated) {
            try Self.jpeg(data, maxPixels: maxPixels, quality: 0.85)
        }.value
        guard let stored = UIImage(data: jpeg) else { throw CoverError.notAnImage }
        let id = try await store(jpeg, noteId: noteId, id: presetId)
        cache.setObject(stored, forKey: id as NSString)
        upload(id, noteId: noteId)
        return AddedImage(id: id, pixelSize: CGSize(width: stored.size.width * stored.scale, height: stored.size.height * stored.scale))
    }

    /// Any other file, as it is.
    func addFile(_ data: Data, mime: String, noteId: String) async throws -> String {
        let id = try await store(data, mime: mime, noteId: noteId)
        upload(id, noteId: noteId)
        return id
    }

    private func upload(_ id: String, noteId: String) {
        guard let remote else { return }
        uploading.insert(id)
        uploads[id] = Task {
            await remote.uploadAttachment(id, noteId: noteId)
            uploading.remove(id)
            uploads[id] = nil
            revision += 1
        }
    }

    /// Returns when the attachment's upload has ended (at once if none is running).
    func uploadEnded(_ id: String) async {
        await uploads[id]?.value
    }

    /// The file of an attachment on this device, downloading it when missing.
    func file(_ attachmentId: String, noteId: String) async -> URL? {
        guard let local = url(attachmentId) else { return nil }
        if FileManager.default.fileExists(atPath: local.path) { return local }
        return await remote?.downloadAttachment(attachmentId, noteId: noteId)
    }

    private func store(_ data: Data, mime: String = "image/jpeg", noteId: String, id presetId: String? = nil) async throws -> String {
        if let remote {
            return try await remote.addAttachment(data, mime: mime, noteId: noteId, id: presetId)
        }
        let id = presetId ?? UUIDv7.make()
        guard let file = url(id) else { throw CoverError.notAnImage }
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        return id
    }

    /// The image if it is on this device; otherwise starts a download and returns nil
    /// (`revision` changes when it arrives).
    func image(_ attachmentId: String, noteId: String) -> UIImage? {
        guard let file = url(attachmentId) else { return nil }
        if let cached = cache.object(forKey: attachmentId as NSString) { return cached }
        if FileManager.default.fileExists(atPath: file.path) {
            // A file from another client may be any size: decoded no larger than a photo here.
            guard let image = Self.image(at: file, maxPixels: Self.maxPhotoPixels) else { return nil }
            cache.setObject(image, forKey: attachmentId as NSString)
            return image
        }
        fetch(attachmentId, noteId: noteId)
        return nil
    }

    private func fetch(_ attachmentId: String, noteId: String) {
        guard let remote, UUIDv7.isValid(attachmentId), !downloading.contains(attachmentId) else { return }
        downloading.insert(attachmentId)
        Task {
            _ = await remote.downloadAttachment(attachmentId, noteId: noteId)
            downloading.remove(attachmentId)
            revision += 1
            NotificationCenter.default.post(name: Self.didArrive, object: attachmentId)
        }
    }

    /// Forgets a replaced or removed cover here and on the server.
    func remove(_ ids: [String]) {
        let ids = ids.filter(UUIDv7.isValid)
        for id in ids {
            cache.removeObject(forKey: id as NSString)
            if let file = url(id) { try? FileManager.default.removeItem(at: file) }
        }
        guard let remote else { return }
        Task { for id in ids { await remote.deleteAttachment(id) } }
    }

    /// Forgets every decrypted image held in memory (local data erased, another account).
    func forgetAll() {
        cache.removeAllObjects()
        uploading.removeAll()
    }

    /// The file of an attachment id; nil for anything that is not an id (ids come from documents
    /// and must never become paths like `../library.sqlite`).
    private func url(_ id: String) -> URL? {
        UUIDv7.isValid(id) ? directory.appendingPathComponent(id) : nil
    }

    /// Images over this many pixels are refused before they are decoded: a crafted file or a huge
    /// panorama would otherwise take all the memory.
    nonisolated static let maxSourcePixels: Double = 50_000_000

    /// At most `maxPixels` on the long side, decoded straight from the file by ImageIO (the full
    /// image is never in memory), EXIF orientation applied.
    nonisolated static func downscaled(_ source: CGImageSource, maxPixels: CGFloat) throws -> CGImage {
        guard CGImageSourceGetCount(source) > 0,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue,
              let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue,
              width > 0, height > 0 else { throw CoverError.notAnImage }
        guard width * height <= maxSourcePixels else { throw CoverError.tooLarge }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: Int(min(maxPixels, max(width, height))),
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { throw CoverError.notAnImage }
        return image
    }

    /// `data` (JPEG, HEIC, PNG…) scaled to `maxPixels` and encoded as JPEG.
    nonisolated static func jpeg(_ data: Data, maxPixels: CGFloat, quality: CGFloat) throws -> Data {
        guard let source = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary)
        else { throw CoverError.notAnImage }
        let image = try downscaled(source, maxPixels: maxPixels)
        let out = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(out, UTType.jpeg.identifier as CFString, 1, nil)
        else { throw CoverError.notAnImage }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw CoverError.notAnImage }
        return out as Data
    }

    /// The clipboard's image as its file bytes (decoded later, scaled); a plain bitmap otherwise.
    static func pastedImageData() -> Data? {
        let board = UIPasteboard.general
        for type in [UTType.heic, .jpeg, .png, .tiff, .gif, .webP] {
            if let data = board.data(forPasteboardType: type.identifier) { return data }
        }
        return board.image?.pngData()
    }

    nonisolated static func image(at file: URL, maxPixels: CGFloat) -> UIImage? {
        guard let source = CGImageSourceCreateWithURL(file as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
              let image = try? downscaled(source, maxPixels: maxPixels) else { return nil }
        return UIImage(cgImage: image)
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
