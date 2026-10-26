import SwiftUI

/// Menu bar and hardware keyboard shortcuts (iPad, spec/05: full keyboard support).
struct AppCommands: Commands {
    @FocusedValue(\.sceneModel) private var scene
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(after: .newItem) {
            Button("New Note") { scene?.newNote() }
                .keyboardShortcut("n", modifiers: .command)
                .disabled(scene == nil)
            Button("New Notebook") {
                if let space = scene?.library.activeSpace { scene?.sheet = .newNotebook(spaceId: space.id) }
            }
            .keyboardShortcut("n", modifiers: [.command, .shift])
            .disabled(scene == nil)
            Button("Open Note in New Window") {
                if let id = scene?.selectedNoteId { openWindow(id: "note", value: id) }
            }
            .keyboardShortcut("o", modifiers: [.command, .option])
            .disabled(scene?.selectedNoteId == nil)
        }

        CommandMenu("Go") {
            Button("Command Palette") { scene?.isCommandPalettePresented = true }
                .keyboardShortcut("k", modifiers: .command)
            Divider()
            Button("All Documents") { scene?.show(.allDocuments) }
                .keyboardShortcut("1", modifiers: .command)
            Button("Tasks") { scene?.show(.tasks) }
                .keyboardShortcut("2", modifiers: .command)
            Button("Calendar") { scene?.show(.calendar) }
                .keyboardShortcut("3", modifiers: .command)
            Button("Starred") { scene?.show(.starred) }
                .keyboardShortcut("4", modifiers: .command)
            Divider()
            Button("Today's Note") { scene?.openToday() }
                .keyboardShortcut("t", modifiers: [.command, .shift])
            Button("Toggle Sidebar") { scene?.toggleSidebar() }
                .keyboardShortcut("s", modifiers: [.command, .control])
            Button("Full Screen") {
                guard let scene else { return }
                if scene.selectedNoteId != nil { scene.toggleDocumentFullScreen() }
            }
            .keyboardShortcut("f", modifiers: [.command, .control])
            .disabled(scene?.selectedNoteId == nil)
            Button("Close Tab") { scene?.closeTab() }
                .keyboardShortcut("w", modifiers: .command)
            Button("Close Document") { scene?.closeDocument() }
                .keyboardShortcut("w", modifiers: [.command, .shift])
                .disabled(scene?.selectedNoteId == nil)
        }

        CommandGroup(replacing: .appSettings) {
            Button("Settings…") { scene?.sheet = .settings }
                .keyboardShortcut(",", modifiers: .command)
        }
    }
}
