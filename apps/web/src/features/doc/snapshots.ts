import { runtime } from "@/data/runtime";

/**
 * When a note gets a version (spec/06 «История версий»; the same policy as iOS, 2026-11-09).
 * Versions are the encrypted snapshots the client uploads, so the client decides when:
 * - leaving the note (closing it or its tab, hiding the page): at least one edit and at least
 *   2 minutes since the last snapshot — or 30+ edits whatever the time (the old threshold);
 * - every 10 minutes while editing;
 * - before «Оформить» or a voice insert: the state «до», so the change can be looked at and undone
 *   from history too;
 * - (the sync client still snapshots by itself after 500 updates / 1 MiB.)
 */
export const EDITING_INTERVAL_MS = 10 * 60_000;
export const LEAVE_GAP_MS = 2 * 60_000;
export const LEAVE_MANY_EDITS = 30;

type NoteState = {
  /** Own edits since the last snapshot taken here. */
  edits: number;
  /** When this device last uploaded a snapshot of the note (0: not known). */
  lastAt: number;
  /** The first edit since that snapshot (the 10-minute clock when lastAt is not known). */
  firstEditAt: number;
  inFlight: Promise<boolean> | null;
};

export type SnapshotDeps = {
  snapshot: (noteId: string) => Promise<boolean>;
  now: () => number;
  load: (noteId: string) => number;
  save: (noteId: string, at: number) => void;
};

const KEY = (noteId: string) => `ds.snapshotAt.${noteId}`;

export function createSnapshotPolicy(deps: SnapshotDeps) {
  const notes = new Map<string, NoteState>();
  const stateOf = (noteId: string) => {
    let s = notes.get(noteId);
    if (!s)
      notes.set(
        noteId,
        (s = { edits: 0, lastAt: deps.load(noteId), firstEditAt: 0, inFlight: null }),
      );
    return s;
  };

  async function take(noteId: string): Promise<boolean> {
    const s = stateOf(noteId);
    if (s.inFlight) return s.inFlight;
    const editsBefore = s.edits;
    s.inFlight = deps
      .snapshot(noteId)
      .catch(() => false)
      .then((ok) => {
        if (ok) {
          // Edits made while it was uploading still count towards the next one.
          s.edits = Math.max(0, s.edits - editsBefore);
          s.lastAt = deps.now();
          s.firstEditAt = s.edits ? s.lastAt : 0;
          deps.save(noteId, s.lastAt);
        }
        return ok;
      })
      .finally(() => {
        s.inFlight = null;
      });
    return s.inFlight;
  }

  return {
    /** An own edit of the note (a local Y.Doc update). */
    edited(noteId: string): void {
      const s = stateOf(noteId);
      const now = deps.now();
      if (!s.edits) s.firstEditAt = now;
      s.edits++;
      const since = s.lastAt || s.firstEditAt;
      if (now - since >= EDITING_INTERVAL_MS) void take(noteId);
    },
    /** Leaving the note: closed, its tab closed, or the page hidden. */
    left(noteId: string): Promise<boolean> {
      const s = stateOf(noteId);
      const gap = deps.now() - s.lastAt;
      if (s.edits >= LEAVE_MANY_EDITS || (s.edits >= 1 && gap >= LEAVE_GAP_MS)) return take(noteId);
      return Promise.resolve(false);
    },
    /** Before «Оформить» or a voice insert: the state before it (unless that is already the last one). */
    before(noteId: string): Promise<boolean> {
      const s = stateOf(noteId);
      if (s.edits >= 1 || !s.lastAt) return take(noteId);
      return Promise.resolve(false);
    },
    /** For tests. */
    state: (noteId: string) => ({ ...stateOf(noteId) }),
  };
}

const storage = {
  load(noteId: string) {
    try {
      return Number(localStorage.getItem(KEY(noteId))) || 0;
    } catch {
      return 0;
    }
  },
  save(noteId: string, at: number) {
    try {
      localStorage.setItem(KEY(noteId), String(at));
    } catch {
      // Private mode: the policy still works for this session.
    }
  },
};

export const snapshots = createSnapshotPolicy({
  snapshot: (noteId) => runtime().requestSnapshot(noteId),
  now: () => Date.now(),
  ...storage,
});

/** The note open for editing now (dictation inserts into it). */
let active: string | null = null;
export const setActiveNote = (noteId: string | null) => void (active = noteId);
export const activeNote = () => active;
