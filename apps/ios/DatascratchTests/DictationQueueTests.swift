import Foundation
import Testing
@testable import Datascratch

/// A service whose answers the test lets out one by one.
private actor GatedVoiceService: VoiceService {
    private var gates: [String: CheckedContinuation<Void, Never>] = [:]
    private var opened: Set<String> = []
    var error: VoiceError?

    func setError(_ error: VoiceError?) { self.error = error }

    func open(_ name: String) {
        opened.insert(name)
        gates.removeValue(forKey: name)?.resume()
    }

    private func wait(_ name: String) async {
        if opened.contains(name) { return }
        await withCheckedContinuation { gates[name] = $0 }
    }

    nonisolated func me() async throws -> VoiceAccess { VoiceAccess(enabled: true) }

    nonisolated func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript {
        let name = audio.lastPathComponent
        await wait(name)
        if let error = await error { throw error }
        return VoiceTranscript(durationSec: 1, turns: [VoiceTurn(speaker: "S1", start: 0, end: 1, text: "server \(name)")])
    }

    nonisolated func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> String {
        text.capitalizedFirst
    }
}

@MainActor
private final class TextSink: DictationTarget {
    var inserted: [String] = []
    var preview: String?
    func showDictationPreview(_ text: String?) { preview = text }
    func insertDictation(_ text: String) { inserted.append(text) }
}

@MainActor
struct DictationQueueTests {
    private func make() -> (DictationQueue, GatedVoiceService, TextSink) {
        let service = GatedVoiceService()
        let queue = DictationQueue(service: service) { (.standard, .keep) }
        let sink = TextSink()
        queue.target = sink
        return (queue, service, sink)
    }

    private func settle(_ queue: DictationQueue, until done: @escaping () -> Bool) async {
        for _ in 0..<200 where !done() { try? await Task.sleep(for: .milliseconds(10)) }
    }

    /// Pieces go in in the order they were spoken, even when the second comes back first; the
    /// preview shows what is heard and not in yet.
    @Test func piecesGoInInTheOrderSpoken() async {
        let (queue, service, sink) = make()
        let first = queue.begin()
        queue.heard("one", in: first)
        queue.finish(first, audio: URL(fileURLWithPath: "/tmp/a.m4a"))
        let second = queue.begin()
        queue.heard("two", in: second)
        #expect(sink.preview == "one two")
        queue.finish(second, audio: URL(fileURLWithPath: "/tmp/b.m4a"))

        await service.open("b.m4a")
        try? await Task.sleep(for: .milliseconds(100))
        #expect(sink.inserted.isEmpty, "the second piece waits for the first")
        await service.open("a.m4a")
        await settle(queue) { sink.inserted.count == 2 }
        #expect(sink.inserted == ["Server a.m4a", "Server b.m4a"])
        #expect(sink.preview == nil)
        #expect(!queue.isBusy)
    }

    /// A cancelled piece leaves nothing, and the ones after it are not held up by it.
    @Test func cancelledPieceLeavesNothing() async {
        let (queue, service, sink) = make()
        let first = queue.begin()
        queue.heard("drop me", in: first)
        let second = queue.begin()
        queue.heard("keep", in: second)
        queue.finish(second, audio: URL(fileURLWithPath: "/tmp/c.m4a"))
        queue.cancel(first)
        #expect(sink.preview == "keep")
        await service.open("c.m4a")
        await settle(queue) { !sink.inserted.isEmpty }
        #expect(sink.inserted == ["Server c.m4a"])
    }

    /// Offline: what the device heard goes in, with a note that it will be refined.
    @Test func offlineKeepsWhatTheDeviceHeard() async {
        let (queue, service, sink) = make()
        await service.setError(.offline)
        let piece = queue.begin()
        queue.heard("heard here", in: piece)
        queue.finish(piece, audio: URL(fileURLWithPath: "/tmp/d.m4a"))
        await service.open("d.m4a")
        await settle(queue) { !sink.inserted.isEmpty }
        #expect(sink.inserted == ["heard here"])
        #expect(queue.notice == .offline)
    }

    /// Closing the document drops whatever is not in the text yet.
    @Test func cancelAllDropsEverything() async {
        let (queue, service, sink) = make()
        let piece = queue.begin()
        queue.heard("late", in: piece)
        queue.finish(piece, audio: URL(fileURLWithPath: "/tmp/e.m4a"))
        queue.cancelAll()
        await service.open("e.m4a")
        try? await Task.sleep(for: .milliseconds(100))
        #expect(sink.inserted.isEmpty)
        #expect(sink.preview == nil)
    }

    @Test func serverErrorCodes() {
        #expect(VoiceError.from(code: "voice_disabled", status: 403) == .disabled)
        #expect(VoiceError.from(code: "voice_quota", status: 429) == .quota)
        #expect(VoiceError.from(code: "voice_too_long", status: 413) == .tooLong)
        #expect(VoiceError.from(code: "voice_upstream", status: 502) == .upstream)
        #expect(VoiceError.from(code: "voice_unavailable", status: 503) == .unavailable)
        #expect(VoiceError.from(code: "http_503", status: 503) == .unavailable, "an unknown code goes by its status")
        #expect(VoiceError.from(code: "bad_audio", status: 400) == .failed("bad_audio"))
    }

    /// While the server works on a piece, the screen says which step it is at.
    @Test func stageFollowsTheEarliestPiece() async {
        let (queue, service, sink) = make()
        let piece = queue.begin()
        #expect(queue.stage == nil, "recording: no server step")
        queue.heard("x", in: piece)
        queue.finish(piece, audio: URL(fileURLWithPath: "/tmp/f.m4a"))
        #expect(queue.stage == .recognising)
        await service.open("f.m4a")
        await settle(queue) { !sink.inserted.isEmpty }
        #expect(queue.stage == nil)
    }

    /// The contract's vectors (test-vectors/vectors/api/bodies.json).
    @Test func contractVectorsDecode() throws {
        let me = try JSONDecoder().decode(VoiceAccess.self, from: Data(#"{"enabled":true,"monthlyMinutes":600,"usedMinutes":12.5,"resetsAt":"2026-12-01T00:00:00.000Z"}"#.utf8))
        #expect(me.enabled && me.available && !me.isAdmin && me.minutesLeft == 587, "a server from before available/isAdmin")
        let full = try JSONDecoder().decode(VoiceAccess.self, from: Data(#"{"enabled":true,"available":false,"monthlyMinutes":600,"usedMinutes":0,"resetsAt":"2026-12-01T00:00:00.000Z","isAdmin":true}"#.utf8))
        #expect(!full.isUsable && full.isAdmin)
        #expect((try? JSONDecoder().decode(VoiceAccess.self, from: Data(#"{"enabled":true,"monthlyMinutes":600,"usedMinutes":0}"#.utf8))) == nil,
                "resetsAt is required")
        let transcript = try JSONDecoder().decode(VoiceTranscript.self, from: Data(#"{"durationSec":9,"turns":[{"speaker":"S1","start":0,"end":4.2,"text":"Давай во вторник."},{"speaker":"S2","start":4.5,"end":9,"text":"Лучше в среду."}]}"#.utf8))
        #expect(transcript.text == "Давай во вторник. Лучше в среду.")
        #expect(try JSONDecoder().decode(VoiceTranscript.self, from: Data(#"{"durationSec":0,"turns":[]}"#.utf8)).text.isEmpty)
    }
}
