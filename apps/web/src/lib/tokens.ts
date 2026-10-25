// Colour tokens used in documents (design-tokens.md); value = token name, rendered via CSS vars.
export const TINTS = ["red", "orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink", "gray"] as const;
export type Tint = (typeof TINTS)[number];

export function tintName(token: string | null | undefined): Tint {
  const name = (token ?? "").replace(/^tint\./, "") as Tint;
  return TINTS.includes(name) ? name : "gray";
}
export const tintFg = (token?: string | null) => `var(--ds-tint-${tintName(token)}-fg)`;
export const tintBg = (token?: string | null) => `var(--ds-tint-${tintName(token)}-bg)`;

/** `meta.backdrop` is still rendered when a document has one (spec/12 §12.7: not offered in the UI). */
export const backdropCss = (name: string) => `var(--ds-backdrop-${name.replace(/^backdrop\./, "")})`;

export const EMOJI_CHOICES = ["📓", "📒", "📕", "📗", "📘", "📙", "🗂️", "💼", "🏡", "🎓", "🧪", "✏️", "🎨", "🌱", "⭐️", "🔥", "💡", "🧭", "🗒️", "📌", "🎯", "🧠", "📷", "🎵"];
