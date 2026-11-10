@preconcurrency import AVFoundation
import Foundation
import Speech

/// One piece of speech being recorded: the level for the wave, the device's live recognition for
/// the preview, and the recording (AAC in m4a) for the server.
@MainActor
protocol VoiceCapture: AnyObject {
    /// 0…1, smoothed, for the wave around the button.
    var onLevel: ((Float) -> Void)? { get set }
    /// The device's recognition so far (volatile and final text together).
    var onHeard: ((String) -> Void)? { get set }
    func start() async throws
    /// Stops and returns the recording (nil when nothing usable was recorded).
    func stop() async -> URL?
    /// Returns the recording so far and goes on recording into a new one, without a gap (a long
    /// dictation in pieces); the device's recognition starts over for the next piece.
    func split() async -> URL?
    func cancel()
}

nonisolated enum VoiceCaptureError: Error, Equatable {
    case microphoneDenied
    case unavailable
}

/// The microphone through `AVAudioEngine`: buffers go to the file and to `SpeechAnalyzer`
/// (iOS 26, on device) at once. The preview is a courtesy — when the device cannot recognise this
/// language, recording still works and the server's text is all there is.
@MainActor
final class MicrophoneCapture: VoiceCapture {
    var onLevel: ((Float) -> Void)?
    var onHeard: ((String) -> Void)?

    private let engine = AVAudioEngine()
    private var file: AVAudioFile?
    private var url: URL?
    private var level: Float = 0
    private let locale: Locale

    private var analyzer: SpeechAnalyzer?
    private var input: AsyncStream<AnalyzerInput>.Continuation?
    private var results: Task<Void, Never>?
    private var converter: AVAudioConverter?
    private var analyzerFormat: AVAudioFormat?
    private var finalText = ""

    init(locale: Locale = .current) {
        self.locale = locale
    }

    static func requestMicrophone() async -> Bool {
        await AVAudioApplication.requestRecordPermission()
    }

    func start() async throws {
        guard await Self.requestMicrophone() else { throw VoiceCaptureError.microphoneDenied }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.duckOthers, .defaultToSpeaker])
        try session.setActive(true, options: [])

        let format = engine.inputNode.outputFormat(forBus: 0)
        guard format.sampleRate > 0 else { throw VoiceCaptureError.unavailable }
        try openFile(format: format)
        await startRecognition(inputFormat: format)

        engine.inputNode.installTap(onBus: 0, bufferSize: 2048, format: format,
                                    block: Self.tap { [weak self] buffer, rms in self?.take(buffer, rms: rms) })
        engine.prepare()
        try engine.start()
    }

    private func openFile(format: AVAudioFormat) throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("dictation-\(UUID().uuidString).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: 1,
            AVEncoderBitRateKey: 64_000,
        ]
        file = try AVAudioFile(forWriting: url, settings: settings, commonFormat: format.commonFormat, interleaved: format.isInterleaved)
        self.url = url
    }

    func split() async -> URL? {
        let done = url
        let format = engine.inputNode.outputFormat(forBus: 0)
        // The next buffer goes to the new file; the old one is closed (released) and complete.
        file = nil
        url = nil
        try? openFile(format: format)
        finalText = ""
        guard let done, let size = try? done.resourceValues(forKeys: [.fileSizeKey]).fileSize, size > 0 else { return nil }
        return done
    }

    private func take(_ buffer: AVAudioPCMBuffer, rms: Float) {
        try? file?.write(from: buffer)
        // A soft rise and a slower fall: the wave breathes with the voice instead of flickering.
        let target = min(1, max(0, (20 * log10(max(rms, 1e-6)) + 50) / 40))
        level = target > level ? level + (target - level) * 0.6 : level + (target - level) * 0.15
        onLevel?(level)
        feedRecognizer(buffer)
    }

    /// The tap runs on the audio thread: the block must not be the main actor's.
    nonisolated private static func tap(_ deliver: @escaping @MainActor @Sendable (AVAudioPCMBuffer, Float) -> Void) -> AVAudioNodeTapBlock {
        { buffer, _ in
            let power = Self.rms(buffer)
            let box = BufferBox(buffer: buffer)
            Task { @MainActor in deliver(box.buffer, power) }
        }
    }

    nonisolated private static func rms(_ buffer: AVAudioPCMBuffer) -> Float {
        guard let data = buffer.floatChannelData?[0] else { return 0 }
        let n = Int(buffer.frameLength)
        guard n > 0 else { return 0 }
        var sum: Float = 0
        for i in 0..<n { sum += data[i] * data[i] }
        return (sum / Float(n)).squareRoot()
    }

    // MARK: On-device recognition (preview only)

    private func startRecognition(inputFormat: AVAudioFormat) async {
        guard SpeechTranscriber.isAvailable,
              let supported = await SpeechTranscriber.supportedLocale(equivalentTo: locale) else { return }
        let transcriber = SpeechTranscriber(locale: supported, transcriptionOptions: [],
                                            reportingOptions: [.volatileResults], attributeOptions: [])
        do {
            if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
                // The model is fetched once; this piece goes without a preview meanwhile.
                Task { try? await request.downloadAndInstall() }
                return
            }
            guard let format = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [transcriber]) else { return }
            analyzerFormat = format
            converter = AVAudioConverter(from: inputFormat, to: format)
            let (stream, continuation) = AsyncStream<AnalyzerInput>.makeStream()
            input = continuation
            let analyzer = SpeechAnalyzer(modules: [transcriber])
            self.analyzer = analyzer
            finalText = ""
            results = Task { [weak self] in
                do {
                    for try await result in transcriber.results {
                        let text = String(result.text.characters)
                        guard let self else { return }
                        if result.isFinal {
                            self.finalText += text
                            self.onHeard?(self.finalText)
                        } else {
                            self.onHeard?(self.finalText + text)
                        }
                    }
                } catch {}
            }
            try await analyzer.start(inputSequence: stream)
        } catch {
            input = nil
            analyzer = nil
        }
    }

    private func feedRecognizer(_ buffer: AVAudioPCMBuffer) {
        guard let input, let converter, let format = analyzerFormat else { return }
        let ratio = format.sampleRate / buffer.format.sampleRate
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 1
        guard let out = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return }
        var given = false
        var error: NSError?
        _ = converter.convert(to: out, error: &error) { _, status in
            if given {
                status.pointee = .noDataNow
                return nil
            }
            given = true
            status.pointee = .haveData
            return buffer
        }
        if error == nil, out.frameLength > 0 { input.yield(AnalyzerInput(buffer: out)) }
    }

    private func stopEngine() {
        engine.inputNode.removeTap(onBus: 0)
        if engine.isRunning { engine.stop() }
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }

    func stop() async -> URL? {
        stopEngine()
        input?.finish()
        input = nil
        if let analyzer { try? await analyzer.finalizeAndFinishThroughEndOfInput() }
        analyzer = nil
        results = nil
        file = nil
        level = 0
        onLevel?(0)
        defer { url = nil }
        guard let url, let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize, size > 0 else { return nil }
        return url
    }

    func cancel() {
        stopEngine()
        input?.finish()
        input = nil
        if let analyzer { Task { await analyzer.cancelAndFinishNow() } }
        analyzer = nil
        results?.cancel()
        results = nil
        file = nil
        if let url { try? FileManager.default.removeItem(at: url) }
        url = nil
    }
}

/// A tap's buffer handed to the main actor (the engine gives each callback its own buffer).
nonisolated private struct BufferBox: @unchecked Sendable {
    let buffer: AVAudioPCMBuffer
}

/// UI tests: no microphone in the simulator. «Hears» a fixed phrase word by word and leaves a
/// small file standing in for the recording.
@MainActor
final class FakeVoiceCapture: VoiceCapture {
    var onLevel: ((Float) -> Void)?
    var onHeard: ((String) -> Void)?
    private var ticker: Task<Void, Never>?
    static let words = ["so", "this", "is", "dictated", "text"]

    func start() async throws {
        ticker = Task { [weak self] in
            var heard: [String] = []
            for (i, word) in Self.words.enumerated() {
                try? await Task.sleep(for: .milliseconds(150))
                guard !Task.isCancelled else { return }
                heard.append(word)
                self?.onLevel?(i.isMultiple(of: 2) ? 0.8 : 0.4)
                self?.onHeard?(heard.joined(separator: " "))
            }
        }
    }

    func stop() async -> URL? {
        ticker?.cancel()
        onLevel?(0)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("fake-\(UUID().uuidString).m4a")
        try? Data([0, 1, 2, 3]).write(to: url)
        return url
    }

    func split() async -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("fake-\(UUID().uuidString).m4a")
        try? Data([0, 1, 2, 3]).write(to: url)
        return url
    }

    func cancel() {
        ticker?.cancel()
        onLevel?(0)
    }
}
