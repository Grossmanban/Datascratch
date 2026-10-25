import DSEditorModel
import Foundation
import Testing

/// The anchor encodings from `strokes/anchors.json` decode as Yjs item positions and re-encode
/// to the same bytes. Resolving them after Yjs updates needs Yrs — covered by the DSCore adapter.
@Suite struct AnchorVectorTests {
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../../../../../../packages/test-vectors/vectors").standardized

    static var available: Bool { FileManager.default.fileExists(atPath: root.appendingPathComponent("strokes/anchors.json").path) }

    static func base64url(_ s: String) -> Data {
        var b = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b.count % 4 != 0 { b += "=" }
        return Data(base64Encoded: b)!
    }

    @Test(.enabled(if: available)) func anchorsRoundTrip() throws {
        for name in ["strokes/anchors.json", "strokes/layout.json"] {
            let data = try Data(contentsOf: Self.root.appendingPathComponent(name))
            let file = try JSONSerialization.jsonObject(with: data) as! [String: Any]
            let indices = file["anchorIndices"] as! [Int]
            let anchors = (file["anchors"] as! [String]).map(Self.base64url)
            var clocks: [UInt32] = []
            for a in anchors {
                let decoded = try #require(RelativePositionCodec.decode(a))
                #expect(decoded.assoc == 0)
                #expect(RelativePositionCodec.encode(item: decoded.item, assoc: decoded.assoc) == a)
                clocks.append(decoded.item.clock)
            }
            // Consecutive characters of one insert have consecutive clocks.
            let offsets = zip(clocks, indices).map { Int($0) - $1 }
            #expect(Set(offsets).count == 1, "\(name)")
        }
    }
}
