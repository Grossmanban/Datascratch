// Types of the handwriting strokes contract (strokes.md, v1).
import type { AuthorKind, Uuid } from "./common.js";

export const STROKE_FORMAT_VERSION = 1;

export const STROKE_TOOLS = ["pen", "pencil", "marker", "highlighter"] as const;
export type StrokeTool = (typeof STROKE_TOOLS)[number];

export const ANCHOR_KINDS = ["text", "block", "image", "drawing"] as const;
export type AnchorKind = (typeof ANCHOR_KINDS)[number];

export const STROKE_HINTS = [
  "free",
  "underline",
  "strike",
  "circle",
  "highlight",
  "arrow",
  "scribble",
] as const;
export type StrokeHint = (typeof STROKE_HINTS)[number];

export interface StrokeAuthor {
  kind: AuthorKind;
  id: string;
}

/**
 * A finished stroke as stored in `Y.Map "strokes"` of a note (one nested Y.Map per stroke).
 * Immutable after creation except `hidden`.
 */
export interface Stroke {
  v: number;
  tool: StrokeTool;
  /** Ink color token (`ink.black`, …) or `#RRGGBB`. */
  color: string;
  /** Base width in pt at pressure 1.0 and font size 17 pt. */
  width: number;
  opacity: number;
  anchorKind: AnchorKind;
  /** For `block`, `image`, `drawing`; null for `text`. */
  blockId: Uuid | null;
  /** For `text`: encoded Yjs relative positions inside `content`, one per touched character. */
  anchors: Uint8Array[];
  /** Packed points, see {@link StrokePoint}. */
  points: Uint8Array;
  hint: StrokeHint;
  author: StrokeAuthor;
  /** Unix ms. */
  createdAt: number;
  /** Reserved; the only mutable field. */
  hidden?: boolean;
}

/** One unpacked point record (strokes.md §3). */
export interface StrokePoint {
  /** Index into `anchors` for `text` strokes, -1 otherwise. */
  a: number;
  /** `text`: em offset from the glyph origin; others: fraction of the block width. */
  x: number;
  /** y grows downwards; `text`: em from the baseline; others: in block-width units. */
  y: number;
  /** 0..1, 1 without pressure support. */
  pressure: number;
  /** Radians 0..π/2, π/2 without tilt support. */
  altitude: number;
  /** Radians 0..2π. */
  azimuth: number;
  /** Radians, Pencil Pro barrel roll; 0 without support. */
  roll: number;
  /** ms since stroke start. */
  t: number;
}

/** Float32 values per point record. */
export const POINT_FIELDS = 8;
/** Bytes per point record (8 × Float32 LE). */
export const POINT_BYTES = POINT_FIELDS * 4;

/** Font size at which `width` is defined (strokes.md §5). */
export const REFERENCE_FONT_SIZE = 17;
/** Block width at which `width` is defined for non-text anchors (strokes.md §5). */
export const REFERENCE_BLOCK_WIDTH = 600;

/** Strokes whose anchors are all deleted are purged after this many days (D-35). */
export const ORPHAN_STROKE_PURGE_DAYS = 30;
/** Segments with fewer points are not drawn (D-35). */
export const MIN_SEGMENT_POINTS = 2;
