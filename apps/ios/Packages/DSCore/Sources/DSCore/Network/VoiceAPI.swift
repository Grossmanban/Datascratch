import Foundation

// Voice (D-65, api.md «Голос»; mirrors packages/shared/src/contracts/voice.ts). The server
// proxies recognition and the text AI; audio and text pass through it in memory only.

public enum VoiceMode: String, Codable, Hashable, Sendable { case dictation, conversation }
public enum VoiceLanguage: String, Codable, Hashable, Sendable { case ru, auto }
public enum VoiceTextTask: String, Codable, Hashable, Sendable { case clean, minutes, format }
public enum VoiceStyle: String, Codable, Hashable, Sendable { case document, plan, minutes, article, letter, notes }
public enum VoiceProfanity: String, Codable, Hashable, Sendable { case soften, keep }
public enum VoiceQuality: String, Codable, Hashable, Sendable { case standard, best }

public enum Voice {
    public static let maxAudioBytes = 200 * 1024 * 1024
    public static let maxDurationSec = 3 * 60 * 60
    public static let maxSpeakers = 8
    public static let maxTextChars = 400_000
    public static let maxTurns = 20_000
    /// `agentId` of the `agentEdit` mark on text written by voice; shown as «Голос».
    public static let agentId = "voice"
    public static let audioMimeTypes: Set<String> = ["audio/mp4", "audio/x-m4a", "audio/m4a", "video/mp4", "audio/webm", "video/webm",
                                                    "audio/ogg", "audio/wav", "audio/x-wav", "audio/wave"]

    /// «мм:сс», from an hour «ч:мм:сс»; seconds rounded down (voice/timestamps.json).
    public static func timestamp(_ seconds: Double) -> String {
        let total = Int(max(0, seconds).rounded(.down))
        let h = total / 3600, m = (total % 3600) / 60, s = total % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)
    }

    /// "S2" → «Собеседник 2».
    public static func speakerLabel(_ id: String) -> String {
        id.hasPrefix("S") ? "Собеседник \(id.dropFirst())" : id
    }

    static func isSpeaker(_ s: String) -> Bool { s.range(of: #"^S[1-9][0-9]?$"#, options: .regularExpression) != nil }
}

/// Text fields of the multipart `POST /voice/transcribe` (the file is the part `audio`);
/// multipart values are strings, `speakers` an integer 1–8.
public struct VoiceTranscribeFields: Hashable, Sendable, Decodable {
    public var mode: VoiceMode
    public var speakers: Int?
    public var language: VoiceLanguage

    public init(mode: VoiceMode, speakers: Int? = nil, language: VoiceLanguage = .ru) {
        self.mode = mode
        self.speakers = speakers
        self.language = language
    }

    /// The multipart form fields.
    public var formFields: [(name: String, value: String)] {
        var f = [("mode", mode.rawValue), ("language", language.rawValue)]
        if let speakers { f.append(("speakers", String(speakers))) }
        return f.map { (name: $0.0, value: $0.1) }
    }

    enum CodingKeys: String, CodingKey { case mode, speakers, language }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        mode = try c.decode(VoiceMode.self, forKey: .mode)
        language = try c.decodeIfPresent(VoiceLanguage.self, forKey: .language) ?? .ru
        if c.contains(.speakers) {
            let n: Int?
            if let i = try? c.decode(Int.self, forKey: .speakers) { n = i } else { n = Int(try c.decode(String.self, forKey: .speakers)) }
            guard let n, (1...Voice.maxSpeakers).contains(n) else { throw APIValidation.fail(c, .speakers, "speakers 1–8") }
            speakers = n
        }
    }
}

public struct VoiceTurn: Codable, Hashable, Sendable {
    /// "S1", "S2", … in order of first appearance.
    public var speaker: String
    /// Seconds from the start of the recording.
    public var start: Double
    public var end: Double
    public var text: String

    public init(speaker: String, start: Double, end: Double, text: String) {
        self.speaker = speaker
        self.start = start
        self.end = end
        self.text = text
    }

    enum CodingKeys: String, CodingKey { case speaker, start, end, text }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        speaker = try c.decode(String.self, forKey: .speaker)
        guard Voice.isSpeaker(speaker) else { throw APIValidation.fail(c, .speaker, "speaker S1…") }
        start = try c.decode(Double.self, forKey: .start)
        end = try c.decode(Double.self, forKey: .end)
        text = try c.decode(String.self, forKey: .text)
        guard start >= 0, end >= start else { throw APIValidation.fail(c, .end, "end before start") }
    }
}

public struct VoiceTranscribeResponse: Codable, Hashable, Sendable {
    public var durationSec: Double
    /// Dictation: one speaker ("S1").
    public var turns: [VoiceTurn]

    enum CodingKeys: String, CodingKey { case durationSec, turns }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        durationSec = try c.decode(Double.self, forKey: .durationSec)
        guard durationSec >= 0 else { throw APIValidation.fail(c, .durationSec, "negative") }
        turns = try c.decode([VoiceTurn].self, forKey: .turns)
    }
}

/// `POST /voice/text`: exactly one of `turns` (a transcript) or `text`; `style` for `format`
/// only (the server's default is `document`), `profanity` defaults to `soften`.
public struct VoiceTextRequest: Codable, Hashable, Sendable {
    public var task: VoiceTextTask
    public var style: VoiceStyle?
    public var profanity: VoiceProfanity
    public var quality: VoiceQuality
    public var turns: [VoiceTurn]?
    public var text: String?

    public init(task: VoiceTextTask, style: VoiceStyle? = nil, profanity: VoiceProfanity = .soften, quality: VoiceQuality = .standard,
                turns: [VoiceTurn]? = nil, text: String? = nil) {
        self.task = task
        self.style = style
        self.profanity = profanity
        self.quality = quality
        self.turns = turns
        self.text = text
    }

    enum CodingKeys: String, CodingKey { case task, style, profanity, quality, turns, text }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        task = try c.decode(VoiceTextTask.self, forKey: .task)
        style = try c.decodeIfPresent(VoiceStyle.self, forKey: .style)
        profanity = try c.decodeIfPresent(VoiceProfanity.self, forKey: .profanity) ?? .soften
        quality = try c.decodeIfPresent(VoiceQuality.self, forKey: .quality) ?? .standard
        turns = try c.decodeIfPresent([VoiceTurn].self, forKey: .turns)
        text = try c.decodeIfPresent(String.self, forKey: .text)
        guard (turns == nil) != (text == nil) else { throw APIValidation.fail(c, .text, "exactly one of turns or text") }
        guard task == .format || style == nil else { throw APIValidation.fail(c, .style, "style is for format only") }
        if let turns {
            guard (1...Voice.maxTurns).contains(turns.count), turns.reduce(0, { $0 + $1.text.count }) <= Voice.maxTextChars else {
                throw APIValidation.fail(c, .turns, "transcript size")
            }
        }
        if let text { guard (1...Voice.maxTextChars).contains(text.count) else { throw APIValidation.fail(c, .text, "text size") } }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(task, forKey: .task)
        try c.encodeIfPresent(style, forKey: .style)
        try c.encode(profanity, forKey: .profanity)
        try c.encode(quality, forKey: .quality)
        try c.encodeIfPresent(turns, forKey: .turns)
        try c.encodeIfPresent(text, forKey: .text)
    }
}

public struct VoiceTextResponse: Codable, Hashable, Sendable {
    /// Datascratch Markdown (agents-api.md §4).
    public var markdown: String
    /// The model that wrote it, for the note's history.
    public var model: String
    /// The suggested title of the document (`format`, `minutes`): the model's first «# …» line,
    /// cut out of `markdown`. Absent when the model gave none.
    public var title: String?

    /// Longest `title` (`MAX_VOICE_TITLE_CHARS`, UTF-16 code units as in the TS contract).
    public static let maxTitleChars = 80

    enum CodingKeys: String, CodingKey { case markdown, model, title }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        markdown = try c.decode(String.self, forKey: .markdown)
        model = try APIValidation.string(c, .model)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        if let title {
            guard !title.isEmpty, title.utf16.count <= Self.maxTitleChars else { throw APIValidation.fail(c, .title, "1…80 chars") }
            guard title == title.trimmingCharacters(in: .whitespacesAndNewlines), !title.hasSuffix(".") else {
                throw APIValidation.fail(c, .title, "trimmed, no full stop at the end")
            }
        }
    }
}

/// `GET /voice/me`: access and this month's minutes (months by UTC).
public struct VoiceMe: Codable, Hashable, Sendable {
    public var enabled: Bool
    /// The server has the keys of both services (recognition and text).
    public var available: Bool
    /// Recognition minutes per calendar month (UTC).
    public var monthlyMinutes: Int
    public var usedMinutes: Double
    /// Start of the next month, UTC.
    public var resetsAt: String
    /// A server admin: may open the voice access screen (`GET /admin/voice`).
    public var isAdmin: Bool

    public var remainingMinutes: Double { max(0, Double(monthlyMinutes) - usedMinutes) }

    enum CodingKeys: String, CodingKey { case enabled, available, monthlyMinutes, usedMinutes, resetsAt, isAdmin }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        enabled = try c.decode(Bool.self, forKey: .enabled)
        available = try c.decode(Bool.self, forKey: .available)
        monthlyMinutes = try c.decode(Int.self, forKey: .monthlyMinutes)
        usedMinutes = try c.decode(Double.self, forKey: .usedMinutes)
        resetsAt = try APIValidation.isoDateTime(c, .resetsAt)
        isAdmin = try c.decode(Bool.self, forKey: .isAdmin)
        guard monthlyMinutes >= 0, usedMinutes >= 0 else { throw APIValidation.fail(c, .usedMinutes, "negative") }
    }
}

/// An account row of `GET /admin/voice` and the response of `PUT /admin/voice/:userId` (server admin only).
public struct AdminVoiceAccount: Codable, Hashable, Sendable {
    public var userId: String
    public var email: String
    /// Display name, if the account has one (the server sends `null` for now).
    public var name: String?
    /// The account is a server admin.
    public var admin: Bool
    public var enabled: Bool
    /// Effective monthly minutes: the admin's own value or the default.
    public var monthlyMinutes: Int
    /// `false`: the server default for this account; `true`: set by an admin.
    public var customMinutes: Bool
    /// This month (UTC).
    public var usedMinutes: Double
    /// This month's voice cost (recognition + text), US dollars.
    public var costUsd: Double
    /// Voice requests this month (`transcribe` and `text`).
    public var requests: Int

    enum CodingKeys: String, CodingKey {
        case userId, email, name, admin, enabled, monthlyMinutes, customMinutes, usedMinutes, costUsd, requests
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try APIValidation.uuid(c, .userId)
        email = try c.decode(String.self, forKey: .email)
        name = try c.decode(String?.self, forKey: .name)
        admin = try c.decode(Bool.self, forKey: .admin)
        enabled = try c.decode(Bool.self, forKey: .enabled)
        monthlyMinutes = try c.decode(Int.self, forKey: .monthlyMinutes)
        customMinutes = try c.decode(Bool.self, forKey: .customMinutes)
        usedMinutes = try c.decode(Double.self, forKey: .usedMinutes)
        costUsd = try c.decode(Double.self, forKey: .costUsd)
        requests = try c.decode(Int.self, forKey: .requests)
        guard monthlyMinutes >= 0, usedMinutes >= 0, costUsd >= 0, requests >= 0 else {
            throw APIValidation.fail(c, .requests, "negative")
        }
    }
}

/// `GET /admin/voice`: all accounts and this month's totals (UTC month).
public struct AdminVoiceResponse: Codable, Hashable, Sendable {
    public struct Totals: Codable, Hashable, Sendable {
        public var usedMinutes: Double
        public var costUsd: Double
        public var requests: Int
        public var enabledAccounts: Int

        enum CodingKeys: String, CodingKey { case usedMinutes, costUsd, requests, enabledAccounts }

        public init(from decoder: any Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            usedMinutes = try c.decode(Double.self, forKey: .usedMinutes)
            costUsd = try c.decode(Double.self, forKey: .costUsd)
            requests = try c.decode(Int.self, forKey: .requests)
            enabledAccounts = try c.decode(Int.self, forKey: .enabledAccounts)
            guard usedMinutes >= 0, costUsd >= 0, requests >= 0, enabledAccounts >= 0 else {
                throw APIValidation.fail(c, .requests, "negative")
            }
        }
    }

    /// `YYYY-MM`, UTC.
    public var month: String
    public var resetsAt: String
    public var accounts: [AdminVoiceAccount]
    public var totals: Totals

    enum CodingKeys: String, CodingKey { case month, resetsAt, accounts, totals }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        month = try c.decode(String.self, forKey: .month)
        guard month.wholeMatch(of: /\d{4}-\d{2}/) != nil else { throw APIValidation.fail(c, .month, "YYYY-MM") }
        resetsAt = try APIValidation.isoDateTime(c, .resetsAt)
        accounts = try c.decode([AdminVoiceAccount].self, forKey: .accounts)
        totals = try c.decode(Totals.self, forKey: .totals)
    }
}

/// `PUT /admin/voice/:userId` → the account row (`AdminVoiceAccount`).
public struct PutAdminVoiceRequest: Codable, Hashable, Sendable {
    /// What to do with the account's own monthly minutes.
    public enum Minutes: Hashable, Sendable {
        /// Leave them as they are (the field is absent).
        case keep
        /// Back to the server default (`null`).
        case reset
        /// The account's own minutes, 0…100 000.
        case set(Int)
    }

    public var enabled: Bool
    public var monthlyMinutes: Minutes

    public init(enabled: Bool, monthlyMinutes: Minutes = .keep) {
        self.enabled = enabled
        self.monthlyMinutes = monthlyMinutes
    }

    enum CodingKeys: String, CodingKey { case enabled, monthlyMinutes }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        enabled = try c.decode(Bool.self, forKey: .enabled)
        if !c.contains(.monthlyMinutes) {
            monthlyMinutes = .keep
        } else if try c.decodeNil(forKey: .monthlyMinutes) {
            monthlyMinutes = .reset
        } else {
            let minutes = try c.decode(Int.self, forKey: .monthlyMinutes)
            guard (0...100_000).contains(minutes) else { throw APIValidation.fail(c, .monthlyMinutes, "0…100000") }
            monthlyMinutes = .set(minutes)
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(enabled, forKey: .enabled)
        switch monthlyMinutes {
        case .keep: break
        case .reset: try c.encodeNil(forKey: .monthlyMinutes)
        case .set(let minutes): try c.encode(minutes, forKey: .monthlyMinutes)
        }
    }
}
