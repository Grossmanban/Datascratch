import Foundation
import Testing
@testable import Datascratch

/// A note in memory: Markdown in, a suggestion out, undo back.
@MainActor
private final class NoteSink: FormatTarget {
    var body = "milk and bread"
    var selection: String?
    var hasSuggestion = false
    var replaced: [(String, Bool)] = []
    private var before: String?

    var selectedMarkdown: String? { selection }
    var documentMarkdown: String { body }

    func replaceWithFormatted(_ markdown: String, selection: Bool) {
        replaced.append((markdown, selection))
        before = body
        body = markdown
        hasSuggestion = true
    }

    func undoFormatting() {
        if let before { body = before }
        hasSuggestion = false
    }
}

private nonisolated struct StyleEcho: VoiceService {
    var error: VoiceError?
    func me() async throws -> VoiceAccess { VoiceAccess(enabled: true) }
    func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript {
        VoiceTranscript(durationSec: 0, turns: [])
    }
    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> String {
        if let error { throw error }
        return "## \(style?.rawValue ?? "-") (\(task.rawValue))\n\n\(text)"
    }
}

@MainActor
struct VoiceFormatterTests {
    private func make(_ service: StyleEcho = StyleEcho()) -> (VoiceFormatter, NoteSink) {
        let formatter = VoiceFormatter(service: service) { (.standard, .keep) }
        let sink = NoteSink()
        formatter.target = sink
        return (formatter, sink)
    }

    private func settle(_ done: () -> Bool) async {
        for _ in 0..<200 where !done() { try? await Task.sleep(for: .milliseconds(10)) }
    }

    /// Without a selection the whole note goes, in the picked style, as `format`.
    @Test func formatsTheWholeNote() async {
        let (formatter, sink) = make()
        formatter.format(style: .plan)
        #expect(formatter.phase == .working)
        await settle { formatter.phase != .working }
        #expect(sink.replaced.count == 1)
        #expect(sink.replaced.first?.0 == "## plan (format)\n\nmilk and bread")
        #expect(sink.replaced.first?.1 == false)
        #expect(formatter.phase == .done)
        #expect(formatter.original == "milk and bread")
    }

    /// With a selection only it goes, and only it is replaced.
    @Test func formatsTheSelection() async {
        let (formatter, sink) = make()
        sink.selection = "bread"
        #expect(formatter.appliesToSelection)
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        #expect(sink.replaced.first?.0 == "## document (format)\n\nbread")
        #expect(sink.replaced.first?.1 == true)
    }

    /// «Reject» puts the note back while nothing else changed.
    @Test func rejectUndoes() async {
        let (formatter, sink) = make()
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        formatter.reject()
        #expect(sink.body == "milk and bread")
        #expect(formatter.phase == .idle)
        #expect(formatter.original == nil)
    }

    /// Typing after the result: the bar goes, and «Reject» would not undo the person's typing.
    @Test func typingEndsTheOffer() async {
        let (formatter, sink) = make()
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        sink.body += " and eggs"
        formatter.documentChanged()
        #expect(formatter.phase == .idle)
        formatter.reject()
        #expect(sink.body.hasSuffix("and eggs"), "nothing was undone")
    }

    /// The text changed while the server worked: nothing is replaced, and it says so.
    @Test func changedMeanwhileReplacesNothing() async {
        let (formatter, sink) = make()
        formatter.format(style: .document)
        sink.body = "something else"
        await settle { formatter.phase != .working }
        #expect(sink.replaced.isEmpty)
        #expect(formatter.message != nil)
    }

    /// Offline: nothing changes, a calm line about the server.
    @Test func offlineChangesNothing() async {
        let (formatter, sink) = make(StyleEcho(error: .offline))
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        #expect(sink.replaced.isEmpty)
        #expect(formatter.message == VoiceError.offline.formatMessage)
    }

    /// An empty note: nothing goes to the server.
    @Test func emptyNoteSendsNothing() {
        let (formatter, sink) = make()
        sink.body = "  \n"
        formatter.format(style: .document)
        #expect(formatter.phase == .idle)
        #expect(formatter.message != nil)
    }
}
