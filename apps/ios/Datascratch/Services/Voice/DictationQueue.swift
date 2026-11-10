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
        /// Done; `notice` when something is worth saying (offline, a server error, kept).
        case ready(String, notice: VoiceError?)
    }

    struct Piece: Identifiable, Equatable {
        let id: Int
        /// The device's live recognition.
        var heard: String
        var state: State
        /// When it started being spoken (its length on the card).
        var started = Date()
        /// Its record in `DictationInbox` once the recording is kept there.
        var recordId: String?
    }

    private(set) var pieces: [Piece] = []
    /// The latest thing worth saying about a piece (offline, quota, …); the screen shows it once.
    var notice: VoiceError?
    /// The notice is about a recording that failed and is kept (its card is in the note).
    private(set) var noticeIsKept = false

    weak var target: DictationTarget?
    /// Where recordings are kept until their text is in the note (nil: sent from where they are).
    var inbox: DictationInbox?
    /// The note the pieces go into (the inbox's records belong to it).
    var noteId: String?
    /// Right before a piece with text goes in (a version snapshot, sync-protocol §5).
    var beforeInsert: (() async -> Void)?
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
        // With the server's recognition, the recording is kept until its text is in the note.
        if service != nil, let audio, let inbox, let noteId,
           let record = inbox.keep(audio: audio, noteId: noteId, heard: heard,
                                   duration: Date().timeIntervalSince(pieces[i].started)) {
            pieces[i].recordId = record.id
            recognise(id, record: record.id, in: inbox)
            return
        }
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
                    let transcript = try await service.transcribe(audio: audio, mode: .dictation, language: .forDevice)
                    if !transcript.text.isEmpty { text = transcript.text }
                }
                try Task.checkCancellation()
                self?.advance(id, to: .tidying)
                if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    result = .ready("", notice: nil)
                } else {
                    do {
                        let cleaned = try await service.text(task: .clean, style: nil, profanity: profanity, quality: quality, text: text).markdown
                        result = .ready(cleaned, notice: nil)
                    } catch is CancellationError {
                        throw CancellationError()
                    } catch {
                        // Tidying failed: the transcript as heard rather than nothing.
                        result = .ready(text, notice: .untidied((error as? VoiceError)?.code ?? "client"))
                    }
                }
            } catch is CancellationError {
                return
            } catch let error as VoiceError {
                result = .ready(heard, notice: error)
            } catch {
                result = .ready(heard, notice: .failed("client"))
            }
            if let audio { try? FileManager.default.removeItem(at: audio) }
            if case .ready(let text, _) = result, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                await self?.beforeInsert?()
                guard !Task.isCancelled else { return }
            }
            self?.complete(id, result)
        }
    }

    /// A kept recording: recognised through the inbox. A failure leaves the recording there (its
    /// card shows in the note) and lets the pieces after it go in; a failed tidy-up puts the
    /// transcript in as heard.
    private func recognise(_ id: Int, record: String, in inbox: DictationInbox) {
        inbox.begin(record)
        tasks[id] = Task { [weak self] in
            let result: State
            do {
                let item = try await inbox.recognise(record)
                self?.advance(id, to: .tidying)
                result = .ready(item.text ?? "", notice: item.untidied ? .untidied(item.lastError ?? "client") : nil)
            } catch is CancellationError {
                inbox.end(record)
                inbox.adopt(record)
                return
            } catch {
                inbox.end(record)
                inbox.failed(record, error)
                self?.complete(id, .ready("", notice: (error as? VoiceError) ?? .failed("client")))
                return
            }
            if case .ready(let text, _) = result, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                await self?.beforeInsert?()
                guard !Task.isCancelled else {
                    inbox.end(record)
                    inbox.adopt(record)
                    return
                }
            }
            inbox.end(record)
            guard let self else {
                inbox.adopt(record)
                return
            }
            self.complete(id, result)
        }
    }

    /// Swiped away: nothing of it goes into the text.
    func cancel(_ id: Int) {
        tasks.removeValue(forKey: id)?.cancel()
        pieces.removeAll { $0.id == id }
        showPreview()
        flush()
    }

    /// The document closes: what is still being spoken is dropped; a kept recording goes on in
    /// the inbox and reaches the note later.
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
            if let record = first.recordId {
                if trimmed.isEmpty {
                    // Nothing was said: the recording goes. Recognition failed: it stays, with its
                    // card in the note and its retries.
                    if notice == nil { inbox?.remove(record) }
                } else if let target {
                    target.insertDictation(trimmed)
                    // In the text: the recording is no longer needed.
                    inbox?.remove(record)
                } else {
                    inbox?.adopt(record)
                }
                noticeIsKept = trimmed.isEmpty && notice != nil
            } else {
                if !trimmed.isEmpty { target?.insertDictation(trimmed) }
                noticeIsKept = false
            }
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
