// Colour tokens used in documents (design-tokens.md); value = token name, rendered via CSS vars.
export const TINTS = ["red", "orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink", "gray"] as const;
export type Tint = (typeof TINTS)[number];

export function tintName(token: string | null | undefined): Tint {
  const name = (token ?? "").replace(/^tint\./, "") as Tint;
  return TINTS.includes(name) ? name : "gray";
}
export const tintFg = (token?: string | null) => `var(--ds-tint-${tintName(token)}-fg)`;
export const tintBg = (token?: string | null) => `var(--ds-tint-${tintName(token)}-bg)`;

export const BACKDROPS = ["sand", "dusk", "mist", "meadow", "ember"] as const;
export const backdropCss = (name: string) => `var(--ds-backdrop-${name.replace(/^backdrop\./, "")})`;

/** Deterministic soft gradient for documents without a cover image. */
export function coverGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return backdropCss(BACKDROPS[h % BACKDROPS.length]!);
}

export const EMOJI_CHOICES = ["📓", "📒", "📕", "📗", "📘", "📙", "🗂️", "💼", "🏡", "🎓", "🧪", "✏️", "🎨", "🌱", "⭐️", "🔥", "💡", "🧭", "🗒️", "📌", "🎯", "🧠", "📷", "🎵"];
