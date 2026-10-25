/** Builders for test documents in the contract format (notes, notebook indexes, strokes). */
import * as Y from "yjs";
import { insertBlocks } from "../doc/build.js";
import { markdownToBlocks } from "../doc/markdown-import.js";
import { contentOf, findBlock, TEXT_BLOCKS, childElements } from "../doc/model.js";
import { writeStroke, type StrokeHint, type StrokePoint, type StrokeTool } from "../doc/strokes.js";
import { uuidv7 } from "../util.js";

export function makeNoteDoc(title: string, markdown: string): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  doc.transact(() => {
    const root = contentOf(doc);
    insertBlocks(root, 0, [{ type: "title", attrs: {}, inline: [{ text: title, marks: {} }] }], { agentEdit: null });
    insertBlocks(root, 1, markdownToBlocks(markdown), { agentEdit: null });
    doc.getMap("meta").set("formatVersion", 1);
  });
  return doc;
}

/** Id of the n-th (0-based) top-level block after the title. */
export function blockIdAt(doc: Y.Doc, n: number): string {
  const el = childElements(contentOf(doc)).filter((e) => e.nodeName !== "title")[n];
  if (!el) throw new Error(`no block ${n}`);
  return el.getAttribute("blockId") as string;
}

export function titleBlockId(doc: Y.Doc): string {
  return childElements(contentOf(doc))[0]!.getAttribute("blockId") as string;
}

export interface TextStrokeOptions {
  /** Text block (or list item whose first paragraph is used). */
  blockId: string;
  start: number;
  end: number;
  hint?: StrokeHint;
  tool?: StrokeTool;
  color?: string;
  width?: number;
  createdAt?: number;
  id?: string;
}

function textOfBlock(doc: Y.Doc, blockId: string): Y.XmlText {
  const loc = findBlock(doc, blockId);
  if (!loc) throw new Error(`no block ${blockId}`);
  let el = loc.el;
  if (!TEXT_BLOCKS.has(el.nodeName)) el = childElements(el)[0]!;
  const t = el.toArray().find((c): c is Y.XmlText => c instanceof Y.XmlText);
  if (!t) throw new Error("block has no text");
  return t;
}

/**
 * Adds a text-anchored stroke over characters [start, end) of a block's first
 * text run, shaped by `hint` (underline under the baseline, strike through
 * x-height, circle around, highlight band).
 */
export function addTextStroke(doc: Y.Doc, o: TextStrokeOptions): string {
  const t = textOfBlock(doc, o.blockId);
  const hint = o.hint ?? "underline";
  const anchors: Uint8Array[] = [];
  const points: StrokePoint[] = [];
  const base = { pressure: 0.7, altitude: Math.PI / 3, azimuth: 0, roll: 0 };
  let time = 0;
  const pt = (a: number, x: number, y: number) => points.push({ a, x, y, ...base, t: (time += 8) });
  for (let i = o.start; i < o.end; i++) anchors.push(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(t, i)));
  const n = anchors.length;
  if (hint === "underline" || hint === "highlight" || hint === "strike") {
    const y = hint === "underline" ? 0.18 : hint === "strike" ? -0.3 : -0.32;
    for (let a = 0; a < n; a++) {
      pt(a, 0.05, y + (a % 2 ? 0.015 : -0.01));
      pt(a, 0.3, y);
    }
  } else if (hint === "circle") {
    for (let a = 0; a < n; a++) pt(a, 0.1, -0.95);
    pt(n - 1, 0.6, -0.4);
    for (let a = n - 1; a >= 0; a--) pt(a, 0.2, 0.3);
    pt(0, -0.25, -0.35);
    pt(0, 0.05, -0.9);
  } else {
    for (let a = 0; a < n; a++) pt(a, 0.2, -1.1 - 0.2 * Math.sin(a));
  }
  const id = o.id ?? uuidv7();
  doc.transact(() =>
    writeStroke(doc, {
      id,
      v: 1,
      tool: o.tool ?? (hint === "highlight" ? "highlighter" : "pen"),
      color: o.color ?? (hint === "highlight" ? "highlight.yellow" : "ink.blue"),
      width: o.width ?? (hint === "highlight" ? 14 : 2.2),
      opacity: 1,
      anchorKind: "text",
      blockId: null,
      anchors,
      points,
      hint,
      author: { kind: "user", id: "user-1" },
      createdAt: o.createdAt ?? 1_760_000_000_000 + doc.getMap("strokes").size,
    }),
  );
  return id;
}

/** Adds a block-anchored stroke (margin note / drawing) from points in block-width units. */
export function addBlockStroke(doc: Y.Doc, blockId: string, kind: "block" | "drawing" | "image", path: [number, number][], id = uuidv7()): string {
  const points: StrokePoint[] = path.map(([x, y], i) => ({ a: -1, x, y, pressure: 0.6, altitude: Math.PI / 2, azimuth: 0, roll: 0, t: i * 10 }));
  doc.transact(() =>
    writeStroke(doc, {
      id,
      v: 1,
      tool: "pen",
      color: "ink.black",
      width: 2,
      opacity: 1,
      anchorKind: kind,
      blockId,
      anchors: [],
      points,
      hint: "free",
      author: { kind: "user", id: "user-1" },
      createdAt: 1_760_000_100_000 + doc.getMap("strokes").size,
    }),
  );
  return id;
}

export interface NoteMetaInit {
  id: string;
  title: string;
  folderId?: string | null;
  tags?: string[];
  kind?: "note" | "daily" | "inbox";
  trashedAt?: string | null;
  updatedAt?: string;
}

export function makeNotebookDoc(notebookId: string, name: string, notes: NoteMetaInit[], folders: { id: string; name: string; parentId?: string | null }[] = []): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  doc.transact(() => {
    const meta = doc.getMap("meta");
    meta.set("formatVersion", 1);
    meta.set("notebookId", notebookId);
    meta.set("name", name);
    const fm = doc.getMap("folders");
    folders.forEach((f, i) => {
      const m = new Y.Map<unknown>();
      fm.set(f.id, m);
      for (const [k, v] of Object.entries({ id: f.id, parentId: f.parentId ?? null, name: f.name, icon: null, color: null, order: i, createdAt: "2026-10-01T00:00:00.000Z" })) m.set(k, v);
    });
    const nm = doc.getMap("notes");
    notes.forEach((n, i) => {
      const m = new Y.Map<unknown>();
      nm.set(n.id, m);
      const fields = {
        id: n.id,
        folderId: n.folderId ?? null,
        parentNoteId: null,
        title: n.title,
        kind: n.kind ?? "note",
        dailyDate: null,
        tags: n.tags ?? [],
        icon: null,
        coverThumb: null,
        wrappedKey: "test-wrapped-key",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: n.updatedAt ?? "2026-10-20T00:00:00.000Z",
        trashedAt: n.trashedAt ?? null,
        order: i,
      };
      for (const [k, v] of Object.entries(fields)) m.set(k, v);
    });
  });
  return doc;
}
