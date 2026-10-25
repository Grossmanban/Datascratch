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
