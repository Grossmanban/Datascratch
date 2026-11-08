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

    /// `VOICE_AGENT_ID` of the shared contract.
    nonisolated static let voiceAgentId = EditorCommands.voiceAgentId
}
#endif
