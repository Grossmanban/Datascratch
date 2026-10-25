// Stroke thickness (strokes.md §5), identical on every platform.
import {
  REFERENCE_BLOCK_WIDTH,
  REFERENCE_FONT_SIZE,
  type Stroke,
  type StrokePoint,
} from "../contracts/strokes.js";

/** f(p) = 0.35 + 0.65 · p^0.8, p clamped to 0..1. */
export function pressureCurve(pressure: number): number {
  const p = Math.min(Math.max(pressure, 0), 1);
  return 0.35 + 0.65 * Math.pow(p, 0.8);
}

/** Tilt factor for pencil and marker: 1 + 1.5 · (1 − altitude/(π/2)); 1 for other tools. */
export function tiltFactor(tool: Stroke["tool"], altitude: number): number {
  if (tool !== "pencil" && tool !== "marker") return 1;
  const a = Math.min(Math.max(altitude, 0), Math.PI / 2);
  return 1 + 1.5 * (1 - a / (Math.PI / 2));
}

export type WidthScale = { fontSize: number } | { blockWidth: number };

/** Rendered width at a point: width × f(pressure) × scale × tilt. */
export function strokeWidthAt(
  stroke: Pick<Stroke, "tool" | "width">,
  point: Pick<StrokePoint, "pressure" | "altitude">,
  scale: WidthScale,
): number {
  const s =
    "fontSize" in scale
      ? scale.fontSize / REFERENCE_FONT_SIZE
      : scale.blockWidth / REFERENCE_BLOCK_WIDTH;
  return stroke.width * pressureCurve(point.pressure) * s * tiltFactor(stroke.tool, point.altitude);
}

/** The highlighter is drawn under the text with multiply blending (strokes.md §5). */
export function drawsUnderText(tool: Stroke["tool"]): boolean {
  return tool === "highlighter";
}
