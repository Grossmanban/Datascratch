import { Link, useParams } from "@tanstack/react-router";
import { Activity, Bot, ChevronLeft, ChevronRight, Info, NotebookTabs, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/features/shell/PageHeader";
import { cn } from "@/ui";
import { AboutSection } from "./AboutSection";
import { AccountSection, SecuritySection } from "./AccountSection";
import { AgentsSection } from "./AgentsSection";
import { AppearanceSection } from "./AppearanceSection";
import { DiagnosticsSection } from "./DiagnosticsSection";
import { NotebooksSection } from "./NotebooksSection";

export const SETTINGS_SECTIONS = ["account", "appearance", "sync", "security", "agents", "notebooks", "about"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** Icon and its tint (design-system tint tokens), as in the iOS settings. */
const META: Record<SettingsSection, { icon: ReactNode; tint: string }> = {
  account: { icon: <UserRound />, tint: "blue" },
  appearance: { icon: <Palette />, tint: "purple" },
  sync: { icon: <Activity />, tint: "green" },
  security: { icon: <ShieldCheck />, tint: "orange" },
  agents: { icon: <Bot />, tint: "indigo" },
  notebooks: { icon: <NotebookTabs />, tint: "teal" },
  about: { icon: <Info />, tint: "gray" },
};

/**
 * Settings (spec/10): a left list of sections and the open section beside it. On a phone the
 * list is a screen of its own (/settings) and a section opens over it with a way back.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as { section?: SettingsSection };
  const section = params.section;
  const shown: SettingsSection = section ?? "account";
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="settings" data-section={shown}>
      <TopBar className="md:hidden">
        {section ? (
          <Link
            to="/settings"
            className="-ml-1 flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium text-accent focus-visible:focus-ring"
            data-testid="settings-back"
          >
            <ChevronLeft className="size-5" />
            {t("prefs.back")}
          </Link>
        ) : (
          <span className="font-medium text-ink">{t("prefs.title")}</span>
        )}
      </TopBar>
      <div className="flex min-h-0 flex-1">
        <SettingsNav current={section ? shown : undefined} desktopCurrent={shown} />
        <main
          className={cn("scrollbar-thin min-w-0 flex-1 overflow-y-auto bg-canvas", !section && "hidden md:block")}
          aria-labelledby="settings-section-title"
        >
          <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-5 sm:px-8 md:pt-12">
            <header className="mb-7">
              <h1 id="settings-section-title" className="font-display text-[28px] font-semibold leading-tight tracking-[-0.015em] text-ink">
                {t(`prefs.nav.${shown}`)}
              </h1>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{t(`prefs.desc.${shown}`)}</p>
            </header>
            <div className="flex flex-col gap-5" data-testid={`settings-${shown}`}>
              {shown === "account" && <AccountSection />}
              {shown === "appearance" && <AppearanceSection />}
              {shown === "sync" && <DiagnosticsSection />}
              {shown === "security" && <SecuritySection />}
              {shown === "agents" && <AgentsSection />}
              {shown === "notebooks" && <NotebooksSection />}
              {shown === "about" && <AboutSection />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** The section list. Arrow keys move between sections, Home/End jump to the ends. */
function SettingsNav({ current, desktopCurrent }: { current?: SettingsSection; desktopCurrent: SettingsSection }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    const links = [...(ref.current?.querySelectorAll<HTMLAnchorElement>("a[data-section]") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    links[(next + links.length) % links.length]!.focus();
  };
  return (
    <aside
      className={cn(
        "scrollbar-thin w-full shrink-0 overflow-y-auto border-line bg-canvas md:w-[272px] md:border-r md:bg-[color-mix(in_srgb,var(--ds-bg-sidebar)_55%,var(--ds-bg-canvas))]",
        current ? "hidden md:block" : "block",
      )}
    >
      <div className="px-4 pb-6 pt-4 md:px-3 md:pt-10">
        <h2 className="hidden px-3 pb-4 font-display text-[22px] font-semibold tracking-[-0.01em] text-ink md:block">{t("prefs.title")}</h2>
        <nav
          ref={ref}
          aria-label={t("prefs.title")}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-0.5 overflow-hidden rounded-xl border border-line bg-surface shadow-card md:rounded-none md:border-0 md:bg-transparent md:shadow-none"
          data-testid="settings-nav"
        >
          {SETTINGS_SECTIONS.map((id, i) => {
            const active = id === desktopCurrent;
            return (
              <Link
                key={id}
                to="/settings/$section"
                params={{ section: id }}
                data-section={id}
                aria-current={id === current || (!current && active) ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-[52px] items-center gap-3 px-3 py-1.5 text-[15px] leading-snug outline-none transition-colors md:min-h-10 md:rounded-lg md:text-[14px]",
                  "focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-inset",
                  i > 0 && "border-t border-line md:border-t-0",
                  active
                    ? "md:bg-surface md:font-medium md:text-ink md:shadow-[0_0_0_0.5px_var(--ds-line-separator),0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-ink md:text-ink-2 md:hover:bg-ink/[0.045] md:hover:text-ink",
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-[8px] md:size-6 md:rounded-[7px] [&>svg]:size-4 md:[&>svg]:size-[14px]"
                  style={{ background: `var(--ds-tint-${META[id].tint}-bg)`, color: `var(--ds-tint-${META[id].tint}-fg)` }}
                  aria-hidden
                >
                  {META[id].icon}
                </span>
                <span className="min-w-0 flex-1">{t(`prefs.nav.${id}`)}</span>
                <ChevronRight className="size-4 text-ink-3 md:hidden" aria-hidden />
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/** A settings card: surface, hairline, soft shadow; optional title, description and action. */
export function Card({
  title,
  description,
  children,
  action,
  tone,
  testId,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "danger";
  testId?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-surface p-5 shadow-card sm:p-6",
        tone === "danger" ? "border-[color-mix(in_srgb,var(--ds-danger)_28%,var(--ds-line-separator))]" : "border-line",
      )}
      data-testid={testId}
    >
      {(title || action) && (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className={cn("text-[15.5px] font-semibold tracking-[-0.005em]", tone === "danger" ? "text-danger" : "text-ink")}>{title}</h2>}
            {description && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children && <div className={cn(title && "mt-4")}>{children}</div>}
    </section>
  );
}

/** A labelled row inside a card; rows are separated by hairlines. */
export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-[180px]">
        <div className="text-[14.5px] text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
