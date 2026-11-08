#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore) && canImport(DSDesign)
import DSCore
import DSEditor
import Foundation

/// D-65: dictated pieces go into the open document.
///
/// Until DSEditor has its own dictation calls (a preview at the caret, an insert at the caret —
/// asked of ios-editor), the preview shows above the bar and a piece goes in as a paragraph after
/// the caret's, with the caret in it, so the next piece follows it.
extension NativeEditorModel: DictationTarget {
    func showDictationPreview(_ text: String?) {
        if dictationPreview != text { dictationPreview = text }
    }

    func insertDictation(_ text: String) {
        guard !isViewOnly else { return }
        editor.insertBlock(.paragraph(text, marks: Self.voiceMark()))
    }

    /// Text written by voice is highlighted like an agent's until accepted: `agentEdit` with
    /// `agentId = "voice"` (D-65, document-model.md §4.2).
    static func voiceMark(at date: Date = Date()) -> MarkSet {
        MarkSet.empty.setting(MarkName.agentEdit, .object([
            "agentId": .string(voiceAgentId),
            "at": .string(DSDate.iso(date)),
        ]))
    }

    /// `VOICE_AGENT_ID` of the shared contract.
    nonisolated static let voiceAgentId = "voice"
}
#endif
