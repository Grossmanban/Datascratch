import Foundation
import Observation

/// Who else has a note open — live and never stored (owner's feedback 2026-11-01: «it should be
/// visible who is editing in real time, elegantly and unobtrusively»). The web's presence
/// protocol (y-protocols awareness, `apps/web/src/data/presence.ts`), sent encrypted over the sync
/// socket (`ds1|awareness|<docId>`): each device announces `{ "user": { name, color, kind } }`
/// every 15 s and `null` when it leaves; a device silent for 30 s is gone.
struct PresencePeer: Identifiable, Hashable, Sendable {
    let id: UInt64
    let name: String
    /// `#RRGGBB` as sent; checked before it reaches a view.
    let color: String
    var initial: String { name.first.map { String($0).uppercased() } ?? "?" }
}

/// The y-protocols awareness update: varUint count, then per client varUint clientID, varUint
/// clock and varString JSON state (`null` = removed). Bounded like the web's sanitizer.
nonisolated enum AwarenessCodec {
    struct Entry: Equatable, Sendable {
        let client: UInt64
        let clock: UInt64
        /// The JSON state, nil for a removed client.
        let json: String?
    }

    static func encode(_ entries: [Entry]) -> Data {
        var out = Data()
        writeUInt(UInt64(entries.count), to: &out)
        for e in entries {
            writeUInt(e.client, to: &out)
            writeUInt(e.clock, to: &out)
            let bytes = Data((e.json ?? "null").utf8)
            writeUInt(UInt64(bytes.count), to: &out)
            out.append(bytes)
        }
        return out
    }

    static func decode(_ data: Data) -> [Entry]? {
        var pos = data.startIndex
        func uint() -> UInt64? {
            var value: UInt64 = 0, shift: UInt64 = 0
            while pos < data.endIndex, shift < 63 {
                let b = data[pos]
                pos += 1
                value |= UInt64(b & 0x7F) << shift
                if b < 0x80 { return value }
                shift += 7
            }
            return nil
        }
        guard let count = uint(), count <= 256 else { return nil }
        var out: [Entry] = []
        for _ in 0..<count {
            guard let client = uint(), let clock = uint(), let length = uint(), length <= 16 * 1024,
                  data.distance(from: pos, to: data.endIndex) >= Int(length) else { return nil }
            let end = data.index(pos, offsetBy: Int(length))
            guard let json = String(data: data[pos..<end], encoding: .utf8) else { return nil }
            pos = end
            out.append(Entry(client: client, clock: clock, json: json == "null" ? nil : json))
        }
        return out
    }

    private static func writeUInt(_ value: UInt64, to out: inout Data) {
        var n = value
        while n >= 0x80 {
            out.append(UInt8(n & 0x7F) | 0x80)
            n >>= 7
        }
        out.append(UInt8(n))
    }
}

@MainActor
@Observable
final class PresenceCenter {
    /// Other people in each open note (by doc id), in arrival order.
    private(set) var peers: [String: [PresencePeer]] = [:]
    /// Sends an awareness update for a doc (the sync engine encrypts it).
    @ObservationIgnored var send: ((_ docId: String, _ payload: Data) -> Void)?
    /// How this device shows to others: the account's name and colour, as on the web.
    @ObservationIgnored var me: (name: String, color: String)?

    @ObservationIgnored private let myClient = UInt64(UInt32.random(in: 1...UInt32.max))
    @ObservationIgnored private var clock: [String: UInt64] = [:]
    @ObservationIgnored private var seen: [String: [UInt64: (clock: UInt64, peer: PresencePeer, at: Date)]] = [:]
    /// The last clock of clients that left: a late, older update must not bring them back.
    @ObservationIgnored private var gone: [String: [UInt64: UInt64]] = [:]
    @ObservationIgnored private var heartbeat: Timer?
    @ObservationIgnored let now: () -> Date

    nonisolated static let timeout: TimeInterval = 30
    nonisolated static let colors = ["#2E5BDB", "#D2453B", "#3E8E5A", "#7A4FD6", "#C98A1B", "#1F7F80", "#C23F7A"]

    init(now: @escaping () -> Date = Date.init) {
        self.now = now
    }

    /// The web's `colorFor(email)`: the same person has the same colour everywhere.
    nonisolated static func color(for seed: String) -> String {
        var h: UInt32 = 0
        for unit in seed.utf16 { h = h &* 31 &+ UInt32(unit) }
        return colors[Int(h % UInt32(colors.count))]
    }

    nonisolated static func name(forEmail email: String) -> String {
        let local = email.split(separator: "@").first.map(String.init) ?? ""
        return local.isEmpty ? "Me" : local
    }

    /// The note is on screen: announce this device (and keep doing so).
    func join(_ docId: String) {
        guard clock[docId] == nil else { return }
        clock[docId] = 0
        announce(docId)
        startHeartbeat()
    }

    /// The note left the screen: say goodbye and forget its peers.
    func leave(_ docId: String) {
        guard let c = clock.removeValue(forKey: docId) else { return }
        send?(docId, AwarenessCodec.encode([.init(client: myClient, clock: c + 1, json: nil)]))
        seen[docId] = nil
        gone[docId] = nil
        peers[docId] = nil
        if clock.isEmpty {
            heartbeat?.invalidate()
            heartbeat = nil
        }
    }

    /// A decrypted update from another device or guest.
    func receive(_ docId: String, _ payload: Data) {
        guard clock[docId] != nil, let entries = AwarenessCodec.decode(payload) else { return }
        var states = seen[docId] ?? [:]
        var left = gone[docId] ?? [:]
        for e in entries where e.client != myClient {
            let known = max(states[e.client]?.clock ?? 0, left[e.client] ?? 0)
            // Newer clocks win (y-protocols); a removal at the same clock wins too.
            if e.clock < known || (e.clock == known && e.json != nil && (states[e.client] != nil || left[e.client] != nil)) { continue }
            if let json = e.json, let peer = Self.peer(client: e.client, json: json) {
                states[e.client] = (e.clock, peer, now())
                left[e.client] = nil
            } else {
                states[e.client] = nil
                left[e.client] = e.clock
            }
        }
        seen[docId] = states
        gone[docId] = left
        publish(docId)
    }

    /// Drops peers silent for longer than the timeout (their device slept or lost the network).
    func expire() {
        let limit = now().addingTimeInterval(-Self.timeout)
        for docId in Array(seen.keys) {
            seen[docId] = seen[docId]?.filter { $0.value.at >= limit }
            publish(docId)
        }
    }

    private func announce(_ docId: String) {
        guard let me, let c = clock[docId] else { return }
        let next = c + 1
        clock[docId] = next
        let state: [String: Any] = ["user": ["name": me.name, "color": me.color, "kind": "user"], "ts": Int(now().timeIntervalSince1970 * 1000)]
        guard let data = try? JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]),
              let json = String(data: data, encoding: .utf8) else { return }
        send?(docId, AwarenessCodec.encode([.init(client: myClient, clock: next, json: json)]))
    }

    private func startHeartbeat() {
        guard heartbeat == nil else { return }
        heartbeat = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                for docId in self.clock.keys { self.announce(docId) }
                self.expire()
            }
        }
    }

    private func publish(_ docId: String) {
        let list = (seen[docId] ?? [:]).values.sorted { $0.at < $1.at }.map(\.peer)
        // One avatar per person even with two of their devices in the note.
        var names = Set<String>()
        let unique = list.filter { names.insert($0.name).inserted }
        if peers[docId] != unique { peers[docId] = unique }
    }

    /// The state's `user`, checked as on the web (`awarenessSanitize.ts`): a short name and a hex
    /// colour only — anyone with access to the note (guests too) can send one.
    nonisolated static func peer(client: UInt64, json: String) -> PresencePeer? {
        guard let object = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any],
              let user = object["user"] as? [String: Any], let rawName = user["name"] as? String else { return nil }
        let name = String(rawName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(64))
        guard !name.isEmpty else { return nil }
        let raw = user["color"] as? String ?? ""
        let isHex = raw.range(of: "^#[0-9a-fA-F]{3,8}$", options: .regularExpression) != nil
        return PresencePeer(id: client, name: name, color: isHex ? raw : color(for: name))
    }
}
