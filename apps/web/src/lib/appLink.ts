// «Открыть в приложении» (iPhone/iPad): links into the iOS app's custom scheme that mirror the
// web routes, with the server they belong to. The guest key stays in the fragment, as on the web.
import { serverOrigin } from "@/config";

/** iPhone, iPod or iPad — iPadOS reports itself as a Mac, so a touch-capable «Mac» counts too. */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return true;
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

/** Host (with a non-default port) of this app's server, as the `server` parameter. */
export function serverParam(): string {
  return encodeURIComponent(new URL(serverOrigin()).host);
}

export type AppTarget =
  | { kind: "invite"; id: string }
  | { kind: "share"; id: string; key: string }
  | { kind: "note"; id: string }
  | { kind: "notebook"; id: string };

export function appUrl(t: AppTarget): string {
  const base = `ds://${t.kind}/${encodeURIComponent(t.id)}?server=${serverParam()}`;
  return t.kind === "share" ? `${base}#k=${t.key}` : base;
}

/**
 * Hand the link to iOS. If the app is installed the page goes to the background (visibility
 * hidden / pagehide); if nothing happens within `waitMs` the app is not there — `onMissing` runs
 * and the page simply stays as it was.
 */
export function openInApp(url: string, onMissing: () => void, waitMs = 1500): () => void {
  let left = false;
  const away = () => {
    if (document.visibilityState === "hidden") left = true;
  };
  const gone = () => {
    left = true;
  };
  document.addEventListener("visibilitychange", away);
  window.addEventListener("pagehide", gone);
  window.addEventListener("blur", gone);
  const timer = setTimeout(() => {
    cleanup();
    if (!left) onMissing();
  }, waitMs);
  function cleanup() {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", away);
    window.removeEventListener("pagehide", gone);
    window.removeEventListener("blur", gone);
  }
  window.location.href = url;
  return cleanup;
}
