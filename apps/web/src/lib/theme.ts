import { create } from "zustand";

export type ThemePref = "system" | "light" | "dark";

function read(): ThemePref {
  try {
    const v = localStorage.getItem("ds.theme");
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // ignore
  }
  return "system";
}

export const useTheme = create<{ pref: ThemePref; resolved: "light" | "dark" }>(() => ({ pref: read(), resolved: "light" }));

const media = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;

function apply() {
  const { pref } = useTheme.getState();
  const resolved = pref === "system" ? (media?.matches ? "dark" : "light") : pref;
  const root = document.documentElement;
  // A real switch (not the first paint): hover transitions on backgrounds would otherwise fade the
  // old colour out over ~150 ms (styles/index.css turns them off while this attribute is set).
  if (root.dataset.theme && root.dataset.theme !== resolved) {
    root.dataset.themeSwitching = "";
    requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.themeSwitching));
  }
  root.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#1A1917" : "#FAF8F4");
  if (useTheme.getState().resolved !== resolved) useTheme.setState({ resolved });
}

export function initTheme() {
  apply();
  media?.addEventListener?.("change", apply);
}

export function setTheme(pref: ThemePref) {
  try {
    localStorage.setItem("ds.theme", pref);
  } catch {
    // ignore
  }
  useTheme.setState({ pref });
  apply();
}

export function toggleTheme() {
  setTheme(useTheme.getState().resolved === "dark" ? "light" : "dark");
}
