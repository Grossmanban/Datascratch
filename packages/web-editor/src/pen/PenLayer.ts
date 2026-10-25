// The pen layer (D-05): canvases over (and, for the highlighter, under) the editor text. Captures
// stylus / finger / mouse input, binds finished strokes to characters or surfaces (strokes.md) and
// redraws every stroke after any relayout (resize, edit, font change, remote update).
import type { Editor } from "@tiptap/core";
import { ySyncPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import { PEN_ORIGIN } from "../collab/collaboration";
import { packPoints, pressureCurve, tiltFactor, strokeFromYMap, strokeToYMap, unpackPoints, type Stroke, type StrokeAuthor, type StrokePoint, type StrokeTool } from "../shared/strokes";
import { uuidv7 } from "../shared/uuid";
import { resolveColor } from "../tokens";
import { decodeAnchor, encodeCharAnchor, rebaseRedoneAnchors, resolveCharAnchor, type ProsemirrorMapping } from "./anchors";
import {
  bindToSurface,
  bindToText,
  expandToWords,
  fractionInside,
  groupLines,
  pointInPolygon,
  hitsSegments,
  pointsWithin,
  resolveSurfaceSegments,
  resolveTextSegments,
  segmentsBounds,
  splitStroke,
  type AnchorBox,
  type Bounds,
  type InputPoint,
  type Line,
  type RenderPoint,
} from "./geometry";
import { recognizeHint } from "./hint";
import { LayoutPass, resetFontMetrics } from "./layout";
import { fillSegments, prepareCanvas } from "./render";
import { InputSmoother, pointerSample, simplify } from "./smoothing";

export type PenTool = StrokeTool | "eraser" | "lasso";
export type EraserMode = "stroke" | "pixel";

export interface PenSettings {
  /** Active tool; null = the stylus types/selects like a finger (no ink). */
  tool: PenTool | null;
  color: string;
  /** Base width in px at pressure 1 for the current tool. */
  width: number;
  eraserMode: EraserMode;
  eraserSize: number;
  /** Draw with mouse and finger too (otherwise only the stylus draws, finger scrolls). */
  drawWithAnyPointer: boolean;
  /** A scribble over words deletes them (spec/03 «зигзаг по слову — удалить») instead of leaving ink. */
  scribbleDeletes: boolean;
}

export const TOOL_DEFAULTS: Record<StrokeTool, { width: number; opacity: number; color: string }> = {
  pen: { width: 2.2, opacity: 1, color: "ink.black" },
  pencil: { width: 1.6, opacity: 0.85, color: "ink.black" },
  marker: { width: 4.5, opacity: 1, color: "ink.blue" },
  highlighter: { width: 16, opacity: 1, color: "highlight.yellow" },
};

export const DEFAULT_PEN_SETTINGS: PenSettings = {
  tool: "pen",
  color: "ink.black",
  width: TOOL_DEFAULTS.pen.width,
  eraserMode: "stroke",
  eraserSize: 12,
  drawWithAnyPointer: false,
  scribbleDeletes: true,
};

interface Entry {
  id: string;
  stroke: Stroke;
  points: StrokePoint[];
  rels: (Y.RelativePosition | null)[];
  segments: RenderPoint[][] | null;
  bounds: Bounds | null;
  clip: Bounds | null;
  /** Layout may have changed since `segments` were computed. */
  stale: boolean;
}

type Surface = { kind: "image" | "drawing" | "block"; blockId: string; el: HTMLElement };

interface ActiveStroke {
  pointerId: number;
  pointerType: string;
  tool: PenTool;
  t0: number;
  raw: InputPoint[];
  points: InputPoint[];
  predicted: InputPoint[];
  smoother: InputSmoother;
  surface: Surface | null;
  /** Stroke ids hit by the stroke eraser, or point indices hit by the pixel eraser. */
  erasedStrokes: Set<string>;
  erasedPoints: Map<string, Set<number>>;
  /** Lasso: dragging the current selection instead of drawing a new loop. */
  moving: boolean;
}

interface LassoSelection {
  ids: Set<string>;
  bounds: Bounds;
}

export interface PenLayerOptions {
  editor: Editor;
  doc: Y.Doc;
  /** Positioned container that wraps the editor DOM; canvases are inserted into it. */
  root: HTMLElement;
  undoManager: Y.UndoManager;
  author: StrokeAuthor;
  settings?: Partial<PenSettings>;
  onSettingsChange?: (s: PenSettings) => void;
  /** Called after each committed stroke (tests, analytics). */
  onStroke?: (id: string, stroke: Stroke) => void;
}

const PEN_RECENT_MS = 1500;
/** Untracked origin: anchor rebasing must not become an undo step of its own. */
const ANCHOR_REBASE_ORIGIN = Symbol("ds-anchor-rebase");

export class PenLayer {
  readonly editor: Editor;
  readonly doc: Y.Doc;
  readonly root: HTMLElement;
  private readonly strokes: Y.Map<Y.Map<unknown>>;
  private readonly fragment: Y.XmlFragment;
  private readonly undoManager: Y.UndoManager;
  private readonly author: StrokeAuthor;
  private settings: PenSettings;
  private readonly listeners = new Set<(s: PenSettings) => void>();
  private readonly entries = new Map<string, Entry>();
  private readonly under: HTMLCanvasElement;
  private readonly over: HTMLCanvasElement;
  private readonly live: HTMLCanvasElement;
  private active: ActiveStroke | null = null;
  private frame = 0;
  private needsResolve = true;
  private lastPenAt = -Infinity;
  private destroyed = false;
  private readonly cleanups: (() => void)[] = [];
  private readonly onStroke?: (id: string, stroke: Stroke) => void;
  private colorCache = new Map<string, string>();
  private lasso: LassoSelection | null = null;

  constructor(opts: PenLayerOptions) {
    this.editor = opts.editor;
    this.doc = opts.doc;
    this.root = opts.root;
    this.undoManager = opts.undoManager;
    this.author = opts.author;
    this.onStroke = opts.onStroke;
    this.settings = { ...DEFAULT_PEN_SETTINGS, ...opts.settings };
    if (opts.onSettingsChange) this.listeners.add(opts.onSettingsChange);
    this.strokes = this.doc.getMap("strokes");
    this.fragment = this.doc.getXmlFragment("content");

    const mk = (cls: string) => {
      const c = document.createElement("canvas");
      c.className = `ds-pen-canvas ${cls}`;
      c.setAttribute("aria-hidden", "true");
      return c;
    };
    this.under = mk("ds-pen-under");
    this.over = mk("ds-pen-over");
    this.live = mk("ds-pen-live");
    this.root.prepend(this.under);
    this.root.append(this.over, this.live);
    this.root.classList.add("ds-pen-root");

    this.strokes.forEach((map, id) => this.upsert(id, map));
    const onStrokes = (event: Y.YMapEvent<Y.Map<unknown>>) => {
      for (const [id, change] of event.changes.keys) {
        if (change.action === "delete") this.entries.delete(id);
        else {
          const map = this.strokes.get(id);
          if (map) this.upsert(id, map);
        }
      }
      this.schedule();
    };
    this.strokes.observe(onStrokes);
    // Per-stroke `hidden` toggles (the only mutable field).
    const onDeep = (events: Y.YEvent<Y.AbstractType<unknown>>[]) => {
      for (const e of events) {
        if (e.target instanceof Y.Map && e.target !== this.strokes) {
          for (const [id, map] of this.strokes) if (map === e.target) this.upsert(id, map);
        }
      }
      this.schedule();
    };
    this.strokes.observeDeep(onDeep);
    this.cleanups.push(() => this.strokes.unobserve(onStrokes), () => this.strokes.unobserveDeep(onDeep));

    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) this.invalidate();
    };
    this.editor.on("transaction", onTransaction);
    this.cleanups.push(() => this.editor.off("transaction", onTransaction));

    const ro = new ResizeObserver(() => this.invalidate());
    ro.observe(this.root);
    ro.observe(this.editor.view.dom);
    this.cleanups.push(() => ro.disconnect());

    const onScroll = () => this.schedule();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    this.cleanups.push(() => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    });

    const onLayout = () => this.invalidate();
    this.root.addEventListener("ds-layout", onLayout);
    this.cleanups.push(() => this.root.removeEventListener("ds-layout", onLayout));
    if (document.fonts) {
      const onFonts = () => {
        resetFontMetrics();
        this.invalidate();
      };
      document.fonts.addEventListener("loadingdone", onFonts);
      void document.fonts.ready.then(onFonts);
      this.cleanups.push(() => document.fonts.removeEventListener("loadingdone", onFonts));
    }
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onTheme = () => {
      this.colorCache.clear();
      this.schedule();
    };
    mq?.addEventListener?.("change", onTheme);
    this.cleanups.push(() => mq?.removeEventListener?.("change", onTheme));

    // Undo/redo restores text as new items; rebase anchors so other devices see the marks again.
    const onPopped = () => queueMicrotask(() => !this.destroyed && rebaseRedoneAnchors(this.doc, ANCHOR_REBASE_ORIGIN));
    this.undoManager.on("stack-item-popped", onPopped);
    this.cleanups.push(() => this.undoManager.off("stack-item-popped", onPopped));

    const onKey = (e: KeyboardEvent) => {
      if (!this.lasso) return;
      if (e.key === "Escape") this.clearLasso();
      else if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        e.stopPropagation();
        this.deleteSelectedStrokes();
      }
    };
    window.addEventListener("keydown", onKey, true);
    this.cleanups.push(() => window.removeEventListener("keydown", onKey, true));

    this.attachInput();
    this.schedule();
  }

  // ---------- settings ----------

  getSettings(): PenSettings {
    return this.settings;
  }

  setSettings(patch: Partial<PenSettings>): void {
    this.settings = { ...this.settings, ...patch };
    if (patch.tool !== undefined && patch.tool !== "lasso") this.clearLasso();
    this.root.classList.toggle("ds-pen-draw-any", Boolean(this.settings.tool && this.settings.drawWithAnyPointer));
    for (const l of this.listeners) l(this.settings);
  }

  subscribe(listener: (s: PenSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ---------- model ----------

  private upsert(id: string, map: Y.Map<unknown>): void {
    const stroke = strokeFromYMap(map);
    if (!stroke) {
      this.entries.delete(id);
      return;
    }
    let points: StrokePoint[];
    try {
      points = unpackPoints(stroke.points);
    } catch {
      this.entries.delete(id);
      return;
    }
    this.entries.set(id, {
      id,
      stroke,
      points,
      rels: stroke.anchorKind === "text" ? stroke.anchors.map(decodeAnchor) : [],
      segments: null,
      bounds: null,
      clip: null,
      stale: true,
    });
  }

  /** Marks every stroke for re-resolution (call after anything that may move text). */
  invalidate(): void {
    this.needsResolve = true;
    this.schedule();
  }

  /** Number of drawn segments per stroke id (diagnostics and tests). */
  debugSegments(): Record<string, RenderPoint[][]> {
    this.resolveAll();
    this.flush();
    const out: Record<string, RenderPoint[][]> = {};
    for (const [id, e] of this.entries) out[id] = e.segments ?? [];
    return out;
  }

  // ---------- resolution & rendering ----------

  private schedule(): void {
    if (this.frame || this.destroyed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.flush();
    });
  }

  private origin(): { x: number; y: number } {
    const r = this.root.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }

  private mapping(): ProsemirrorMapping | null {
    const state = ySyncPluginKey.getState(this.editor.state) as { binding?: { mapping: ProsemirrorMapping } } | undefined;
    return state?.binding?.mapping ?? null;
  }

  private surfaceElement(kind: Stroke["anchorKind"], blockId: string | null): HTMLElement | null {
    if (!blockId) return null;
    const dom = this.editor.view.dom;
    const esc = CSS.escape(blockId);
    if (kind === "block") return dom.querySelector<HTMLElement>(`[data-block-id="${esc}"]`);
    return dom.querySelector<HTMLElement>(`[data-stroke-surface="${kind}"][data-block-id="${esc}"]`);
  }

  private resolveEntry(e: Entry, pass: LayoutPass, mapping: ProsemirrorMapping | null, skip?: ReadonlySet<number>): void {
    const { stroke } = e;
    e.clip = null;
    if (stroke.hidden) {
      e.segments = [];
      e.bounds = null;
      return;
    }
    if (stroke.anchorKind === "text") {
      const boxes = new Map<number, AnchorBox | null>();
      const anchorBox = (a: number): AnchorBox | null => {
        if (boxes.has(a)) return boxes.get(a)!;
        const rel = e.rels[a];
        let box: AnchorBox | null = null;
        if (rel && mapping) {
          const pos = resolveCharAnchor(rel, this.doc, this.fragment, mapping);
          if (pos !== null) box = pass.anchorBox(pos);
        }
        boxes.set(a, box);
        return box;
      };
      e.segments = resolveTextSegments(stroke, e.points, anchorBox, skip);
    } else {
      const el = this.surfaceElement(stroke.anchorKind, stroke.blockId);
      if (!el) {
        e.segments = [];
        e.bounds = null;
        return;
      }
      const r = el.getBoundingClientRect();
      const left = r.left - pass.origin.x;
      const top = r.top - pass.origin.y;
      e.segments = resolveSurfaceSegments(stroke, e.points, { left, top, width: r.width }, skip);
      if (stroke.anchorKind !== "block") e.clip = { left, top, right: left + r.width, bottom: top + r.height };
    }
    e.bounds = segmentsBounds(e.segments);
  }

  /** Resolves every stroke (after relayout) or, when `onlyNew`, just strokes never resolved yet. */
  private resolveAll(onlyNew = false): void {
    if (!onlyNew) this.markAllStale();
    this.resolveStale(() => true, Infinity);
  }

  private markAllStale(): void {
    if (!this.needsResolve) return;
    for (const e of this.entries.values()) e.stale = true;
    this.needsResolve = false;
  }

  /** Resolves stale strokes matching `filter`, within a time budget (ms). Returns true if some remain. */
  private resolveStale(filter: (e: Entry) => boolean, budget: number): boolean {
    let pass: LayoutPass | null = null;
    const mapping = this.mapping();
    const start = performance.now();
    let remaining = false;
    for (const e of this.entries.values()) {
      if (!e.stale && e.segments) continue;
      if (!filter(e) || performance.now() - start > budget) {
        remaining = true;
        continue;
      }
      pass ??= new LayoutPass(this.editor.view, this.origin());
      this.resolveEntry(e, pass, mapping, this.skipFor(e.id));
      e.stale = false;
    }
    return remaining;
  }

  /**
   * Long notes: after an edit only strokes near the viewport are re-measured before the frame;
   * the rest follow in idle time, so typing never waits for off-screen ink.
   */
  private resolveForFrame(vp: { top: number; height: number }): void {
    this.markAllStale();
    const near = (e: Entry) => !e.bounds || (e.bounds.bottom >= vp.top - vp.height && e.bounds.top <= vp.top + 2 * vp.height);
    this.resolveStale(near, Infinity);
    if (this.resolveStale(() => false, 0)) this.scheduleIdle();
  }

  private idleHandle = 0;
  private scheduleIdle(): void {
    if (this.idleHandle || this.destroyed) return;
    const run = () => {
      this.idleHandle = 0;
      if (this.destroyed) return;
      const more = this.resolveStale(() => true, 8);
      this.schedule();
      if (more) this.scheduleIdle();
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    this.idleHandle = ric ? ric(run, { timeout: 200 }) : window.setTimeout(run, 16);
  }

  private skipFor(id: string): ReadonlySet<number> | undefined {
    return this.active?.erasedPoints.get(id);
  }

  /** Visible part of the root, in layer coordinates. */
  private viewport(): { left: number; top: number; width: number; height: number } {
    const r = this.root.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(0, -r.left);
    const top = Math.max(0, -r.top);
    const right = Math.min(r.width, vw - r.left);
    const bottom = Math.min(r.height, vh - r.top);
    return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  private color(token: string): string {
    let c = this.colorCache.get(token);
    if (!c) {
      c = resolveColor(token, this.root);
      this.colorCache.set(token, c);
    }
    return c;
  }

  /** Resolves (if needed) and redraws synchronously. */
  flush(): void {
    if (this.destroyed) return;
    const vp = this.viewport();
    this.resolveForFrame(vp);
    const dpr = window.devicePixelRatio || 1;
    const under = prepareCanvas(this.under, vp, dpr);
    const over = prepareCanvas(this.over, vp, dpr);
    if (!under || !over) return;
    const hiddenIds =
      this.active?.tool === "eraser" && this.settings.eraserMode === "stroke"
        ? this.active.erasedStrokes
        : this.active?.moving && this.lasso
          ? this.lasso.ids
          : null;
    for (const e of this.entries.values()) {
      if (!e.segments || !e.segments.length || !e.bounds || hiddenIds?.has(e.id)) continue;
      const b = e.bounds;
      if (b.right < vp.left || b.left > vp.left + vp.width || b.bottom < vp.top || b.top > vp.top + vp.height) continue;
      const ctx = e.stroke.tool === "highlighter" ? under : over;
      if (e.clip) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(e.clip.left, e.clip.top, e.clip.right - e.clip.left, e.clip.bottom - e.clip.top);
        ctx.clip();
      }
      fillSegments(ctx, e.segments, this.color(e.stroke.color), e.stroke.opacity);
      if (e.clip) ctx.restore();
    }
    this.renderLive();
  }

  private renderLive(): void {
    const vp = this.viewport();
    const ctx = prepareCanvas(this.live, vp, window.devicePixelRatio || 1);
    const a = this.active;
    if (!ctx) return;
    if (this.lasso && !a?.moving) this.drawSelectionFrame(ctx, this.lasso.bounds, 0, 0);
    if (!a) return;
    if (a.tool === "lasso") {
      if (a.moving && this.lasso) {
        const first = a.raw[0]!;
        const last = a.raw[a.raw.length - 1]!;
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        ctx.save();
        ctx.translate(dx, dy);
        for (const id of this.lasso.ids) {
          const e = this.entries.get(id);
          if (e?.segments?.length) fillSegments(ctx, e.segments, this.color(e.stroke.color), e.stroke.opacity);
        }
        ctx.restore();
        this.drawSelectionFrame(ctx, this.lasso.bounds, dx, dy);
      } else if (a.raw.length > 1) {
        ctx.beginPath();
        a.raw.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = this.color("accent");
        ctx.stroke();
        ctx.setLineDash([]);
      }
      return;
    }
    if (a.tool === "eraser") {
      const last = a.raw[a.raw.length - 1];
      if (last) {
        ctx.beginPath();
        ctx.arc(last.x, last.y, this.settings.eraserSize, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(120,115,108,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      return;
    }
    const tool = a.tool;
    const scale = this.liveScale(a);
    const pts = [...a.points, ...a.predicted];
    const seg: RenderPoint[] = pts.map((p, i) => ({
      x: p.x,
      y: p.y,
      w: this.settings.width * scale * (0.35 + 0.65 * Math.pow(p.pressure, 0.8)) * (tool === "pencil" || tool === "marker" ? 1 + 1.5 * (1 - p.altitude / (Math.PI / 2)) : 1),
      i,
    }));
    if (seg.length === 1) seg.push({ ...seg[0]!, x: seg[0]!.x + 0.01 });
    if (tool === "highlighter") ctx.globalCompositeOperation = "multiply";
    fillSegments(ctx, [seg], this.color(this.settings.color), TOOL_DEFAULTS[tool].opacity);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawSelectionFrame(ctx: CanvasRenderingContext2D, b: Bounds, dx: number, dy: number): void {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.color("accent");
    ctx.globalAlpha = 0.9;
    const pad = 4;
    ctx.strokeRect(b.left - pad + dx, b.top - pad + dy, b.right - b.left + 2 * pad, b.bottom - b.top + 2 * pad);
    ctx.restore();
  }

  /** Text strokes are drawn at the size they will have after binding (font-relative). */
  private liveScale(_a: ActiveStroke): number {
    return 1;
  }

  // ---------- input ----------

  private attachInput(): void {
    const root = this.root;
    const down = (e: PointerEvent) => this.onPointerDown(e);
    const move = (e: PointerEvent) => this.onPointerMove(e);
    const up = (e: PointerEvent) => this.onPointerUp(e, false);
    const cancel = (e: PointerEvent) => this.onPointerUp(e, true);
    // Safari: a stylus touch must not scroll or start text selection (touch-action can't tell pen from finger).
    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0] as (Touch & { touchType?: string }) | undefined;
      if (t?.touchType === "stylus" && this.wantsPen("pen", e.target)) e.preventDefault();
    };
    root.addEventListener("pointerdown", down, { capture: true });
    root.addEventListener("pointermove", move, { capture: true });
    root.addEventListener("pointerup", up, { capture: true });
    root.addEventListener("pointercancel", cancel, { capture: true });
    root.addEventListener("touchstart", touchStart, { passive: false, capture: true });
    this.cleanups.push(() => {
      root.removeEventListener("pointerdown", down, { capture: true });
      root.removeEventListener("pointermove", move, { capture: true });
      root.removeEventListener("pointerup", up, { capture: true });
      root.removeEventListener("pointercancel", cancel, { capture: true });
      root.removeEventListener("touchstart", touchStart, { capture: true });
    });
  }

  private surfaceAt(target: EventTarget | null): Surface | null {
    if (!(target instanceof Element)) return null;
    const el = target.closest<HTMLElement>("[data-stroke-surface]");
    if (!el || !this.editor.view.dom.contains(el) || !el.dataset.blockId) return null;
    return { kind: el.dataset.strokeSurface as "image" | "drawing", blockId: el.dataset.blockId, el };
  }

  /** Whether a pointer of this type should ink at this target with the current settings. */
  private wantsPen(pointerType: string, target: EventTarget | null): boolean {
    if (!this.editor.isEditable || !this.settings.tool) return false;
    if (target instanceof Element && target.closest(".ds-resize-handle, .ds-drawing-handle, input, textarea, button, .ds-pen-ignore")) return false;
    if (pointerType === "pen") return true;
    // Fingers are palm-rejected while a stylus is in use.
    if (pointerType === "touch" && performance.now() - this.lastPenAt < PEN_RECENT_MS) return false;
    if (this.settings.drawWithAnyPointer) return true;
    // Drawing blocks accept any pointer: there is no text to select inside them.
    return this.surfaceAt(target)?.kind === "drawing";
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === "pen") this.lastPenAt = performance.now();
    if (this.active) {
      // A second finger/palm while drawing: ignore it, don't let it reach the editor either.
      if (e.pointerId !== this.active.pointerId) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    const isEraserButton = e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32) !== 0);
    if (!isEraserButton && !this.wantsPen(e.pointerType, e.target)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      this.root.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events in tests */
    }
    const tool: PenTool = isEraserButton ? "eraser" : this.settings.tool!;
    const surface = tool === "eraser" || tool === "lasso" ? null : this.surfaceAt(e.target);
    const origin = this.origin();
    const lx = e.clientX - origin.x;
    const ly = e.clientY - origin.y;
    const b = this.lasso?.bounds;
    const moving = tool === "lasso" && !!b && lx >= b.left - 6 && lx <= b.right + 6 && ly >= b.top - 6 && ly <= b.bottom + 6;
    if (tool === "lasso" && !moving) this.clearLasso();
    const t0 = e.timeStamp;
    this.active = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      tool,
      t0,
      raw: [],
      points: [],
      predicted: [],
      smoother: new InputSmoother(),
      surface,
      erasedStrokes: new Set(),
      erasedPoints: new Map(),
      moving,
    };
    this.addSamples([e]);
    this.schedule();
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerType === "pen") this.lastPenAt = performance.now();
    const a = this.active;
    if (!a || e.pointerId !== a.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const coalesced = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    this.addSamples(coalesced.length ? coalesced : [e]);
    const predicted = typeof e.getPredictedEvents === "function" ? e.getPredictedEvents() : [];
    const origin = this.origin();
    a.predicted = a.tool === "eraser" || a.tool === "lasso" ? [] : predicted.slice(0, 2).map((p) => pointerSample(p, origin, a.t0));
    if (a.tool !== "eraser" && a.pointerType !== "pen") for (const p of a.predicted) p.pressure = 1;
    this.schedule();
  }

  private addSamples(events: PointerEvent[]): void {
    const a = this.active!;
    const origin = this.origin();
    for (const ev of events) {
      const s = pointerSample(ev, origin, a.t0);
      if (a.tool === "highlighter") s.pressure = 1;
      a.raw.push(s);
      if (a.tool === "eraser") this.eraseAt(s);
      else if (a.tool !== "lasso") a.points.push(a.smoother.push(s));
    }
  }

  private onPointerUp(e: PointerEvent, cancelled: boolean): void {
    const a = this.active;
    if (!a || e.pointerId !== a.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      this.root.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!cancelled && e.type === "pointerup") {
      const last = pointerSample(e, this.origin(), a.t0);
      if (a.tool === "highlighter") last.pressure = 1;
      if (a.tool === "lasso") a.raw.push(last);
      else if (a.tool !== "eraser") {
        const prev = a.points[a.points.length - 1];
        // The pen lifts with ~0 pressure; keep the last real pressure for the end point.
        if (prev && (last.pressure === 0 || e.pointerType === "pen")) last.pressure = prev.pressure;
        if (!prev || Math.hypot(prev.x - last.x, prev.y - last.y) > 0.5) a.points.push(last);
      }
    }
    try {
      if (!cancelled) {
        if (a.tool === "eraser") this.commitErase(a);
        else if (a.tool === "lasso") {
          if (a.moving) this.commitMove(a);
          else this.commitLasso(a);
        } else this.commitStroke(a);
      }
    } finally {
      this.active = null;
      this.invalidate();
    }
  }

  // ---------- committing strokes ----------

  private commitStroke(a: ActiveStroke): void {
    const tool = a.tool as StrokeTool;
    const pts = simplify(a.points);
    if (pts.length === 1) pts.push({ ...pts[0]!, x: pts[0]!.x + 0.3, t: pts[0]!.t + 1 });
    if (pts.length < 2) return;
    const base = {
      v: 1 as const,
      tool,
      color: this.settings.color,
      opacity: TOOL_DEFAULTS[tool].opacity,
      author: this.author,
      createdAt: Date.now(),
    };
    let stroke: Stroke | null = null;
    const surface = a.surface ? { ...a.surface, rect: a.surface.el.getBoundingClientRect() } : null;
    const screenWidth = this.settings.width;
    if (surface) {
      const origin = this.origin();
      const s = { left: surface.rect.left - origin.x, top: surface.rect.top - origin.y, width: surface.rect.width };
      stroke = {
        ...base,
        width: (screenWidth * 600) / s.width,
        anchorKind: surface.kind,
        blockId: surface.blockId,
        anchors: [],
        points: packPoints(bindToSurface(pts, s)),
        hint: recognizeHint(pts, tool),
      };
    } else {
      const bound = this.bindTextStroke(pts, tool, base, screenWidth);
      if (bound && this.settings.scribbleDeletes && bound.stroke.hint === "scribble" && bound.positions.length && tool !== "highlighter") {
        if (this.deleteWordsUnder(bound.positions)) return;
      }
      stroke = bound?.stroke ?? null;
    }
    if (!stroke) return;
    const id = uuidv7();
    this.undoManager.stopCapturing();
    this.doc.transact(() => this.strokes.set(id, strokeToYMap(stroke)), PEN_ORIGIN);
    this.undoManager.stopCapturing();
    this.onStroke?.(id, stroke);
  }

  private bindTextStroke(
    pts: InputPoint[],
    tool: StrokeTool,
    base: Omit<Stroke, "width" | "anchorKind" | "blockId" | "anchors" | "points" | "hint">,
    screenWidth: number,
  ): { stroke: Stroke; positions: number[] } | null {
    const mapping = this.mapping();
    if (!mapping) return null;
    const pass = new LayoutPass(this.editor.view, this.origin());
    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
    const margin = 3 * 17 * 1.5;
    const column = this.textColumn();
    const inMargin = column && (maxX < column.left || minX > column.right);
    let lines: Line[] = [];
    if (!inMargin) {
      lines = groupLines(pass.glyphsInBand(minY - margin, maxY + margin));
      // Nothing near: widen to the whole visible document once.
      if (!lines.length) {
        const vp = this.viewport();
        lines = groupLines(pass.glyphsInBand(vp.top - vp.height, vp.top + 2 * vp.height));
      }
    }
    const binding = lines.length ? bindToText(pts, lines) : null;
    if (!binding) {
      const margin = this.bindMarginStroke(pts, tool, base, screenWidth);
      return margin ? { stroke: margin, positions: [] } : null;
    }
    const anchors = binding.anchorPositions.map((pos) => encodeCharAnchor(pos, this.fragment, mapping));
    return {
      stroke: {
        ...base,
        width: (screenWidth * 17) / binding.referenceFontSize,
        anchorKind: "text",
        blockId: null,
        anchors,
        points: packPoints(binding.points),
        hint: recognizeHint(pts, tool, lines),
      },
      positions: binding.anchorPositions,
    };
  }

  /** Scribble gesture: deletes the words under the scribble (one textblock, one undo step). */
  private deleteWordsUnder(positions: number[]): boolean {
    const { state } = this.editor;
    const sorted = [...positions].sort((x, y) => x - y);
    const $a = state.doc.resolve(sorted[0]!);
    const $b = state.doc.resolve(sorted[sorted.length - 1]!);
    if (!$a.parent.isTextblock || !$a.sameParent($b)) return false;
    const start = $a.start();
    const text = $a.parent.textBetween(0, $a.parent.content.size, undefined, "\ufffc");
    const [from, to] = expandToWords(text, $a.pos - start, $b.pos - start + 1);
    if (to <= from) return false;
    this.undoManager.stopCapturing();
    this.editor.chain().deleteRange({ from: start + from, to: start + to }).run();
    this.undoManager.stopCapturing();
    return true;
  }

  /** Text column of the editor in layer coordinates (content box of the ProseMirror element). */
  private textColumn(): { left: number; right: number } | null {
    const dom = this.editor.view.dom;
    const r = dom.getBoundingClientRect();
    const style = getComputedStyle(dom);
    const origin = this.origin();
    return {
      left: r.left - origin.x + (parseFloat(style.paddingLeft) || 0),
      right: r.right - origin.x - (parseFloat(style.paddingRight) || 0),
    };
  }

  /** Margin note: anchored to the vertically nearest block, in fractions of that block's width. */
  private bindMarginStroke(
    pts: InputPoint[],
    tool: StrokeTool,
    base: Omit<Stroke, "width" | "anchorKind" | "blockId" | "anchors" | "points" | "hint">,
    screenWidth: number,
  ): Stroke | null {
    const origin = this.origin();
    const midY = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2;
    let best: { el: HTMLElement; d: number } | null = null;
    for (const el of this.editor.view.dom.querySelectorAll<HTMLElement>("[data-block-id]")) {
      if (el.dataset.strokeSurface) continue;
      const r = el.getBoundingClientRect();
      const top = r.top - origin.y;
      const bottom = r.bottom - origin.y;
      const d = midY < top ? top - midY : midY > bottom ? midY - bottom : 0;
      // Prefer the innermost block when nested blocks contain the point.
      if (!best || d < best.d || (d === best.d && best.el.contains(el))) best = { el, d };
    }
    if (!best?.el.dataset.blockId) return null;
    const r = best.el.getBoundingClientRect();
    const s = { left: r.left - origin.x, top: r.top - origin.y, width: r.width };
    return {
      ...base,
      width: (screenWidth * 600) / s.width,
      anchorKind: "block",
      blockId: best.el.dataset.blockId,
      anchors: [],
      points: packPoints(bindToSurface(pts, s)),
      hint: recognizeHint(pts, tool),
    };
  }

  // ---------- lasso ----------

  /** Ids of strokes selected with the lasso (tests, app integrations). */
  selectedStrokes(): string[] {
    return this.lasso ? [...this.lasso.ids] : [];
  }

  clearLasso(): void {
    if (!this.lasso) return;
    this.lasso = null;
    this.schedule();
  }

  private commitLasso(a: ActiveStroke): void {
    const poly = a.raw;
    if (poly.length < 3) return;
    this.resolveAll(!this.needsResolve);
    const ids = new Set<string>();
    let bounds: Bounds | null = null;
    for (const e of this.entries.values()) {
      if (!e.segments?.length || !e.bounds) continue;
      if (fractionInside(e.segments, poly) < 0.6) continue;
      ids.add(e.id);
      const b = e.bounds;
      bounds = bounds
        ? { left: Math.min(bounds.left, b.left), top: Math.min(bounds.top, b.top), right: Math.max(bounds.right, b.right), bottom: Math.max(bounds.bottom, b.bottom) }
        : { ...b };
    }
    this.lasso = ids.size && bounds ? { ids, bounds } : null;
    // Text under the loop becomes the editor selection (format, copy, delete it as text).
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of poly) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const pass = new LayoutPass(this.editor.view, this.origin());
    const inside = pass.glyphsInBand(minY, maxY).filter((g) => pointInPolygon((g.left + g.right) / 2, (g.top + g.bottom) / 2, poly));
    if (inside.length) {
      const from = Math.min(...inside.map((g) => g.pos));
      const to = Math.max(...inside.map((g) => g.pos)) + 1;
      this.editor.chain().focus().setTextSelection({ from, to }).run();
    }
  }

  private deleteSelectedStrokes(): void {
    const sel = this.lasso;
    if (!sel) return;
    this.undoManager.stopCapturing();
    this.doc.transact(() => sel.ids.forEach((id) => this.strokes.delete(id)), PEN_ORIGIN);
    this.undoManager.stopCapturing();
    this.lasso = null;
    this.schedule();
  }

  /** Drops the selected strokes at their new place: each is re-bound (to text or its surface). */
  private commitMove(a: ActiveStroke): void {
    const sel = this.lasso;
    if (!sel || a.raw.length < 2) return;
    const first = a.raw[0]!;
    const last = a.raw[a.raw.length - 1]!;
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    if (Math.hypot(dx, dy) < 2) return;
    const origin = this.origin();
    const replacements: [string, Stroke][] = [];
    for (const id of sel.ids) {
      const e = this.entries.get(id);
      if (!e?.segments?.length) continue;
      const src = e.points;
      // The stroke's on-screen width at pressure 1, recovered from its first drawn point.
      const p0 = e.segments[0]![0]!;
      const sp0 = src[p0.i]!;
      const screenWidth = p0.w / (pressureCurve(sp0.pressure) * tiltFactor(e.stroke.tool, sp0.altitude));
      const base = { v: 1 as const, tool: e.stroke.tool, color: e.stroke.color, opacity: e.stroke.opacity, author: e.stroke.author, createdAt: e.stroke.createdAt };
      for (const seg of e.segments) {
        const pts: InputPoint[] = seg.map((rp) => {
          const sp = src[rp.i]!;
          return { x: rp.x + dx, y: rp.y + dy, pressure: sp.pressure, altitude: sp.altitude, azimuth: sp.azimuth, roll: sp.roll, t: sp.t };
        });
        let next: Stroke | null = null;
        if (e.stroke.anchorKind === "image" || e.stroke.anchorKind === "drawing") {
          const el = this.surfaceElement(e.stroke.anchorKind, e.stroke.blockId);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const s = { left: r.left - origin.x, top: r.top - origin.y, width: r.width };
          next = { ...base, width: (screenWidth * 600) / s.width, anchorKind: e.stroke.anchorKind, blockId: e.stroke.blockId, anchors: [], points: packPoints(bindToSurface(pts, s)), hint: e.stroke.hint };
        } else {
          next = this.bindTextStroke(pts, e.stroke.tool, base, screenWidth)?.stroke ?? null;
          if (next) next.hint = e.stroke.hint;
        }
        if (next) replacements.push([id, next]);
      }
    }
    this.undoManager.stopCapturing();
    const newIds = new Set<string>();
    this.doc.transact(() => {
      for (const id of sel.ids) this.strokes.delete(id);
      for (const [, stroke] of replacements) {
        const nid = uuidv7();
        newIds.add(nid);
        this.strokes.set(nid, strokeToYMap(stroke));
      }
    }, PEN_ORIGIN);
    this.undoManager.stopCapturing();
    const b = sel.bounds;
    this.lasso = newIds.size ? { ids: newIds, bounds: { left: b.left + dx, top: b.top + dy, right: b.right + dx, bottom: b.bottom + dy } } : null;
  }

  // ---------- eraser ----------

  private eraseAt(p: InputPoint): void {
    const a = this.active!;
    const r = this.settings.eraserSize;
    this.resolveAll(!this.needsResolve);
    for (const e of this.entries.values()) {
      if (!e.segments || !e.bounds) continue;
      const b = e.bounds;
      if (p.x < b.left - r || p.x > b.right + r || p.y < b.top - r || p.y > b.bottom + r) continue;
      if (this.settings.eraserMode === "stroke") {
        if (hitsSegments(e.segments, p.x, p.y, r)) a.erasedStrokes.add(e.id);
      } else {
        const hit = pointsWithin(e.segments, p.x, p.y, r);
        if (hit.length) {
          const set = a.erasedPoints.get(e.id) ?? new Set<number>();
          for (const i of hit) set.add(i);
          a.erasedPoints.set(e.id, set);
          this.needsResolve = true;
        }
      }
    }
  }

  private commitErase(a: ActiveStroke): void {
    if (!a.erasedStrokes.size && !a.erasedPoints.size) return;
    this.undoManager.stopCapturing();
    this.doc.transact(() => {
      for (const id of a.erasedStrokes) this.strokes.delete(id);
      for (const [id, erased] of a.erasedPoints) {
        const e = this.entries.get(id);
        if (!e) continue;
        const pieces = splitStroke(e.stroke, e.points, erased);
        this.strokes.delete(id);
        for (const piece of pieces) {
          const next: Stroke = { ...e.stroke, anchors: piece.anchors, points: packPoints(piece.points) };
          delete next.hidden;
          this.strokes.set(uuidv7(), strokeToYMap(next));
        }
      }
    }, PEN_ORIGIN);
    this.undoManager.stopCapturing();
  }

  /** Deletes all strokes (used by "clear drawing" in a drawing block). */
  clearSurface(blockId: string): void {
    this.doc.transact(() => {
      for (const [id, e] of this.entries) if (e.stroke.blockId === blockId) this.strokes.delete(id);
    }, PEN_ORIGIN);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.idleHandle) {
      const cic = (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (cic) cic(this.idleHandle);
      else clearTimeout(this.idleHandle);
    }
    for (const c of this.cleanups) c();
    this.under.remove();
    this.over.remove();
    this.live.remove();
    this.root.classList.remove("ds-pen-root", "ds-pen-draw-any");
  }
}
