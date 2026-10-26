/**
 * Groups strokes of a note into "handwriting items" an agent can refer to:
 * each item is one picture (get_handwriting_image) plus a text note of what
 * it is attached to ("подчёркнуто от руки: «…»", D-11).
 *
 * A written word is several strokes whose points are anchored to whatever
 * characters happen to be nearest — often in different words, cells or
 * paragraphs. So text strokes are grouped by *time* (one writing run) within
 * one top-level block, never by anchor; anchors only name the place.
 */
import * as Y from "yjs";
import { attr, blockIdOf, childElements, contentOf, findBlock, flatten } from "./model.js";
import { readStrokes, resolveAnchor, type Stroke, type StrokeHint } from "./strokes.js";

export type HandwritingKind = "text" | "margin" | "drawing" | "image";

export interface HandwritingItem {
  /** Stable id: the id of the first stroke of the group. */
  id: string;
  kind: HandwritingKind;
  /** The text block most strokes are anchored to (kind=text), or the block the strokes belong to. */
  blockId: string | null;
  /** Top-level block of the group (where read_note shows it when the inner block has no line of its own). */
  topBlockId: string | null;
  strokeIds: string[];
  /** Human-readable description in Russian, e.g. `подчёркнуто от руки: «важно»`. */
  description: string;
  /** Marked spans per stroke (kind=text). */
  marks: { hint: StrokeHint; tool: string; text: string; start: number; end: number }[];
}

const HINT_RU: Record<StrokeHint, string> = {
  underline: "подчёркнуто от руки",
  strike: "зачёркнуто от руки",
  circle: "обведено от руки",
  highlight: "выделено маркером",
  arrow: "стрелка от руки у",
  scribble: "написано от руки рядом с",
  free: "написано от руки рядом с",
};

/** Strokes drawn within this pause belong to one writing run (one word, one mark). */
export const GROUP_PAUSE_MS = 2500;

function hintOf(s: Stroke): StrokeHint {
  if (s.tool === "highlighter" && s.hint === "free") return "highlight";
  return s.hint;
}

function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

/** The element directly under the note's content fragment that contains `el`. */
export function topLevelOf(el: Y.XmlElement): Y.XmlElement {
  let cur: Y.XmlElement = el;
  while (cur.parent instanceof Y.XmlElement) cur = cur.parent;
  return cur;
}

export interface PlacedAnchor {
  block: Y.XmlElement;
  offset: number;
}

export interface TextStrokePlacement {
  stroke: Stroke;
  /** Per anchor: the text block and offset in its flattened text, or null when deleted. */
  anchors: (PlacedAnchor | null)[];
  /** Text block holding most live anchors. */
  main: Y.XmlElement;
  top: Y.XmlElement;
}

/** Resolves every anchor of text strokes to (text block, offset); strokes with no live anchor are dropped (D-35). */
export function placeTextStrokes(doc: Y.Doc, strokes: Stroke[]): TextStrokePlacement[] {
  const runStart = new Map<Y.XmlElement, Map<Y.XmlText, number>>();
  const startsOf = (b: Y.XmlElement) => {
    let m = runStart.get(b);
    if (!m) runStart.set(b, (m = flatten(b).runStart));
    return m;
  };
  const out: TextStrokePlacement[] = [];
  for (const stroke of strokes) {
    if (stroke.anchorKind !== "text") continue;
    const anchors = stroke.anchors.map((a): PlacedAnchor | null => {
      const r = resolveAnchor(doc, a);
      if (!r) return null;
      const start = startsOf(r.block).get(r.ytext);
      return start === undefined ? null : { block: r.block, offset: start + r.index };
    });
    // Visible only if two consecutive points sit on live characters (a 1-point segment is not drawn, D-35).
    const live = (p: { a: number }) => anchors[Math.round(p.a)] != null;
    const visible = stroke.points.some((p, i) => i > 0 && live(p) && live(stroke.points[i - 1]!));
    if (!visible) continue;
    const counts = new Map<Y.XmlElement, number>();
    for (const a of anchors) if (a) counts.set(a.block, (counts.get(a.block) ?? 0) + 1);
    const main = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]![0];
    out.push({ stroke, anchors, main, top: topLevelOf(main) });
  }
  return out;
}

/** A pen rarely starts exactly on a letter boundary: widen the marked span to whole words. */
function wordSpan(text: string, start: number, end: number): string {
  const isWord = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}_-]/u.test(c);
  let s = start;
  let e = end;
  while (s > 0 && isWord(text[s - 1]) && isWord(text[s])) s--;
  while (e < text.length && isWord(text[e]) && isWord(text[e - 1])) e++;
  return text.slice(s, e);
}

/** "в таблице, строка 2, столбец 3: " when the block is inside a table cell. */
function cellPlace(block: Y.XmlElement): string {
  let cell: Y.XmlElement | null = block;
  while (cell && cell.nodeName !== "tableCell" && cell.nodeName !== "tableHeader") cell = cell.parent instanceof Y.XmlElement ? cell.parent : null;
  if (!cell) return "";
  const row = cell.parent as Y.XmlElement;
  const table = row.parent as Y.XmlElement;
  const r = childElements(table).indexOf(row) + 1;
  const c = childElements(row).indexOf(cell) + 1;
  return `в таблице (строка ${r}, столбец ${c}) `;
}

function describeGroup(group: TextStrokePlacement[]): { description: string; marks: HandwritingItem["marks"] } {
  const marks: HandwritingItem["marks"] = [];
  const parts: string[] = [];
  const texts = new Map<Y.XmlElement, string>();
  for (const p of group) {
    const offsets = p.anchors.filter((a): a is PlacedAnchor => a !== null && a.block === p.main).map((a) => a.offset);
    const text = texts.get(p.main) ?? flatten(p.main).text;
    texts.set(p.main, text);
    const start = Math.min(...offsets);
    const end = Math.max(...offsets) + 1;
    const hint = hintOf(p.stroke);
    const words = clip(wordSpan(text, start, end));
    marks.push({ hint, tool: p.stroke.tool, text: words, start, end });
    const part = `${cellPlace(p.main)}${HINT_RU[hint]}: «${words}»`;
    if (!parts.includes(part)) parts.push(part);
  }
  return { description: parts.join("; "), marks };
}

export function collectHandwriting(doc: Y.Doc): HandwritingItem[] {
  const strokes = readStrokes(doc);
  const items: HandwritingItem[] = [];

  // Text-anchored strokes: writing runs (consecutive in time) within one top-level block.
  const placed = placeTextStrokes(doc, strokes).sort((a, b) => a.stroke.createdAt - b.stroke.createdAt);
  const groups: TextStrokePlacement[][] = [];
  for (const p of placed) {
    const g = groups[groups.length - 1];
    const last = g?.[g.length - 1];
    if (g && last && p.top === last.top && p.stroke.createdAt - last.stroke.createdAt <= GROUP_PAUSE_MS) g.push(p);
    else groups.push([p]);
  }
  for (const g of groups) {
    const { description, marks } = describeGroup(g);
    const counts = new Map<Y.XmlElement, number>();
    for (const p of g) counts.set(p.main, (counts.get(p.main) ?? 0) + 1);
    const main = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]![0];
    items.push({
      id: g[0]!.stroke.id,
      kind: "text",
      blockId: blockIdOf(main),
      topBlockId: blockIdOf(g[0]!.top),
      strokeIds: g.map((p) => p.stroke.id),
      description,
      marks,
    });
  }

  // Block-anchored strokes: margin notes, drawings, pictures — one item per block.
  const byBlockId = new Map<string, Stroke[]>();
  for (const s of strokes) {
    if (s.anchorKind === "text" || !s.blockId || s.points.length < 2) continue;
    const key = `${s.anchorKind}:${s.blockId}`;
    byBlockId.set(key, [...(byBlockId.get(key) ?? []), s]);
  }
  for (const [key, list] of byBlockId) {
    const [kindRaw, blockId] = key.split(/:(.*)/s) as [Stroke["anchorKind"], string];
    const loc = findBlock(doc, blockId);
    if (!loc) continue; // the block is gone — nothing to show
    const kind: HandwritingKind = kindRaw === "block" ? "margin" : kindRaw === "drawing" ? "drawing" : "image";
    let description: string;
    if (kind === "margin") description = `заметка от руки на полях: «${clip(flatten(loc.el).text || "", 80)}»`;
    else if (kind === "drawing") description = "рисунок от руки";
    else {
      const alt = attr<string>(loc.el, "alt") || attr<string>(loc.el, "caption") || "";
      description = alt ? `пометки от руки на картинке «${clip(alt, 80)}»` : "пометки от руки на картинке";
    }
    items.push({ id: list[0]!.id, kind, blockId, topBlockId: blockIdOf(topLevelOf(loc.el)), strokeIds: list.map((s) => s.id), description, marks: [] });
  }
  return items;
}

export function findHandwriting(items: HandwritingItem[], id: string): HandwritingItem | null {
  return items.find((i) => i.id === id || i.strokeIds.includes(id)) ?? null;
}

/** Top-level blocks in document order (for region rendering). */
export function topLevelBlocks(doc: Y.Doc): Y.XmlElement[] {
  return childElements(contentOf(doc));
}
