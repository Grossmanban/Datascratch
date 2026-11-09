import Foundation

/// What is about to change a note: a snapshot first (sync-protocol §5), so «Version History»
/// has the note as it was.
enum SnapshotMoment {
    /// «Format» replaces text with a suggestion.
    case suggestion
    /// A dictated piece goes in.
    case voiceInsert
}

/// The snapshot policy on iOS (sync-protocol §5, owner 2026-11-09: after a dictation the history
/// said «No versions yet»): leaving a note, the app going to the background, and right before a
/// voice change. Without a server (local-only build) there is nothing to snapshot.
extension AppModel {
    func snapshotOnLeave(noteId: String) {
        #if canImport(DSCore)
        connection?.snapshotOnLeave(noteId: noteId)
        #endif
    }

    func snapshotOnBackground() {
        #if canImport(DSCore)
        connection?.snapshotOnBackground()
        #endif
    }

    func snapshotBeforeChange(noteId: String, _ moment: SnapshotMoment) async {
        #if canImport(DSCore)
        await connection?.snapshotBeforeChange(noteId: noteId, reason: moment == .suggestion ? .beforeSuggestion : .beforeVoiceInsert)
        #endif
    }
}
