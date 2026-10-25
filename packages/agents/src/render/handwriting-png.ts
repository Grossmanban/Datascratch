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
import type * as Y from "yjs";
import type { HandwritingItem } from "../doc/handwriting.js";
import { attr, findBlock, flatten, markName, TEXT_BLOCKS, childElements, type Marks } from "../doc/model.js";
import { anchorTextStrokes, readStrokes, type Stroke } from "../doc/strokes.js";
import { DISPLAY_FAMILY, ensureFonts, TEXT_FAMILY } from "./fonts.js";

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

interface Glyph {
  ch: string;
  x: number;
  w: number;
  line: number;
  font: string;
  marks: Marks;
}

interface Line {
  top: number;
  baseline: number;
  bottom: number;
}

interface Layout {
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
  return `${italic}${bold} ${style.size}px "${family}"`;
}

function layoutText(ctx: SKRSContext2D, el: Y.XmlElement, left: number, width: number): Layout {
  const style = blockStyle(el);
  const flat = flatten(el);
  const fs = style.size;
  const lineHeight = fs * (style.family === DISPLAY_FAMILY ? 1.25 : 1.5);
  const ascent = fs * 0.97;
  const glyphs: Glyph[] = [];
  for (let i = 0; i < flat.text.length; i++) {
    const ch = flat.text[i]!;
    const marks = flat.charMarks[i] ?? {};
    const font = fontFor(style, marks);
    ctx.font = font;
    const w = ch === "\n" ? 0 : ctx.measureText(ch).width;
    glyphs.push({ ch, x: 0, w, line: 0, font, marks });
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
      if (x > 0 && x + glyphs[k]!.w > width && glyphs[k]!.ch !== " ") {
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

function drawText(ctx: SKRSContext2D, layout: Layout, dy: number, focus: Set<number> | null, range?: [number, number]): void {
  ctx.textBaseline = "alphabetic";
  for (const g of layout.glyphs) {
    if (g.ch === "\n" || g.ch === " ") continue;
    if (range && (g.line < range[0] || g.line > range[1])) continue;
    const line = layout.lines[g.line]!;
    const faded = focus && !focus.has(g.line);
    const hl = has(g.marks, "highlight") as { color?: string } | undefined;
    if (hl) {
      ctx.fillStyle = cssColor(typeof hl === "object" && hl.color ? hl.color : "highlight.yellow", "rgba(255,227,110,0.5)");
      ctx.fillRect(g.x, dy + line.top + 2, g.w, line.bottom - line.top - 4);
    }
    ctx.globalAlpha = faded ? 0.45 : 1;
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
    ctx.globalAlpha = 1;
  }
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

/** Text stroke → segments via the shared layout rules; the glyph geometry comes from our typesetter. */
function textSegments(doc: Y.Doc, stroke: Stroke, block: Y.XmlElement, layout: Layout, dy: number): Pt[][] {
  const flat = flatten(block);
  const anchors = resolveAnchors(doc, stroke.anchors);
  return toPts(
    layoutTextStroke(stroke, stroke.points, anchors, (anchor) => {
      const start = flat.runStart.get(anchor.text);
      const g = start === undefined ? undefined : layout.glyphs[start + anchor.index];
      if (!g) return null;
      return { x: g.x, baseline: dy + layout.lines[g.line]!.baseline, fontSize: layout.fontSize, line: g.line };
    }),
  );
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
  /** Pixels per point (default 2). */
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

type Painter = (ctx: SKRSContext2D) => void;

async function paint(widthPt: number, top: number, bottom: number, scale: number, painters: Painter[]): Promise<RenderedImage> {
  const height = Math.max(1, bottom - top);
  const canvas = createCanvas(Math.ceil(widthPt * scale), Math.ceil(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(0, -top);
  for (const p of painters) p(ctx);
  const png = await canvas.encode("png");
  return { png, width: canvas.width, height: canvas.height };
}

const measureCanvas = () => createCanvas(4, 4).getContext("2d");

export async function renderHandwriting(doc: Y.Doc, item: HandwritingItem, options: RenderOptions = {}): Promise<RenderedImage> {
  ensureFonts();
  const scale = options.scale ?? 2;
  const ctxLines = options.contextLines ?? 1;
  const wanted = new Set(item.strokeIds);
  const strokes = readStrokes(doc).filter((s) => wanted.has(s.id));
  const width = COLUMN + PAD * 2;

  if (item.kind === "text") {
    const anchored = anchorTextStrokes(doc, strokes);
    const block = anchored[0]?.block;
    if (!block) throw new Error("handwriting has no live anchors");
    const layout = layoutText(measureCanvas(), block, PAD, COLUMN);
    const dy = PAD;
    const segs = anchored.map((a) => ({ a, segments: textSegments(doc, a.stroke, block, layout, dy) }));
    const markedLines = new Set<number>();
    for (const a of anchored) for (const o of a.offsets) if (o !== null) markedLines.add(layout.glyphs[o]?.line ?? 0);
    const minL = Math.max(0, Math.min(...markedLines) - ctxLines);
    const maxL = Math.min(layout.lines.length - 1, Math.max(...markedLines) + ctxLines);
    const box = boxOf(segs.flatMap((s) => s.segments));
    let top = dy + layout.lines[minL]!.top - 10;
    let bottom = dy + layout.lines[maxL]!.bottom + 10;
    if (box) {
      top = Math.min(top, box.minY - 8);
      bottom = Math.max(bottom, box.maxY + 8);
    }
    const focus = new Set<number>([...markedLines]);
    const under = segs.filter((s) => drawsUnderText(s.a.stroke.tool));
    const over = segs.filter((s) => !drawsUnderText(s.a.stroke.tool));
    return paint(width, top, bottom, scale, [
      (c) => under.forEach((s) => s.segments.forEach((seg) => drawSegment(c, s.a.stroke, seg))),
      (c) => drawText(c, layout, dy, focus, [minL, maxL]),
      (c) => over.forEach((s) => s.segments.forEach((seg) => drawSegment(c, s.a.stroke, seg))),
    ]);
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
      (c) => layout && drawText(c, layout, PAD, null),
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
