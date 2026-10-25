#if canImport(CoreGraphics)
import CoreGraphics
#endif
import Foundation

/// Shared stroke thickness rules (`strokes.md` §5) so ink looks the same on every platform.
public enum InkWidth {
    public static let referenceFontSize: Double = 17
    public static let referenceBlockWidth: Double = 600

    /// `f(p) = 0.35 + 0.65 · p^0.8`
    public static func pressureCurve(_ p: Double) -> Double {
        0.35 + 0.65 * pow(min(max(p, 0), 1), 0.8)
    }

    /// Tilt factor for pencil and marker: `1 + 1.5 · (1 − altitude/(π/2))`.
    public static func tiltFactor(altitude: Double) -> Double {
        let a = min(max(altitude, 0), .pi / 2)
        return 1 + 1.5 * (1 - a / (.pi / 2))
    }

    /// Thickness in points at one point of a stroke.
    /// - Parameter scale: `fontSize / 17` for text strokes, `blockWidth / 600` for the rest.
    public static func width(base: Double, tool: InkTool, pressure: Double, altitude: Double, scale: Double) -> Double {
        var w = base * pressureCurve(pressure) * scale
        if tool.respondsToTilt { w *= tiltFactor(altitude: altitude) }
        return w
    }

    public static func textScale(fontSize: Double) -> Double { fontSize / referenceFontSize }
    public static func blockScale(blockWidth: Double) -> Double { blockWidth / referenceBlockWidth }
}
