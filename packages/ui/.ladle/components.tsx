import type { GlobalProvider } from "@ladle/react";
import { useEffect } from "react";
import { UIProvider } from "../src";
import "../src/fonts.css";
import "../src/styles.css";

// Ladle's theme addon toggles light/dark; mirror it onto data-theme for the tokens.
export const Provider: GlobalProvider = ({ children, globalState }) => {
  useEffect(() => {
    document.documentElement.dataset.theme = globalState.theme === "dark" ? "dark" : "light";
  }, [globalState.theme]);
  return (
    <UIProvider>
      <div className="min-h-screen bg-canvas p-8 font-text text-body text-fg">{children}</div>
    </UIProvider>
  );
};
