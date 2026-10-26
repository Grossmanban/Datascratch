#if canImport(UIKit)
import os

/// Points of interest for Instruments (subsystem `com.datascratch.editor`): intervals for opening
/// a note, re-projecting after an edit, laying out ink, redrawing the live stroke and committing a
/// stroke; events for pen down/up. They cost next to nothing when no trace is being recorded. How
/// to record a trace: `Demo/README.md`, section «Профилирование».
enum EditorSignpost {
    static let log = OSSignposter(subsystem: "com.datascratch.editor", category: .pointsOfInterest)

    static func event(_ name: StaticString) {
        log.emitEvent(name)
    }
}
#endif
