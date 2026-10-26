import { create } from "zustand";

// «Недавно закрытые» (spec/12 §12.6): tabs closed on this device, per space, newest first, so a
// tab closed by accident can be brought back from the tab overview. Kept like a browser's list:
// on this device only (localStorage, in try/catch), at most 20 per space.

export type ClosedTab = { noteId: string; closedAt: number };
const KEY = "ds.closedTabs";
const LIMIT = 20;

function load(): Record<string, ClosedTab[]> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Record<string, ClosedTab[]>) : {};
  } catch {
    return {};
  }
}

export const useClosedTabs = create<Record<string, ClosedTab[]>>(() => load());

function save(next: Record<string, ClosedTab[]>) {
  useClosedTabs.setState(next, true);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode: kept for this tab only
  }
}

export function recordClosedTabs(spaceId: string, noteIds: string[]) {
  if (!noteIds.length) return;
  const cur = useClosedTabs.getState();
  const now = Date.now();
  const list = [...noteIds.map((noteId) => ({ noteId, closedAt: now })), ...(cur[spaceId] ?? []).filter((c) => !noteIds.includes(c.noteId))];
  save({ ...cur, [spaceId]: list.slice(0, LIMIT) });
}

/** A tab opened again leaves the list. */
export function forgetClosedTab(spaceId: string, noteId: string) {
  const cur = useClosedTabs.getState();
  if (!cur[spaceId]?.some((c) => c.noteId === noteId)) return;
  save({ ...cur, [spaceId]: cur[spaceId]!.filter((c) => c.noteId !== noteId) });
}

export function clearClosedTabs() {
  save({});
}
