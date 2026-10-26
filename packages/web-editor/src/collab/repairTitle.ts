// Repair of damaged note starts (document-model.md «Один title», 2026-10-26). Clients that seeded
// an empty title and an empty paragraph into a note they had not fetched yet left documents with
// two titles, empty paragraphs before the real title, or the real title demoted to a paragraph
// behind a new empty one. The rule is deterministic and only deletes empties or merges as below, so
// clients repairing the same document concurrently converge (the iOS editor applies the identical
// rule). Applied in this order (numbered as in the contract):
//   1. several top-level titles → delete the EMPTY ones (all empty: keep the first); non-empty extra
//      titles stay untouched (converting them concurrently would duplicate ids);
//   2. EMPTY paragraphs before the first title are deleted;
//   3. the document starts with an EMPTY title T: skip the EMPTY paragraphs after it; if the first
//      non-empty block is a PARAGRAPH P whose blockId is OLDER (UUIDv7 time) than T's, P was the
//      original title — its inline content moves into T, P and the skipped empty paragraphs are
//      deleted;
//   4. an empty document is left alone (nothing is written on open).
// One Y transaction, idempotent; the origin is not tracked by the undo manager.
import { Extension } from "@tiptap/core";
import * as Y from "yjs";

/** Origin of repair transactions (not undoable, not the user's edit). */
export const REPAIR_ORIGIN = { name: "datascratch-repair" };

/** Milliseconds of a UUIDv7 (first 48 bits), or null for anything else. */
export function uuidv7Time(id: unknown): number | null {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

/** A block with no text and no inline atoms. */
function isEmpty(el: Y.XmlElement): boolean {
  return el.toArray().every((c) => c instanceof Y.XmlText && c.length === 0);
}

function cloneInline(node: Y.XmlElement | Y.XmlText): Y.XmlElement | Y.XmlText {
  if (node instanceof Y.XmlText) {
    const t = new Y.XmlText();
    t.applyDelta(node.toDelta());
    return t;
  }
  const e = new Y.XmlElement(node.nodeName);
  for (const [k, v] of Object.entries(node.getAttributes())) e.setAttribute(k, v as never);
  e.insert(0, node.toArray().map((c) => cloneInline(c as Y.XmlElement | Y.XmlText)));
  return e;
}

/** What the repair did (for tests and logs). */
export interface TitleRepair {
  deletedEmptyTitles: number;
  deletedEmptyParagraphs: number;
  restoredFromParagraph: boolean;
}

/** Applies rules 1–3 in order to `content`; returns what changed (nothing → no Y transaction). */
export function repairTitles(content: Y.XmlFragment): TitleRepair {
  const result: TitleRepair = { deletedEmptyTitles: 0, deletedEmptyParagraphs: 0, restoredFromParagraph: false };
  const doc = content.doc;
  if (!doc || content.length === 0) return result;

  // Decide on a copy of the top level, then write once.
  let blocks = content.toArray().filter((n): n is Y.XmlElement => n instanceof Y.XmlElement);
  const isTitle = (e: Y.XmlElement) => e.nodeName === "title";
  const isEmptyParagraph = (e: Y.XmlElement) => e.nodeName === "paragraph" && isEmpty(e);

  // Rule 1: duplicate titles — only empty ones go.
  const titles = blocks.filter(isTitle);
  const emptyTitles = titles.length > 1 ? titles.filter((t, i) => isEmpty(t) && !(i === 0 && titles.every(isEmpty))) : [];
  blocks = blocks.filter((b) => !emptyTitles.includes(b));

  // Rule 2: empty paragraphs before the first title.
  const firstTitle = blocks.findIndex(isTitle);
  const emptyBefore = firstTitle > 0 ? blocks.slice(0, firstTitle).filter(isEmptyParagraph) : [];
  blocks = blocks.filter((b) => !emptyBefore.includes(b));

  // Rule 3: an empty title, (empty paragraphs), then an older paragraph = the demoted title.
  let restore: { title: Y.XmlElement; from: Y.XmlElement; skipped: Y.XmlElement[] } | null = null;
  const head = blocks[0];
  if (head && isTitle(head) && isEmpty(head)) {
    let i = 1;
    while (i < blocks.length && isEmptyParagraph(blocks[i]!)) i++;
    const next = blocks[i];
    if (next && next.nodeName === "paragraph") {
      const t = uuidv7Time(head.getAttribute("blockId"));
      const p = uuidv7Time(next.getAttribute("blockId"));
      if (t !== null && p !== null && p < t) restore = { title: head, from: next, skipped: blocks.slice(1, i) };
    }
  }

  const deletions = [...emptyTitles, ...emptyBefore, ...(restore ? [restore.from, ...restore.skipped] : [])];
  if (!deletions.length) return result;

  doc.transact(() => {
    if (restore) {
      restore.title.delete(0, restore.title.length);
      restore.title.insert(0, restore.from.toArray().map((c) => cloneInline(c as Y.XmlElement | Y.XmlText)));
    }
    for (const el of deletions) {
      const i = content.toArray().indexOf(el);
      if (i >= 0) content.delete(i, 1);
    }
  }, REPAIR_ORIGIN);
  result.deletedEmptyTitles = emptyTitles.length;
  result.deletedEmptyParagraphs = emptyBefore.length + (restore ? restore.skipped.length : 0);
  result.restoredFromParagraph = !!restore;
  return result;
}

/**
 * Repairs on open and whenever the top level of the note changes (content arriving from the
 * server, another client). Returns the unsubscribe function.
 */
export function attachTitleRepair(content: Y.XmlFragment, canWrite: () => boolean): () => void {
  const run = () => {
    if (canWrite()) repairTitles(content);
  };
  run();
  const observer = (e: Y.YXmlEvent) => {
    if (e.transaction.origin === REPAIR_ORIGIN) return;
    // After the transaction that changed the top level (repair writes in its own transaction).
    queueMicrotask(run);
  };
  content.observe(observer);
  return () => content.unobserve(observer);
}

/** Runs the repair for the editor's note while the editor is editable (read-only notes are never written). */
export const TitleRepair = Extension.create<{ doc: Y.Doc | null }>({
  name: "dsTitleRepair",
  addOptions() {
    return { doc: null };
  },
  addStorage() {
    return { detach: null as null | (() => void) };
  },
  onCreate() {
    const doc = this.options.doc;
    if (!doc) return;
    const editor = this.editor;
    this.storage.detach = attachTitleRepair(doc.getXmlFragment("content"), () => !editor.isDestroyed && editor.isEditable);
  },
  onDestroy() {
    this.storage.detach?.();
  },
});
