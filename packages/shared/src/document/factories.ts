// Document factories and format-version checks (document-model.md §1–4, §6).
import * as Y from "yjs";
import {
  ACCOUNT_ROOTS,
  DEFAULT_NOTE_STYLE,
  FORMAT_VERSION,
  NOTEBOOK_ROOTS,
  NOTE_ROOTS,
  type NoteDocMeta,
  type NotebookMeta,
  type NotebookMetaFields,
  type PMNode,
} from "../contracts/document.js";
import type { DocKind } from "../contracts/common.js";
import { uuidv7 } from "../ids.js";
import { pmContentToY } from "./yjs.js";

export interface AccountDocRoots {
  meta: Y.Map<unknown>;
  spaces: Y.Map<unknown>;
  notebooks: Y.Map<unknown>;
  settings: Y.Map<unknown>;
  starred: Y.Array<unknown>;
  tabs: Y.Array<unknown>;
}

export interface NotebookDocRoots {
  meta: Y.Map<unknown>;
  folders: Y.Map<unknown>;
  notes: Y.Map<unknown>;
  tags: Y.Map<unknown>;
}

export interface NoteDocRoots {
  content: Y.XmlFragment;
  meta: Y.Map<unknown>;
  strokes: Y.Map<unknown>;
  comments: Y.Map<unknown>;
}

export function accountRoots(doc: Y.Doc): AccountDocRoots {
  return {
    meta: doc.getMap(ACCOUNT_ROOTS.meta),
    spaces: doc.getMap(ACCOUNT_ROOTS.spaces),
    notebooks: doc.getMap(ACCOUNT_ROOTS.notebooks),
    settings: doc.getMap(ACCOUNT_ROOTS.settings),
    starred: doc.getArray(ACCOUNT_ROOTS.starred),
    tabs: doc.getArray(ACCOUNT_ROOTS.tabs),
  };
}

export function notebookRoots(doc: Y.Doc): NotebookDocRoots {
  return {
    meta: doc.getMap(NOTEBOOK_ROOTS.meta),
    folders: doc.getMap(NOTEBOOK_ROOTS.folders),
    notes: doc.getMap(NOTEBOOK_ROOTS.notes),
    tags: doc.getMap(NOTEBOOK_ROOTS.tags),
  };
}

export function noteRoots(doc: Y.Doc): NoteDocRoots {
  return {
    content: doc.getXmlFragment(NOTE_ROOTS.content),
    meta: doc.getMap(NOTE_ROOTS.meta),
    strokes: doc.getMap(NOTE_ROOTS.strokes),
    comments: doc.getMap(NOTE_ROOTS.comments),
  };
}

export interface DocOptions {
  /** Pass an existing Y.Doc (e.g. with a fixed clientID for tests). */
  doc?: Y.Doc;
}

export function createAccountDoc(options: DocOptions = {}): Y.Doc {
  const doc = options.doc ?? new Y.Doc();
  doc.transact(() => {
    accountRoots(doc).meta.set("formatVersion", FORMAT_VERSION);
  });
  return doc;
}

export interface NotebookDocOptions extends DocOptions, Partial<NotebookMetaFields> {}

export function createNotebookDoc(notebookId: string, options: NotebookDocOptions = {}): Y.Doc {
  const doc = options.doc ?? new Y.Doc();
  doc.transact(() => {
    const meta = notebookRoots(doc).meta;
    meta.set("formatVersion", FORMAT_VERSION);
    meta.set("notebookId", notebookId);
    meta.set("name", options.name ?? "");
    meta.set("icon", options.icon ?? null);
    meta.set("space", options.space ?? null);
  });
  return doc;
}

/** Read the notebook document's `meta` (missing fields read as empty/null). */
export function getNotebookMeta(doc: Y.Doc): NotebookMeta {
  const m = notebookRoots(doc).meta;
  return {
    formatVersion: (m.get("formatVersion") as number | undefined) ?? FORMAT_VERSION,
    notebookId: String(m.get("notebookId") ?? ""),
    name: String(m.get("name") ?? ""),
    icon: (m.get("icon") as string | null | undefined) ?? null,
    space: (m.get("space") as NotebookMeta["space"] | undefined) ?? null,
  };
}

/**
 * Update the copies of name/icon/space in the notebook's `meta`. Clients call
 * it whenever the NotebookRef or its Space changes in the account document.
 */
export function setNotebookMeta(doc: Y.Doc, fields: Partial<NotebookMetaFields>): void {
  const m = notebookRoots(doc).meta;
  doc.transact(() => {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      if (JSON.stringify(m.get(k)) !== JSON.stringify(v)) m.set(k, v);
    }
  });
}

export interface NoteDocOptions extends DocOptions {
  title?: string;
  /** Body blocks; defaults to one empty paragraph. Missing blockIds are assigned. */
  blocks?: PMNode[];
  meta?: Partial<Omit<NoteDocMeta, "formatVersion">>;
  /** Id generator (tests, vectors). */
  newId?: () => string;
}

/** A new note: `doc = title block+` with blockIds, plus `meta`. */
export function createNoteDoc(options: NoteDocOptions = {}): Y.Doc {
  const doc = options.doc ?? new Y.Doc();
  const newId = options.newId ?? (() => uuidv7());
  const title: PMNode = {
    type: "title",
    attrs: { blockId: newId() },
    ...(options.title ? { content: [{ type: "text", text: options.title }] } : {}),
  };
  const body = (options.blocks ?? [{ type: "paragraph" }]).map((b) => withBlockIds(b, newId));
  doc.transact(() => {
    const { content, meta } = noteRoots(doc);
    meta.set("formatVersion", FORMAT_VERSION);
    meta.set("style", { ...DEFAULT_NOTE_STYLE, ...(options.meta?.style ?? {}) });
    meta.set("cover", options.meta?.cover ?? null);
    meta.set("backdrop", options.meta?.backdrop ?? null);
    content.insert(0, pmContentToY([title, ...body]));
  });
  return doc;
}

const NON_BLOCK = new Set(["text", "noteLink", "tag", "mention", "hardBreak", "doc"]);

/** Copy of `node` where every block node (recursively) has a blockId. */
export function withBlockIds(node: PMNode, newId: () => string = () => uuidv7()): PMNode {
  if (NON_BLOCK.has(node.type)) {
    return node.content
      ? { ...node, content: node.content.map((c) => withBlockIds(c, newId)) }
      : node;
  }
  const attrs = { ...(node.attrs ?? {}) };
  if (typeof attrs.blockId !== "string" || attrs.blockId === "") attrs.blockId = newId();
  if (node.type === "taskItem" && (typeof attrs.taskId !== "string" || attrs.taskId === "")) {
    attrs.taskId = newId();
  }
  const out: PMNode = { ...node, attrs };
  if (node.content) out.content = node.content.map((c) => withBlockIds(c, newId));
  return out;
}

/** `meta.formatVersion` of any document kind (null if not yet set). */
export function getFormatVersion(doc: Y.Doc): number | null {
  const v = doc.getMap("meta").get("formatVersion");
  return typeof v === "number" ? v : null;
}

/** A client must open documents of a newer format read-only (document-model.md §6, R-03). */
export function isReadOnlyFormat(doc: Y.Doc, supported: number = FORMAT_VERSION): boolean {
  const v = getFormatVersion(doc);
  return v !== null && v > supported;
}

/** Root names a document kind uses (for diagnostics and tests). */
export function rootNames(kind: DocKind): readonly string[] {
  switch (kind) {
    case "account":
      return Object.values(ACCOUNT_ROOTS);
    case "notebook":
      return Object.values(NOTEBOOK_ROOTS);
    case "note":
      return Object.values(NOTE_ROOTS);
  }
}
