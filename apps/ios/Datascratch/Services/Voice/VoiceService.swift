import Foundation

// D-65 Voice, phase 1 (dictation): the server recognises speech (more accurately than the device)
// and tidies it up. Audio and text pass through our server to the speech and language providers
// and are not stored; notes stay encrypted. Contract: api.md «Голос».

#if canImport(DSCore)
import DSCore

// The contract's own types (ios-core, `DSCore/Network/VoiceAPI.swift`).
typealias VoiceQuality = DSCore.VoiceQuality
typealias VoiceProfanity = DSCore.VoiceProfanity
typealias VoiceMode = DSCore.VoiceMode
typealias VoiceStyle = DSCore.VoiceStyle
typealias VoiceTextTask = DSCore.VoiceTextTask
typealias VoiceLanguage = DSCore.VoiceLanguage
typealias VoiceTurn = DSCore.VoiceTurn
#else
/// «Best» is more accurate and tidier, and costs ten times as much (Settings → Voice).
nonisolated enum VoiceQuality: String, Sendable { case standard, best }
/// Swear words softened in formatted text (the default), or kept as said.
nonisolated enum VoiceProfanity: String, Sendable { case keep, soften }
nonisolated enum VoiceMode: String, Sendable { case dictation, conversation }
/// «Format»: what the text should become.
nonisolated enum VoiceStyle: String, Sendable { case document, plan, minutes, article, letter, notes }
/// `clean`: a dictated piece without fillers and false starts; `minutes`: a conversation
/// (phase 2); `format`: text rewritten in a style.
nonisolated enum VoiceTextTask: String, Sendable { case clean, minutes, format }
/// `language` of a transcription: Russian (the server's default) or detected.
nonisolated enum VoiceLanguage: String, Sendable { case ru, auto }

/// One speaker's stretch of speech; a dictation is a single turn "S1".
nonisolated struct VoiceTurn: Codable, Equatable, Sendable {
    var speaker: String
    /// Seconds from the start of the recording.
    var start: Double
    var end: Double
    var text: String
}
#endif

nonisolated extension VoiceStyle {
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

nonisolated extension VoiceLanguage {
    /// Russian on a Russian device, detected otherwise.
    static var forDevice: VoiceLanguage {
        Locale.current.language.languageCode?.identifier == "ru" ? .ru : .auto
    }
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
    /// The server took longer than the request may wait (a long recording, a slow provider).
    case timeout
    /// `/voice/text clean` failed: the transcript went in as heard (the code says why).
    case untidied(String)
    case failed(String)

    /// The cause as a code, shown with the message and in Diagnostics (`voice.<code>`).
    var code: String {
        switch self {
        case .offline: "network"
        case .disabled: "voice_disabled"
        case .quota: "voice_quota"
        case .tooLong: "voice_too_long"
        case .upstream: "voice_upstream"
        case .unavailable: "voice_unavailable"
        case .notSignedIn: "not_signed_in"
        case .timeout: "timeout"
        case .untidied(let code), .failed(let code): code
        }
    }

    /// A recording that could not be recognised: it is kept on the device, with the cause.
    var keptMessage: String {
        String(localized: "Not recognised (\(code)) — the recording is kept on this device.")
    }

    var message: String {
        switch self {
        case .offline: String(localized: "Recognised on this device — we’ll refine it when you’re online.")
        case .disabled: String(localized: "Voice isn’t turned on for this account.")
        case .quota: String(localized: "This month’s voice limit is used up.")
        case .tooLong: String(localized: "The recording is too long (up to 3 hours).")
        case .upstream: String(localized: "The recognition service isn’t responding — try again.")
        case .unavailable: String(localized: "Voice is temporarily unavailable.")
        case .notSignedIn: String(localized: "Sign in to dictate with the server’s recognition.")
        case .timeout: String(localized: "The server took too long to answer — the recording is kept.")
        case .untidied(let code): String(localized: "Inserted as heard — tidying it up failed (\(code)).")
        case .failed(let code): String(localized: "Couldn’t process the recording (\(code)).")
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

/// `GET /v1/voice/me`: whether this account may use voice, whether the server can serve it, and
/// the account's minutes this month (UTC).
nonisolated struct VoiceAccess: Codable, Equatable, Sendable {
    /// Turned on for this account by the server's admin.
    var enabled: Bool
    /// The server has its voice keys (false: «temporarily unavailable»).
    var available: Bool
    /// Minutes of recognition per calendar month.
    var monthlyMinutes: Int
    var usedMinutes: Double
    /// Start of the next month (ISO, UTC).
    var resetsAt: String
    /// The server's admin (who may use voice is managed in the web app).
    var isAdmin: Bool

    init(enabled: Bool, available: Bool = true, monthlyMinutes: Int = 0, usedMinutes: Double = 0, resetsAt: String = "", isAdmin: Bool = false) {
        self.enabled = enabled
        self.available = available
        self.monthlyMinutes = monthlyMinutes
        self.usedMinutes = usedMinutes
        self.resetsAt = resetsAt
        self.isAdmin = isAdmin
    }

    private enum CodingKeys: String, CodingKey { case enabled, available, monthlyMinutes, usedMinutes, resetsAt, isAdmin }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        enabled = try c.decode(Bool.self, forKey: .enabled)
        // A server from before `available` and `isAdmin`: available, not admin.
        available = try c.decodeIfPresent(Bool.self, forKey: .available) ?? true
        monthlyMinutes = try c.decode(Int.self, forKey: .monthlyMinutes)
        usedMinutes = try c.decode(Double.self, forKey: .usedMinutes)
        resetsAt = try c.decode(String.self, forKey: .resetsAt)
        isAdmin = try c.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
    }

    /// The microphone can be offered.
    var isUsable: Bool { enabled && available }
    var minutesLeft: Int { max(0, Int((Double(monthlyMinutes) - usedMinutes).rounded(.down))) }
}

/// The server side of voice; a fake one runs the UI tests.
nonisolated protocol VoiceService: Sendable {
    func me() async throws -> VoiceAccess
    func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript
    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> VoiceText
}

/// `/voice/text`'s answer: the Markdown and, for `format` and `minutes`, the model's title for the
/// note (api.md «Голос»: the server cuts the first `# …` line out of the Markdown into `title`).
nonisolated struct VoiceText: Equatable, Sendable {
    var markdown: String
    var title: String?
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
        return try decode(VoiceAccess.self, from: try await send(request))
    }

    func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript {
        let boundary = "ds-\(UUID().uuidString)"
        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n".data(using: .utf8)!)
        }
        // Fields first, then the file (api.md «Голос»).
        field("mode", mode.rawValue)
        field("language", language.rawValue)
        let audioData = try Data(contentsOf: audio)
        body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"\(audio.lastPathComponent)\"\r\nContent-Type: audio/mp4\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        var request = try await request("voice/transcribe")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        // A long piece: the upload and the provider's recognition both take time (≥ 15 min).
        request.timeoutInterval = Self.transcribeTimeout
        return try decode(VoiceTranscript.self, from: try await send(request))
    }

    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> VoiceText {
        struct Body: Encodable {
            var task: String
            var style: String?
            var profanity: String
            var quality: String
            var text: String
        }
        struct Reply: Decodable { var markdown: String; var title: String? }
        var request = try await request("voice/text")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(Body(task: task.rawValue, style: style?.rawValue, profanity: profanity.rawValue,
                                                         quality: quality.rawValue, text: text))
        request.timeoutInterval = 90
        let reply = try decode(Reply.self, from: try await send(request))
        let title = reply.title?.trimmingCharacters(in: .whitespacesAndNewlines)
        return VoiceText(markdown: reply.markdown, title: title?.isEmpty == false ? title : nil)
    }

    /// How long `/voice/transcribe` may take: a five-minute piece over a slow connection plus the
    /// provider's recognition.
    static let transcribeTimeout: TimeInterval = 15 * 60

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do { return try JSONDecoder().decode(type, from: data) } catch { throw VoiceError.failed("bad_response") }
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
        } catch let error as URLError where error.code == .timedOut {
            throw VoiceError.timeout
        } catch let error as URLError where Self.offlineCodes.contains(error.code) {
            throw VoiceError.offline
        } catch let error as URLError where error.code == .cancelled {
            throw CancellationError()
        } catch is CancellationError {
            throw CancellationError()
        } catch let error as URLError {
            throw VoiceError.failed("url_\(error.code.rawValue)")
        } catch {
            throw VoiceError.failed("client")
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
                                                  .cannotFindHost, .dataNotAllowed, .internationalRoamingOff]
}

/// UI tests (`-ui-testing`): a fixed transcript and a visible «cleaned» marker, or an error from
/// `-ui-testing-voice-error <offline|disabled|quota>`.
nonisolated struct FakeVoiceService: VoiceService {
    var error: VoiceError?
    var delay: Duration = .milliseconds(300)
    /// `-ui-testing-voice-transcribe-fails <n>`: the first n recognitions fail (voice_upstream).
    var transcribeFails = 0
    /// `-ui-testing-voice-clean-fails`: tidying up fails (voice_upstream).
    var cleanFails = false
    /// Calls so far, shared by every copy (the app makes a service per use).
    static let calls = FakeCalls()

    static let transcript = "um so this is dictated text"
    /// The title the fake model gives a formatted note.
    static let title = "Formatted by Voice"
    static func cleaned(_ text: String) -> String {
        text.replacingOccurrences(of: "um so ", with: "").capitalizedFirst + "."
    }

    func me() async throws -> VoiceAccess {
        VoiceAccess(enabled: error != .disabled, available: error != .unavailable, monthlyMinutes: 600, usedMinutes: 12.5,
                    resetsAt: "2026-12-01T00:00:00.000Z")
    }

    func transcribe(audio: URL, mode: VoiceMode, language: VoiceLanguage) async throws -> VoiceTranscript {
        try await Task.sleep(for: delay)
        if let error { throw error }
        if Self.calls.next() <= transcribeFails { throw VoiceError.upstream }
        return VoiceTranscript(durationSec: 2, turns: [VoiceTurn(speaker: "S1", start: 0, end: 2, text: Self.transcript)])
    }

    func text(task: VoiceTextTask, style: VoiceStyle?, profanity: VoiceProfanity, quality: VoiceQuality, text: String) async throws -> VoiceText {
        try await Task.sleep(for: delay)
        if let error { throw error }
        switch task {
        case .clean:
            if cleanFails { throw VoiceError.upstream }
            return VoiceText(markdown: Self.cleaned(text))
        case .format, .minutes:
            return VoiceText(markdown: "## \(style?.rawValue.capitalizedFirst ?? "Notes")\n\n\(text)", title: Self.title)
        }
    }
}

/// The fake's count of recognitions (UI tests).
nonisolated final class FakeCalls: @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0
    func next() -> Int { lock.withLock { count += 1; return count } }
}

nonisolated extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
