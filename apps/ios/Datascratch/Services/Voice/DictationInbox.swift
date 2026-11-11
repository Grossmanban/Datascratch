import Foundation
import Observation

/// One recorded piece kept on the device until its text is safely in the note (D-65: what was
/// said is never lost). The recording sits next to this record as `<id>.m4a`.
nonisolated struct PendingDictation: Codable, Identifiable, Equatable, Sendable {
    var id: String
    var noteId: String
    var createdAt: Date
    /// Seconds of speech.
    var duration: Double
    /// What the device heard while it was spoken (the preview).
    var heard: String
    /// `/voice/transcribe`'s text once it came back: a retry then only tidies it.
    var transcript: String?
    /// Ready for the note: the tidied text, or the transcript as heard when tidying failed.
    var text: String?
    /// `text` is the transcript as heard (tidying failed).
    var untidied = false
    /// Failed recognitions so far.
    var attempts = 0
    /// The last failure's code (`voice_upstream`, `voice_too_long`, `timeout`, `network`, …).
    var lastError: String?
    /// Its place in the note's text (DSEditor's `DictationAnchor`, JSON): the placeholder stands
    /// there while it is recognised, also after the note is opened again, and the text goes there.
    var anchor: Data?
}

/// D-65: every recorded piece goes here before it goes to the server, and leaves only once its
/// text is in the note. A recognition that fails keeps the recording: the note shows a card
/// («Not recognised · 2:41 · Retry · Save Audio · Delete»), it is retried by itself (three times,
/// with pauses, and again when the network comes back), and it survives a restart. The records
/// live in Application Support, protected by the system's file encryption.
@Observable
@MainActor
final class DictationInbox {
    private(set) var items: [PendingDictation] = []
    /// Being recognised now (by a document's dictation or a retry).
    private(set) var working: Set<String> = []

    @ObservationIgnored private let directory: URL
    @ObservationIgnored private let service: () -> (any VoiceService)?
    @ObservationIgnored private let options: () -> (quality: VoiceQuality, profanity: VoiceProfanity)
    /// A diagnostics event (`voice.<code>`).
    @ObservationIgnored var log: (String) -> Void = { _ in }
    /// Open notes taking a retried piece's text: note id → put it in, by record id and text (false:
    /// it could not go in).
    @ObservationIgnored private var sinks: [String: (_ id: String, _ text: String) async -> Bool] = [:]
    @ObservationIgnored private var retries: [String: Task<Void, Never>] = [:]
    /// Pauses before the automatic retries.
    @ObservationIgnored var backoff: [Duration] = [.seconds(10), .seconds(60), .seconds(300)]

    init(directory: URL, service: @escaping () -> (any VoiceService)?,
         options: @escaping () -> (quality: VoiceQuality, profanity: VoiceProfanity)) {
        self.directory = directory
        self.service = service
        self.options = options
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
        load()
    }

    /// Application Support/Dictation (kept in backups' place, not in caches).
    static func appSupport() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Dictation", isDirectory: true)
    }

    /// UI tests: a fixed temporary folder, emptied unless `keep` (a restart within a test).
    static func temporary(keep: Bool) -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("ui-testing-dictation", isDirectory: true)
        if !keep { try? FileManager.default.removeItem(at: url) }
        return url
    }

    // MARK: Records

    func items(for noteId: String) -> [PendingDictation] { items.filter { $0.noteId == noteId } }
    func item(_ id: String) -> PendingDictation? { items.first { $0.id == id } }
    func audioURL(_ id: String) -> URL { directory.appendingPathComponent("\(id).m4a") }
    private func recordURL(_ id: String) -> URL { directory.appendingPathComponent("\(id).json") }

    /// The recording moves here before anything is sent; nil only when it could not be stored
    /// (then it is sent from where it is, as before).
    func keep(audio: URL, noteId: String, heard: String, duration: Double) -> PendingDictation? {
        let item = PendingDictation(id: UUID().uuidString.lowercased(), noteId: noteId, createdAt: Date(),
                                    duration: duration, heard: heard)
        let target = audioURL(item.id)
        do {
            try FileManager.default.moveItem(at: audio, to: target)
            try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                                                   ofItemAtPath: target.path)
        } catch {
            log("voice.keep_failed")
            return nil
        }
        items.append(item)
        save(item)
        return item
    }

    /// Where its placeholder stands in the note now.
    func setAnchor(_ id: String, _ anchor: Data?) {
        guard var item = self.item(id), item.anchor != anchor else { return }
        item.anchor = anchor
        update(item)
    }

    func update(_ item: PendingDictation) {
        guard let i = items.firstIndex(where: { $0.id == item.id }) else { return }
        items[i] = item
        save(item)
    }

    /// Its text is in the note (or the person deleted it): the recording goes.
    func remove(_ id: String) {
        retries.removeValue(forKey: id)?.cancel()
        items.removeAll { $0.id == id }
        working.remove(id)
        try? FileManager.default.removeItem(at: audioURL(id))
        try? FileManager.default.removeItem(at: recordURL(id))
    }

    private func save(_ item: PendingDictation) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(item) else { return }
        try? data.write(to: recordURL(item.id), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    private func load() {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        items = files.filter { $0.pathExtension == "json" }
            .compactMap { try? decoder.decode(PendingDictation.self, from: Data(contentsOf: $0)) }
            // A record without its recording and without text has nothing left to recognise.
            .filter { $0.text != nil || FileManager.default.fileExists(atPath: audioURL($0.id).path) }
            .sorted { $0.createdAt < $1.createdAt }
    }

    // MARK: Recognition

    /// Recognises a kept piece: the transcript (once), then tidying. A failed tidy-up gives the
    /// transcript as heard instead of nothing. Throws when recognition itself fails.
    func recognise(_ id: String) async throws -> PendingDictation {
        guard var item = self.item(id) else { throw CancellationError() }
        if item.text != nil { return item }
        guard let service = self.service() else { throw VoiceError.notSignedIn }
        if item.transcript == nil {
            let transcript = try await service.transcribe(audio: audioURL(id), mode: .dictation, language: .forDevice)
            item.transcript = transcript.text
            update(item)
        }
        try Task.checkCancellation()
        var raw = item.transcript ?? ""
        if raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { raw = item.heard }
        if raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            item.text = ""
        } else {
            let (quality, profanity) = self.options()
            do {
                item.text = try await service.text(task: .clean, style: nil, profanity: profanity, quality: quality, text: raw).markdown
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                let code = (error as? VoiceError)?.code ?? "client"
                item.text = raw
                item.untidied = true
                item.lastError = code
                log("voice.clean.\(code)")
            }
        }
        update(item)
        return item
    }

    /// A document's dictation works on the piece now (retries leave it alone).
    func begin(_ id: String) { working.insert(id) }
    func end(_ id: String) { working.remove(id) }

    /// Recognition failed: the recording stays, the card shows, and it is tried again later.
    func failed(_ id: String, _ error: Error) {
        guard var item = self.item(id) else { return }
        let code = (error as? VoiceError)?.code ?? "client"
        item.attempts += 1
        item.lastError = code
        update(item)
        log("voice.transcribe.\(code)")
        scheduleRetry(id)
    }

    /// A document closed while its piece was still on its way: it goes on without the document.
    func adopt(_ id: String) {
        guard let item = self.item(id), !working.contains(id) else { return }
        if item.text == nil { run(id) } else { deliver(id) }
    }

    /// The person taps «Retry»: now, whatever the pauses say.
    func retry(_ id: String) {
        retries.removeValue(forKey: id)?.cancel()
        run(id)
    }

    /// The network is back (or the app is): everything not recognised yet goes again.
    func retryAll() {
        for item in items where item.text == nil && !working.contains(item.id) {
            retries.removeValue(forKey: item.id)?.cancel()
            run(item.id)
        }
    }

    /// Automatic retries: three, after the pauses in `backoff`; then the card waits for «Retry».
    private func scheduleRetry(_ id: String) {
        guard let item = self.item(id), item.attempts <= backoff.count else { return }
        let pause = backoff[item.attempts - 1]
        retries[id]?.cancel()
        retries[id] = Task { [weak self] in
            try? await Task.sleep(for: pause)
            guard !Task.isCancelled else { return }
            self?.retries[id] = nil
            self?.run(id)
        }
    }

    private func run(_ id: String) {
        guard self.item(id) != nil, !working.contains(id) else { return }
        working.insert(id)
        Task { [weak self] in
            guard let self else { return }
            do {
                _ = try await self.recognise(id)
                self.working.remove(id)
                self.log("voice.retry.ok")
                self.deliver(id)
            } catch is CancellationError {
                self.working.remove(id)
            } catch {
                self.working.remove(id)
                self.failed(id, error)
            }
        }
    }

    // MARK: Into the note

    /// The note is open and takes recognised pieces (at their placeholder, else at the caret).
    func attach(noteId: String, insert: @escaping (_ id: String, _ text: String) async -> Bool) {
        sinks[noteId] = insert
    }

    func detach(noteId: String) {
        sinks[noteId] = nil
    }

    /// A recognised piece goes into its note when the note is open; otherwise its card offers
    /// «Insert» there next time.
    func deliver(_ id: String) {
        guard let item = self.item(id), let text = item.text, let sink = sinks[item.noteId], !working.contains(id) else { return }
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            remove(id)
            return
        }
        working.insert(id)
        Task { [weak self] in
            let done = await sink(id, text)
            guard let self else { return }
            self.working.remove(id)
            if done { self.remove(id) }
        }
    }
}
