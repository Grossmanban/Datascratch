import SwiftUI
import UIKit

extension DSRGBA {
    /// Parses `#RRGGBB` (the leading `#` is optional). Returns nil for anything else.
    public init?(hex: String) {
        guard let normalized = DSRecentPenColors.normalized(hex) else { return nil }
        guard let value = UInt32(normalized.dropFirst(), radix: 16) else { return nil }
        self.init((value << 8) | 0xFF)
    }
}

/// Colour family of a pen tool: inks for pen / pencil / marker, highlights for the highlighter.
public enum DSPenColorFamily: String, CaseIterable, Sendable, Hashable {
    case ink
    case highlight
}

/// Recently used custom stroke colours, newest first, at most six per family.
/// Persisted in `UserDefaults` under `ds.pen.recent.ink` / `ds.pen.recent.highlight`
/// as JSON arrays of uppercase `#RRGGBB` (same rule as the web `PenToolbar`).
public enum DSRecentPenColors {
    public static let limit = 6

    public static func key(for family: DSPenColorFamily) -> String {
        "ds.pen.recent.\(family.rawValue)"
    }

    /// Uppercase `#RRGGBB`, or nil if `hex` is not a 6-digit hex colour.
    public static func normalized(_ hex: String) -> String? {
        var digits = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if digits.hasPrefix("#") { digits.removeFirst() }
        guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return nil }
        return "#" + digits.uppercased()
    }

    /// `list` with `hex` moved to the front: normalized, deduplicated, capped at `limit`.
    public static func pushing(_ hex: String, into list: [String]) -> [String] {
        let existing = list.compactMap(normalized)
        guard let value = normalized(hex) else { return Array(existing.prefix(limit)) }
        return Array(([value] + existing.filter { $0 != value }).prefix(limit))
    }

    public static func load(family: DSPenColorFamily, defaults: UserDefaults = .standard) -> [String] {
        guard let data = defaults.data(forKey: key(for: family)),
              let list = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return Array(list.compactMap(normalized).prefix(limit))
    }

    public static func push(_ hex: String, family: DSPenColorFamily, defaults: UserDefaults = .standard) {
        let next = pushing(hex, into: load(family: family, defaults: defaults))
        if let data = try? JSONEncoder().encode(next) {
            defaults.set(data, forKey: key(for: family))
        }
    }

    public static func clear(family: DSPenColorFamily, defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: key(for: family))
    }
}

/// System colour picker (`UIColorPickerViewController`) without opacity.
/// Reports the final colour as `#RRGGBB` when the picker is closed.
struct DSSystemColorPicker: UIViewControllerRepresentable {
    let initial: Color
    let onFinish: (String?) -> Void

    func makeUIViewController(context: Context) -> UIColorPickerViewController {
        let picker = UIColorPickerViewController()
        picker.supportsAlpha = false
        picker.selectedColor = UIColor(initial)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIColorPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onFinish: onFinish)
    }

    @MainActor
    final class Coordinator: NSObject, UIColorPickerViewControllerDelegate {
        let onFinish: (String?) -> Void
        private var picked: UIColor?

        init(onFinish: @escaping (String?) -> Void) {
            self.onFinish = onFinish
        }

        func colorPickerViewController(_ viewController: UIColorPickerViewController, didSelect color: UIColor, continuously: Bool) {
            picked = color
        }

        func colorPickerViewControllerDidFinish(_ viewController: UIColorPickerViewController) {
            onFinish(picked.map(DSSystemColorPicker.hex(from:)))
        }
    }

    /// `#RRGGBB` of a UI colour in sRGB (clamped).
    static func hex(from color: UIColor) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        let rgba = DSRGBA(
            red: Double(min(max(r, 0), 1)),
            green: Double(min(max(g, 0), 1)),
            blue: Double(min(max(b, 0), 1)),
            alpha: 1
        )
        return rgba.hex
    }
}
