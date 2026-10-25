import SwiftUI

extension Tint {
    var localizedName: LocalizedStringKey {
        switch self {
        case .red: "Red"
        case .orange: "Orange"
        case .yellow: "Yellow"
        case .green: "Green"
        case .teal: "Teal"
        case .blue: "Blue"
        case .indigo: "Indigo"
        case .purple: "Purple"
        case .pink: "Pink"
        case .gray: "Gray"
        }
    }
}

struct TintPicker: View {
    @Binding var selection: Tint

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Theme.Space.s2), count: 5),
                  spacing: Theme.Space.s3) {
            ForEach(Tint.allCases, id: \.self) { tint in
                Button {
                    withAnimation(Theme.Motion.snappy) { selection = tint }
                    Haptics.selection()
                } label: {
                    Circle()
                        .fill(tint.foreground)
                        .frame(width: 30, height: 30)
                        .overlay {
                            if selection == tint {
                                Circle().strokeBorder(.white, lineWidth: 3)
                                Image(systemName: "checkmark")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(.white)
                            }
                        }
                        .padding(4)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text(tint.localizedName))
                .accessibilityAddTraits(selection == tint ? .isSelected : [])
            }
        }
        .padding(.vertical, Theme.Space.s2)
    }
}

/// SF Symbols suitable for spaces, notebooks and folders.
struct SymbolPicker: View {
    @Binding var selection: String
    var tint: Tint

    static let symbols = [
        "book.closed", "folder", "doc.text", "tray", "archivebox", "briefcase", "house", "graduationcap",
        "lightbulb", "star", "heart", "flag", "bookmark", "tag", "paperplane", "pencil.and.scribble",
        "paintpalette", "music.note", "camera", "leaf", "globe", "airplane", "cart", "sparkles",
        "brain.head.profile", "chart.bar", "hammer", "cup.and.saucer", "figure.run", "moon.stars",
    ]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Theme.Space.s2), count: 6),
                  spacing: Theme.Space.s2) {
            ForEach(Self.symbols, id: \.self) { symbol in
                Button {
                    selection = symbol
                    Haptics.selection()
                } label: {
                    Image(systemName: symbol)
                        .font(.title3)
                        .frame(width: 40, height: 40)
                        .foregroundStyle(selection == symbol ? tint.foreground : Theme.Palette.textSecondary)
                        .background(selection == symbol ? tint.background : .clear,
                                    in: RoundedRectangle(cornerRadius: Theme.Radius.md))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(symbol)
            }
        }
        .padding(.vertical, Theme.Space.s2)
    }
}
