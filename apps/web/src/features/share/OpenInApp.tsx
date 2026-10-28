import { Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { appUrl, isAppleMobile, openInApp, type AppTarget } from "@/lib/appLink";
import { cn, toast } from "@/ui";

/**
 * «Открыть в приложении» — only on iPhone/iPad. Opens the iOS app by its scheme; without the app
 * nothing happens for ~1.5 s, then a calm note says the page keeps working here.
 */
export function OpenInApp({ target, className, compact }: { target: AppTarget; className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  if (!isAppleMobile()) return null;
  return (
    <a
      href={appUrl(target)}
      onClick={(e) => {
        e.preventDefault();
        openInApp(appUrl(target), () => toast(t("openInApp.missing")));
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent font-medium text-white shadow-sm transition active:scale-[0.97]",
        compact ? "h-7 px-3 text-[12.5px]" : "h-11 w-full px-4 text-[15px]",
        className,
      )}
      data-testid="open-in-app"
    >
      <Smartphone className={compact ? "size-3.5" : "size-4"} />
      {t("openInApp.button")}
    </a>
  );
}
