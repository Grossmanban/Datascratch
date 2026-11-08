import Foundation
import Observation
import UIKit

/// D-65: the microphone of one open document. Hold to speak, let go to send the piece; swipe up
/// while holding to go on hands free, swipe left to throw the piece away. Pieces go to
/// `DictationQueue`, which puts them into the text in order.
@Observable
@MainActor
final class DictationController {
    enum Mode: Equatable {
        case idle
        /// The button is held.
        case holding
        /// Hands free: recording goes on until «Stop».
        case locked
    }

    private(set) var mode: Mode = .idle
    /// 0…1 for the wave.
    private(set) var level: Float = 0
    /// «Where your voice goes», before the first recording on this device.
    var showsConsent = false
    /// A calm line under the button (offline, quota, microphone off); cleared after a while.
    private(set) var message: String?

    let queue: DictationQueue
    @ObservationIgnored private weak var app: AppModel?
    @ObservationIgnored private var capture: (any VoiceCapture)?
    @ObservationIgnored private var piece: Int?
    @ObservationIgnored private var starting: Task<Void, Never>?
    @ObservationIgnored private var messageClear: Task<Void, Never>?
    /// A dictated piece is at most ten minutes (api.md «Голос»): it goes by itself then.
    nonisolated static let pieceLimit: Duration = .seconds(600)
    @ObservationIgnored private var limit: Task<Void, Never>?
    /// Let go (or cancelled) while the microphone was still starting.
    @ObservationIgnored private var endedEarly: Ending?

    private enum Ending { case finish, cancel }

    init(app: AppModel?, target: DictationTarget) {
        self.app = app
        let settings = app?.settings
        queue = DictationQueue(service: app?.voiceService) {
            (settings?.voiceQuality ?? .standard, settings?.voiceProfanity ?? .keep)
        }
        queue.target = target
    }

    var isRecording: Bool { mode != .idle }

    // MARK: Gestures

    /// The finger is down on the button.
    func press() {
        guard mode == .idle else { return }
        guard app?.settings.voiceConsentShown == true else {
            showsConsent = true
            return
        }
        mode = .holding
        begin()
    }

    /// The finger is lifted: a held piece goes; hands free goes on.
    func release() {
        guard mode == .holding else { return }
        finish()
    }

    /// Swiped up while holding: the finger may leave the button.
    func lock() {
        guard mode == .holding else { return }
        mode = .locked
        haptic(.light)
    }

    /// VoiceOver and a quick tap: hands free from the start.
    func startHandsFree() {
        press()
        if mode == .holding { mode = .locked }
    }

    /// «Stop» while hands free.
    func stop() {
        guard mode == .locked else { return }
        finish()
    }

    /// Swiped left, or «Cancel» while hands free.
    func cancel() {
        guard mode != .idle else { return }
        mode = .idle
        level = 0
        haptic(.rigid)
        limit?.cancel()
        if starting != nil { endedEarly = .cancel }
        capture?.cancel()
        capture = nil
        if let piece { queue.cancel(piece) }
        piece = nil
    }

    /// The document goes off screen: a piece being spoken is sent, not lost.
    func leave() {
        guard mode != .idle else { return }
        finish()
    }

    /// The document closes.
    func close() {
        cancel()
        queue.cancelAll()
    }

    func consentAccepted() {
        app?.settings.voiceConsentShown = true
        showsConsent = false
    }

    /// «Not Now»: nothing recorded; the sheet comes again next time.
    func consentDeclined() {
        showsConsent = false
    }

    // MARK: Recording

    private func begin() {
        guard let app else { return }
        haptic(.medium)
        let capture = app.makeVoiceCapture()
        self.capture = capture
        let piece = queue.begin()
        self.piece = piece
        capture.onLevel = { [weak self] level in self?.level = level }
        capture.onHeard = { [weak self] text in self?.queue.heard(text, in: piece) }
        endedEarly = nil
        limit?.cancel()
        limit = Task { [weak self] in
            try? await Task.sleep(for: Self.pieceLimit)
            guard !Task.isCancelled, let self, self.piece == piece, self.mode != .idle else { return }
            self.finish()
        }
        starting = Task { [weak self] in
            do {
                try await capture.start()
            } catch {
                self?.failedToStart(error)
                return
            }
            guard let self else { return }
            self.starting = nil
            switch self.endedEarly {
            case .finish?: self.finish()
            case .cancel?: capture.cancel()
            case nil: break
            }
            self.endedEarly = nil
        }
    }

    private func finish() {
        guard let capture, let piece else {
            mode = .idle
            return
        }
        if starting != nil {
            endedEarly = .finish
            mode = .idle
            return
        }
        mode = .idle
        level = 0
        limit?.cancel()
        haptic(.soft)
        self.capture = nil
        self.piece = nil
        Task { [weak self] in
            let audio = await capture.stop()
            self?.queue.finish(piece, audio: audio)
        }
    }

    private func failedToStart(_ error: Error) {
        starting = nil
        mode = .idle
        level = 0
        capture = nil
        if let piece { queue.cancel(piece) }
        piece = nil
        if (error as? VoiceCaptureError) == .microphoneDenied {
            show(String(localized: "No access to the microphone — allow it in Settings."))
        } else {
            show(String(localized: "No microphone found."))
        }
    }

    /// Notices from the queue (offline, quota, voice off) shown under the button for a while.
    func show(_ text: String) {
        message = text
        messageClear?.cancel()
        messageClear = Task { [weak self] in
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            self?.message = nil
        }
    }

    func takeQueueNotice() {
        guard let notice = queue.notice else { return }
        queue.notice = nil
        show(notice.message)
    }

    private func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        guard app?.settings.hapticsEnabled != false else { return }
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
}
