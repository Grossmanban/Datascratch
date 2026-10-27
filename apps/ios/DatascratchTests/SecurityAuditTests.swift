#if canImport(DSCore)
import DSCore
#endif
import Foundation
import Testing
import UIKit
@testable import Datascratch

/// Security audit 2026-10-27 (build 21).
@MainActor
struct SecurityAuditTests {
    // 1) Names and ids from note content never form paths.

    @Test func fileNamesFromNotesAreNotPaths() {
        #expect(SafeFileName.sanitize("../../Library/Application Support/library.sqlite", fallback: "x") == "library.sqlite")
        #expect(SafeFileName.sanitize("a/b/c.pdf", fallback: "x") == "c.pdf")
        #expect(SafeFileName.sanitize("..", fallback: "x") == "x")
        #expect(SafeFileName.sanitize("...", fallback: "x") == "x")
        #expect(SafeFileName.sanitize("", fallback: "x") == "x")
        #expect(SafeFileName.sanitize("Отчёт 2026.pdf", fallback: "x") == "Отчёт 2026.pdf")
    }

    @Test func onlyRealIdsNameAttachmentFiles() async {
        #expect(UUIDv7.isValid(UUIDv7.make()))
        #expect(!UUIDv7.isValid("../../library.sqlite"))
        #expect(!UUIDv7.isValid(UUIDv7.make().uppercased()))
        let images = CoverImages.temporary()
        #expect(images.image("../../library.sqlite", noteId: "n") == nil)
        #expect(await images.file("../x", noteId: "n") == nil)
    }

    // 2) Erasing local data takes the decrypted attachments too.

    #if canImport(DSCore)
    @Test func erasingLocalDataRemovesAttachments() throws {
        let core = try CoreLibrary.inMemory()
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("wipe-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data("secret".utf8).write(to: directory.appendingPathComponent(UUIDv7.make()))
        try core.wipeLocalData(attachments: directory)
        #expect(try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty)
    }
    #endif

    // 3) Secrets on the clipboard stay on this device and expire.

    @Test func secretsOnTheClipboardExpire() {
        let now = Date(timeIntervalSince1970: 1_000)
        let options = SecretPasteboard.options(now)
        #expect(options[.localOnly] as? Bool == true)
        #expect(options[.expirationDate] as? Date == now.addingTimeInterval(60))
    }

    // 5) Huge images are refused before they are decoded.

    @Test func hugeImagesAreRefusedBeforeDecoding() {
        // A PNG header claiming 10 000 × 10 000 (100 MP) and no pixels.
        let png = Self.pngHeader(width: 10_000, height: 10_000)
        #expect(throws: CoverImages.CoverError.tooLarge) {
            _ = try CoverImages.jpeg(png, maxPixels: 2560, quality: 0.8)
        }
    }

    @Test func photosAreScaledToTheirLimit() throws {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let png = UIGraphicsImageRenderer(size: CGSize(width: 3000, height: 1500), format: format).image { context in
            UIColor.systemGreen.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 3000, height: 1500))
        }.pngData()!
        let jpeg = try CoverImages.jpeg(png, maxPixels: 1000, quality: 0.8)
        let image = try #require(UIImage(data: jpeg))
        #expect(image.size.width * image.scale == 1000)
        #expect(image.size.height * image.scale == 500)
    }

    // 6) Remote images of a paste: https only, never this device or its network.

    @Test func privateAddressesAreBlocked() {
        for address: [UInt8] in [[127, 0, 0, 1], [10, 1, 2, 3], [192, 168, 1, 1], [172, 16, 0, 1], [169, 254, 1, 1],
                                 [100, 64, 0, 1], [0, 0, 0, 0], [224, 0, 0, 1]] {
            #expect(!RemoteImageFetcher.isPublic(address), "\(address)")
        }
        #expect(RemoteImageFetcher.isPublic([8, 8, 8, 8]))
        #expect(RemoteImageFetcher.isPublic([93, 184, 216, 34]))
        var loopback6 = [UInt8](repeating: 0, count: 16); loopback6[15] = 1
        var linkLocal6 = [UInt8](repeating: 0, count: 16); linkLocal6[0] = 0xfe; linkLocal6[1] = 0x80
        var unique6 = [UInt8](repeating: 0, count: 16); unique6[0] = 0xfd
        var mapped6 = [UInt8](repeating: 0, count: 16); mapped6[10] = 0xff; mapped6[11] = 0xff
        mapped6[12] = 127; mapped6[15] = 1
        for address in [loopback6, linkLocal6, unique6, mapped6] { #expect(!RemoteImageFetcher.isPublic(address)) }
        let google6: [UInt8] = [0x20, 0x01, 0x48, 0x60, 0x48, 0x60, 0, 0, 0, 0, 0, 0, 0, 0, 0x88, 0x88]
        #expect(RemoteImageFetcher.isPublic(google6))
    }

    @Test func onlyHttpsToPublicHostsIsFetched() async {
        #expect(!(await RemoteImageFetcher.isAllowed(URL(string: "http://example.com/a.png")!)))
        #expect(!(await RemoteImageFetcher.isAllowed(URL(string: "https://localhost/a.png")!)))
        #expect(!(await RemoteImageFetcher.isAllowed(URL(string: "https://printer.local/a.png")!)))
        #expect(!(await RemoteImageFetcher.isAllowed(URL(string: "https://127.0.0.1/a.png")!)))
        #expect(!(await RemoteImageFetcher.isAllowed(URL(string: "https://192.168.0.10/a.png")!)))
    }

    // ios-core: a server lowering the password KDF, or sending unusable paths, is an error the
    // person can read, not a crash.

    #if canImport(DSCore)
    @Test func unsafeServerAnswersBecomeReadableErrors() {
        let kdf = ServerAccountService.map(CryptoError.unsafeKDF(ops: 1, mem: 8192))
        #expect(kdf as? Datascratch.AccountError == .unsafeServerParameters)
        let kept = ServerAccountService.map(Datascratch.AccountError.invalidRecoveryKey)
        #expect(kept as? Datascratch.AccountError == .invalidRecoveryKey)
    }

    /// D-53: only a revocation the server states erases the device; an expired token or a
    /// network error never does.
    @Test func onlyAStatedRevocationErasesTheDevice() {
        #expect(ServerConnection.isDeviceRevoked(APIError.server(status: 401, code: "device_revoked", message: "")))
        #expect(!ServerConnection.isDeviceRevoked(APIError.server(status: 401, code: "unauthorized", message: "")))
        #expect(!ServerConnection.isDeviceRevoked(APIError.notAuthenticated))
        #expect(!ServerConnection.isDeviceRevoked(APIError.transport("offline")))
        #expect(!ServerConnection.isDeviceRevoked(URLError(.notConnectedToInternet)))
    }
    #endif

    private static func pngHeader(width: UInt32, height: UInt32) -> Data {
        func be(_ v: UInt32) -> [UInt8] { [UInt8(v >> 24), UInt8(v >> 16 & 0xff), UInt8(v >> 8 & 0xff), UInt8(v & 0xff)] }
        func chunk(_ type: String, _ body: [UInt8]) -> [UInt8] {
            let typed = Array(type.utf8) + body
            return be(UInt32(body.count)) + typed + be(crc32(typed))
        }
        let ihdr = be(width) + be(height) + [8, 6, 0, 0, 0]
        // The first row only, as one stored (uncompressed) deflate block: a valid, truncated stream,
        // so ImageIO reads the header as it would for a real file still loading.
        let row = Int(width) * 4 + 1
        let idat: [UInt8] = [0x78, 0x01, 0x00, UInt8(row & 0xff), UInt8(row >> 8),
                             UInt8(~row & 0xff), UInt8((~row >> 8) & 0xff)] + [UInt8](repeating: 0, count: row)
        return Data([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] + chunk("IHDR", ihdr) + chunk("IDAT", idat))
    }

    private static func crc32(_ bytes: [UInt8]) -> UInt32 {
        var crc: UInt32 = 0xffff_ffff
        for byte in bytes {
            crc ^= UInt32(byte)
            for _ in 0..<8 { crc = crc & 1 == 1 ? (crc >> 1) ^ 0xedb8_8320 : crc >> 1 }
        }
        return ~crc
    }
}
