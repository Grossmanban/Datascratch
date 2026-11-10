import Foundation
import Observation

/// What «Оформить» reads and writes in an open note (`NativeEditorModel` over DSEditor).
@MainActor
protocol FormatTarget: AnyObject {
    /// The selection as Markdown, nil without one.
    var selectedMarkdown: String? { get }
    /// The note's body (after the title) as Markdown.
    var documentMarkdown: String { get }
    /// The note's title as it is now.
    var noteTitle: String { get }
    /// No title of the note's own: empty, or the automatic «Note <date>» a new note gets (as on
    /// the web: otherwise the model's title would almost never land on a fresh dictated note).
    var isUntitled: Bool { get }
    /// The editor can put a title in (DSEditor's title API; until then no title is set or offered).
    var canSetTitle: Bool { get }
    /// The note has an edit marked for review (the formatted text until it is accepted).
    var hasSuggestion: Bool { get }
    /// Replaces the selection, or the note's body, with a highlighted suggestion and, given one,
    /// the title too — one undo step.
    func replaceWithFormatted(_ markdown: String, selection: Bool, title: String?)
    /// «Replace»: the suggested title in place of the note's own (its own undo step).
    func replaceTitle(_ title: String)
    /// Takes the last change back.
    func undoFormatting()
}

/// D-65 «Оформить»: the selection, or the whole note, goes to `/voice/text` (`task: format`) in the
/// style the person picked; the result replaces it as one edit highlighted like an agent's
/// (author «Голос»). Until the person types again: «Show Original» and «Reject» (undo).
@Observable
@MainActor
final class VoiceFormatter {
    enum Phase: Equatable {
        case idle
        /// The server is formatting.
        case working
        /// The formatted text is in, highlighted; it can still be taken back.
        case done
    }

    private(set) var phase: Phase = .idle
    /// A calm line about the last try (offline, quota, the text changed meanwhile).
    private(set) var message: String?
    /// What the formatted text replaced (Markdown), for «Show Original».
    private(set) var original: String?
    /// The model's title for a note with a title of its own: offered, put in only on «Replace».
    private(set) var suggestedTitle: String?
    /// What «Format» works on if it starts now.
    var appliesToSelection: Bool { target?.selectedMarkdown != nil }

    /// The server takes at most this much text (api.md «Голос», `Voice.maxTextChars`).
    nonisolated static let maxTextChars = 400_000
    @ObservationIgnored weak var target: FormatTarget?
    @ObservationIgnored private let service: (any VoiceService)?
    @ObservationIgnored private let options: () -> (quality: VoiceQuality, profanity: VoiceProfanity)
    /// The note right after the formatted text went in: «Reject» undoes only while it is so.
    @ObservationIgnored private var after: String?
    /// The title «Replace» put in: «Reject» takes it back too (its own undo step first).
    @ObservationIgnored private var replacedTitle: String?
    @ObservationIgnored private var task: Task<Void, Never>?
    /// Right before the formatted text goes in (a version snapshot, sync-protocol §5).
    @ObservationIgnored var beforeChange: (() async -> Void)?
    @ObservationIgnored private var messageClear: Task<Void, Never>?

    init(service: (any VoiceService)?, options: @escaping () -> (quality: VoiceQuality, profanity: VoiceProfanity)) {
        self.service = service
        self.options = options
    }

    /// Formats the selection, else the whole note.
    func format(style: VoiceStyle) {
        guard phase != .working, let target else { return }
        guard let service else {
            show(VoiceError.notSignedIn.formatMessage)
            return
        }
        let selection = target.selectedMarkdown
        let source = selection ?? target.documentMarkdown
        guard !source.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            show(String(localized: "Nothing to format yet."))
            return
        }
        guard source.count <= Self.maxTextChars else {
            show(VoiceError.tooLong.formatMessage)
            return
        }
        dismiss()
        message = nil
        phase = .working
        let (quality, profanity) = options()
        task = Task { [weak self] in
            let result: Result<VoiceText, Error>
            do {
                result = .success(try await service.text(task: .format, style: style, profanity: profanity,
                                                         quality: quality, text: source))
            } catch {
                result = .failure(error)
            }
            guard let self, !Task.isCancelled else { return }
            if case .success = result, let beforeChange = self.beforeChange {
                await beforeChange()
                guard !Task.isCancelled else { return }
            }
            self.task = nil
            switch result {
            case .success(let reply): self.finish(reply, source: source, selection: selection != nil)
            case .failure(let error):
                self.phase = .idle
                self.show((error as? VoiceError ?? .failed(String(describing: error))).formatMessage)
            }
        }
    }

    private func finish(_ reply: VoiceText, source: String, selection: Bool) {
        phase = .idle
        guard let target else { return }
        // The text changed while the server worked: the result would land on something else.
        let now = selection ? target.selectedMarkdown : target.documentMarkdown
        guard now == source else {
            show(String(localized: "The text changed while it was being formatted — nothing was replaced."))
            return
        }
        let formatted = reply.markdown.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !formatted.isEmpty else {
            show(VoiceError.failed("empty").formatMessage)
            return
        }
        // The model's title: an untitled note takes it in the same edit; a title of the note's
        // own stays, and the card offers the new one.
        let title = target.canSetTitle ? reply.title.flatMap { $0 == target.noteTitle ? nil : $0 } : nil
        let titleNow = title != nil && target.isUntitled
        target.replaceWithFormatted(formatted, selection: selection, title: titleNow ? title : nil)
        original = source
        suggestedTitle = titleNow ? nil : title
        after = target.documentMarkdown
        phase = .done
    }

    /// Something changed in the note: once the person types, accepts or undoes, «Reject» would
    /// take back their change instead, so the bar goes.
    func documentChanged() {
        guard phase == .done, let target else { return }
        if !target.hasSuggestion || target.documentMarkdown != after { dismiss() }
    }

    /// «Reject»: the note as it was before formatting.
    func reject() {
        defer { dismiss() }
        guard phase == .done, let target, target.hasSuggestion, target.documentMarkdown == after else { return }
        // Not again from `documentChanged` while the undo lands.
        phase = .idle
        if let replacedTitle, target.noteTitle == replacedTitle { target.undoFormatting() }
        target.undoFormatting()
    }

    /// «Replace»: the offered title in place of the note's own.
    func replaceTitle() {
        guard phase == .done, let title = suggestedTitle, let target else { return }
        target.replaceTitle(title)
        replacedTitle = title
        suggestedTitle = nil
    }

    /// The bar goes; the formatted text stays as it is.
    func dismiss() {
        if phase == .done { phase = .idle }
        original = nil
        after = nil
        suggestedTitle = nil
        replacedTitle = nil
    }

    /// The document closes: a result still on its way is dropped.
    func cancel() {
        task?.cancel()
        task = nil
        if phase == .working { phase = .idle }
    }

    func show(_ text: String) {
        message = text
        messageClear?.cancel()
        messageClear = Task { [weak self] in
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            self?.message = nil
        }
    }
}

nonisolated extension VoiceError {
    /// The same errors, said for formatting text (no recording, no device text kept).
    var formatMessage: String {
        switch self {
        case .offline: String(localized: "No connection — formatting needs the server.")
        case .notSignedIn: String(localized: "Sign in to format text on the server.")
        case .tooLong: String(localized: "The text is too long to format.")
        case .upstream: String(localized: "The formatting service isn’t responding — try again.")
        case .failed, .untidied, .timeout: String(localized: "Couldn’t format the text (\(code)) — try again.")
        case .disabled, .quota, .unavailable: message
        }
    }
}
