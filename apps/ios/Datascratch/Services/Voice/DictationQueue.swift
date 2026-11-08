import Foundation
import Observation

/// Where dictated text goes: the open document's editor.
@MainActor
protocol DictationTarget: AnyObject {
    /// What is heard but not in the text yet, shown at the caret (grey, italic); nil hides it.
    func showDictationPreview(_ text: String?)
    /// A finished piece at the caret, as one undo step.
    func insertDictation(_ text: String)
}

/// D-65: dictation in pieces. Each hold (or hands-free stretch) is a piece: while it is spoken the
/// device's own recognition shows at the caret; on release the recording goes to the server
/// (recognised more accurately, then cleaned) and the result takes the preview's place. A person
/// may go on talking before a piece is back: pieces go into the text in the order they were
/// spoken, whatever order the server answers in. A cancelled piece leaves nothing.
@Observable
@MainActor
final class DictationQueue {
    enum State: Equatable {
        case recording
        /// The server is recognising the recording («Распознаю…»).
        case recognising
        /// The server is tidying the text up («Привожу в порядок…»).
        case tidying
        /// Done; `notice` when it is the device's text (offline, a server error).
        case ready(String, notice: VoiceError?)
    }

    struct Piece: Identifiable, Equatable {
        let id: Int
        /// The device's live recognition.
        var heard: String
        var state: State
    }

    private(set) var pieces: [Piece] = []
    /// The latest thing worth saying about a piece (offline, quota, …); the screen shows it once.
    var notice: VoiceError?

    weak var target: DictationTarget?
    /// nil: this device only (no server) — what the device heard is the text.
    private let service: (any VoiceService)?
    private let options: () -> (quality: VoiceQuality, profanity: VoiceProfanity)
    private var tasks: [Int: Task<Void, Never>] = [:]
    private var nextId = 1

    init(service: (any VoiceService)?, options: @escaping () -> (quality: VoiceQuality, profanity: VoiceProfanity)) {
        self.service = service
        self.options = options
    }

    /// Something is being recorded or worked on.
    var isBusy: Bool { !pieces.isEmpty }
    var isRecording: Bool { pieces.contains { $0.state == .recording } }

    /// A new piece starts being spoken.
    @discardableResult
    func begin() -> Int {
        let id = nextId
        nextId += 1
        pieces.append(Piece(id: id, heard: "", state: .recording))
        showPreview()
        return id
    }

    /// The device's recognition so far for a piece.
    func heard(_ text: String, in id: Int) {
        guard let i = pieces.firstIndex(where: { $0.id == id }), pieces[i].heard != text else { return }
        pieces[i].heard = text
        showPreview()
    }

    /// The piece was let go: its recording (nil when none could be made) goes to the server.
    func finish(_ id: Int, audio: URL?) {
        guard let i = pieces.firstIndex(where: { $0.id == id }), pieces[i].state == .recording else { return }
        pieces[i].state = .recognising
        let heard = pieces[i].heard
        let service = service
        let (quality, profanity) = options()
        tasks[id] = Task { [weak self] in
            let result: State
            do {
                guard let service else {
                    if let audio { try? FileManager.default.removeItem(at: audio) }
                    self?.complete(id, .ready(heard, notice: nil))
                    return
                }
                var text = heard
                if let audio {
                    let transcript = try await service.transcribe(audio: audio, mode: .dictation, quality: quality)
                    if !transcript.text.isEmpty { text = transcript.text }
                }
                try Task.checkCancellation()
                self?.advance(id, to: .tidying)
                if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    result = .ready("", notice: nil)
                } else {
                    let cleaned = try await service.text(task: .clean, style: nil, profanity: profanity, quality: quality, text: text)
                    result = .ready(cleaned, notice: nil)
                }
            } catch is CancellationError {
                return
            } catch let error as VoiceError {
                result = .ready(heard, notice: error)
            } catch {
                result = .ready(heard, notice: .failed(String(describing: error)))
            }
            if let audio { try? FileManager.default.removeItem(at: audio) }
            self?.complete(id, result)
        }
    }

    /// Swiped away: nothing of it goes into the text.
    func cancel(_ id: Int) {
        tasks.removeValue(forKey: id)?.cancel()
        pieces.removeAll { $0.id == id }
        showPreview()
        flush()
    }

    /// The document closes: whatever is not in the text yet is dropped.
    func cancelAll() {
        for task in tasks.values { task.cancel() }
        tasks = [:]
        pieces = []
        target?.showDictationPreview(nil)
    }

    private func advance(_ id: Int, to state: State) {
        guard let i = pieces.firstIndex(where: { $0.id == id }) else { return }
        pieces[i].state = state
    }

    /// What the server is doing with the earliest piece still out (nil while recording).
    var stage: State? {
        guard !isRecording else { return nil }
        return pieces.first { $0.state == .recognising || $0.state == .tidying }?.state
    }

    private func complete(_ id: Int, _ state: State) {
        tasks[id] = nil
        guard let i = pieces.firstIndex(where: { $0.id == id }) else { return }
        pieces[i].state = state
        flush()
    }

    /// Ready pieces at the front go in, in order; a piece still out waits for those before it.
    private func flush() {
        while let first = pieces.first, case .ready(let text, let notice) = first.state {
            pieces.removeFirst()
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty { target?.insertDictation(trimmed) }
            if let notice { self.notice = notice }
        }
        showPreview()
    }

    /// Everything heard and not in the text yet, in order.
    var previewText: String? {
        let text = pieces.map(\.heard).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
        if !text.isEmpty { return text }
        return pieces.isEmpty ? nil : ""
    }

    private func showPreview() {
        target?.showDictationPreview(previewText)
    }
}
