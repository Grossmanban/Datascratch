/**
 * Icons of spaces, notebooks, folders and notes are an emoji (web) or an SF Symbol name (iOS
 * SymbolPicker). The web can't draw SF Symbols, so a known name shows as a close emoji and an
 * unknown name shows nothing — never the name itself.
 */
const SF_SYMBOLS: Record<string, string> = {
  "book.closed": "📕",
  folder: "📁",
  "doc.text": "📄",
  tray: "📥",
  archivebox: "🗃️",
  briefcase: "💼",
  house: "🏠",
  graduationcap: "🎓",
  lightbulb: "💡",
  star: "⭐",
  heart: "❤️",
  flag: "🚩",
  bookmark: "🔖",
  tag: "🏷️",
  paperplane: "✈️",
  "pencil.and.scribble": "✍️",
  paintpalette: "🎨",
  "music.note": "🎵",
  camera: "📷",
  leaf: "🍃",
  globe: "🌍",
  airplane: "✈️",
  cart: "🛒",
  sparkles: "✨",
  "brain.head.profile": "🧠",
  "chart.bar": "📊",
  hammer: "🔨",
  "cup.and.saucer": "☕",
  "figure.run": "🏃",
  "moon.stars": "🌙",
  calendar: "📅",
  person: "👤",
};

/** Looks like an SF Symbol name (`house`, `book.closed`), not an emoji or other text. */
export function isSymbolName(icon: string): boolean {
  return /^[a-z][a-z0-9]*(\.[a-z0-9]+)*$/.test(icon);
}

/** What to draw for a stored icon: the emoji, a stand-in for a known SF Symbol, or "". */
export function iconGlyph(icon: string | null | undefined): string {
  if (!icon) return "";
  if (!isSymbolName(icon)) return icon;
  // `.fill` and other variants map like the base symbol.
  return SF_SYMBOLS[icon] ?? SF_SYMBOLS[icon.replace(/\.(fill|circle|square)$/, "")] ?? "";
}

/** "🏠 Личное" — or just the name when there is nothing to draw. */
export function withIcon(icon: string | null | undefined, name: string): string {
  const g = iconGlyph(icon);
  return g ? `${g} ${name}` : name;
}
