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
    var noteTitle = ""
    var isUntitled: Bool { noteTitle.isEmpty || noteTitle == "Note Nov 9, 2026" }
    var canSetTitle = true
    /// Undo steps: what the body, title and suggestion flag were before each.
    private var undo: [(body: String, title: String, suggestion: Bool)] = []

    var selectedMarkdown: String? { selection }
    var documentMarkdown: String { body }

    func replaceWithFormatted(_ markdown: String, selection: Bool, title: String?) {
        replaced.append((markdown, selection))
        undo.append((body, noteTitle, hasSuggestion))
        body = markdown
        if let title { noteTitle = title }
        hasSuggestion = true
    }

    func replaceTitle(_ title: String) {
        undo.append((body, noteTitle, hasSuggestion))
        noteTitle = title
    }

    func undoFormatting() {
        guard let last = undo.popLast() else { return }
        body = last.body
        noteTitle = last.title
        hasSuggestion = last.suggestion
    }
}

private nonisolated struct StyleEcho: VoiceService {
    var error: VoiceError?
    var title: String?
    func me() async throws -> VoiceAccess { VoiceAccess(enabled: true) }
    func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript {
        VoiceTranscript(durationSec: 0, turns: [])
    }
    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> VoiceText {
        if let error { throw error }
        return VoiceText(markdown: "## \(style?.rawValue ?? "-") (\(task.rawValue))\n\n\(text)", title: title)
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

    /// A version snapshot comes first: the history keeps the note as it was before formatting.
    @Test func snapshotBeforeTheFormattedTextGoesIn() async {
        let (formatter, sink) = make()
        var replacedAtSnapshot: [Int] = []
        formatter.beforeChange = { replacedAtSnapshot.append(sink.replaced.count) }
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        #expect(replacedAtSnapshot == [0])
        #expect(sink.replaced.count == 1)
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

    /// An untitled note — empty, or the automatic «Note <date>» — takes the model's title in the
    /// same edit, and «Reject» brings back the old one with the text.
    @Test(arguments: ["", "Note Nov 9, 2026"])
    func untitledNoteTakesTheTitle(_ title: String) async {
        let (formatter, sink) = make(StyleEcho(title: "Shopping"))
        sink.noteTitle = title
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        #expect(sink.noteTitle == "Shopping")
        #expect(formatter.suggestedTitle == nil, "nothing to offer: it is in")
        formatter.reject()
        #expect(sink.noteTitle == title)
        #expect(sink.body == "milk and bread")
    }

    /// A title of the note's own stays; the model's is offered, and «Replace» puts it in.
    /// «Reject» afterwards takes back both.
    @Test func ownTitleIsOffered() async {
        let (formatter, sink) = make(StyleEcho(title: "Shopping"))
        sink.noteTitle = "Groceries"
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        #expect(sink.noteTitle == "Groceries")
        #expect(formatter.suggestedTitle == "Shopping")
        formatter.replaceTitle()
        #expect(sink.noteTitle == "Shopping")
        #expect(formatter.suggestedTitle == nil)
        #expect(formatter.phase == .done, "«Reject» is still there")
        formatter.reject()
        #expect(sink.noteTitle == "Groceries")
        #expect(sink.body == "milk and bread")
    }

    /// The same title as now, or an editor without a title API: nothing is set or offered.
    @Test func noTitleChangeWhenNotNeededOrPossible() async {
        let (formatter, sink) = make(StyleEcho(title: "Groceries"))
        sink.noteTitle = "Groceries"
        formatter.format(style: .document)
        await settle { formatter.phase != .working }
        #expect(formatter.suggestedTitle == nil)

        let (other, plain) = make(StyleEcho(title: "Shopping"))
        plain.canSetTitle = false
        other.format(style: .document)
        await settle { other.phase != .working }
        #expect(plain.noteTitle == "")
        #expect(other.suggestedTitle == nil)
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
