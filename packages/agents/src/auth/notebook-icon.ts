/**
 * Notebook icon for server-rendered pages: a tile in the notebook's tint with
 * either its emoji or an inline SVG stand-in for the SF Symbol names the iOS
 * symbol picker stores (the page has no external resources: CSP default-src 'none').
 */
import { tokens } from "@datascratch/design-tokens";
import { esc } from "./pages-escape.js";

const SVG: Record<string, string> = {
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.5 9h17M3.5 15h17"/>',
  "book.closed": '<path d="M6 3.5h11a1 1 0 0 1 1 1V20H7a2 2 0 0 1-2-2V5a1.5 1.5 0 0 1 1-1.5z"/><path d="M5 17a2 2 0 0 1 2-2h11"/>',
  folder: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="11.5" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17"/>',
  house: '<path d="M4 11 12 4.5 20 11"/><path d="M6.5 9.5V19h11V9.5M10 19v-5h4v5"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  heart: '<path d="M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7.3a3.8 3.8 0 0 1 7 2.2C19 14.6 12 19 12 19z"/>',
  lightbulb: '<path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z"/>',
  bookmark: '<path d="M7 3.5h10V20l-5-3.5L7 20z"/>',
  tag: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8 8z"/><circle cx="8" cy="8" r="1.3"/>',
  "doc.text": '<path d="M6.5 3.5h7l4 4V20a.5.5 0 0 1-.5.5H6.5A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6"/>',
  tray: '<path d="M3.5 13.5 6 5.5h12l2.5 8V19h-17z"/><path d="M3.5 13.5h5a3.5 3.5 0 0 0 7 0h5"/>',
  "graduationcap": '<path d="m2.5 9.5 9.5-4.5 9.5 4.5-9.5 4.5z"/><path d="M6.5 11.5V16c3.5 2.5 7.5 2.5 11 0v-4.5M21.5 9.5V15"/>',
  sparkles: '<path d="M10 4.5 11.6 9l4.4 1.5-4.4 1.6L10 16.5l-1.6-4.4L4 10.5 8.4 9zM17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
};
/** Fallback symbol: a closed notebook. */
const DEFAULT_SYMBOL = "book.closed";

function isSymbolName(icon: string): boolean {
  return /^[a-z][a-z0-9]*(\.[a-z0-9]+)*$/.test(icon);
}

interface Tint {
  fg: { light: string; dark: string };
  bg: { light: string; dark: string };
}

function tintOf(color: string | null | undefined): Tint {
  const tints = tokens.tint as Record<string, Tint>;
  const name = color?.replace(/^tint\./, "").replace(/\.(fg|bg)$/, "");
  if (name && tints[name]) return tints[name]!;
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return { fg: { light: color, dark: color }, bg: { light: `${color}1F`, dark: `${color}33` } };
  return tints.blue!;
}

/** CSS for `.ico` tiles (light and dark themes). */
export const ICON_STYLE =
  ".ico{flex:none;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--tf);background:var(--tb);font-size:17px;line-height:1}" +
  ".ico svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}" +
  "@media (prefers-color-scheme:dark){.ico{color:var(--tfd);background:var(--tbd)}}";

export function notebookIcon(icon: string | null | undefined, color: string | null | undefined): string {
  const t = tintOf(color);
  const style = `--tf:${t.fg.light};--tb:${t.bg.light};--tfd:${t.fg.dark};--tbd:${t.bg.dark}`;
  let inner: string;
  if (icon && !isSymbolName(icon)) inner = esc(icon);
  else {
    const base = icon?.replace(/\.(fill|circle|square)$/, "");
    const paths = (icon && SVG[icon]) ?? (base && SVG[base]) ?? SVG[DEFAULT_SYMBOL]!;
    inner = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  }
  return `<span class="ico" style="${style}">${inner}</span>`;
}
