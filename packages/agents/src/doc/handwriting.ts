/**
 * Groups strokes of a note into "handwriting items" an agent can refer to:
 * each item is one picture (get_handwriting_image) plus a text note of what
 * it is attached to ("подчёркнуто от руки: «…»", D-11).
 */
import type * as Y from "yjs";
import { blockIdOf, findBlock, flatten, attr } from "./model.js";
import { anchorTextStrokes, readStrokes, type AnchoredStroke, type Stroke, type StrokeHint } from "./strokes.js";

export type HandwritingKind = "text" | "margin" | "drawing" | "image";

export interface HandwritingItem {
  /** Stable id: the id of the first stroke of the group. */
  id: string;
  kind: HandwritingKind;
  /** The text block (kind=text) or the block the strokes are attached to. */
  blockId: string | null;
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
  scribble: "заштриховано от руки",
  free: "пометка от руки у",
};

function hintOf(s: Stroke): StrokeHint {
  if (s.tool === "highlighter" && s.hint === "free") return "highlight";
  return s.hint;
}

function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

/** Characters within this distance are considered one handwriting group. */
const GROUP_GAP = 24;

interface TextMark {
  anchored: AnchoredStroke;
  start: number;
  end: number;
}

export function collectHandwriting(doc: Y.Doc): HandwritingItem[] {
  const strokes = readStrokes(doc);
  const items: HandwritingItem[] = [];

  // Text-anchored strokes: group per text block, then by proximity of marked spans.
  const byBlock = new Map<Y.XmlElement, TextMark[]>();
  for (const a of anchorTextStrokes(doc, strokes)) {
    const live = a.offsets.filter((o): o is number => o !== null);
    if (live.length === 0) continue;
    const list = byBlock.get(a.block) ?? [];
    list.push({ anchored: a, start: Math.min(...live), end: Math.max(...live) + 1 });
    byBlock.set(a.block, list);
  }
  for (const [block, marks] of byBlock) {
    const text = flatten(block).text;
    const sorted = [...marks].sort((x, y) => x.start - y.start);
    const groups: TextMark[][] = [];
    for (const m of sorted) {
      const g = groups[groups.length - 1];
      const gEnd = g ? Math.max(...g.map((x) => x.end)) : -Infinity;
      if (g && m.start <= gEnd + GROUP_GAP) g.push(m);
      else groups.push([m]);
    }
    for (const g of groups) {
      const ordered = [...g].sort((x, y) => x.anchored.stroke.createdAt - y.anchored.stroke.createdAt);
      const spans = ordered.map((m) => ({
        hint: hintOf(m.anchored.stroke),
        tool: m.anchored.stroke.tool,
        text: clip(wordSpan(text, m.start, m.end)),
        start: m.start,
        end: m.end,
      }));
      items.push({
        id: ordered[0]!.anchored.stroke.id,
        kind: "text",
        blockId: blockIdOf(block),
        strokeIds: ordered.map((m) => m.anchored.stroke.id),
        description: describeSpans(spans),
        marks: spans,
      });
    }
  }

  // Block-anchored strokes: margin notes, drawings, pictures — one item per block.
  const byBlockId = new Map<string, Stroke[]>();
  for (const s of strokes) {
    if (s.anchorKind === "text" || !s.blockId) continue;
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
    items.push({ id: list[0]!.id, kind, blockId, strokeIds: list.map((s) => s.id), description, marks: [] });
  }
  return items;
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

function describeSpans(spans: HandwritingItem["marks"]): string {
  const parts: string[] = [];
  for (const s of spans) {
    const p = `${HINT_RU[s.hint]}: «${s.text}»`;
    if (!parts.includes(p)) parts.push(p);
  }
  return parts.join("; ");
}

export function findHandwriting(items: HandwritingItem[], id: string): HandwritingItem | null {
  return items.find((i) => i.id === id || i.strokeIds.includes(id)) ?? null;
}
