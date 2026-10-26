// Repair of damaged note starts (document-model.md «Один title», 2026-10-26). Clients that seeded
// an empty title into a note they had not fetched yet left documents with two titles, or with the
// real title demoted to a paragraph behind a new empty one. The rule is deterministic and only
// removes what is provably a stray, so clients repairing the same document concurrently converge
// (the iOS editor applies the identical rule):
//   (a) several top-level titles → delete the EMPTY ones except the first title if all are empty;
//       non-empty extra titles stay untouched (converting them concurrently would duplicate ids);
//   (b) the document starts with an EMPTY title immediately followed by a PARAGRAPH whose blockId is
//       OLDER (UUIDv7 time) than the title's → the paragraph was the original title: its inline
//       content moves into the title and the paragraph is deleted;
//   (c) an empty document is left alone (nothing is written on open).
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

/** What the repair would do (for tests and logs). */
export interface TitleRepair {
  deletedEmptyTitles: number;
  restoredFromParagraph: boolean;
}

/** Applies rules (a) and (b) to `content`; returns what changed (nothing → no Y transaction). */
export function repairTitles(content: Y.XmlFragment): TitleRepair {
  const result: TitleRepair = { deletedEmptyTitles: 0, restoredFromParagraph: false };
  const doc = content.doc;
  if (!doc || content.length === 0) return result;
  const top = () => content.toArray().filter((n): n is Y.XmlElement => n instanceof Y.XmlElement);

  // Decide first, write once.
  const titles = top().filter((e) => e.nodeName === "title");
  const emptyExtras = titles.length > 1 ? titles.filter((t, i) => isEmpty(t) && !(i === 0 && titles.every(isEmpty))) : [];
  const remaining = top().filter((e) => !emptyExtras.includes(e));
  const [first, second] = remaining;
  const restore =
    !!first &&
    !!second &&
    first.nodeName === "title" &&
    isEmpty(first) &&
    second.nodeName === "paragraph" &&
    (() => {
      const t = uuidv7Time(first.getAttribute("blockId"));
      const p = uuidv7Time(second.getAttribute("blockId"));
      return t !== null && p !== null && p < t;
    })();
  if (!emptyExtras.length && !restore) return result;

  doc.transact(() => {
    for (const t of emptyExtras) {
      const i = content.toArray().indexOf(t);
      if (i >= 0) content.delete(i, 1);
    }
    result.deletedEmptyTitles = emptyExtras.length;
    if (restore) {
      first!.delete(0, first!.length);
      first!.insert(0, second!.toArray().map((c) => cloneInline(c as Y.XmlElement | Y.XmlText)));
      const i = content.toArray().indexOf(second!);
      if (i >= 0) content.delete(i, 1);
      result.restoredFromParagraph = true;
    }
  }, REPAIR_ORIGIN);
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
