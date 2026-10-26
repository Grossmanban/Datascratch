import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { abandonRestore } from "@/auth/session";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--ds-bg-surface)" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke="var(--ds-line-separator)" />
      <path
        d="M18 44c6-2 10-14 16-20s10-4 8 2-10 14-4 16 10-8 12-10"
        fill="none"
        stroke="var(--ds-accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** After this long on the logo, offer a way out instead of waiting forever. */
const SLOW_MS = 8_000;

export function Splash() {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-canvas px-6 text-center" data-testid="splash">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <Logo size={56} />
      </motion.div>
      {slow && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-[340px] flex-col items-center gap-3" role="alert" data-testid="splash-slow">
          <p className="text-[15px] font-semibold text-ink">{t("app.slowTitle")}</p>
          <p className="text-[13.5px] text-ink-2">{t("app.slowText")}</p>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => location.reload()} className="h-9 rounded-lg bg-accent px-4 text-[14px] font-semibold text-white">
              {t("app.retry")}
            </button>
            <button type="button" onClick={() => abandonRestore()} className="h-9 rounded-lg px-4 text-[14px] font-medium text-ink-2 ring-1 ring-line hover:text-ink">
              {t("app.signInAgain")}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
