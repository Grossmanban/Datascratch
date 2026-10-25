// Shape hint recognition (strokes.md `hint`): a cheap geometric classifier. The hint does not change
// how a stroke is drawn; it tells agents and exporters what the mark means (D-11).
import type { StrokeHint, StrokeTool } from "@datascratch/shared/strokes";
import type { Line } from "./geometry";

interface P {
  x: number;
  y: number;
}

function pathLength(pts: readonly P[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return l;
}

/** Counts horizontal direction reversals larger than `minAmp` px. */
function xReversals(pts: readonly P[], minAmp: number): number {
  let reversals = 0;
  let dir = 0;
  let extreme = pts[0]?.x ?? 0;
  for (const p of pts) {
    const d = p.x - extreme;
    if (dir >= 0 && d > 0) extreme = p.x;
    else if (dir <= 0 && d < 0) extreme = p.x;
    if (dir >= 0 && d < -minAmp) {
      if (dir > 0) reversals++;
      dir = -1;
      extreme = p.x;
    } else if (dir <= 0 && d > minAmp) {
      if (dir < 0) reversals++;
      dir = 1;
      extreme = p.x;
    }
  }
  return reversals;
}

/** Total turning angle (radians, absolute). */
function totalTurning(pts: readonly P[]): number {
  let sum = 0;
  let prev: number | null = null;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]!.x - pts[i - 1]!.x;
    const dy = pts[i]!.y - pts[i - 1]!.y;
    if (Math.hypot(dx, dy) < 1) continue;
    const a = Math.atan2(dy, dx);
    if (prev !== null) {
      let d = a - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      sum += d;
    }
    prev = a;
  }
  return Math.abs(sum);
}

/**
 * Classifies a finished stroke. `lines` (text lines under the stroke) let it tell an underline
 * (below the x-height band) from a strike-through (through the middle of the letters).
 */
export function recognizeHint(pts: readonly P[], tool: StrokeTool, lines: readonly Line[] = []): StrokeHint {
  if (tool === "highlighter") return "highlight";
  if (pts.length < 2) return "free";
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const size = Math.max(w, h);
  if (size < 4) return "free";
  const len = pathLength(pts);
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const chord = Math.hypot(last.x - first.x, last.y - first.y);

  if (w > 12 && xReversals(pts, Math.max(6, w * 0.15)) >= 4 && len > 3 * w) return "scribble";

  if (chord < 0.3 * size && w > 10 && h > 8 && len > 2.2 * size && totalTurning(pts) > 1.6 * Math.PI) return "circle";

  // Arrow: a mostly straight shaft followed by a short head that turns back near the tip.
  let tip = 0;
  let tipD = 0;
  pts.forEach((p, i) => {
    const d = Math.hypot(p.x - first.x, p.y - first.y);
    if (d > tipD) {
      tipD = d;
      tip = i;
    }
  });
  if (tipD > 30 && tip < pts.length - 2) {
    const shaft = pathLength(pts.slice(0, tip + 1));
    const head = pts.slice(tip);
    const headLen = pathLength(head);
    if (tipD / shaft > 0.85 && headLen > 0.12 * tipD && headLen < 0.9 * tipD) {
      const tipP = pts[tip]!;
      const far = Math.max(...head.map((p) => Math.hypot(p.x - tipP.x, p.y - tipP.y)));
      if (far < 0.45 * tipD) return "arrow";
    }
  }

  if (chord / len > 0.85 && h < 0.3 * w && w > 12) {
    const midY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const line = lines.find((l) => midY >= l.top - 0.6 * (l.bottom - l.top) && midY <= l.bottom + 0.6 * (l.bottom - l.top) && maxX >= l.left && minX <= l.right);
    if (line && line.glyphs.length) {
      const g = line.glyphs[Math.floor(line.glyphs.length / 2)]!;
      // Letters span roughly baseline-0.7em … baseline; the x-height middle is ~0.3em above baseline.
      const rel = (midY - g.baseline) / g.fontSize;
      if (rel > -0.12) return "underline";
      if (rel > -0.6) return "strike";
    }
    return "underline";
  }
  return "free";
}
