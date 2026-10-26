import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/ui";

/**
 * A toast that appears while a dialog or menu is open becomes the top layer and takes Escape away
 * from it; informational toasts wait until nothing modal is open.
 */
function whenNothingModal(fn: () => void) {
  const busy = () => !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]');
  if (!busy()) return fn();
  const timer = setInterval(() => {
    if (busy()) return;
    clearInterval(timer);
    fn();
  }, 500);
}

export function PwaPrompt() {
  const { t } = useTranslation();
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.MODE === "test" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    void import("virtual:pwa-register").then(({ registerSW }) => {
      if (cancelled) return;
      const update = registerSW({
        onNeedRefresh() {
          whenNothingModal(() => toast(t("pwa.update"), { duration: 60_000, action: { label: t("pwa.reload"), run: () => void update(true) } }));
        },
        onOfflineReady() {
          whenNothingModal(() => toast(t("pwa.offlineReady")));
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [t]);
  return null;
}
