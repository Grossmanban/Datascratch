import { Link, useParams } from "@tanstack/react-router";
import { Bot, NotebookTabs, Palette, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PageTitle, TopBar } from "@/features/shell/PageHeader";
import { APP_VERSION } from "@/config";
import { cn } from "@/ui";
import { AccountSection } from "./AccountSection";
import { AgentsSection } from "./AgentsSection";
import { AppearanceSection } from "./AppearanceSection";
import { NotebooksSection } from "./NotebooksSection";

export type SettingsSection = "account" | "notebooks" | "agents" | "appearance";

const SECTIONS: { id: SettingsSection; icon: ReactNode }[] = [
  { id: "account", icon: <UserRound className="size-4" /> },
  { id: "notebooks", icon: <NotebookTabs className="size-4" /> },
  { id: "agents", icon: <Bot className="size-4" /> },
  { id: "appearance", icon: <Palette className="size-4" /> },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const { section } = useParams({ from: "/app/settings/$section" });
  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <TopBar>
        <nav className="flex min-w-0 gap-0.5 overflow-x-auto">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to="/settings/$section"
              params={{ section: s.id }}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                s.id === section ? "bg-ink/[0.07] font-medium text-ink" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
              )}
            >
              {s.icon}
              <span className={cn(s.id !== section && "hidden sm:inline")}>{t(`settings.${s.id}`)}</span>
            </Link>
          ))}
        </nav>
      </TopBar>
      <div className="mx-auto max-w-[720px] pb-24">
        <PageTitle title={t(`settings.${section}`)} />
        <div className="flex flex-col gap-6 px-4 sm:px-10">
          {section === "account" && <AccountSection />}
          {section === "notebooks" && <NotebooksSection />}
          {section === "agents" && <AgentsSection />}
          {section === "appearance" && <AppearanceSection />}
          <p className="pt-6 text-center text-[12px] text-ink-3">{t("settings.version", { version: APP_VERSION })}</p>
        </div>
      </div>
    </div>
  );
}

export function Card({ title, description, children, action }: { title?: ReactNode; description?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(40_30_10/0.04)]">
      {(title || action) && (
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children && <div className={cn(title && "mt-4")}>{children}</div>}
    </section>
  );
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] text-ink-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
