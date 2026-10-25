import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeState {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const query = "(prefers-color-scheme: dark)";
const systemDark = () => typeof window !== "undefined" && window.matchMedia?.(query).matches === true;

/**
 * Applies `data-theme` on <html>. "system" removes it, so tokens.css follows
 * prefers-color-scheme without a flash.
 */
export function ThemeProvider({
  children,
  defaultPreference = "system",
  onChange,
}: {
  children: ReactNode;
  defaultPreference?: ThemePreference;
  onChange?: (p: ThemePreference) => void;
}) {
  const [preference, setPref] = useState<ThemePreference>(defaultPreference);
  const [dark, setDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (preference === "system") delete el.dataset.theme;
    else el.dataset.theme = preference;
  }, [preference]);

  const setPreference = useCallback(
    (p: ThemePreference) => {
      setPref(p);
      onChange?.(p);
    },
    [onChange],
  );

  const resolved = preference === "system" ? (dark ? "dark" : "light") : preference;
  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider> (or <UIProvider theme>)");
  return ctx;
}
