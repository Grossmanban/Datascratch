import Foundation
import Testing
@testable import DSCore

/// Shared test vectors from `packages/test-vectors/vectors` (D-22): the same inputs must give
/// the same bytes in Swift and TypeScript.
enum Vectors {
    static let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // DSCoreTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // DSCore
        .deletingLastPathComponent() // Packages
        .deletingLastPathComponent() // ios
        .deletingLastPathComponent() // apps
        .deletingLastPathComponent() // repo
        .appendingPathComponent("packages/test-vectors/vectors")

    static var available: Bool { FileManager.default.fileExists(atPath: root.appendingPathComponent("crypto/kdf.json").path) }

    static func json(_ name: String) throws -> [String: Any] {
        let data = try Data(contentsOf: root.appendingPathComponent(name))
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    struct BadValue: Error {}

    static func b64(_ v: Any?) throws -> Data {
        guard let s = v as? String, let d = Base64URL.decode(s) else { throw BadValue() }
        return d
    }

    static func hex(_ v: Any?) throws -> Data {
        guard let s = v as? String, let d = Data(hex: s) else { throw BadValue() }
        return d
    }
}

/// Deep-compares JSON values (numbers compared as Double).
func jsonEqual(_ a: Any?, _ b: Any?) -> Bool {
    switch (a, b) {
    case (nil, nil): return true
    case (is NSNull, is NSNull): return true
    case (let x as [String: Any], let y as [String: Any]):
        return x.count == y.count && x.allSatisfy { k, v in y.keys.contains(k) && jsonEqual(v, y[k]) }
    case (let x as [Any], let y as [Any]):
        return x.count == y.count && zip(x, y).allSatisfy { jsonEqual($0, $1) }
    case (let x as String, let y as String): return x == y
    case (let x as Bool, let y as Bool) where type(of: a!) == type(of: b!): return x == y
    case (let x as NSNumber, let y as NSNumber): return x.doubleValue == y.doubleValue
    default: return false
    }
}

/// Canonical form: marks sorted by type (mark order is not significant).
func sortedMarks(_ v: Any) -> Any {
    if var d = v as? [String: Any] {
        if let marks = d["marks"] as? [[String: Any]] {
            d["marks"] = marks.sorted { ($0["type"] as? String ?? "") < ($1["type"] as? String ?? "") }
        }
        if let content = d["content"] as? [Any] { d["content"] = content.map(sortedMarks) }
        return d
    }
    return v
}

@Suite(.enabled(if: Vectors.available, "packages/test-vectors not present yet"))
struct CryptoVectorTests {
    @Test func kdf() throws {
        for c in try Vectors.json("crypto/kdf.json")["cases"] as! [[String: Any]] {
            let password = c["password"] as! String
            #expect(Data(password.precomposedStringWithCompatibilityMapping.utf8) == (try Vectors.hex(c["passwordNfkcUtf8"])))
            let kdf = c["kdf"] as! [String: Any]
            let keys = try DSCrypto.deriveKeys(password: password, salt: try Vectors.b64(c["salt"]),
                                               params: KDFParams(alg: kdf["alg"] as! String, ops: kdf["ops"] as! Int, mem: kdf["mem"] as! Int))
            #expect(keys.loginKey == (try Vectors.b64(c["loginKey"])), "\(password)")
            #expect(keys.passwordKey == (try Vectors.b64(c["passwordKey"])), "\(password)")
        }
    }

    @Test func envelopes() throws {
        let file = try Vectors.json("crypto/envelope.json")
        for c in file["cases"] as! [[String: Any]] {
            let key = try Vectors.b64(c["key"])
            let ad = c["ad"] as! String
            let env = try DSCrypto.seal(try Vectors.b64(c["plaintext"]), key: key, ad: ad, nonce: try Vectors.b64(c["nonce"]))
            #expect(env == (try Vectors.b64(c["envelope"])))
            #expect(try DSCrypto.open(env, key: key, ad: ad) == (try Vectors.b64(c["plaintext"])))
        }
        for f in file["failures"] as! [[String: Any]] {
            let expected: CryptoError = switch f["error"] as! String {
            case "decrypt_failed": .decryptionFailed
            case "unsupported_version": .unsupportedVersion(2)
            default: .malformedEnvelope
            }
            #expect(throws: expected, "\(f["case"]!)") {
                try DSCrypto.open(try Vectors.b64(f["envelope"]), key: try Vectors.b64(f["key"]), ad: f["ad"] as! String)
            }
        }
    }

    @Test func keyWraps() throws {
        let file = try Vectors.json("crypto/key-wraps.json")
        let ids = file["ids"] as! [String: String]
        for c in file["cases"] as! [[String: Any]] {
            let ad: String = switch c["name"] as! String {
            case "masterKey/password": CryptoAD.masterByPassword(userId: ids["userId"]!)
            case "masterKey/recovery": CryptoAD.masterByRecovery(userId: ids["userId"]!)
            case "notebookKey/master": CryptoAD.notebookKey(ids["notebookId"]!)
            case "notebookKey/server": CryptoAD.notebookServerKey(ids["notebookId"]!)
            default: CryptoAD.noteKey(ids["noteId"]!)
            }
            #expect(ad == c["ad"] as! String)
            let wrapped = try DSCrypto.wrapKey(try Vectors.b64(c["key"]), with: try Vectors.b64(c["wrappingKey"]), ad: ad, nonce: try Vectors.b64(c["nonce"]))
            #expect(wrapped == (try Vectors.b64(c["wrapped"])), "\(c["name"]!)")
            #expect(try DSCrypto.unwrapKey(wrapped, with: try Vectors.b64(c["wrappingKey"]), ad: ad) == (try Vectors.b64(c["key"])))
        }
    }

    @Test func recoveryKeys() throws {
        let file = try Vectors.json("crypto/recovery-key.json")
        for c in file["cases"] as! [[String: Any]] {
            let key = try Vectors.hex(c["recoveryKey"])
            #expect(try RecoveryKeyFormat.format(key) == c["text"] as! String)
            #expect(try DSCrypto.recoveryLoginKey(key) == (try Vectors.b64(c["recoveryLoginKey"])))
        }
        for p in file["parse"] as! [[String: Any]] {
            let input = p["input"] as! String
            if p["error"] != nil {
                #expect(throws: CryptoError.invalidRecoveryKey, "\(input)") { try RecoveryKeyFormat.parse(input) }
            } else {
                #expect(try RecoveryKeyFormat.parse(input) == (try Vectors.hex(p["recoveryKey"])), "\(input)")
            }
        }
    }

    @Test func attachmentChunks() throws {
        let file = try Vectors.json("crypto/attachment.json")
        let size = file["plaintextSize"] as! Int
        let plaintext = Data((0..<size).map { UInt8(($0 * 31 + 7) % 256) })
        #expect(DSCrypto.sha256(plaintext).hexString == file["plaintextSha256"] as! String)
        #expect(DSCrypto.chunkCount(plaintextSize: size) == file["chunkCount"] as! Int)
        let key = try Vectors.b64(file["noteKey"])
        let id = file["attachmentId"] as! String
        var envelopes: [Data] = []
        for c in file["chunks"] as! [[String: Any]] {
            let index = c["index"] as! Int
            let last = c["last"] as! Bool
            #expect(CryptoAD.attachmentChunk(id, index: index, last: last) == c["ad"] as! String)
            let start = index * DSCrypto.attachmentChunkSize
            let chunk = plaintext[start..<min(start + DSCrypto.attachmentChunkSize, size)]
            #expect(chunk.count == c["plaintextLength"] as! Int)
            let env = try DSCrypto.sealChunk(chunk, key: key, attachmentId: id, index: index, last: last, nonce: try Vectors.b64(c["nonce"]))
            #expect(env.count == c["envelopeLength"] as! Int)
            #expect(DSCrypto.sha256(env).hexString == c["envelopeSha256"] as! String)
            envelopes.append(env)
        }
        #expect(try DSCrypto.openAttachment(envelopes, key: key, attachmentId: id) == plaintext)
    }

    @Test func uuidv7() throws {
        for c in try Vectors.json("ids/uuidv7.json")["cases"] as! [[String: Any]] {
            let ms = UInt64((c["unixMs"] as! NSNumber).int64Value)
            let id = EntityID.make(milliseconds: ms, random: [UInt8](try Vectors.hex(c["rand"])))
            #expect(id == c["uuid"] as! String)
            #expect(EntityID.isValid(id))
        }
    }
}

@Suite(.enabled(if: Vectors.available, "packages/test-vectors not present yet"))
struct StrokeVectorTests {
    @Test func points() throws {
        let file = try Vectors.json("strokes/points.json")
        let points = (file["points"] as! [[String: Double]]).map {
            StrokePoint(anchor: Int($0["a"]!), x: Float($0["x"]!), y: Float($0["y"]!), pressure: Float($0["pressure"]!),
                        altitude: Float($0["altitude"]!), azimuth: Float($0["azimuth"]!), roll: Float($0["roll"]!), t: Float($0["t"]!))
        }
        let packed = StrokeCodec.pack(points)
        #expect(packed.hexString == file["packedHex"] as! String)
        #expect(try StrokeCodec.unpack(packed) == points)
    }

    @Test func width() throws {
        for c in try Vectors.json("strokes/width.json")["cases"] as! [[String: Any]] {
            let tool = Stroke.Tool(rawValue: c["tool"] as! String)!
            let scale = c["scale"] as! [String: Double]
            let kind: Stroke.AnchorKind = scale["fontSize"] != nil ? .text : .block
            let w = StrokeMetrics.width(base: c["width"] as! Double, tool: tool, anchorKind: kind, pressure: c["pressure"] as! Double,
                                        altitude: c["altitude"] as! Double, scaleBase: scale["fontSize"] ?? scale["blockWidth"]!)
            #expect(abs(StrokeMetrics.pressureFactor(c["pressure"] as! Double) - (c["f"] as! Double)) < 1e-4)
            #expect(abs(w - (c["result"] as! Double)) < 1e-4, "\(c)")
        }
    }

    /// Relative positions of characters, after remote inserts/deletes (D-35).
    @Test func anchors() throws {
        let file = try Vectors.json("strokes/anchors.json")
        let doc = CRDTDocument(kind: .note, docId: "n")
        try doc.applyUpdate(try Vectors.b64(file["base"]))
        #expect(try doc.xmlNode(at: [0, 0]).textContent == file["textBefore"] as! String)
        let anchors = try (file["anchors"] as! [String]).map { try #require(Base64URL.decode($0)) }
        for (i, index) in (file["anchorIndices"] as! [Int]).enumerated() {
            #expect(try doc.relativePosition(at: [0, 0], index: UInt32(index)) == anchors[i])
        }
        for step in file["steps"] as! [[String: Any]] {
            try doc.applyUpdate(try Vectors.b64(step["update"]))
            #expect(try doc.xmlNode(at: [0, 0]).textContent == step["textAfter"] as! String)
            let resolved = try doc.resolve(relativePositions: anchors)
            for (r, expected) in zip(resolved, step["anchors"] as! [[String: Any]]) {
                let r = try #require(r)
                #expect(r.deleted == expected["deleted"] as! Bool, "\(step["description"]!)")
                if let index = expected["index"] as? Int { #expect(Int(r.index) == index, "\(step["description"]!)") }
            }
        }
    }

    /// Reference monospace layout: x = (i mod perLine)·10, baseline = ⌊i/perLine⌋·24 + 17.
    @Test func layout() throws {
        let file = try Vectors.json("strokes/layout.json")
        let doc = CRDTDocument(kind: .note, docId: "n")
        try doc.applyUpdate(try Vectors.b64(file["base"]))
        let anchors = try (file["anchors"] as! [String]).map { try #require(Base64URL.decode($0)) }
        let points = try StrokeCodec.unpack(try Vectors.b64(file["points"]))
        let spec = file["stroke"] as! [String: Any]
        let stroke = Stroke(tool: .init(rawValue: spec["tool"] as! String)!, color: "ink.black", width: spec["width"] as! Double,
                            anchorKind: .text, anchors: anchors, points: points, author: Author(kind: .user, id: "u"))

        func layout(perLine: Int) throws -> [[[String: Double]]] {
            let resolved = try doc.resolve(relativePositions: anchors)
            let segments = stroke.segments(resolved: resolved) { a in resolved[a].map { Int($0.index) / perLine } }
            return segments.map { seg in
                seg.pointIndices.map { i in
                    let p = points[i]
                    let index = Int(resolved[p.anchor]!.index)
                    let x = Double(index % perLine) * 10 + Double(p.x) * 17
                    let y = Double(index / perLine) * 24 + 17 + Double(p.y) * 17
                    let w = StrokeMetrics.width(base: stroke.width, tool: stroke.tool, anchorKind: .text, pressure: Double(p.pressure),
                                                altitude: Double(p.altitude), scaleBase: 17)
                    return ["x": x, "y": y, "width": w]
                }
            }
        }

        func matches(_ actual: [[[String: Double]]], _ expected: Any?) -> Bool {
            guard let exp = expected as? [[[String: Double]]], exp.count == actual.count else { return false }
            return zip(actual, exp).allSatisfy { a, e in
                a.count == e.count && zip(a, e).allSatisfy { p, q in ["x", "y", "width"].allSatisfy { abs(p[$0]! - q[$0]!) < 1e-3 } }
            }
        }

        for c in file["cases"] as! [[String: Any]] {
            #expect(matches(try layout(perLine: c["perLine"] as! Int), c["segments"]), "perLine \(c["perLine"]!)")
        }
        // Delete the character at index 4 (the anchor of the third point).
        try doc.transact(origin: .remote) { $0.deleteText(at: 4, length: 1, in: [0, 0]) }
        let after = file["afterDeletingIndex4"] as! [String: Any]
        #expect(matches(try layout(perLine: 1000), after["segments"]))
    }
}

@Suite(.enabled(if: Vectors.available, "packages/test-vectors not present yet"))
struct DocumentVectorTests {
    @Test func referenceNote() throws {
        let file = try Vectors.json("document/note.json")
        let noteId = file["noteId"] as! String
        let note = NoteDocument(noteId: noteId)
        try note.crdt.applyUpdate(try Vectors.b64(file["update"]))
        let expected = file["expected"] as! [String: Any]

        #expect(jsonEqual(sortedMarks(try note.contentJSON()), sortedMarks(expected["content"]!)))
        #expect(jsonEqual(note.crdt.mapValue("meta")?.jsonObject, expected["meta"]))
        #expect(jsonEqual(note.crdt.mapValue("strokes")?.jsonObject, expected["strokes"]))
        #expect(jsonEqual(note.crdt.mapValue("comments")?.jsonObject, expected["comments"]))

        // Typed readers agree with the plain JSON.
        let strokes = note.strokes()
        #expect(strokes.count == (expected["strokes"] as! [String: Any]).count)
        for s in strokes {
            #expect(jsonEqual(YValue.sharedMap(entries: s.fields).jsonObject, (expected["strokes"] as! [String: Any])[s.id]))
        }
        #expect(note.comments().map(\.id) == Array((expected["comments"] as! [String: Any]).keys))

        let derived = try note.derived()
        let d = expected["derived"] as! [String: Any]
        #expect(derived.title == d["title"] as! String)
        #expect(derived.plainText == d["plainText"] as! String)
        #expect(derived.tags == d["tags"] as! [String])
        let tasks = derived.tasks.map { t -> [String: Any] in
            ["noteId": t.noteId, "taskId": t.taskId, "blockId": t.blockId ?? NSNull(), "text": t.text, "state": t.state.rawValue,
             "scheduled": t.scheduled ?? NSNull(), "deadline": t.deadline ?? NSNull()]
        }
        #expect(jsonEqual(tasks, d["tasks"]))
        let links = derived.links.map { l -> [String: Any] in
            ["fromNoteId": l.sourceNoteId, "toNoteId": l.targetNoteId, "blockId": l.blockId ?? NSNull(), "label": l.label]
        }
        #expect(jsonEqual(links, d["links"]))

        // The vector marks the paragraph with block-anchored handwriting explicitly.
        let markdown = MarkdownExport.render(try note.blocks(), options: .init(blocksWithHandwriting: ["0192f3c4-0000-7000-8000-000000000065"]))
        #expect(markdown == d["markdown"] as! String)

        // Round trip: writing the blocks back through the iOS writer gives the same JSON.
        let copy = NoteDocument(noteId: noteId)
        try copy.insertBlocks(try note.blocks(), at: 0)
        #expect(jsonEqual(sortedMarks(try copy.contentJSON()), sortedMarks(expected["content"]!)))
    }

    @Test func referenceNotebook() throws {
        let file = try Vectors.json("document/notebook.json")
        let nb = NotebookDocument(notebookId: file["notebookId"] as! String)
        try nb.crdt.applyUpdate(try Vectors.b64(file["update"]))
        let expected = file["expected"] as! [String: Any]
        for root in ["meta", "folders", "notes", "tags"] {
            #expect(jsonEqual(nb.crdt.mapValue(root)?.jsonObject, expected[root]), "\(root)")
        }
        // Typed records write back the same fields.
        for f in nb.folders() { #expect(jsonEqual(YValue.object(entries: f.fields).jsonObject, (expected["folders"] as! [String: Any])[f.id])) }
        for n in nb.notes() { #expect(jsonEqual(YValue.object(entries: n.fields).jsonObject, (expected["notes"] as! [String: Any])[n.id])) }
        #expect(nb.dailyNote(for: "2026-10-25") != nil)
    }

    @Test func referenceAccount() throws {
        let file = try Vectors.json("document/account.json")
        let acc = AccountDocument(accountDocId: EntityID.make())
        try acc.crdt.applyUpdate(try Vectors.b64(file["update"]))
        let expected = file["expected"] as! [String: Any]
        for root in ["meta", "spaces", "notebooks", "settings"] {
            #expect(jsonEqual(acc.crdt.mapValue(root)?.jsonObject, expected[root]), "\(root)")
        }
        for root in ["starred", "tabs"] {
            #expect(jsonEqual(acc.crdt.arrayValues(root).map(\.jsonObject), expected[root]), "\(root)")
        }
        for s in acc.spaces() { #expect(jsonEqual(YValue.object(entries: s.fields).jsonObject, (expected["spaces"] as! [String: Any])[s.id])) }
        for n in acc.notebooks() { #expect(jsonEqual(YValue.object(entries: n.fields).jsonObject, (expected["notebooks"] as! [String: Any])[n.id])) }
        #expect(acc.starred() == [StarredItem(kind: .note, id: "0192f3c4-0000-7000-8000-000000000001")])
        #expect(acc.tabs() == ["0192f3c4-0000-7000-8000-000000000001"])
    }
}

@Suite(.enabled(if: Vectors.available, "packages/test-vectors not present yet"))
struct SyncVectorTests {
    @Test func messages() throws {
        let file = try Vectors.json("sync/messages.json")
        let valid = file["valid"] as! [String: [[String: Any]]]
        let invalid = file["invalid"] as! [String: [[String: Any]]]
        func data(_ o: Any) throws -> Data { try JSONSerialization.data(withJSONObject: o, options: [.sortedKeys]) }

        for m in valid["client"]! {
            let msg = try JSONDecoder().decode(ClientMessage.self, from: try data(m))
            // Re-encoding gives the same JSON.
            let back = try JSONSerialization.jsonObject(with: try JSONEncoder.sync.encode(msg))
            #expect(jsonEqual(back, m), "\(m)")
        }
        for m in valid["server"]! {
            let msg = try #require(SyncFrame.decode(String(decoding: try data(m), as: UTF8.self)), "\(m)")
            let back = try JSONSerialization.jsonObject(with: try JSONEncoder.sync.encode(msg))
            #expect(jsonEqual(back, m), "\(m)")
        }
        for c in invalid["client"]! {
            #expect(throws: (any Error).self, "\(c["reason"]!)") { try JSONDecoder().decode(ClientMessage.self, from: try data(c["message"]!)) }
        }
        for c in invalid["server"]! {
            #expect(SyncFrame.decode(String(decoding: try data(c["message"]!), as: UTF8.self)) == nil, "\(c["reason"]!)")
        }
    }
}

@Suite(.enabled(if: Vectors.available, "packages/test-vectors not present yet"))
struct EncodingVectorTests {
    @Test(.enabled(if: FileManager.default.fileExists(atPath: Vectors.root.appendingPathComponent("crypto/base64url.json").path)))
    func base64url() throws {
        let file = try Vectors.json("crypto/base64url.json")
        for c in file["encode"] as! [[String: String]] {
            let data = try Vectors.hex(c["hex"])
            #expect(Base64URL.encode(data) == c["base64url"]!)
            #expect(Base64URL.decode(c["base64url"]!) == data)
        }
        for r in file["rejectDecode"] as! [[String: String]] {
            #expect(Base64URL.decode(r["input"]!) == nil, "\(r["reason"]!)")
        }
    }

    /// REST bodies: valid ones decode, invalid ones are rejected (api/bodies.json).
    @Test(.enabled(if: FileManager.default.fileExists(atPath: Vectors.root.appendingPathComponent("api/bodies.json").path)))
    func restBodies() throws {
        let cases = try Vectors.json("api/bodies.json")["cases"] as! [String: [String: Any]]
        let decoders: [String: (Data) throws -> Void] = [
            "preloginRequest": { _ = try JSONDecoder().decode(PreloginRequest.self, from: $0) },
            "preloginResponse": { _ = try JSONDecoder().decode(PreloginResponse.self, from: $0) },
            "signupRequest": { _ = try JSONDecoder().decode(SignupRequest.self, from: $0) },
            "loginRequest": { _ = try JSONDecoder().decode(LoginRequest.self, from: $0) },
            "session": { _ = try JSONDecoder().decode(AuthSession.self, from: $0) },
            "recoveryFinishRequest": { _ = try JSONDecoder().decode(RecoveryFinishRequest.self, from: $0) },
            "createNotebookRequest": { _ = try JSONDecoder().decode(CreateNotebookRequest.self, from: $0) },
            "registerDocRequest": { _ = try JSONDecoder().decode(RegisterDocRequest.self, from: $0) },
            "attachmentStatus": { _ = try JSONDecoder().decode(AttachmentStatus.self, from: $0) },
            "createShareRequest": { _ = try JSONDecoder().decode(CreateShareRequest.self, from: $0) },
            "apiError": { _ = try JSONDecoder().decode(APIErrorBody.self, from: $0) },
        ]
        for (name, c) in cases {
            guard let decode = decoders[name] else {
                Issue.record("no Swift type for \(name)")
                continue
            }
            for body in c["valid"] as! [Any] {
                #expect(throws: Never.self, "\(name) valid") { try decode(try JSONSerialization.data(withJSONObject: body)) }
            }
            for inv in c["invalid"] as! [[String: Any]] {
                #expect(throws: (any Error).self, "\(name): \(inv["reason"]!)") { try decode(try JSONSerialization.data(withJSONObject: inv["body"]!)) }
            }
        }
    }
}
