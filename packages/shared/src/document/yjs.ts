// Low-level conversion between ProseMirror-style JSON (PMNode) and the Yjs XML
// tree, byte-for-byte the structure y-prosemirror writes (document-model.md §4.1):
//   - node → Y.XmlElement(nodeName); attributes with value null are not stored;
//   - adjacent text nodes → one Y.XmlText; each mark → formatting attribute
//     `markName` (or `markName--<hash>` for overlapping marks) = mark attrs object.
import * as Y from "yjs";
import type { PMMark, PMNode } from "../contracts/document.js";

export type YChild = Y.XmlElement | Y.XmlText;

type Attrs = Record<string, unknown>;

/** Mark name from a formatting attribute key (strips y-prosemirror's `--<hash>` suffix). */
export function markNameFromAttr(key: string): string {
  const i = key.indexOf("--");
  return i < 0 ? key : key.slice(0, i);
}

function marksToAttributes(marks: PMMark[] | undefined): Attrs {
  const out: Attrs = {};
  for (const m of marks ?? []) out[m.type] = m.attrs ?? {};
  return out;
}

/** Formatting attributes → marks. Accepts both `{}` and `true` for attribute-less marks. */
export function attributesToMarks(attrs: Attrs | undefined | null): PMMark[] {
  if (!attrs) return [];
  const marks: PMMark[] = [];
  for (const key of Object.keys(attrs)) {
    const value = attrs[key];
    if (value === null || value === undefined || value === false) continue;
    const mark: PMMark = { type: markNameFromAttr(key) };
    if (typeof value === "object" && Object.keys(value as object).length > 0) {
      mark.attrs = { ...(value as Attrs) };
    }
    marks.push(mark);
  }
  return marks;
}

/** Build Yjs children for a PM content array (not yet integrated into a document). */
export function pmContentToY(content: PMNode[] | undefined): YChild[] {
  const out: YChild[] = [];
  let run: PMNode[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const text = new Y.XmlText();
    text.applyDelta(
      run.map((n) => ({ insert: n.text ?? "", attributes: marksToAttributes(n.marks) })),
    );
    out.push(text);
    run = [];
  };
  for (const node of content ?? []) {
    if (node.type === "text") {
      if (node.text) run.push(node);
    } else {
      flush();
      out.push(pmNodeToY(node));
    }
  }
  flush();
  return out;
}

/** Build a Y.XmlElement for a non-text PM node. */
export function pmNodeToY(node: PMNode): Y.XmlElement {
  if (node.type === "text") throw new TypeError("text nodes are converted with pmContentToY");
  const el = new Y.XmlElement(node.type);
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    if (value !== null && value !== undefined) el.setAttribute(key, value as string);
  }
  const children = pmContentToY(node.content);
  if (children.length > 0) el.insert(0, children);
  return el;
}

export function yTextToPM(text: Y.XmlText): PMNode[] {
  const out: PMNode[] = [];
  for (const d of text.toDelta() as { insert: unknown; attributes?: Attrs }[]) {
    if (typeof d.insert !== "string" || d.insert.length === 0) continue;
    const node: PMNode = { type: "text", text: d.insert };
    const marks = attributesToMarks(d.attributes);
    if (marks.length > 0) node.marks = marks;
    out.push(node);
  }
  return out;
}

export function yChildrenToPM(children: YChild[]): PMNode[] {
  const out: PMNode[] = [];
  for (const child of children) {
    if (child instanceof Y.XmlText) out.push(...yTextToPM(child));
    else out.push(yElementToPM(child));
  }
  return out;
}

export function yElementToPM(el: Y.XmlElement): PMNode {
  const node: PMNode = { type: el.nodeName };
  const attrs = el.getAttributes() as Attrs;
  if (Object.keys(attrs).length > 0) node.attrs = { ...attrs };
  const content = yChildrenToPM(el.toArray() as YChild[]);
  if (content.length > 0) node.content = content;
  return node;
}

/** The whole `content` fragment as `{ type: "doc", content }`. */
export function yFragmentToPM(fragment: Y.XmlFragment): PMNode {
  return { type: "doc", content: yChildrenToPM(fragment.toArray() as YChild[]) };
}

/** Plain JSON copy of a Y.Map (nested Y types converted with toJSON). */
export function mapToObject(map: Y.Map<unknown>): Record<string, unknown> {
  return map.toJSON() as Record<string, unknown>;
}

/** Set every key of `value` on a nested Y.Map (creating it if needed). Undefined keys are skipped. */
export function writeRecord(parent: Y.Map<unknown>, key: string, value: object): Y.Map<unknown> {
  let map = parent.get(key);
  if (!(map instanceof Y.Map)) {
    map = new Y.Map<unknown>();
    parent.set(key, map);
  }
  const m = map as Y.Map<unknown>;
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const cur = m.get(k);
    if (!jsonEqual(cur, v)) m.set(k, v);
  }
  return m;
}

export function readRecord<T>(parent: Y.Map<unknown>, key: string): T | null {
  const map = parent.get(key);
  return map instanceof Y.Map ? (map.toJSON() as T) : null;
}

export function readRecords<T>(parent: Y.Map<unknown>): T[] {
  const out: T[] = [];
  parent.forEach((value) => {
    if (value instanceof Y.Map) out.push(value.toJSON() as T);
  });
  return out;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Uint8Array || b instanceof Uint8Array) return false;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
