import { useEffect, useState } from "react";
import * as Y from "yjs";
import { META_ORIGIN } from "./collab/collaboration";
import { DEFAULT_NOTE_STYLE, type NoteBackdrop, type NoteCover, type NoteStyle } from "@datascratch/shared/contracts";

/** formatVersion this client understands (document-model.md §6). */
export const SUPPORTED_FORMAT_VERSION = 1;

export interface NoteMetaState {
  formatVersion: number;
  style: NoteStyle;
  cover: NoteCover | null;
  backdrop: NoteBackdrop | null;
}

export function readNoteMeta(doc: Y.Doc): NoteMetaState {
  const meta = doc.getMap<unknown>("meta");
  const style = (meta.get("style") as Partial<NoteStyle> | undefined) ?? {};
  return {
    formatVersion: (meta.get("formatVersion") as number | undefined) ?? SUPPORTED_FORMAT_VERSION,
    style: { ...DEFAULT_NOTE_STYLE, ...style },
    cover: (meta.get("cover") as NoteCover | null | undefined) ?? null,
    backdrop: (meta.get("backdrop") as NoteBackdrop | null | undefined) ?? null,
  };
}

/** Writes `formatVersion` into a new note (no-op if present). */
export function initNoteMeta(doc: Y.Doc): void {
  const meta = doc.getMap<unknown>("meta");
  if (meta.has("formatVersion")) return;
  doc.transact(() => meta.set("formatVersion", SUPPORTED_FORMAT_VERSION), META_ORIGIN);
}

export function setNoteStyle(doc: Y.Doc, patch: Partial<NoteStyle>): void {
  const meta = doc.getMap<unknown>("meta");
  const next = { ...readNoteMeta(doc).style, ...patch };
  doc.transact(() => meta.set("style", next), META_ORIGIN);
}

export function setNoteCover(doc: Y.Doc, cover: NoteCover | null): void {
  doc.transact(() => doc.getMap<unknown>("meta").set("cover", cover), META_ORIGIN);
}

export function setNoteBackdrop(doc: Y.Doc, backdrop: NoteBackdrop | null): void {
  doc.transact(() => doc.getMap<unknown>("meta").set("backdrop", backdrop), META_ORIGIN);
}

/** Live `meta` of a note document. */
export function useNoteMeta(doc: Y.Doc): NoteMetaState {
  const [state, setState] = useState(() => readNoteMeta(doc));
  useEffect(() => {
    const meta = doc.getMap<unknown>("meta");
    const update = () => setState(readNoteMeta(doc));
    update();
    meta.observe(update);
    return () => meta.unobserve(update);
  }, [doc]);
  return state;
}

/** Plain text of the `title` node. */
export function readTitle(doc: Y.Doc): string {
  const first = doc.getXmlFragment("content").get(0);
  if (!(first instanceof Y.XmlElement) || first.nodeName !== "title") return "";
  return first
    .toArray()
    .map((c) => (c instanceof Y.XmlText ? (c.toDelta() as { insert: unknown }[]).map((d) => (typeof d.insert === "string" ? d.insert : "")).join("") : ""))
    .join("");
}
