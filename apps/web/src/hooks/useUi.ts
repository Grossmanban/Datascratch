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
};

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
}));

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
