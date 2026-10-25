import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { LocaleContext, type Locale } from "./lib/i18n";
import { ThemeProvider, type ThemePreference } from "./lib/theme";
import { ToastProvider } from "./components/Toast";
import { TooltipProvider } from "./components/Tooltip";

export interface UIProviderProps {
  children: ReactNode;
  locale?: Locale;
  /** Manage `data-theme` on <html>. Omit to leave theming to the app. */
  theme?: ThemePreference;
  onThemeChange?: (p: ThemePreference) => void;
}

/** Root provider: locale, reduced motion, tooltips, toasts and (optionally) theme. */
export function UIProvider({ children, locale = "ru", theme, onThemeChange }: UIProviderProps) {
  const inner = (
    <LocaleContext.Provider value={locale}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={500} skipDelayDuration={200}>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </MotionConfig>
    </LocaleContext.Provider>
  );
  return theme ? (
    <ThemeProvider
      defaultPreference={theme}
      {...(onThemeChange ? { onChange: onThemeChange } : {})}
    >
      {inner}
    </ThemeProvider>
  ) : (
    inner
  );
}
