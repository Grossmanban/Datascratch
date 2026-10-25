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
      {/* Inline styles: Tailwind only scans src/, not .ladle/. */}
      <div
        style={{
          minHeight: "100vh",
          padding: 32,
          background: "var(--ds-bg-canvas)",
          color: "var(--ds-text-primary)",
          fontSize: 17,
        }}
      >
        {children}
      </div>
    </UIProvider>
  );
};
