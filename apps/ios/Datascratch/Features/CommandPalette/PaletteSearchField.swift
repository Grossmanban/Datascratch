import SwiftUI
import UIKit

/// The palette's search field. UIKit's, because its text is read on every edit — the word
/// still being typed (marked text, keyboard predictions) included; SwiftUI's `TextField` left
/// the query empty until the word was committed, so a typed word listed nothing (owner,
/// 2026-11-03). It takes focus when shown; ↑ ↓ move through the results, Esc closes.
struct PaletteSearchField: UIViewRepresentable {
    @Binding var text: String
    let placeholder: String
    let onSubmit: () -> Void
    let onMove: (Int) -> Void
    let onEscape: () -> Void

    func makeUIView(context: Context) -> KeyField {
        let field = KeyField()
        field.placeholder = placeholder
        field.font = .systemFont(ofSize: 19)
        field.textColor = UIColor(Theme.Palette.textPrimary)
        field.tintColor = UIColor(Theme.Palette.accent)
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        field.spellCheckingType = .no
        field.smartQuotesType = .no
        field.inlinePredictionType = .no
        field.returnKeyType = .go
        field.delegate = context.coordinator
        field.addTarget(context.coordinator, action: #selector(Coordinator.changed(_:)), for: .editingChanged)
        field.accessibilityIdentifier = "palette.field"
        field.setContentHuggingPriority(.defaultLow, for: .horizontal)
        field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        DispatchQueue.main.async { field.becomeFirstResponder() }
        return field
    }

    func updateUIView(_ field: KeyField, context: Context) {
        context.coordinator.parent = self
        field.onMove = onMove
        field.onEscape = onEscape
        // Never while a word is being composed: that would cut it short.
        if field.markedTextRange == nil, field.text != text { field.text = text }
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UITextFieldDelegate {
        var parent: PaletteSearchField

        init(_ parent: PaletteSearchField) {
            self.parent = parent
        }

        @objc func changed(_ field: UITextField) {
            parent.text = field.text ?? ""
        }

        func textFieldShouldReturn(_ textField: UITextField) -> Bool {
            parent.text = textField.text ?? ""
            parent.onSubmit()
            return false
        }
    }

    /// ↑ ↓ and Esc from a hardware keyboard go to the results, not to the text.
    final class KeyField: UITextField {
        var onMove: ((Int) -> Void)?
        var onEscape: (() -> Void)?

        override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
            for press in presses {
                switch press.key?.keyCode {
                case .keyboardUpArrow: onMove?(-1); return
                case .keyboardDownArrow: onMove?(1); return
                case .keyboardEscape: onEscape?(); return
                default: break
                }
            }
            super.pressesBegan(presses, with: event)
        }
    }
}
