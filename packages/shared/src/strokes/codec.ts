// Point packing (strokes.md §3): records of 8 × Float32 little-endian =
// [a, x, y, pressure, altitude, azimuth, roll, t].
import { POINT_BYTES, type StrokePoint } from "../contracts/strokes.js";

export function packPoints(points: readonly StrokePoint[]): Uint8Array {
  const out = new Uint8Array(points.length * POINT_BYTES);
  const view = new DataView(out.buffer);
  points.forEach((p, i) => {
    const o = i * POINT_BYTES;
    view.setFloat32(o, p.a, true);
    view.setFloat32(o + 4, p.x, true);
    view.setFloat32(o + 8, p.y, true);
    view.setFloat32(o + 12, p.pressure, true);
    view.setFloat32(o + 16, p.altitude, true);
    view.setFloat32(o + 20, p.azimuth, true);
    view.setFloat32(o + 24, p.roll, true);
    view.setFloat32(o + 28, p.t, true);
  });
  return out;
}

export function pointCount(packed: Uint8Array): number {
  if (packed.length % POINT_BYTES !== 0) {
    throw new RangeError(
      `packed points length ${packed.length} is not a multiple of ${POINT_BYTES}`,
    );
  }
  return packed.length / POINT_BYTES;
}

export function unpackPoints(packed: Uint8Array): StrokePoint[] {
  const n = pointCount(packed);
  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
  const out: StrokePoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * POINT_BYTES;
    out[i] = {
      a: view.getFloat32(o, true),
      x: view.getFloat32(o + 4, true),
      y: view.getFloat32(o + 8, true),
      pressure: view.getFloat32(o + 12, true),
      altitude: view.getFloat32(o + 16, true),
      azimuth: view.getFloat32(o + 20, true),
      roll: view.getFloat32(o + 24, true),
      t: view.getFloat32(o + 28, true),
    };
  }
  return out;
}

/** Zero-copy view as Float32 values (requires a little-endian host, i.e. every supported one). */
export function pointsAsFloat32(packed: Uint8Array): Float32Array {
  pointCount(packed);
  if (packed.byteOffset % 4 === 0) {
    return new Float32Array(packed.buffer, packed.byteOffset, packed.byteLength / 4);
  }
  return new Float32Array(packed.slice().buffer);
}

/** Defaults for devices without pressure / tilt / roll (strokes.md §3). */
export const DEFAULT_POINT: Omit<StrokePoint, "a" | "x" | "y" | "t"> = Object.freeze({
  pressure: 1,
  altitude: Math.PI / 2,
  azimuth: 0,
  roll: 0,
});
