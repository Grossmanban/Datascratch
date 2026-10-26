import { useEffect, useState, useSyncExternalStore } from "react";
import type * as Y from "yjs";
import { runtime } from "@/data/runtime";
import { readNoteMeta } from "@/domain/note";

/** Acquire a note's Y.Doc for as long as the component is mounted. */
export function useNoteDoc(noteId: string | undefined): Y.Doc | null {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  useEffect(() => {
    if (!noteId) return;
    let alive = true;
    const rt = runtime();
    // acquire() counts immediately, so exactly one release() per effect run.
    const pending = rt.store.acquire(noteId);
    void pending.then((d) => {
      if (alive) setDoc(d);
    });
    return () => {
      alive = false;
      setDoc(null);
      rt.store.release(noteId);
    };
  }, [noteId]);
  return doc;
}

/** Live view of a note's `meta` map (style, cover, backdrop). */
export function useNoteMeta(doc: Y.Doc | null) {
  return useSyncExternalStore(
    (cb) => {
      if (!doc) return () => undefined;
      const m = doc.getMap("meta");
      m.observe(cb);
      return () => m.unobserve(cb);
    },
    () => (doc ? cachedMeta(doc) : null),
  );
}

const metaCache = new WeakMap<Y.Doc, { key: string; value: ReturnType<typeof readNoteMeta> }>();
function cachedMeta(doc: Y.Doc) {
  const value = readNoteMeta(doc);
  const key = JSON.stringify(value);
  const c = metaCache.get(doc);
  if (c && c.key === key) return c.value;
  metaCache.set(doc, { key, value });
  return value;
}

/**
 * Whether a note's content is here to edit: it has blocks, or sync is caught up and it really is
 * empty. Until then the editor must not be mounted: on an empty document it writes a fresh empty
 * title of its own, and when the real content arrives (a note made on another device or by an
 * agent, not downloaded or decrypted yet) that title wins and the real one becomes a paragraph —
 * the «Без названия» notes of 2026-10-26.
 */
export function useNoteContentReady(noteId: string, doc: Y.Doc | null): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    if (!doc) return;
    const content = doc.getXmlFragment("content");
    const check = () => {
      if (content.length > 0 || runtime().isDocSynced(noteId)) {
        setReady(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const onChange = () => void check();
    content.observe(onChange);
    const timer = window.setInterval(() => {
      if (check()) window.clearInterval(timer);
    }, 400);
    return () => {
      content.unobserve(onChange);
      window.clearInterval(timer);
    };
  }, [doc, noteId]);
  return ready;
}

