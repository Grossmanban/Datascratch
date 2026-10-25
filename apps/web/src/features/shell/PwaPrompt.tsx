import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/ui";

export function PwaPrompt() {
  const { t } = useTranslation();
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.MODE === "test" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    void import("virtual:pwa-register").then(({ registerSW }) => {
      if (cancelled) return;
      const update = registerSW({
        onNeedRefresh() {
          toast(t("pwa.update"), { duration: 60_000, action: { label: t("pwa.reload"), run: () => void update(true) } });
        },
        onOfflineReady() {
          toast(t("pwa.offlineReady"));
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [t]);
  return null;
}
