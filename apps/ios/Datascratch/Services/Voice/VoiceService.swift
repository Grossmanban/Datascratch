import Foundation

// D-65 Voice, phase 1 (dictation): the server recognises speech (more accurately than the device)
// and tidies it up. Audio and text pass through our server to the speech and language providers
// and are not stored; notes stay encrypted. Contract: api.md «Голос».

/// «Best» is more accurate and tidier, and costs ten times as much (Settings → Voice).
nonisolated enum VoiceQuality: String, CaseIterable, Identifiable, Sendable {
    case standard, best
    var id: String { rawValue }
}

/// Swear words softened in formatted text (the default), or kept as said.
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

    var title: String {
        switch self {
        case .document: String(localized: "Document")
        case .plan: String(localized: "Plan")
        case .minutes: String(localized: "Meeting Minutes")
        case .article: String(localized: "Article")
        case .letter: String(localized: "Letter")
        case .notes: String(localized: "Lecture Notes")
        }
    }
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
    /// 403 `voice_disabled`: not turned on for this account.
    case disabled
    /// 429 `voice_quota`: this month's minutes are used up.
    case quota
    /// 413 `voice_too_long`: over 3 hours / 200 MB.
    case tooLong
    /// 502 `voice_upstream`: the recognition service did not answer.
    case upstream
    /// 503 `voice_unavailable`.
    case unavailable
    case notSignedIn
    case failed(String)

    var message: String {
        switch self {
        case .offline: String(localized: "Recognised on this device — we’ll refine it when you’re online.")
        case .disabled: String(localized: "Voice isn’t turned on for this account.")
        case .quota: String(localized: "This month’s voice limit is used up.")
        case .tooLong: String(localized: "The recording is too long (up to 3 hours).")
        case .upstream: String(localized: "The recognition service isn’t responding — try again.")
        case .unavailable: String(localized: "Voice is temporarily unavailable.")
        case .notSignedIn: String(localized: "Sign in to dictate with the server’s recognition.")
        case .failed: String(localized: "Couldn’t process the recording. What the device heard is kept.")
        }
    }

    /// Server error codes (api.md «Голос»).
    static func from(code: String, status: Int) -> VoiceError {
        switch code {
        case "voice_disabled": return .disabled
        case "voice_quota": return .quota
        case "voice_too_long": return .tooLong
        case "voice_upstream": return .upstream
        case "voice_unavailable": return .unavailable
        default: break
        }
        switch status {
        case 401: return .notSignedIn
        case 403: return .disabled
        case 413: return .tooLong
        case 429: return .quota
        case 502: return .upstream
        case 503: return .unavailable
        default: return .failed(code)
        }
    }
}

/// `GET /v1/voice/me`: whether this account may use voice, and what is left this month.
nonisolated struct VoiceAccess: Decodable, Equatable, Sendable {
    var enabled: Bool
    /// Minutes left this month; nil without a limit.
    var minutesLeft: Double?
    /// The server's owner (access is managed in the web app).
    var isAdmin: Bool

    init(enabled: Bool, minutesLeft: Double? = nil, isAdmin: Bool = false) {
        self.enabled = enabled
        self.minutesLeft = minutesLeft
        self.isAdmin = isAdmin
    }

    private enum CodingKeys: String, CodingKey {
        case enabled, minutesLeft, remainingMinutes, limitMinutes, usedMinutes, isAdmin, admin
    }

    /// Lenient until the contract is in main: `minutesLeft`, or `remainingMinutes`, or the limit
    /// less what is used.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        enabled = try c.decodeIfPresent(Bool.self, forKey: .enabled) ?? false
        if let left = try c.decodeIfPresent(Double.self, forKey: .minutesLeft) ?? c.decodeIfPresent(Double.self, forKey: .remainingMinutes) {
            minutesLeft = left
        } else if let limit = try c.decodeIfPresent(Double.self, forKey: .limitMinutes) {
            minutesLeft = max(0, limit - (try c.decodeIfPresent(Double.self, forKey: .usedMinutes) ?? 0))
        } else {
            minutesLeft = nil
        }
        isAdmin = try c.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? c.decodeIfPresent(Bool.self, forKey: .admin) ?? false
    }
}

/// The server side of voice; a fake one runs the UI tests.
nonisolated protocol VoiceService: Sendable {
    func me() async throws -> VoiceAccess
    func transcribe(audio: URL, mode: VoiceMode, quality: VoiceQuality) async throws -> VoiceTranscript
    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> String
}

/// `POST /v1/voice/transcribe` and `POST /v1/voice/text` with this account's access token.
nonisolated struct ServerVoiceService: VoiceService {
    /// Server root with `/v1` (the API client's base).
    let baseURL: URL
    let accessToken: @Sendable () async throws -> String
    var session: URLSession = .shared

    func me() async throws -> VoiceAccess {
        var request = try await request("voice/me")
        request.httpMethod = "GET"
        return try JSONDecoder().decode(VoiceAccess.self, from: try await send(request))
    }

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

    func me() async throws -> VoiceAccess {
        VoiceAccess(enabled: error != .disabled, minutesLeft: 120)
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
