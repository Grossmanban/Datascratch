import { create } from "zustand";

function readBool(key: string, def: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v === "1";
  } catch {
    return def;
  }
}

type UiState = {
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  paletteOpen: boolean;
  /** The tab overview (spec/12 §12.6): «+N», ⌘⇧\\ or the tab count on a phone. */
  tabOverviewOpen: boolean;
  shareFor: { kind: "note" | "notebook"; id: string } | null;
  /** «Участники пространства» of a shared space (D-62). */
  spaceMembersFor: string | null;
  /** Incoming invitations dialog (D-54); a string highlights that invitation (/invite/:id). */
  invitationsOpen: boolean | string;
  /** Bumped when keys of a shared resource changed (D-54): views holding a key or a link re-read them. */
  keysChangedAt: number;
  historyFor: string | null;
  /** Note whose cover dialog is open (spec/12 §12.7). */
  coverFor: string | null;
  newNotebookFor: string | null;
  docView: "grid" | "list";
  sort: "updated" | "created" | "title";
  /** Full-screen ("focus") per kind of screen: no sidebar; remembered on this device. */
  focus: Record<FocusKind, boolean>;
  /** The pen palette is folded into a round button at the edge (as on iOS); remembered. */
  penPaletteCollapsed: boolean;
};

export type FocusKind = "doc" | "calendar" | "tasks";
const FOCUS_KINDS: FocusKind[] = ["doc", "calendar", "tasks"];

export const useUi = create<UiState>(() => ({
  sidebarOpen: readBool("ds.sidebar", true),
  mobileNavOpen: false,
  paletteOpen: false,
  tabOverviewOpen: false,
  shareFor: null,
  spaceMembersFor: null,
  invitationsOpen: false,
  keysChangedAt: 0,
  historyFor: null,
  coverFor: null,
  newNotebookFor: null,
  docView: (() => {
    try {
      // D-61 «Плотнее»: rows by default; cards stay one click away in «Вид» (and are remembered).
      return localStorage.getItem("ds.docView") === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  })(),
  sort: "updated",
  focus: Object.fromEntries(FOCUS_KINDS.map((k) => [k, readBool(`ds.focus.${k}`, false)])) as Record<FocusKind, boolean>,
  penPaletteCollapsed: readBool("ds.penPalette.collapsed", false),
}));

export function togglePenPalette() {
  const next = !useUi.getState().penPaletteCollapsed;
  try {
    localStorage.setItem("ds.penPalette.collapsed", next ? "1" : "0");
  } catch {
    // ignore
  }
  useUi.setState({ penPaletteCollapsed: next });
}

/** Which full-screen-capable screen a path is, if any. */
export function focusKindOf(pathname: string): FocusKind | null {
  if (pathname.startsWith("/doc/")) return "doc";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/tasks")) return "tasks";
  return null;
}

export function toggleFocus(kind: FocusKind) {
  const next = !useUi.getState().focus[kind];
  try {
    localStorage.setItem(`ds.focus.${kind}`, next ? "1" : "0");
  } catch {
    // ignore
  }
  useUi.setState((s) => ({ focus: { ...s.focus, [kind]: next } }));
}

export function toggleSidebar() {
  const next = !useUi.getState().sidebarOpen;
  try {
    localStorage.setItem("ds.sidebar", next ? "1" : "0");
  } catch {
    // ignore
  }
  useUi.setState({ sidebarOpen: next });
}

export function setDocView(v: "grid" | "list") {
  try {
    localStorage.setItem("ds.docView", v);
  } catch {
    // ignore
  }
  useUi.setState({ docView: v });
}
