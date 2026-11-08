import Foundation

// D-65 Voice, phase 1 (dictation): the server recognises speech (more accurately than the device)
// and tidies it up. Audio and text pass through our server to the speech and language providers
// and are not stored; notes stay encrypted. Contract: api.md «Голос».

/// Better recognition is slower and costs more (Settings → Voice).
nonisolated enum VoiceQuality: String, CaseIterable, Identifiable, Sendable {
    case standard, best
    var id: String { rawValue }
}

/// Swear words as said, or softened in formatted text (never in a plain dictation).
nonisolated enum VoiceProfanity: String, CaseIterable, Identifiable, Sendable {
    case keep, soften
    var id: String { rawValue }
}

nonisolated enum VoiceMode: String, Sendable {
    case dictation, conversation
}

/// «Format»: what the text should become.
nonisolated enum VoiceStyle: String, CaseIterable, Identifiable, Sendable {
    case document, plan, minutes, article, letter, notes
    var id: String { rawValue }
}

nonisolated enum VoiceTextTask: String, Sendable {
    /// A dictated piece without fillers and false starts, punctuation added.
    case clean
    /// Minutes of a conversation (phase 2).
    case minutes
    /// Text rewritten in a style.
    case format
}

/// One speaker's stretch of speech; a dictation is usually a single turn.
nonisolated struct VoiceTurn: Codable, Equatable, Sendable {
    var speaker: String?
    var text: String
    var start: Double?
    var end: Double?
}

nonisolated struct VoiceTranscript: Decodable, Equatable, Sendable {
    var durationSec: Double
    var turns: [VoiceTurn]

    var text: String {
        turns.map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
}

nonisolated enum VoiceError: Error, Equatable, Sendable {
    /// No network: what the device heard is kept.
    case offline
    /// Voice is off for this account or server (`voice_disabled`).
    case disabled
    /// The account's voice minutes are used up (`voice_quota…`).
    case quota
    case notSignedIn
    case failed(String)

    var message: String {
        switch self {
        case .offline: String(localized: "Recognised on this device — we’ll refine it when you’re online.")
        case .disabled: String(localized: "Voice is turned off on this server.")
        case .quota: String(localized: "You’ve used up voice for now. It comes back with the next period.")
        case .notSignedIn: String(localized: "Sign in to dictate with the server’s recognition.")
        case .failed: String(localized: "Couldn’t process the recording. What the device heard is kept.")
        }
    }

    /// Server error codes (api.md «Голос»).
    static func from(code: String, status: Int) -> VoiceError {
        if code == "voice_disabled" { return .disabled }
        if code.contains("quota") || status == 429 { return .quota }
        if status == 401 { return .notSignedIn }
        return .failed(code)
    }
}

/// The server side of voice; a fake one runs the UI tests.
nonisolated protocol VoiceService: Sendable {
    func transcribe(audio: URL, mode: VoiceMode, quality: VoiceQuality) async throws -> VoiceTranscript
    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> String
}

/// `POST /v1/voice/transcribe` and `POST /v1/voice/text` with this account's access token.
nonisolated struct ServerVoiceService: VoiceService {
    /// Server root with `/v1` (the API client's base).
    let baseURL: URL
    let accessToken: @Sendable () async throws -> String
    var session: URLSession = .shared

    func transcribe(audio: URL, mode: VoiceMode, quality: VoiceQuality) async throws -> VoiceTranscript {
        let boundary = "ds-\(UUID().uuidString)"
        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".data(using: .utf8)!)
        }
        field("mode", mode.rawValue)
        field("quality", quality.rawValue)
        let audioData = try Data(contentsOf: audio)
        body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"\(audio.lastPathComponent)\"\r\nContent-Type: audio/mp4\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        var request = try await request("voice/transcribe")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        request.timeoutInterval = 120
        return try JSONDecoder().decode(VoiceTranscript.self, from: try await send(request))
    }

    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> String {
        struct Body: Encodable {
            var task: String
            var style: String?
            var profanity: String
            var quality: String
            var text: String
        }
        struct Reply: Decodable { var markdown: String }
        var request = try await request("voice/text")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(Body(task: task.rawValue, style: style?.rawValue, profanity: profanity.rawValue,
                                                         quality: quality.rawValue, text: text))
        request.timeoutInterval = 90
        return try JSONDecoder().decode(Reply.self, from: try await send(request)).markdown
    }

    private func request(_ path: String) async throws -> URLRequest {
        let token: String
        do { token = try await accessToken() } catch { throw VoiceError.notSignedIn }
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError where Self.offlineCodes.contains(error.code) {
            throw VoiceError.offline
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            throw VoiceError.failed(String(describing: error))
        }
        guard let http = response as? HTTPURLResponse else { throw VoiceError.failed("no response") }
        guard (200..<300).contains(http.statusCode) else {
            struct ErrorBody: Decodable { struct Inner: Decodable { var code: String }; var error: Inner }
            let code = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error.code ?? "http_\(http.statusCode)"
            throw VoiceError.from(code: code, status: http.statusCode)
        }
        return data
    }

    static let offlineCodes: Set<URLError.Code> = [.notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost,
                                                  .cannotFindHost, .timedOut, .dataNotAllowed, .internationalRoamingOff]
}

/// UI tests (`-ui-testing`): a fixed transcript and a visible «cleaned» marker, or an error from
/// `-ui-testing-voice-error <offline|disabled|quota>`.
nonisolated struct FakeVoiceService: VoiceService {
    var error: VoiceError?
    var delay: Duration = .milliseconds(300)

    static let transcript = "um so this is dictated text"
    static func cleaned(_ text: String) -> String {
        text.replacingOccurrences(of: "um so ", with: "").capitalizedFirst + "."
    }

    func transcribe(audio: URL, mode: VoiceMode, quality: VoiceQuality) async throws -> VoiceTranscript {
        try await Task.sleep(for: delay)
        if let error { throw error }
        return VoiceTranscript(durationSec: 2, turns: [VoiceTurn(speaker: nil, text: Self.transcript)])
    }

    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> String {
        try await Task.sleep(for: delay)
        if let error { throw error }
        switch task {
        case .clean: return Self.cleaned(text)
        case .format, .minutes: return "## \(style?.rawValue.capitalizedFirst ?? "Notes")\n\n\(text)"
        }
    }
}

nonisolated extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
