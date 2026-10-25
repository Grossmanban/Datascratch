import SwiftUI

/// Soft Craft-like gradient behind documents: base gradient, colour blobs and paper grain.
public struct DSBackdrop: View {
    private let token: DSBackdropToken
    private let grain: Bool
    @Environment(\.colorScheme) private var colorScheme

    public init(_ token: DSBackdropToken, grain: Bool = true) {
        self.token = token
        self.grain = grain
    }

    public var body: some View {
        let spec = colorScheme == .dark ? token.dark : token.light
        GeometryReader { proxy in
            let reach = (proxy.size.width * proxy.size.width + proxy.size.height * proxy.size.height).squareRoot() * 0.75
            ZStack {
                LinearGradient(
                    colors: spec.base.map(\.color),
                    startPoint: Self.start(angle: spec.angle),
                    endPoint: Self.end(angle: spec.angle)
                )
                ForEach(spec.blobs.indices, id: \.self) { index in
                    let blob = spec.blobs[index]
                    RadialGradient(
                        colors: [blob.color.color, blob.color.color.opacity(0)],
                        center: UnitPoint(x: blob.x, y: blob.y),
                        startRadius: 0,
                        endRadius: max(1, reach * blob.radius)
                    )
                }
                if grain {
                    DSGrain(opacity: spec.noise)
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    /// CSS `linear-gradient` angle: 0° points up, clockwise.
    nonisolated static func start(angle: Double) -> UnitPoint {
        let r = angle * .pi / 180
        return UnitPoint(x: 0.5 - sin(r) / 2, y: 0.5 + cos(r) / 2)
    }

    nonisolated static func end(angle: Double) -> UnitPoint {
        let r = angle * .pi / 180
        return UnitPoint(x: 0.5 + sin(r) / 2, y: 0.5 - cos(r) / 2)
    }
}

/// Deterministic paper grain, tiled so it is cheap at any size.
public struct DSGrain: View {
    private let opacity: Double
    @Environment(\.colorScheme) private var colorScheme

    public init(opacity: Double = 0.05) {
        self.opacity = opacity
    }

    public var body: some View {
        let dark = colorScheme == .dark
        Canvas { context, size in
            var light = Path()
            var deep = Path()
            let columns = Int((size.width / GrainPattern.tile).rounded(.up))
            let rows = Int((size.height / GrainPattern.tile).rounded(.up))
            for row in 0..<max(rows, 0) {
                for column in 0..<max(columns, 0) {
                    let origin = CGPoint(x: CGFloat(column) * GrainPattern.tile, y: CGFloat(row) * GrainPattern.tile)
                    for (i, speck) in GrainPattern.specks.enumerated() {
                        let rect = speck.offsetBy(dx: origin.x, dy: origin.y)
                        if i.isMultiple(of: 2) {
                            deep.addRect(rect)
                        } else {
                            light.addRect(rect)
                        }
                    }
                }
            }
            context.fill(deep, with: .color(.black.opacity(dark ? opacity * 2 : opacity * 1.4)))
            context.fill(light, with: .color(.white.opacity(dark ? opacity * 0.8 : opacity * 2)))
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// Precomputed speck positions for one grain tile.
enum GrainPattern {
    static let tile: CGFloat = 96
    static let specks: [CGRect] = {
        var rng = SplitMix64(seed: 0xD5_0A7A)
        return (0..<220).map { _ in
            let x = CGFloat(rng.nextUnit()) * GrainPattern.tile
            let y = CGFloat(rng.nextUnit()) * GrainPattern.tile
            let side: CGFloat = rng.nextUnit() < 0.7 ? 1 : 1.5
            return CGRect(x: x, y: y, width: side, height: side)
        }
    }()
}

/// Small seeded PRNG so grain looks identical on every launch.
struct SplitMix64: Sendable {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// Uniform value in 0..<1.
    mutating func nextUnit() -> Double {
        Double(next() >> 11) / Double(1 << 53)
    }
}

#Preview("Backdrops — light") {
    BackdropGallery()
}

#Preview("Backdrops — dark") {
    BackdropGallery()
        .preferredColorScheme(.dark)
}

private struct BackdropGallery: View {
    var body: some View {
        ScrollView {
            VStack(spacing: DSSpace.s4) {
                ForEach(DSBackdropToken.allCases, id: \.self) { token in
                    DSBackdrop(token)
                        .frame(height: 140)
                        .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous))
                        .overlay(alignment: .bottomLeading) {
                            Text(token.rawValue.capitalized)
                                .dsFont(.h3)
                                .foregroundStyle(.ds(.textPrimary))
                                .padding(DSSpace.s4)
                        }
                }
            }
            .padding(DSSpace.s4)
        }
        .background(.ds(.bgCanvas))
    }
}
