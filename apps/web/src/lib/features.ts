// The one place that decides which features this build shows (D-51).
//
// By default the app is notes only (KISS): spaces, notebooks, folders, notes, tags, starred,
// search, tabs (D-51 amendment 2026-11-02), the editor with the pen, sharing and agents. Tasks
// (screen, Inbox, task dates), Calendar and daily notes are the «extended mode»: their code stays
// compiled and tested, and is shown only in a build made with VITE_DS_EXTENDED_MODE=1. The data
// they wrote (task dates) is kept as is; a minimal build never writes it.

const flag = String(import.meta.env.VITE_DS_EXTENDED_MODE ?? "").toLowerCase();

export const extendedMode = flag === "1" || flag === "true" || flag === "yes";

export const features = {
  /** «Задачи» (Inbox / Today / Upcoming / All), task dates and rescheduling. */
  tasks: extendedMode,
  /** «Календарь» and daily notes. */
  calendar: extendedMode,
  /** The tab strip, the tab overview, «open in a tab» and the tab keys in the account document.
   *  On in every build since the owner asked for tabs back (D-51 amendment 2026-11-02). */
  tabs: true,
} as const;
