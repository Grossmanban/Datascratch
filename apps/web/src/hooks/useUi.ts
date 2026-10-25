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
  shareFor: { kind: "note" | "notebook"; id: string } | null;
  historyFor: string | null;
  /** Note whose cover dialog is open (spec/12 §12.7). */
  coverFor: string | null;
  newNotebookFor: string | null;
  docView: "grid" | "list";
  sort: "updated" | "created" | "title";
  /** Full-screen ("focus") per kind of screen: no sidebar; remembered on this device. */
  focus: Record<FocusKind, boolean>;
};

export type FocusKind = "doc" | "calendar" | "tasks";
const FOCUS_KINDS: FocusKind[] = ["doc", "calendar", "tasks"];

export const useUi = create<UiState>(() => ({
  sidebarOpen: readBool("ds.sidebar", true),
  mobileNavOpen: false,
  paletteOpen: false,
  shareFor: null,
  historyFor: null,
  coverFor: null,
  newNotebookFor: null,
  docView: (() => {
    try {
      return localStorage.getItem("ds.docView") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  })(),
  sort: "updated",
  focus: Object.fromEntries(FOCUS_KINDS.map((k) => [k, readBool(`ds.focus.${k}`, false)])) as Record<FocusKind, boolean>,
}));

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
