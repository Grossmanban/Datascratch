import { Menu, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/useMedia";
import { toggleSidebar, useUi } from "@/hooks/useUi";
import { cn, IconButton } from "@/ui";

/** Top bar of every page: sidebar toggle, breadcrumbs/title, actions. Glassy when content scrolls under it. */
export function TopBar({ children, actions, className }: { children?: ReactNode; actions?: ReactNode; className?: string }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  return (
    <header className={cn("glass sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 px-3 sm:px-4", className)}>
      {isMobile ? (
        <IconButton label={t("nav.expandSidebar")} onClick={() => useUi.setState({ mobileNavOpen: true })} data-testid="mobile-menu">
          <Menu className="size-[18px]" />
        </IconButton>
      ) : (
        !sidebarOpen && (
          <IconButton label={t("nav.expandSidebar")} onClick={toggleSidebar}>
            <PanelLeftOpen className="size-[18px]" />
          </IconButton>
        )
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13.5px] text-ink-2">{children}</div>
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </header>
  );
}

export function PageTitle({ icon, title, subtitle, children }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 px-5 pb-5 pt-8 sm:px-10 sm:pt-12">
      <div className="min-w-0 flex-1">
        {icon && <div className="mb-3 text-[34px] leading-none">{icon}</div>}
        <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[38px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[14px] text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
