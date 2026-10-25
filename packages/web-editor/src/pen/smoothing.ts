import type { InputPoint } from "./geometry";

/**
 * Speed-adaptive exponential smoothing (a light "1€ filter"): slow, careful movements are smoothed
 * strongly to remove jitter, fast movements pass through with little lag.
 */
export class InputSmoother {
  private last: InputPoint | null = null;
  constructor(
    private readonly minAlpha = 0.28,
    private readonly speedGain = 0.06,
  ) {}

  reset(): void {
    this.last = null;
  }

  push(p: InputPoint): InputPoint {
    const prev = this.last;
    if (!prev) {
      this.last = p;
      return p;
    }
    const dt = Math.max(1, p.t - prev.t);
    const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt; // px per ms
    const alpha = Math.min(1, this.minAlpha + speed * this.speedGain * 10);
    const out: InputPoint = {
      x: prev.x + (p.x - prev.x) * alpha,
      y: prev.y + (p.y - prev.y) * alpha,
      pressure: prev.pressure + (p.pressure - prev.pressure) * Math.min(1, alpha + 0.2),
      altitude: p.altitude,
      azimuth: p.azimuth,
      roll: p.roll,
      t: p.t,
    };
    this.last = out;
    return out;
  }
}

/** Drops points closer than `minDist` px to the previous kept point (keeps the last point). */
export function simplify(points: readonly InputPoint[], minDist = 0.75): InputPoint[] {
  if (points.length <= 2) return points.slice();
  const out: InputPoint[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const q = out[out.length - 1]!;
    if (Math.hypot(p.x - q.x, p.y - q.y) >= minDist) out.push(p);
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** Pressure, tilt and twist of a PointerEvent in contract units (strokes.md §3). */
export function pointerSample(e: PointerEvent, origin: { x: number; y: number }, t0: number): InputPoint {
  const isPen = e.pointerType === "pen";
  const pressure = isPen ? (e.pressure > 0 ? e.pressure : 0.5) : 1;
  const ev = e as PointerEvent & { altitudeAngle?: number; azimuthAngle?: number };
  let altitude = Math.PI / 2;
  let azimuth = 0;
  if (isPen) {
    if (typeof ev.altitudeAngle === "number") {
      altitude = ev.altitudeAngle;
      azimuth = ev.azimuthAngle ?? 0;
    } else if (e.tiltX || e.tiltY) {
      const tx = (e.tiltX * Math.PI) / 180;
      const ty = (e.tiltY * Math.PI) / 180;
      altitude = Math.PI / 2 - Math.min(Math.PI / 2, Math.hypot(tx, ty));
      azimuth = (Math.atan2(Math.tan(ty), Math.tan(tx)) + 2 * Math.PI) % (2 * Math.PI);
    }
  }
  return {
    x: e.clientX - origin.x,
    y: e.clientY - origin.y,
    pressure,
    altitude,
    azimuth,
    roll: isPen && e.twist ? (e.twist * Math.PI) / 180 : 0,
    t: Math.max(0, e.timeStamp - t0),
  };
}
