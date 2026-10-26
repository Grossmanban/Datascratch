import SwiftUI

/// Every state of `DSPenToolbar` on paper: regular (pen, blue ink, two recent
/// custom colours), highlighter, eraser, compact (iPhone width) and collapsed.
/// Rendered to PNG by the snapshot tests (with `\.dsGlassFallback`).
public struct DSPenToolbarGallery: View {
    private let recent = ["#2F6F6A", "#B5651D"]

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpace.s6) {
            Text("Перо")
                .dsFont(.title)
                .foregroundStyle(Color.dsPrimary)
            paper {
                Text("Штрихи привязаны к словам и едут вместе с текстом.")
                    .dsFont(.body)
                    .foregroundStyle(Color.dsPrimary)
            }
            row("Ручка, синие чернила, два своих цвета") {
                DSPenToolbar(
                    selection: .constant(DSPenSelection(tool: .pen, color: .ink(.blue))),
                    canUndo: true,
                    onUndo: {},
                    onRedo: {},
                    isCollapsed: .constant(false),
                    recentColors: recent
                )
            }
            row("Текстовыделитель") {
                DSPenToolbar(
                    selection: .constant(DSPenSelection(tool: .highlighter, color: .highlight(.yellow), width: .bold)),
                    canUndo: true,
                    onUndo: {},
                    onRedo: {},
                    recentColors: []
                )
            }
            row("Ластик (по пикселю)") {
                DSPenToolbar(
                    selection: .constant(DSPenSelection(tool: .eraser, eraserMode: .pixel)),
                    tools: DSPenTool.allCases,
                    recentColors: []
                )
            }
            HStack(alignment: .top, spacing: DSSpace.s8) {
                row("Компактная (iPhone)") {
                    DSPenToolbar(
                        selection: .constant(DSPenSelection(tool: .marker, color: .custom("#2F6F6A"))),
                        canUndo: true,
                        onUndo: {},
                        onRedo: {},
                        compact: true,
                        recentColors: recent
                    )
                    .frame(width: 390, alignment: .leading)
                }
                row("Свёрнутая") {
                    DSPenToolbar(
                        selection: .constant(DSPenSelection(tool: .pen, color: .ink(.red))),
                        isCollapsed: .constant(true),
                        recentColors: []
                    )
                }
            }
            Spacer(minLength: 0)
        }
        .padding(DSSpace.s8)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.dsCanvas)
    }

    private func paper<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        content()
            .padding(DSSpace.s5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous)
                    .fill(Color.dsSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous)
                    .strokeBorder(Color.dsSeparator, lineWidth: 0.5)
            )
    }

    private func row<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: DSSpace.s2) {
            Text(title)
                .dsFont(.footnote)
                .foregroundStyle(Color.dsSecondary)
            content()
        }
    }
}

#Preview("Pen toolbar gallery") {
    DSPenToolbarGallery()
        .environment(\.dsGlassFallback, true)
}
