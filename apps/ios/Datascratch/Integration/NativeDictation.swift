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

    // MARK: Placeholders in the text (spec/04 «Заглушка записи в тексте»)

    func placeDictation(_ id: String, at anchor: Data?, seconds: Int, failed code: String?) -> Data? {
        let state: DictationPlaceholderState = code.map { .failed(code: $0) } ?? .recognising(seconds: seconds)
        if dictationPlaces[id] != nil {
            if dictationPlaces[id] != state {
                editor.updateDictationPlaceholder(id: id, state: state)
                dictationPlaces[id] = state
            }
            return editor.dictationPlaceholderAnchor(id: id).flatMap(Self.encode)
        }
        guard !isViewOnly else { return nil }
        let stored = anchor.flatMap(Self.decode)
        // Its paragraph is gone: at the caret instead.
        var place = editor.insertDictationPlaceholder(id: id, at: stored, state: state)
        if place == nil, stored != nil { place = editor.insertDictationPlaceholder(id: id, at: nil, state: state) }
        guard let place else { return nil }
        dictationPlaces[id] = state
        return Self.encode(place)
    }

    func replaceDictation(_ id: String, with text: String) -> Bool {
        guard !isViewOnly, dictationPlaces[id] != nil, let anchor = editor.dictationPlaceholderAnchor(id: id) else { return false }
        let document = editor.document
        let place = anchor.resolve(in: document)
        // Pieces said one after another stand at the same place: the later ones go after this
        // one's text, not before it.
        let followers = place.map { place in
            dictationPlaces.keys.filter { other in
                other != id && editor.dictationPlaceholderAnchor(id: other)?.resolve(in: document) == place
            }
        } ?? []
        let next = place.flatMap { p in p.offset < document.textLength(of: p.block) ? document.anchor(block: p.block, offset: p.offset) : nil }
        let lengthBefore = place.map { document.textLength(of: $0.block) }
        dictationPlaces[id] = nil
        // A trailing space joins the next piece, as at the caret.
        guard editor.replaceDictationPlaceholder(id: id, markdown: text + " ") else { return false }
        guard let place, !followers.isEmpty else { return true }
        let end: TextPosition?
        if let next {
            end = document.resolveAnchor(next)
        } else if !text.contains("\n"), let lengthBefore {
            end = TextPosition(block: place.block, offset: place.offset + document.textLength(of: place.block) - lengthBefore)
        } else {
            end = nil
        }
        for other in followers.sorted() {
            guard let state = dictationPlaces[other] else { continue }
            let at = end.map { DictationAnchor.at($0, in: document) }
            let moved = editor.insertDictationPlaceholder(id: other, at: at, state: state)
                ?? editor.insertDictationPlaceholder(id: other, at: nil, state: state)
            app?.dictationInbox.setAnchor(other, moved.flatMap(Self.encode))
        }
        return true
    }

    func removeDictationPlace(_ id: String) {
        guard dictationPlaces.removeValue(forKey: id) != nil else { return }
        editor.removeDictationPlaceholder(id: id)
        if tappedDictation == id { tappedDictation = nil }
    }

    /// The placeholders follow the note's kept recordings: a retry shows «Recognising…», a
    /// failure «Not recognised», a deleted recording takes its placeholder away. Opening the note
    /// puts them back where they were said, and a piece recognised while it was closed goes in
    /// there.
    func syncDictationPlaces(with inbox: DictationInbox) {
        let items = inbox.items(for: noteId)
        let ids = Set(items.map(\.id))
        for id in dictationPlaces.keys where !ids.contains(id) { removeDictationPlace(id) }
        for item in items {
            let working = inbox.working.contains(item.id)
            let seconds = Int(item.duration.rounded())
            if item.text != nil {
                if dictationPlaces[item.id] == nil, item.anchor != nil {
                    _ = placeDictation(item.id, at: item.anchor, seconds: seconds, failed: nil)
                }
                if !working { inbox.deliver(item.id) }
                continue
            }
            let failed: String? = working || item.attempts == 0 ? nil : (item.lastError ?? "client")
            if let anchor = placeDictation(item.id, at: item.anchor, seconds: seconds, failed: failed), anchor != item.anchor {
                inbox.setAnchor(item.id, anchor)
            }
        }
        if let tapped = tappedDictation, !ids.contains(tapped) || inbox.working.contains(tapped) { tappedDictation = nil }
    }

    /// The note goes off screen: the places as they are now stay with the recordings.
    func keepDictationPlaces(in inbox: DictationInbox) {
        for id in dictationPlaces.keys {
            if let anchor = editor.dictationPlaceholderAnchor(id: id).flatMap(Self.encode) { inbox.setAnchor(id, anchor) }
        }
    }

    private static func encode(_ anchor: DictationAnchor) -> Data? { try? JSONEncoder().encode(anchor) }
    private static func decode(_ data: Data) -> DictationAnchor? { try? JSONDecoder().decode(DictationAnchor.self, from: data) }
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
