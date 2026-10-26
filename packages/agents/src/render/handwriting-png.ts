/**
 * Server-side rendering of handwriting to PNG for agents (D-11).
 *
 * The text of the block is laid out with a simplified typesetter (bundled
 * Inter/Newsreader, greedy word wrap at a 600 pt column) and the strokes are
 * drawn by the rules of contracts/strokes.md: anchor glyph origin + em
 * offsets, line breaks split strokes, deleted anchors are skipped (D-35),
 * thickness = width × f(pressure) × scale, highlighter under the text with
 * multiply. The image is cropped to the marked lines plus context.
 */
import { tokens } from "@datascratch/design-tokens";
import {
  drawsUnderText,
  layoutBlockStroke,
  layoutTextStroke,
  resolveAnchors,
  type Segment,
} from "@datascratch/shared/strokes";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import * as Y from "yjs";
import { placeTextStrokes, topLevelBlocks, type HandwritingItem } from "../doc/handwriting.js";
import { attr, findBlock, flatten, markName, TEXT_BLOCKS, childElements, type Marks } from "../doc/model.js";
import { readStrokes, type Stroke } from "../doc/strokes.js";
import { DISPLAY_FAMILY, EMOJI_FAMILY, ensureFonts, TEXT_FAMILY } from "./fonts.js";

/** Reference column width in pt (strokes.md §5 scales block strokes by blockWidth/600). */
export const COLUMN = 600;
const PAD = 20;

/** Light-theme colors from the design tokens (contracts/design-tokens.md). */
const COLORS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(tokens.ink).map(([k, v]) => [`ink.${k}`, v.light])),
  ...Object.fromEntries(Object.entries(tokens.highlight).map(([k, v]) => [`highlight.${k}`, v.light])),
  ...Object.fromEntries(Object.entries(tokens.color).map(([k, v]) => [k, v.light])),
};
const BG = tokens.color["bg.surface"].light;
const INK = tokens.color["text.primary"].light;
const LINK = tokens.color.accent.light;

export function cssColor(token: string, fallback = INK): string {
  const hex = COLORS[token] ?? (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(token) ? token : null);
  if (!hex) return fallback;
  if (hex.length === 9) {
    const a = parseInt(hex.slice(7, 9), 16) / 255;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return hex;
}

export { pressureCurve } from "@datascratch/shared/strokes";

// ---------------------------------------------------------------------------
// Text layout
// ---------------------------------------------------------------------------

interface BlockStyle {
  family: string;
  size: number;
  weight: number;
}

function blockStyle(el: Y.XmlElement): BlockStyle {
  // Table cells as the iOS editor draws them (TableBlockView): 15 pt, header semibold.
  const cell = el.parent instanceof Y.XmlElement ? el.parent.nodeName : null;
  if (cell === "tableCell" || cell === "tableHeader") return { family: TEXT_FAMILY, size: 15, weight: cell === "tableHeader" ? 600 : 400 };
  switch (el.nodeName) {
    case "title":
      return { family: DISPLAY_FAMILY, size: 34, weight: 600 };
    case "heading": {
      const level = Number(attr(el, "level") ?? 1);
      return { family: DISPLAY_FAMILY, size: level === 1 ? 28 : level === 2 ? 22 : 19, weight: 600 };
    }
    case "codeBlock":
      return { family: TEXT_FAMILY, size: 15, weight: 400 };
    default:
      return { family: TEXT_FAMILY, size: 17, weight: 400 };
  }
}

/** @internal exported for tests */
export interface Glyph {
  ch: string;
  x: number;
  w: number;
  line: number;
  font: string;
  marks: Marks;
}

/** @internal */
export interface Line {
  top: number;
  baseline: number;
  bottom: number;
}

/** @internal */
export interface Layout {
  glyphs: Glyph[];
  lines: Line[];
  fontSize: number;
  height: number;
  /** Left edge of the text column. */
  left: number;
}

function has(marks: Marks, name: string): unknown {
  for (const [k, v] of Object.entries(marks)) if (markName(k) === name && v !== null && v !== false && v !== undefined) return v;
  return undefined;
}

function fontFor(style: BlockStyle, marks: Marks): string {
  const bold = has(marks, "bold") ? 700 : style.weight;
  const italic = has(marks, "italic") ? "italic " : "";
  const family = style.family === DISPLAY_FAMILY ? DISPLAY_FAMILY : TEXT_FAMILY;
  return `${italic}${bold} ${style.size}px "${family}", "${EMOJI_FAMILY}"`;
}

/** Code units that extend the previous character (surrogate tail, variation selectors, ZWJ, skin tones, combining marks). */
function continues(text: string, i: number): boolean {
  const c = text.charCodeAt(i);
  if (c >= 0xdc00 && c <= 0xdfff && i > 0) {
    const p = text.charCodeAt(i - 1);
    if (p >= 0xd800 && p <= 0xdbff) return true;
  }
  if (c === 0xfe0f || c === 0xfe0e || c === 0x200d || c === 0x20e3) return true;
  if (c >= 0x0300 && c <= 0x036f) return true;
  // Skin-tone modifiers U+1F3FB…1F3FF (high surrogate D83C, low DFFB–DFFF).
  if (c === 0xd83c && i + 1 < text.length) {
    const n = text.charCodeAt(i + 1);
    if (n >= 0xdffb && n <= 0xdfff) return true;
  }
  // The character after a ZWJ joins the sequence.
  if (i > 0 && text.charCodeAt(i - 1) === 0x200d) return true;
  return false;
}

function layoutText(ctx: SKRSContext2D, el: Y.XmlElement, left: number, width: number): Layout {
  const style = blockStyle(el);
  const flat = flatten(el);
  const fs = style.size;
  const lineHeight = fs * (style.family === DISPLAY_FAMILY ? 1.25 : 1.5);
  const ascent = fs * 0.97;
  // One glyph per UTF-16 index (anchor offsets are UTF-16 indices); a cluster (emoji, accents)
  // is drawn by its first index, the following indices get zero width at the same position.
  const glyphs: Glyph[] = [];
  let head = -1;
  for (let i = 0; i < flat.text.length; i++) {
    const ch = flat.text[i]!;
    const marks = flat.charMarks[i] ?? {};
    const font = fontFor(style, marks);
    if (head >= 0 && continues(flat.text, i)) {
      glyphs[head]!.ch += ch;
      glyphs.push({ ch: "", x: 0, w: 0, line: 0, font, marks });
      continue;
    }
    head = glyphs.length;
    glyphs.push({ ch, x: 0, w: 0, line: 0, font, marks });
  }
  for (const g of glyphs) {
    if (!g.ch || g.ch === "\n") continue;
    ctx.font = g.font;
    g.w = ctx.measureText(g.ch).width + (has(g.marks, "code") ? 1 : 0);
  }
  // Greedy word wrap.
  let line = 0;
  let x = 0;
  let i = 0;
  while (i < glyphs.length) {
    if (glyphs[i]!.ch === "\n") {
      glyphs[i]!.x = x;
      glyphs[i]!.line = line;
      line++;
      x = 0;
      i++;
      continue;
    }
    let j = i;
    let wordW = 0;
    while (j < glyphs.length && glyphs[j]!.ch !== "\n" && !(j > i && glyphs[j - 1]!.ch === " ")) {
      wordW += glyphs[j]!.w;
      j++;
    }
    const trimmed = wordW - (glyphs[j - 1]!.ch === " " ? glyphs[j - 1]!.w : 0);
    if (x > 0 && x + trimmed > width) {
      line++;
      x = 0;
    }
    for (let k = i; k < j; k++) {
      if (x > 0 && x + glyphs[k]!.w > width && glyphs[k]!.ch !== " " && glyphs[k]!.w > 0) {
        line++;
        x = 0;
      }
      glyphs[k]!.x = x;
      glyphs[k]!.line = line;
      x += glyphs[k]!.w;
    }
    i = j;
  }
  const lineCount = Math.max(1, (glyphs[glyphs.length - 1]?.line ?? 0) + 1);
  const lines: Line[] = [];
  for (let l = 0; l < lineCount; l++) {
    const top = l * lineHeight;
    const baseline = top + (lineHeight - fs) / 2 + ascent * 0.92;
    lines.push({ top, baseline, bottom: top + lineHeight });
  }
  for (const g of glyphs) g.x += left;
  return { glyphs, lines, fontSize: fs, height: lineCount * lineHeight, left };
}

const CODE_BG = tokens.color["line.separator"].light;

function drawText(ctx: SKRSContext2D, layout: Layout, dy: number): void {
  ctx.textBaseline = "alphabetic";
  for (const g of layout.glyphs) {
    if (!g.ch || g.ch === "\n") continue;
    const line = layout.lines[g.line]!;
    const hl = has(g.marks, "highlight") as { color?: string } | undefined;
    if (hl) {
      ctx.fillStyle = cssColor(typeof hl === "object" && hl.color ? hl.color : "highlight.yellow", "rgba(255,227,110,0.5)");
      ctx.fillRect(g.x, dy + line.top + 2, g.w, line.bottom - line.top - 4);
    }
    if (has(g.marks, "code")) {
      ctx.fillStyle = CODE_BG;
      ctx.fillRect(g.x - 0.5, dy + line.top + 4, g.w + 1, line.bottom - line.top - 8);
    }
    if (g.ch === " ") continue;
    ctx.font = g.font;
    const link = has(g.marks, "link") || has(g.marks, "__atom");
    ctx.fillStyle = link ? LINK : INK;
    ctx.fillText(g.ch, g.x, dy + line.baseline);
    if (has(g.marks, "underline") || has(g.marks, "strike")) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1;
      const y = has(g.marks, "strike") ? line.baseline - layout.fontSize * 0.3 : line.baseline + 2;
      ctx.beginPath();
      ctx.moveTo(g.x, dy + y);
      ctx.lineTo(g.x + g.w, dy + y);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Region layout: the top-level blocks a handwriting group touches, laid out
// like the editor does (stacked blocks, indented lists, tables as a grid).
// ---------------------------------------------------------------------------

type Painter = (ctx: SKRSContext2D) => void;

interface PlacedText {
  layout: Layout;
  dy: number;
  /** Unique id of the block for line keys. */
  key: number;
}

/** @internal */
export interface Region {
  texts: Map<Y.XmlElement, PlacedText>;
  /** Backgrounds, borders, list markers (drawn before text). */
  decor: Painter[];
  height: number;
}

const MUTED = tokens.color["text.tertiary"].light;
const LINE = tokens.color["line.separator"].light;
const PANEL = tokens.color["bg.sidebar"].light;

/** @internal */
export function layoutRegion(ctx: SKRSContext2D, tops: Y.XmlElement[], x0: number, width: number): Region {
  const texts = new Map<Y.XmlElement, PlacedText>();
  const decor: Painter[] = [];
  const text = (el: Y.XmlElement, x: number, y: number, w: number): number => {
    const layout = layoutText(ctx, el, x, w);
    texts.set(el, { layout, dy: y, key: texts.size });
    if (el.nodeName === "codeBlock") decor.push((c) => ((c.fillStyle = PANEL), c.fillRect(x - 8, y - 4, w + 16, layout.height + 8)));
    return layout.height;
  };
  const label = (x: number, y: number, w: number, s: string): number => {
    decor.push((c) => {
      c.fillStyle = PANEL;
      c.fillRect(x, y + 2, w, 26);
      c.fillStyle = MUTED;
      c.font = `400 13px "${TEXT_FAMILY}", "${EMOJI_FAMILY}"`;
      c.fillText(s.slice(0, 80), x + 8, y + 19);
    });
    return 30;
  };
  const firstBaseline = (el: Y.XmlElement): number | null => {
    for (const [b, p] of texts) {
      let cur: unknown = b;
      while (cur instanceof Y.AbstractType && cur !== el) cur = cur.parent;
      if (cur === el) return p.dy + p.layout.lines[0]!.baseline;
    }
    return null;
  };
  const stack = (els: Y.XmlElement[], x: number, y: number, w: number, gap: number): number => {
    let h = 0;
    els.forEach((c, i) => {
      if (i > 0) h += gap;
      h += layoutEl(c, x, y + h, w);
    });
    return h;
  };
  const layoutEl = (el: Y.XmlElement, x: number, y: number, w: number): number => {
    if (TEXT_BLOCKS.has(el.nodeName)) return text(el, x, y, w);
    const kids = childElements(el);
    switch (el.nodeName) {
      case "bulletList":
      case "orderedList":
      case "taskList": {
        let h = 0;
        const start = Number(attr(el, "start") ?? 1);
        kids.forEach((item, i) => {
          if (i > 0) h += 2;
          const iy = y + h;
          h += layoutEl(item, x + 24, iy, w - 24);
          const base = firstBaseline(item) ?? iy + 17;
          const marker =
            el.nodeName === "orderedList" ? `${start + i}.` : el.nodeName === "taskList" ? (attr(item, "state") === "done" ? "☑" : "☐") : "•";
          decor.push((c) => ((c.fillStyle = MUTED), (c.font = `400 16px "${TEXT_FAMILY}", "${EMOJI_FAMILY}"`), c.fillText(marker, x + 4, base)));
        });
        return h;
      }
      case "blockquote": {
        const h = stack(kids, x + 16, y, w - 16, 4);
        decor.push((c) => ((c.fillStyle = LINE), c.fillRect(x + 2, y, 3, h)));
        return h;
      }
      case "callout": {
        const h = stack(kids, x + 14, y + 8, w - 28, 4) + 16;
        decor.push((c) => ((c.fillStyle = PANEL), c.fillRect(x, y, w, h)));
        return h;
      }
      case "table": {
        // Equal columns, 10 pt inset, rows at least 38 pt — the editors' table geometry.
        const cols = Math.max(1, ...kids.map((r) => childElements(r).length));
        const cw = w / cols;
        let h = 0;
        kids.forEach((row, r) => {
          const cells = childElements(row);
          const ry = y + h;
          const heights = cells.map((cell, ci) => stack(childElements(cell), x + ci * cw + 10, ry + 8, cw - 20, 2) + 16);
          const rh = Math.max(38, ...heights);
          const header = cells.some((c) => c.nodeName === "tableHeader") || r === 0;
          decor.push((c) => {
            if (header) ((c.fillStyle = PANEL), c.fillRect(x, ry, cols * cw, rh));
            c.strokeStyle = LINE;
            c.lineWidth = 1;
            for (let ci = 0; ci < cols; ci++) c.strokeRect(x + ci * cw, ry, cw, rh);
          });
          h += rh;
        });
        return h;
      }
      case "horizontalRule":
        decor.push((c) => ((c.fillStyle = LINE), c.fillRect(x, y + 8, w, 1)));
        return 18;
      case "image":
        return label(x, y, w, `🖼 ${String(attr(el, "alt") || attr(el, "caption") || "картинка")}`);
      case "file":
        return label(x, y, w, `📎 ${String(attr(el, "name") ?? "файл")}`);
      case "mathBlock":
        return label(x, y, w, `∑ ${String(attr(el, "latex") ?? "")}`);
      case "mermaid":
        return label(x, y, w, "диаграмма");
      case "drawing":
        return label(x, y, w, "рисунок");
      case "pageCard":
        return label(x, y, w, "📄 вложенный документ");
      default:
        return stack(kids, x, y, w, 4);
    }
  };
  const height = stack(tops, x0, PAD, width, 12) + PAD;
  return { texts, decor, height };
}

// ---------------------------------------------------------------------------
// Strokes
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
  w: number;
}

const toPts = (segments: Segment[]): Pt[][] => segments.map((seg) => seg.map((p) => ({ x: p.x, y: p.y, w: Math.max(0.4, p.width) })));

function drawSegment(ctx: SKRSContext2D, stroke: Stroke, pts: Pt[]): void {
  if (pts.length < 2) return; // D-35: a segment shorter than 2 points is not drawn
  const color = cssColor(stroke.color, stroke.tool === "highlighter" ? "rgba(255,227,110,0.5)" : INK);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.globalAlpha = stroke.opacity;
  if (drawsUnderText(stroke.tool)) ctx.globalCompositeOperation = "multiply";
  const uniform = drawsUnderText(stroke.tool) || stroke.opacity < 1 || color.startsWith("rgba");
  if (uniform) {
    ctx.lineWidth = pts.reduce((s, p) => s + p.w, 0) / pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      ctx.lineWidth = (a.w + b.w) / 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Where a drawn point's anchor landed in our layout. */
interface PointInfo {
  anchor: number;
  block: Y.XmlElement;
  baseline: number;
}

/** A text stroke laid out by the shared rules, with each drawn point's anchor placement. */
interface Traced {
  stroke: Stroke;
  rigid: boolean;
  segments: Segment[];
  info: PointInfo[][];
}

/** Handwritten words and symbols keep their own shape; underlines, circles and highlights follow the text. */
const RIGID_HINTS = new Set<Stroke["hint"]>(["free", "scribble", "arrow"]);

/**
 * Text stroke → segments via the shared layout rules; anchors may point into
 * any laid-out text block of the region (a word written across cells).
 */
function traceStroke(doc: Y.Doc, stroke: Stroke, region: Region, anchorLines: { top: number; bottom: number }[] | undefined, keepShape: boolean): Traced {
  const starts = new Map<Y.XmlElement, Map<Y.XmlText, number>>();
  const anchors = resolveAnchors(doc, stroke.anchors);
  const rigid = keepShape && RIGID_HINTS.has(stroke.hint);
  const placedAt = new Map<object, { block: Y.XmlElement; baseline: number }>();
  // `t` carries the point index through the shared layout, to know each drawn point's anchor.
  const indexed = stroke.points.map((p, i) => ({ ...p, t: i }));
  const segments = layoutTextStroke(stroke, indexed, anchors, (anchor) => {
    const block = anchor.text.parent;
    if (!(block instanceof Y.XmlElement)) return null;
    const placed = region.texts.get(block);
    if (!placed) return null;
    let runStart = starts.get(block);
    if (!runStart) starts.set(block, (runStart = flatten(block).runStart));
    const start = runStart.get(anchor.text);
    const g = start === undefined ? undefined : placed.layout.glyphs[start + anchor.index];
    if (!g) return null;
    const line = placed.layout.lines[g.line]!;
    anchorLines?.push({ top: placed.dy + line.top, bottom: placed.dy + line.bottom });
    placedAt.set(anchor, { block, baseline: placed.dy + line.baseline });
    // A handwritten word is one shape even where our layout wraps or changes cell: never split it there.
    return { x: g.x, baseline: placed.dy + line.baseline, fontSize: placed.layout.fontSize, line: rigid ? "stroke" : `${placed.key}:${g.line}` };
  });
  const info = segments.map((seg) =>
    seg.map((p) => {
      const a = stroke.points[p.t]!.a;
      return { anchor: a, ...placedAt.get(anchors[a]!)! };
    }),
  );
  return { stroke, rigid, segments, info };
}

/**
 * Each point of a text stroke is stored relative to its own anchor character,
 * so one handwritten word spans several anchors — often in different cells or
 * lines, and over several strokes. Our font advances, line wraps and table
 * columns differ from the editor's, which would shift the parts of a word
 * against each other at every anchor change (a crisp «g» smeared into its «e»).
 *
 * Within one anchor the motion is exact (vertically also on one baseline);
 * across a change we take the motion of the neighbouring samples instead. The
 * difference at a change between two text blocks tells how far our layout of
 * one block is shifted against the other compared to the editor; all strokes
 * of the group are placed in the frame of the block most of them sit in, so
 * letters in neighbouring cells keep their spacing too.
 */
function shapeGroup(traced: Traced[]): Pt[][][] {
  type Shape = { xs: number[]; ys: number[] };
  const shapes = new Map<Segment, Shape>();
  const jumps = new Map<Y.XmlElement, Map<Y.XmlElement, { x: number; y: number }[]>>();
  const jump = (a: Y.XmlElement, b: Y.XmlElement, x: number, y: number) => {
    let m = jumps.get(a);
    if (!m) jumps.set(a, (m = new Map()));
    m.set(b, [...(m.get(b) ?? []), { x, y }]);
  };
  const blockCount = new Map<Y.XmlElement, number>();
  for (const t of traced) {
    if (!t.rigid) continue;
    t.segments.forEach((seg, si) => {
      const info = t.info[si]!;
      const same = (k: number) => k >= 1 && k < seg.length && info[k]!.anchor === info[k - 1]!.anchor;
      const step = (k: number, axis: "x" | "y") => seg[k]![axis] - seg[k - 1]![axis];
      const estimate = (k: number, axis: "x" | "y") => {
        const around = [k - 1, k + 1].filter(same).map((j) => step(j, axis));
        return around.length ? around.reduce((a, b) => a + b, 0) / around.length : 0;
      };
      const xs = [seg[0]!.x];
      const ys = [seg[0]!.y];
      for (let k = 1; k < seg.length; k++) {
        const exact = same(k);
        const sx = exact ? step(k, "x") : estimate(k, "x");
        const sy = exact || info[k]!.baseline === info[k - 1]!.baseline ? step(k, "y") : estimate(k, "y");
        xs.push(xs[k - 1]! + sx);
        ys.push(ys[k - 1]! + sy);
        const a = info[k - 1]!.block;
        const b = info[k]!.block;
        if (a !== b) {
          // How much further our layout puts block b than the editor did, relative to block a.
          jump(a, b, step(k, "x") - sx, step(k, "y") - sy);
          jump(b, a, sx - step(k, "x"), sy - step(k, "y"));
        }
      }
      for (const i of info) blockCount.set(i.block, (blockCount.get(i.block) ?? 0) + 1);
      shapes.set(seg, { xs, ys });
    });
  }
  // Offsets of every block against the main one, through the observed jumps (breadth-first).
  const main = [...blockCount.entries()].sort((p, q) => q[1] - p[1])[0]?.[0];
  const offset = new Map<Y.XmlElement, { x: number; y: number }>();
  if (main) {
    offset.set(main, { x: 0, y: 0 });
    const queue = [main];
    while (queue.length) {
      const a = queue.shift()!;
      for (const [b, list] of jumps.get(a) ?? []) {
        if (offset.has(b)) continue;
        const o = offset.get(a)!;
        offset.set(b, { x: o.x + list.reduce((s, j) => s + j.x, 0) / list.length, y: o.y + list.reduce((s, j) => s + j.y, 0) / list.length });
        queue.push(b);
      }
    }
  }
  return traced.map((t) =>
    toPts(
      t.segments.map((seg, si) => {
        const shape = shapes.get(seg);
        const out = shape
          ? (() => {
              // Place the shape where our layout puts its points, each moved into the main block's frame.
              const info = t.info[si]!;
              const off = (k: number) => offset.get(info[k]!.block) ?? { x: 0, y: 0 };
              const dx = seg.reduce((s, p, k) => s + p.x - off(k).x - shape.xs[k]!, 0) / seg.length;
              const dy = seg.reduce((s, p, k) => s + p.y - off(k).y - shape.ys[k]!, 0) / seg.length;
              return seg.map((p, k) => ({ ...p, x: shape.xs[k]! + dx, y: shape.ys[k]! + dy }));
            })()
          : seg;
        return out.map((p) => ({ ...p, t: t.stroke.points[p.t]!.t }));
      }),
    ),
  );
}

function regionSegments(doc: Y.Doc, stroke: Stroke, region: Region, anchorLines?: { top: number; bottom: number }[], keepShape = true): Pt[][] {
  return shapeGroup([traceStroke(doc, stroke, region, anchorLines, keepShape)])[0]!;
}

/** Lays out top-level blocks like the PNG does. @internal (tests) */
export const regionOf = (tops: Y.XmlElement[]): Region => layoutRegion(measureCanvas(), tops, PAD, COLUMN);

/** A text stroke's drawn segments in the region of `tops`. @internal (tests) */
export function strokeInRegion(doc: Y.Doc, stroke: Stroke, tops: Y.XmlElement[], keepShape = true): Pt[][] {
  return regionSegments(doc, stroke, regionOf(tops), undefined, keepShape);
}

/** The drawn segments of several strokes of one group (placed together). @internal (tests) */
export function groupInRegion(doc: Y.Doc, strokes: Stroke[], tops: Y.XmlElement[]): Pt[][][] {
  const region = regionOf(tops);
  return shapeGroup(strokes.map((s) => traceStroke(doc, s, region, undefined, true)));
}

/**
 * Single-block variant used by tests. `keepShape: false` gives the pure contract layout
 * (shared stroke vectors); the default is what the PNG draws. @internal
 */
export function textSegments(doc: Y.Doc, stroke: Stroke, block: Y.XmlElement, layout: Layout, dy: number, keepShape = true): Pt[][] {
  return regionSegments(doc, stroke, { texts: new Map([[block, { layout, dy, key: 0 }]]), decor: [], height: 0 }, undefined, keepShape);
}

function boxOf(segments: Pt[][]): { minY: number; maxY: number; minX: number; maxX: number } | null {
  const pts = segments.flat();
  if (pts.length === 0) return null;
  return {
    minY: Math.min(...pts.map((p) => p.y - p.w)),
    maxY: Math.max(...pts.map((p) => p.y + p.w)),
    minX: Math.min(...pts.map((p) => p.x - p.w)),
    maxX: Math.max(...pts.map((p) => p.x + p.w)),
  };
}

export interface RenderOptions {
  /** Pixels per point (default: 3 for small fragments, 2 otherwise — autoScale). */
  scale?: number;
  /** Lines of surrounding text above and below the marked lines (default 1). */
  contextLines?: number;
  /** Decoded attachment bytes for kind=image. */
  image?: Uint8Array | null;
}

export interface RenderedImage {
  png: Buffer;
  width: number;
  height: number;
}

/** Small fragments (a word in a cell) are drawn denser so thin strokes stay crisp. */
export function autoScale(heightPt: number): number {
  return heightPt <= 200 ? 3 : 2;
}

async function paint(widthPt: number, top: number, bottom: number, requested: number | undefined, painters: Painter[], left = 0): Promise<RenderedImage> {
  const height = Math.max(1, bottom - top);
  const scale = requested ?? autoScale(height);
  const canvas = createCanvas(Math.ceil(widthPt * scale), Math.ceil(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(-left, -top);
  for (const p of painters) p(ctx);
  const png = await canvas.encode("png");
  return { png, width: canvas.width, height: canvas.height };
}

const measureCanvas = () => createCanvas(4, 4).getContext("2d");

export async function renderHandwriting(doc: Y.Doc, item: HandwritingItem, options: RenderOptions = {}): Promise<RenderedImage> {
  ensureFonts();
  const scale = options.scale;
  const ctxLines = options.contextLines ?? 1;
  const wanted = new Set(item.strokeIds);
  const strokes = readStrokes(doc).filter((s) => wanted.has(s.id));
  const width = COLUMN + PAD * 2;

  if (item.kind === "text") {
    // The group's top-level blocks (and everything between them) are laid out as the editor shows them.
    const placements = placeTextStrokes(doc, strokes);
    if (placements.length === 0) throw new Error("handwriting has no visible strokes");
    const all = topLevelBlocks(doc);
    const idx = placements.map((p) => all.indexOf(p.top)).filter((n) => n >= 0);
    const tops = all.slice(Math.min(...idx), Math.max(...idx) + 1);
    const region = layoutRegion(measureCanvas(), tops, PAD, COLUMN);
    const anchorLines: { top: number; bottom: number }[] = [];
    const shaped = shapeGroup(placements.map((p) => traceStroke(doc, p.stroke, region, anchorLines, true)));
    const segs = placements.map((p, i) => ({ s: p.stroke, segments: shaped[i]! }));
    const box = boxOf(segs.flatMap((x) => x.segments));
    if (!box) throw new Error("handwriting has no visible strokes");
    // Frame: every stroke (never clipped) plus the lines it sits on and some context around them.
    const context = 26 * ctxLines;
    const linesTop = Math.min(...anchorLines.map((l) => l.top));
    const linesBottom = Math.max(...anchorLines.map((l) => l.bottom));
    // Snap the context edges to whole text lines (no half-cut lines at the borders).
    const allLines = [...region.texts.values()].flatMap((p) => p.layout.lines.map((l) => ({ top: p.dy + l.top, bottom: p.dy + l.bottom })));
    const snapUp = (y: number) => Math.min(y, ...allLines.filter((l) => l.top < y && l.bottom > y).map((l) => l.top - 6));
    const snapDown = (y: number) => Math.max(y, ...allLines.filter((l) => l.top < y && l.bottom > y).map((l) => l.bottom + 6));
    const top = Math.min(box.minY - 10, Math.max(0, snapUp(linesTop - context)));
    const bottom = Math.max(box.maxY + 10, Math.min(region.height, snapDown(linesBottom + context)));
    const left = Math.min(0, box.minX - 10);
    const right = Math.max(width, box.maxX + 10);
    const under = segs.filter((x) => drawsUnderText(x.s.tool));
    const over = segs.filter((x) => !drawsUnderText(x.s.tool));
    return paint(
      right - left,
      top,
      bottom,
      scale,
      [
        (c) => region.decor.forEach((d) => d(c)),
        (c) => under.forEach((x) => x.segments.forEach((seg) => drawSegment(c, x.s, seg))),
        (c) => region.texts.forEach((p) => drawText(c, p.layout, p.dy)),
        (c) => over.forEach((x) => x.segments.forEach((seg) => drawSegment(c, x.s, seg))),
      ],
      left,
    );
  }

  const loc = item.blockId ? findBlock(doc, item.blockId) : null;
  if (!loc) throw new Error("handwriting block not found");
  const blockPts = (s: Stroke, originY: number) => toPts(layoutBlockStroke(s, s.points, { x: PAD, y: originY, width: COLUMN }));

  if (item.kind === "margin") {
    const textEl = TEXT_BLOCKS.has(loc.el.nodeName) ? loc.el : (childElements(loc.el).find((c) => TEXT_BLOCKS.has(c.nodeName)) ?? null);
    const layout = textEl ? layoutText(measureCanvas(), textEl, PAD, COLUMN) : null;
    const segs = strokes.map((s) => ({ s, segments: blockPts(s, PAD) }));
    const box = boxOf(segs.flatMap((x) => x.segments));
    const top = Math.min(0, (box?.minY ?? PAD) - 8);
    const bottom = Math.max(PAD + (layout?.height ?? 0) + PAD, (box?.maxY ?? 0) + 8);
    return paint(width, top, bottom, scale, [
      (c) => layout && drawText(c, layout, PAD),
      (c) => segs.forEach((x) => x.segments.forEach((seg) => drawSegment(c, x.s, seg))),
    ]);
  }

  // drawing / image: points in fractions of the block width
  const segs = strokes.map((s) => ({ s, segments: blockPts(s, PAD) }));
  const box = boxOf(segs.flatMap((x) => x.segments));
  let contentH = Number(attr(loc.el, "height") ?? 0) || 0;
  let img: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (item.kind === "image" && options.image) {
    try {
      img = await loadImage(Buffer.from(options.image));
      contentH = (COLUMN * img.height) / img.width;
    } catch {
      img = null;
    }
  }
  if (!contentH) contentH = Math.max(120, (box?.maxY ?? 0) - PAD + 12);
  const top = Math.min(0, (box?.minY ?? 0) - 8);
  const bottom = Math.max(PAD * 2 + contentH, (box?.maxY ?? 0) + 8);
  return paint(width, top, bottom, scale, [
    (c) => {
      if (item.kind !== "image") return;
      if (img) c.drawImage(img, PAD, PAD, COLUMN, contentH);
      else {
        c.fillStyle = "#F3EFE7";
        c.fillRect(PAD, PAD, COLUMN, contentH);
        c.fillStyle = "#9C978E";
        c.font = `400 15px "${TEXT_FAMILY}"`;
        c.fillText(String(attr(loc.el, "alt") || "картинка"), PAD + 12, PAD + 24);
      }
    },
    (c) => segs.forEach((x) => x.segments.forEach((seg) => drawSegment(c, x.s, seg))),
  ]);
}
