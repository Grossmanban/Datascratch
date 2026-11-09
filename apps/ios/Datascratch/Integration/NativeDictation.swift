#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore) && canImport(DSDesign)
import DSCore
import DSEditor
import Foundation

/// D-65: dictated pieces go into the open document through DSEditor's voice calls: what is heard
/// shows grey at the caret, and a cleaned piece goes in at the caret, into its paragraph,
/// highlighted as a voice edit (`agentEdit`, `agentId = "voice"`) until accepted.
extension NativeEditorModel: DictationTarget {
    func showDictationPreview(_ text: String?) {
        if dictationPreview != text { dictationPreview = text }
        editor.setDictationPreview(text)
    }

    func insertDictation(_ text: String) {
        guard !isViewOnly else { return }
        // A trailing space joins the next piece (the caret ends after it); at the end of a
        // paragraph it shows nothing.
        editor.replaceWithSuggestion(text + " ", scope: .selection)
    }
}

/// D-65 «Оформить»: the selection or the note's body as Markdown, and the formatted text back as
/// a suggestion marked for review (`agentEdit`, author «Голос»).
extension NativeEditorModel: FormatTarget {
    var selectedMarkdown: String? { editor.selectedMarkdown }
    var documentMarkdown: String { editor.documentMarkdown }
    var hasSuggestion: Bool { editor.hasAgentEdits }

    // The model's title (api.md «Голос» `title`): set with the body in one step for an untitled
    // note, or offered and set on its own («Заменить»).
    var noteTitle: String { editor.title }
    var isUntitled: Bool {
        let title = noteTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return true }
        guard let note = app?.library.note(noteId) else { return false }
        return title == Self.defaultTitle(created: note.createdAt)
    }
    var canSetTitle: Bool { !isViewOnly }

    func replaceWithFormatted(_ markdown: String, selection: Bool, title: String?) {
        guard !isViewOnly else { return }
        editor.replaceWithSuggestion(markdown, scope: selection ? .selection : .document, title: title)
    }

    func replaceTitle(_ title: String) {
        guard !isViewOnly else { return }
        editor.setTitle(title)
    }

    func undoFormatting() {
        editor.undo()
    }

    /// «Format» is offered: the note can be edited and the server's voice is on for this account.
    var canFormat: Bool {
        guard let app, !isViewOnly else { return false }
        return app.voiceService != nil && !app.isVoiceOff
    }

    /// «Format…»: where the text goes first (once), then «How to Format?».
    func askHowToFormat(scene: SceneModel) {
        guard canFormat, let app else { return }
        scene.sheet = app.hasVoiceConsent() ? .voiceFormat(noteId: noteId) : .voiceConsent
    }
}
#endif
