import * as Y from "yjs";

/** Write a plain object as a Y.Map (one level deep: nested values are stored as JSON). */
export function toYMap(obj: Record<string, unknown>): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  for (const [k, v] of Object.entries(obj)) m.set(k, v === undefined ? null : v);
  return m;
}

export function patchYMap(m: Y.Map<unknown>, patch: Record<string, unknown>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const cur = m.get(k);
    if (JSON.stringify(cur) !== JSON.stringify(v)) m.set(k, v);
  }
}

export function readMapOfMaps<T>(root: Y.Map<Y.Map<unknown>>): T[] {
  const out: T[] = [];
  root.forEach((v) => {
    if (v instanceof Y.Map) out.push(v.toJSON() as T);
  });
  return out;
}

/** Fractional order between two neighbours (for manual sorting without renumbering). */
export function orderBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
