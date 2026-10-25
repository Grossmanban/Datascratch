// DOM measurement for the pen layer: glyph boxes of characters, in layer coordinates.
import type { EditorView } from "@tiptap/pm/view";
import type { AnchorBox, Glyph } from "./geometry";

const blockIds = new WeakMap<Element, number>();
let blockSeq = 0;
function blockIdOf(el: Element): number {
  let id = blockIds.get(el);
  if (id === undefined) {
    id = ++blockSeq;
    blockIds.set(el, id);
  }
  return id;
}

/** The textblock element (paragraph, heading, cell paragraph, …) that contains a node. */
function textblockElement(node: Node, root: HTMLElement): Element | null {
  let el: Element | null = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  while (el && el !== root) {
    const display = getComputedStyle(el).display;
    if (display !== "inline" && display !== "contents") return el;
    el = el.parentElement;
  }
  return el;
}

interface FontMetrics {
  ascent: number;
  descent: number;
}
const metricsCache = new Map<string, FontMetrics>();
let measureCtx: CanvasRenderingContext2D | null = null;

/** Ascent/descent of a CSS font, as fractions of the font size. */
function fontMetrics(style: CSSStyleDeclaration): FontMetrics {
  const key = `${style.fontStyle} ${style.fontWeight} ${style.fontFamily}`;
  let m = metricsCache.get(key);
  if (m) return m;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (measureCtx) {
    measureCtx.font = `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`;
    const tm = measureCtx.measureText("Hg");
    const ascent = (tm.fontBoundingBoxAscent ?? tm.actualBoundingBoxAscent ?? 80) / 100;
    const descent = (tm.fontBoundingBoxDescent ?? tm.actualBoundingBoxDescent ?? 20) / 100;
    m = { ascent: ascent || 0.8, descent: descent || 0.2 };
  } else {
    m = { ascent: 0.8, descent: 0.2 };
  }
  metricsCache.set(key, m);
  return m;
}

/** Clears cached font metrics (call after web fonts finish loading). */
export function resetFontMetrics(): void {
  metricsCache.clear();
}

interface ElementInfo {
  fontSize: number;
  metrics: FontMetrics;
  rtl: boolean;
  block: number;
}

/** Per-measurement-pass cache of computed styles. */
export class LayoutPass {
  private readonly info = new Map<Element, ElementInfo>();
  private readonly range = document.createRange();
  constructor(
    readonly view: EditorView,
    readonly origin: { x: number; y: number },
  ) {}

  private elementInfo(el: Element): ElementInfo {
    let info = this.info.get(el);
    if (!info) {
      const style = getComputedStyle(el);
      const tb = textblockElement(el, this.view.dom);
      info = {
        fontSize: parseFloat(style.fontSize) || 17,
        metrics: fontMetrics(style),
        rtl: style.direction === "rtl",
        block: tb ? blockIdOf(tb) : 0,
      };
      this.info.set(el, info);
    }
    return info;
  }

  /** Glyph of the character in `text` at `offset`, or null if it is not rendered (collapsed, hidden). */
  glyphAt(text: Text, offset: number, pos: number): Glyph | null {
    const parent = text.parentElement;
    if (!parent) return null;
    const code = text.data.charCodeAt(offset);
    const end = code >= 0xd800 && code <= 0xdbff ? offset + 2 : offset + 1;
    this.range.setStart(text, offset);
    this.range.setEnd(text, Math.min(end, text.length));
    const rects = this.range.getClientRects();
    const rect = rects.length ? rects[rects.length > 1 && rects[0]!.width === 0 ? 1 : 0]! : null;
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    const info = this.elementInfo(parent);
    // The rect of a text range spans the font's content area (ascent + descent).
    const scale = rect.height / (info.metrics.ascent + info.metrics.descent) || info.fontSize;
    const baseline = rect.top + info.metrics.ascent * scale - this.origin.y;
    return {
      pos,
      left: rect.left - this.origin.x,
      right: rect.right - this.origin.x,
      top: rect.top - this.origin.y,
      bottom: rect.bottom - this.origin.y,
      baseline,
      fontSize: info.fontSize,
      block: info.block,
      rtl: info.rtl,
    };
  }

  /** Current box of the character at ProseMirror position `pos`. */
  glyphAtPos(pos: number): Glyph | null {
    let dom: { node: Node; offset: number };
    try {
      dom = this.view.domAtPos(pos + 1, -1);
    } catch {
      return null;
    }
    let { node, offset } = dom;
    if (node.nodeType !== Node.TEXT_NODE || offset === 0) {
      try {
        dom = this.view.domAtPos(pos, 1);
      } catch {
        return null;
      }
      node = dom.node;
      offset = dom.offset + 1;
      if (node.nodeType !== Node.TEXT_NODE) {
        // Position at an element boundary: step into the following text node.
        const child = node.childNodes[dom.offset];
        if (child && child.nodeType === Node.TEXT_NODE) {
          node = child;
          offset = 1;
        } else return null;
      }
    }
    const text = node as Text;
    let start = offset - 1;
    // Low surrogate: step back to the start of the pair.
    const c = text.data.charCodeAt(start);
    if (c >= 0xdc00 && c <= 0xdfff && start > 0) start--;
    return this.glyphAt(text, start, pos);
  }

  anchorBox(pos: number): AnchorBox | null {
    const g = this.glyphAtPos(pos);
    if (!g) return null;
    return { x: g.rtl ? g.right : g.left, baseline: g.baseline, fontSize: g.fontSize, block: g.block };
  }

  /**
   * All rendered glyphs whose text nodes intersect the vertical band [top, bottom] (layer coords),
   * in document order. Text inside non-editable widgets (node views, chips) is skipped.
   */
  glyphsInBand(top: number, bottom: number): Glyph[] {
    const root = this.view.dom;
    const out: Glyph[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const parent = n.parentElement;
        if (!parent || parent.closest("[contenteditable=false]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodeRange = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n as Text;
      if (!text.length) continue;
      nodeRange.selectNodeContents(text);
      const r = nodeRange.getBoundingClientRect();
      if (r.bottom - this.origin.y < top || r.top - this.origin.y > bottom) continue;
      let base: number;
      try {
        base = this.view.posAtDOM(text, 0);
      } catch {
        continue;
      }
      if (base < 0) continue;
      for (let i = 0; i < text.length; i++) {
        const code = text.data.charCodeAt(i);
        if (code >= 0xdc00 && code <= 0xdfff) continue;
        if (code === 0x200b || code === 0xfeff) continue;
        const g = this.glyphAt(text, i, base + i);
        if (g && g.bottom >= top && g.top <= bottom && g.right > g.left) out.push(g);
      }
    }
    return out;
  }
}
