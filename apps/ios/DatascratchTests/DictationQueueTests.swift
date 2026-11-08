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

    nonisolated func transcribe(audio: URL, mode: VoiceMode, quality: VoiceQuality) async throws -> VoiceTranscript {
        let name = audio.lastPathComponent
        await wait(name)
        if let error = await error { throw error }
        return VoiceTranscript(durationSec: 1, turns: [VoiceTurn(text: "server \(name)")])
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
        #expect(VoiceError.from(code: "voice_quota_exceeded", status: 402) == .quota)
        #expect(VoiceError.from(code: "rate_limited", status: 429) == .quota)
        #expect(VoiceError.from(code: "bad_audio", status: 400) == .failed("bad_audio"))
    }
}
