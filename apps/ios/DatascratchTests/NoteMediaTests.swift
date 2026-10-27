import Foundation
import Testing
import UIKit
@testable import Datascratch

/// Stands for the server's attachments: files land in the same directory, as DSCore's do.
@MainActor
final class RecordingAttachmentRemote: CoverAttachmentRemote {
    let directory: URL
    var added: [(mime: String, noteId: String, bytes: Int)] = []
    var uploaded: [String] = []

    init(directory: URL) { self.directory = directory }

    func addAttachment(_ data: Data, mime: String, noteId: String) async throws -> String {
        let id = UUID().uuidString.lowercased()
        try data.write(to: directory.appendingPathComponent(id))
        added.append((mime, noteId, data.count))
        return id
    }

    func uploadAttachment(_ attachmentId: String, noteId: String) async { uploaded.append(attachmentId) }
    func downloadAttachment(_ attachmentId: String, noteId: String) async -> URL? { nil }
    func deleteAttachment(_ attachmentId: String) async {}
}

/// Build 19: photos and files in a note's text.
@MainActor
struct NoteMediaTests {
    private func photo(_ size: CGSize) -> Data {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.systemTeal.setFill()
            context.fill(CGRect(origin: .zero, size: size))
        }.pngData() ?? Data()
    }

    @Test func aLargePhotoIsScaledStoredAndUploaded() async throws {
        let images = CoverImages.temporary()
        let remote = RecordingAttachmentRemote(directory: images.directory)
        images.remote = remote
        let added = try await images.addImage(photo(CGSize(width: 4000, height: 3000)), noteId: "note-1")
        #expect(max(added.pixelSize.width, added.pixelSize.height) == CoverImages.maxPhotoPixels)
        // The preview is there at once, before any upload.
        #expect(images.image(added.id, noteId: "note-1") != nil)
        #expect(remote.added.first?.mime == "image/jpeg")
        #expect(remote.added.first?.noteId == "note-1")
        for _ in 0..<50 where !remote.uploaded.contains(added.id) { try await Task.sleep(for: .milliseconds(20)) }
        #expect(remote.uploaded == [added.id])
        #expect(images.uploading.isEmpty)
    }

    /// Without a server the photo stays on this device (DSCore uploads what is pending once
    /// connected).
    @Test func offlineThePhotoStaysOnThisDevice() async throws {
        let images = CoverImages.temporary()
        let added = try await images.addImage(photo(CGSize(width: 800, height: 600)), noteId: "note-2")
        #expect(added.pixelSize == CGSize(width: 800, height: 600))
        #expect(images.image(added.id, noteId: "note-2") != nil)
        #expect(images.uploading.isEmpty)
    }

    @Test func otherFilesAreKeptAsTheyAre() async throws {
        let images = CoverImages.temporary()
        let remote = RecordingAttachmentRemote(directory: images.directory)
        images.remote = remote
        let bytes = Data("%PDF-1.7 test".utf8)
        let id = try await images.addFile(bytes, mime: "application/pdf", noteId: "note-3")
        #expect(remote.added.first?.mime == "application/pdf")
        #expect(try Data(contentsOf: images.directory.appendingPathComponent(id)) == bytes)
    }

    @Test func notAnImageIsRefused() async {
        let images = CoverImages.temporary()
        await #expect(throws: CoverImages.CoverError.self) {
            _ = try await images.addImage(Data("not an image".utf8), noteId: "note-4")
        }
    }
}
