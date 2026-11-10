import Foundation
import Testing
@testable import Datascratch

/// A server that fails recognition a set number of times, and tidying when told to.
private nonisolated final class ScriptedVoice: VoiceService, @unchecked Sendable {
    private let lock = NSLock()
    private var failsLeft: Int
    private var cleanFails: Bool
    private var cleanError: VoiceError
    private var delay: Duration
    private(set) var transcribeCalls = 0

    init(transcribeFails: Int = 0, cleanFails: Bool = false, cleanError: VoiceError = .upstream, delay: Duration = .zero) {
        failsLeft = transcribeFails
        self.cleanFails = cleanFails
        self.cleanError = cleanError
        self.delay = delay
    }

    func set(transcribeFails: Int) { lock.withLock { failsLeft = transcribeFails } }
    var calls: Int { lock.withLock { transcribeCalls } }

    func me() async throws -> VoiceAccess { VoiceAccess(enabled: true) }

    func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript {
        if delay > .zero { try await Task.sleep(for: delay) }
        let fail = lock.withLock { () -> Bool in
            transcribeCalls += 1
            guard failsLeft > 0 else { return false }
            failsLeft -= 1
            return true
        }
        if fail { throw VoiceError.upstream }
        return VoiceTranscript(durationSec: 161, turns: [VoiceTurn(speaker: "S1", start: 0, end: 161, text: "um the long piece")])
    }

    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> VoiceText {
        if lock.withLock({ cleanFails }) { throw lock.withLock { cleanError } }
        return VoiceText(markdown: text.replacingOccurrences(of: "um ", with: "").capitalizedFirst + ".")
    }
}

@MainActor
private final class NoteText: DictationTarget {
    var inserted: [String] = []
    func showDictationPreview(_ text: String?) {}
    func insertDictation(_ text: String) { inserted.append(text) }
}

@MainActor
struct DictationInboxTests {
    private let directory = FileManager.default.temporaryDirectory
        .appendingPathComponent("inbox-tests-\(UUID().uuidString)", isDirectory: true)

    private func inbox(_ service: ScriptedVoice?) -> DictationInbox {
        let inbox = DictationInbox(directory: directory, service: { service }) { (.standard, .keep) }
        inbox.backoff = [.milliseconds(20), .milliseconds(20), .milliseconds(20)]
        return inbox
    }

    private func recording() throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("rec-\(UUID().uuidString).m4a")
        try Data([1, 2, 3, 4]).write(to: url)
        return url
    }

    private func queue(_ inbox: DictationInbox, _ service: ScriptedVoice, _ note: NoteText) -> DictationQueue {
        let queue = DictationQueue(service: service) { (.standard, .keep) }
        queue.target = note
        queue.inbox = inbox
        queue.noteId = "note-1"
        return queue
    }

    private func settle(until done: @escaping () -> Bool) async {
        for _ in 0..<300 where !done() { try? await Task.sleep(for: .milliseconds(10)) }
    }

    /// The owner's bug: recognition failed and the long piece was gone. Now the recording stays,
    /// with the cause, and «Retry» puts its text in the note.
    @Test func failedRecognitionKeepsTheRecording() async throws {
        let service = ScriptedVoice(transcribeFails: 100)
        let inbox = inbox(service)
        inbox.backoff = []
        let note = NoteText()
        let queue = queue(inbox, service, note)
        let piece = queue.begin()
        queue.finish(piece, audio: try recording())
        await settle { inbox.items.first?.attempts == 1 }

        #expect(note.inserted.isEmpty)
        let item = try #require(inbox.items.first)
        #expect(item.noteId == "note-1")
        #expect(item.lastError == "voice_upstream")
        #expect(FileManager.default.fileExists(atPath: inbox.audioURL(item.id).path), "the recording is kept")
        #expect(queue.notice == .upstream)
        #expect(!queue.isBusy, "pieces after it are not held up")

        service.set(transcribeFails: 0)
        inbox.attach(noteId: "note-1") { text in note.inserted.append(text); return true }
        inbox.retry(item.id)
        await settle { inbox.items.isEmpty }
        #expect(note.inserted == ["The long piece."])
        #expect(!FileManager.default.fileExists(atPath: inbox.audioURL(item.id).path), "in the note: the recording goes")
    }

    /// Tidying failed: the transcript goes in as heard, with a word about it — not nothing.
    @Test func failedTidyingInsertsTheTranscript() async throws {
        let service = ScriptedVoice(cleanFails: true)
        let inbox = inbox(service)
        let note = NoteText()
        let queue = queue(inbox, service, note)
        let piece = queue.begin()
        queue.finish(piece, audio: try recording())
        await settle { !note.inserted.isEmpty }
        #expect(note.inserted == ["um the long piece"])
        #expect(queue.notice == .untidied("voice_upstream"))
        #expect(inbox.items.isEmpty)
    }

    /// The owner's case (build 45): tidying a 1–2 minute piece took longer than the phone waited.
    /// A timeout on the tidy step keeps the transcript, and the wait is above the server's.
    @Test func tidyingTimeoutKeepsTheTranscript() async throws {
        let service = ScriptedVoice(cleanFails: true, cleanError: .timeout)
        let inbox = inbox(service)
        let note = NoteText()
        let queue = queue(inbox, service, note)
        let piece = queue.begin()
        queue.finish(piece, audio: try recording())
        await settle { !note.inserted.isEmpty }
        #expect(note.inserted == ["um the long piece"])
        #expect(queue.notice == .untidied("timeout"))
        #expect(inbox.items.isEmpty)
        #expect(ServerVoiceService.textTimeout >= 20 * 60)
    }

    /// The records outlive the app: a new inbox over the same folder has them.
    @Test func recordingsSurviveARestart() throws {
        let first = inbox(nil)
        let kept = try #require(first.keep(audio: try recording(), noteId: "note-1", heard: "heard", duration: 161))
        let second = inbox(nil)
        #expect(second.items.map(\.id) == [kept.id])
        #expect(second.items.first?.duration == 161)
        #expect(FileManager.default.fileExists(atPath: second.audioURL(kept.id).path))
    }

    /// Closing the note while a piece is on its way: it is recognised anyway and waits for the
    /// note (its card offers «Insert»).
    @Test func closingTheNoteKeepsThePiece() async throws {
        let service = ScriptedVoice(delay: .milliseconds(100))
        let inbox = inbox(service)
        let note = NoteText()
        let queue = queue(inbox, service, note)
        let piece = queue.begin()
        queue.finish(piece, audio: try recording())
        queue.cancelAll()
        await settle { inbox.items.first?.text != nil }
        #expect(note.inserted.isEmpty)
        #expect(inbox.items.first?.text == "The long piece.")
    }

    /// Three retries by themselves, with pauses; then it waits for «Retry».
    @Test func retriesThreeTimesThenWaits() async throws {
        let service = ScriptedVoice(transcribeFails: 100)
        let inbox = inbox(service)
        let note = NoteText()
        let queue = queue(inbox, service, note)
        let piece = queue.begin()
        queue.finish(piece, audio: try recording())
        await settle { inbox.items.first?.attempts == 4 }
        try? await Task.sleep(for: .milliseconds(150))
        #expect(inbox.items.first?.attempts == 4, "the first try and three retries")
        #expect(service.calls == 4)
    }

    /// A retry that gets through on its own reaches the open note.
    @Test func automaticRetryReachesTheNote() async throws {
        let service = ScriptedVoice(transcribeFails: 2)
        let inbox = inbox(service)
        let note = NoteText()
        inbox.attach(noteId: "note-1") { text in note.inserted.append(text); return true }
        let queue = queue(inbox, service, note)
        let piece = queue.begin()
        queue.finish(piece, audio: try recording())
        await settle { inbox.items.isEmpty }
        #expect(note.inserted == ["The long piece."])
    }

    /// The cause is a code people (and Diagnostics) can read.
    @Test func errorCodes() {
        #expect(VoiceError.offline.code == "network")
        #expect(VoiceError.timeout.code == "timeout")
        #expect(VoiceError.upstream.code == "voice_upstream")
        #expect(VoiceError.tooLong.code == "voice_too_long")
        #expect(VoiceError.failed("url_-1001").code == "url_-1001")
        #expect(ServerVoiceService.transcribeTimeout >= 15 * 60)
    }
}
