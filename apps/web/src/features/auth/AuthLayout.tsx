import { Outlet } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/features/shell/Splash";

export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-full items-start justify-center overflow-hidden bg-canvas px-4 pb-16 pt-[10vh] sm:items-center sm:pt-0">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[560px] w-[1100px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: "var(--ds-backdrop-dusk)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full max-w-[400px]"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="mt-5 font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">{t("app.name")}</h1>
          <p className="mt-1.5 text-[15px] text-ink-2">{t("auth.tagline")}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface/90 p-6 shadow-card backdrop-blur-sm sm:p-7">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
