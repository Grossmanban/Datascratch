import "./lib/zodConfig";
import "@datascratch/ui/fonts.css";
import "./styles/index.css";
import "./i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { initTheme } from "./lib/theme";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// Every module of the app shell arrived: the boot watchdog (public/boot-guard.js) stands down.
(window as unknown as { __dsBootOk?: () => void }).__dsBootOk?.();
