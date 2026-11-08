#if canImport(DSEditor) && canImport(DSEditorCore) && canImport(DSCore) && canImport(DSDesign)
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
        editor.insertBlock(.paragraph(text))
    }
}
#endif
