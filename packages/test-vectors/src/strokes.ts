import * as Y from "yjs";
import {
  encodeAnchor,
  layoutTextStroke,
  packPoints,
  pressureCurve,
  resolveAnchors,
  strokeWidthAt,
  type GlyphBox,
  type ResolvedAnchor,
  type StrokePoint,
} from "@datascratch/shared/strokes";
import { b64, hex } from "./util.js";

const PER_LINE_WIDE = 1000;

/** The reference layout of the vectors: monospace, 10 units per character, 24 per line, font size 17. */
function monoLayout(perLine: number) {
  return (a: ResolvedAnchor): GlyphBox => ({
    x: (a.index % perLine) * 10,
    baseline: Math.floor(a.index / perLine) * 24 + 17,
    fontSize: 17,
    line: Math.floor(a.index / perLine),
  });
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

export function strokeVectors() {
  // --- point packing -------------------------------------------------------
  const points: StrokePoint[] = [
    { a: 0, x: 0, y: 0.1, pressure: 1, altitude: Math.PI / 2, azimuth: 0, roll: 0, t: 0 },
    {
      a: 1,
      x: 0.25,
      y: -0.5,
      pressure: 0.5,
      altitude: 0.7853982,
      azimuth: 3.1415927,
      roll: 0.1,
      t: 8,
    },
    { a: -1, x: 1.5, y: 2.75, pressure: 0, altitude: 0, azimuth: 6.2831855, roll: -1, t: 1234.5 },
  ];
  const packed = packPoints(points);

  // --- anchors through edits ----------------------------------------------
  // A paragraph Y.XmlText inside the note's `content`, written by client 1.
  const doc = new Y.Doc();
  doc.clientID = 1;
  doc.gc = false;
  const para = new Y.XmlElement("paragraph");
  const text = new Y.XmlText();
  para.insert(0, [text]);
  doc.getXmlFragment("content").insert(0, [para]);
  text.insert(0, "The quick brown fox");
  const base = Y.encodeStateAsUpdate(doc);
  const anchorIdx = [4, 5, 10, 14, 18]; // q u b(rown) b? f(ox) x
  const anchors = anchorIdx.map((i) => encodeAnchor(text, i));

  // Edits by client 2, each given as the incremental update.
  const editor = new Y.Doc();
  editor.clientID = 2;
  editor.gc = false;
  Y.applyUpdate(editor, base);
  const et = (editor.getXmlFragment("content").get(0) as Y.XmlElement).get(0) as Y.XmlText;
  const steps: { description: string; edit: (t: Y.XmlText) => void }[] = [
    { description: "insert '>> ' at 0", edit: (t) => t.insert(0, ">> ") },
    { description: "delete 'quick ' (6 chars at 7)", edit: (t) => t.delete(7, 6) },
    { description: "insert 'very ' at 7", edit: (t) => t.insert(7, "very ") },
    { description: "delete everything", edit: (t) => t.delete(0, t.length) },
  ];
  const stepVectors = steps.map((s) => {
    const sv = Y.encodeStateVector(editor);
    s.edit(et);
    const update = Y.encodeStateAsUpdate(editor, sv);
    Y.applyUpdate(doc, update);
    return {
      description: s.description,
      update: b64(update),
      textAfter: text.toString(),
      anchors: resolveAnchors(doc, anchors).map((r) =>
        r && !r.deleted ? { deleted: false, index: r.index } : { deleted: true },
      ),
    };
  });

  // --- layout / line breaking ---------------------------------------------
  const lDoc = new Y.Doc();
  lDoc.clientID = 3;
  const lPara = new Y.XmlElement("paragraph");
  const lText = new Y.XmlText();
  lPara.insert(0, [lText]);
  lDoc.getXmlFragment("content").insert(0, [lPara]);
  lText.insert(0, "abcdefghij");
  const lAnchors = [2, 3, 4, 5, 6].map((i) => encodeAnchor(lText, i));
  const lPoints: StrokePoint[] = [0, 1, 2, 3, 4].map((a, i) => ({
    a,
    x: 0.2,
    y: 0.15,
    pressure: 0.25 * (i + 1) - 0.05,
    altitude: Math.PI / 4,
    azimuth: 0,
    roll: 0,
    t: i * 8,
  }));
  const stroke = { tool: "pencil" as const, width: 2 };
  const layoutCases = [PER_LINE_WIDE, 4].map((perLine) => {
    const segs = layoutTextStroke(
      stroke,
      lPoints,
      resolveAnchors(lDoc, lAnchors),
      monoLayout(perLine),
    );
    return {
      perLine,
      segments: segs.map((s) =>
        s.map((p) => ({ x: round(p.x), y: round(p.y), width: round(p.width) })),
      ),
    };
  });
  const layoutBase = Y.encodeStateAsUpdate(lDoc);
  lText.delete(4, 1); // removes "e" → anchor 2 deleted
  const afterDelete = layoutTextStroke(
    stroke,
    lPoints,
    resolveAnchors(lDoc, lAnchors),
    monoLayout(PER_LINE_WIDE),
  );

  const widths = [
    { tool: "pen", width: 2, pressure: 1, altitude: Math.PI / 2, scale: { fontSize: 17 } },
    { tool: "pen", width: 2, pressure: 0, altitude: Math.PI / 2, scale: { fontSize: 34 } },
    { tool: "pencil", width: 1.5, pressure: 0.5, altitude: 0, scale: { fontSize: 17 } },
    { tool: "marker", width: 6, pressure: 0.3, altitude: Math.PI / 4, scale: { blockWidth: 300 } },
    { tool: "highlighter", width: 10, pressure: 0.7, altitude: 0.2, scale: { blockWidth: 600 } },
  ].map((c) => ({
    ...c,
    f: round(pressureCurve(c.pressure)),
    result: round(strokeWidthAt({ tool: c.tool as "pen", width: c.width }, c, c.scale)),
  }));

  return {
    "strokes/points.json": {
      description:
        "Packed points: records of 8 Float32 LE [a, x, y, pressure, altitude, azimuth, roll, t]. Values are given after Float32 rounding.",
      points: points.map((p) => {
        const f = new Float32Array([p.a, p.x, p.y, p.pressure, p.altitude, p.azimuth, p.roll, p.t]);
        return {
          a: f[0],
          x: f[1],
          y: f[2],
          pressure: f[3],
          altitude: f[4],
          azimuth: f[5],
          roll: f[6],
          t: f[7],
        };
      }),
      packedHex: hex(packed),
    },
    "strokes/anchors.json": {
      description:
        "Relative-position anchors (Y.encodeRelativePosition, assoc 0) of characters in a Y.XmlText at content[0][0]. Apply `base`, then each step's update in order; resolve every anchor after each step. A deleted character resolves to {deleted: true} (D-35).",
      base: b64(base),
      textBefore: "The quick brown fox",
      anchorIndices: anchorIdx,
      anchors: anchors.map(b64),
      steps: stepVectors,
    },
    "strokes/layout.json": {
      description:
        "Layout of a text stroke with the reference monospace layout: glyph x = (index mod perLine) * 10, baseline = floor(index / perLine) * 24 + 17, fontSize 17, line = floor(index / perLine). Point = (x + px*fontSize, baseline + py*fontSize); width = strokeWidth(...). Segments break between lines; points on deleted characters are dropped; segments < 2 points are dropped. Values rounded to 1e-4.",
      base: b64(layoutBase),
      textBefore: "abcdefghij",
      anchorIndices: [2, 3, 4, 5, 6],
      anchors: lAnchors.map(b64),
      stroke,
      points: b64(packPoints(lPoints)),
      cases: layoutCases,
      afterDeletingIndex4: {
        segments: afterDelete.map((s) =>
          s.map((p) => ({ x: round(p.x), y: round(p.y), width: round(p.width) })),
        ),
      },
    },
    "strokes/width.json": {
      description:
        "f(p) = 0.35 + 0.65 p^0.8; width × f × (fontSize/17 | blockWidth/600) × tilt; tilt = 1 + 1.5 (1 − altitude/(π/2)) for pencil and marker only.",
      cases: widths,
    },
  };
}
