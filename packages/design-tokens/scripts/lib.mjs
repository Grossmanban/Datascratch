// Pure helpers shared by the generators and tests. No dependencies.

/** Parse #RGB, #RRGGBB or #RRGGBBAA into components 0..255 and alpha 0..1. */
export function parseHex(hex) {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex);
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const v = m[1];
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
    a: v.length === 8 ? parseInt(v.slice(6, 8), 16) / 255 : 1,
  };
}

const h2 = (n) =>
  Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

export function toHex({ r, g, b, a = 1 }) {
  const base = `#${h2(r)}${h2(g)}${h2(b)}`;
  return a >= 1 ? base : `${base}${h2(a * 255)}`;
}

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue(p, q, h + 1 / 3) * 255, g: hue(p, q, h) * 255, b: hue(p, q, h - 1 / 3) * 255 };
}

/** WCAG relative luminance. */
export function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a, b) {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pen ink in the dark theme: same name, lightened so it reads on warm graphite.
 * Near-black ink becomes the dark-theme primary text colour.
 */
export function darkInk(hex, darkPrimary) {
  const c = parseHex(hex);
  const hsl = rgbToHsl(c);
  if (hsl.l < 0.2 && hsl.s < 0.25) return darkPrimary;
  const l = Math.max(hsl.l, 0.7);
  const s = Math.min(hsl.s, 0.78);
  return toHex({ ...hslToRgb({ h: hsl.h, s, l }), a: c.a });
}

/** Highlighter in the dark theme: deeper colour, lower alpha, so light text stays legible. */
export function darkHighlight(hex) {
  const c = parseHex(hex);
  const hsl = rgbToHsl(c);
  const l = Math.min(hsl.l, 0.52);
  const s = Math.min(hsl.s, 0.55);
  return toHex({ ...hslToRgb({ h: hsl.h, s, l }), a: 0.4 });
}

/**
 * SwiftUI-style spring (response = period in seconds, damping = damping fraction)
 * sampled into a CSS `linear()` easing. Returns { duration (ms), easing }.
 */
export function springToCss({ response, damping }, samples = 48) {
  const omega = (2 * Math.PI) / response;
  const zeta = damping;
  const x = (t) => {
    if (zeta >= 1) return 1 - (1 + omega * t) * Math.exp(-omega * t);
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    return (
      1 -
      Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
    );
  };
  // Settle when the remaining distance stays below 0.1 %.
  let settle = response;
  for (let t = 0; t < 10; t += 0.001) {
    let ok = true;
    for (let u = t; u < t + 0.2; u += 0.01)
      if (Math.abs(1 - x(u)) > 0.001) {
        ok = false;
        break;
      }
    if (ok) {
      settle = t;
      break;
    }
  }
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const v = i === samples ? 1 : x((settle * i) / samples);
    pts.push(Number(v.toFixed(4)));
  }
  return { duration: Math.round(settle * 1000), easing: `linear(${pts.join(", ")})` };
}

/** Motion (motion.dev) spring parameters equivalent to a SwiftUI spring. */
export function springToMotion({ response, damping }) {
  return {
    type: "spring",
    visualDuration: response,
    bounce: Number(Math.max(0, 1 - damping).toFixed(3)),
  };
}

export const kebab = (name) =>
  name
    .replace(/\./g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
export const camel = (name) => name.replace(/[.-](\w)/g, (_, c) => c.toUpperCase());
