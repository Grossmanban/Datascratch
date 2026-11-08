import { tokens } from "@datascratch/design-tokens";
import { Check } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { currentLang, setLang } from "@/i18n";
import { setTheme, useTheme, type ThemePref } from "@/lib/theme";
import { setSetting, TAB_TIDY_DEFAULT } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { cn, SegmentedControl } from "@/ui";
import { Card, Row } from "./SettingsPage";
import { features } from "@/lib/features";

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  void i18n.language;
  // Shared across the account (document-model §2): 1 / 7 / 30 days or never; 7 by default.
  const tidy = useWorkspace((s) => {
    const v = s.account.settings.tabTidyDays;
    return v === null ? null : typeof v === "number" ? v : TAB_TIDY_DEFAULT;
  });
  return (
    <>
      <Card title={t("settings.theme")} description={t("prefs.appearance.themeHint")}>
        <ThemePicker />
      </Card>
      <Card>
        <Row label={t("settings.language")}>
          <SegmentedControl
            value={currentLang()}
            onChange={setLang}
            options={[
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
          />
        </Row>
        {features.tabs && (
          <Row label={t("tabs.tidy")} hint={t("tabs.tidyHint")}>
            <SegmentedControl
              value={String(tidy)}
              onChange={(v) => setSetting("tabTidyDays", v === "null" ? null : Number(v))}
              options={[
                { value: "1", label: t("tabs.tidy1") },
                { value: "7", label: t("tabs.tidy7") },
                { value: "30", label: t("tabs.tidy30") },
                { value: "null", label: t("tabs.tidyNever") },
              ]}
            />
          </Row>
        )}
      </Card>
    </>
  );
}

const THEMES: ThemePref[] = ["light", "dark", "system"];

/** Three small previews of the app (a radio group: arrows move, Space/Enter choose). */
function ThemePicker() {
  const { t } = useTranslation();
  const pref = useTheme((s) => s.pref);
  const ref = useRef<HTMLDivElement>(null);
  const label = (p: ThemePref) => t(p === "system" ? "settings.themeSystem" : p === "light" ? "settings.themeLight" : "settings.themeDark");
  const onKeyDown = (e: KeyboardEvent) => {
    const i = THEMES.indexOf(pref);
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = THEMES[(i + d + THEMES.length) % THEMES.length]!;
    setTheme(next);
    ref.current?.querySelector<HTMLButtonElement>(`[data-theme-choice="${next}"]`)?.focus();
  };
  return (
    <div ref={ref} role="radiogroup" aria-label={t("settings.theme")} onKeyDown={onKeyDown} className="grid grid-cols-3 gap-3" data-testid="theme-picker">
      {THEMES.map((p) => {
        const on = pref === p;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-theme-choice={p}
            onClick={() => setTheme(p)}
            className="group flex flex-col items-stretch gap-2 rounded-xl text-left outline-none"
          >
            <span
              className={cn(
                "relative block aspect-[4/3] overflow-hidden rounded-xl border transition-[box-shadow,border-color]",
                on
                  ? "border-[var(--ds-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-accent)_22%,transparent)]"
                  : "border-line group-hover:border-[color-mix(in_srgb,var(--ds-text-tertiary)_60%,transparent)]",
                "group-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-accent)_40%,transparent)]",
              )}
            >
              {p === "system" ? (
                <>
                  <Preview scheme="light" />
                  <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                    <Preview scheme="dark" />
                  </span>
                </>
              ) : (
                <Preview scheme={p} />
              )}
              {on && (
                <span className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--ds-accent)] text-[var(--ds-text-on-accent)]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={cn("px-0.5 text-[13px]", on ? "font-medium text-ink" : "text-ink-2")}>{label(p)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A miniature of the app in one scheme (that scheme's token values, whatever the current theme). */
function Preview({ scheme }: { scheme: "light" | "dark" }) {
  const k = tokens.color;
  const c = {
    canvas: k["bg.canvas"][scheme],
    sidebar: k["bg.sidebar"][scheme],
    surface: k["bg.surface"][scheme],
    line: k["line.separator"][scheme],
    ink: k["text.primary"][scheme],
    soft: k["line.separator"][scheme],
    accent: k.accent[scheme],
  };
  return (
    <span className="absolute inset-0 flex" style={{ background: c.canvas }} data-theme-sample={scheme} aria-hidden>
      <span className="flex w-[30%] flex-col gap-[6%] p-[6%]" style={{ background: c.sidebar, borderRight: `1px solid ${c.line}` }}>
        <span className="h-[7%] w-[70%] rounded-full" style={{ background: c.ink, opacity: 0.7 }} />
        <span className="h-[6%] w-[85%] rounded-full" style={{ background: c.soft }} />
        <span className="h-[6%] w-[60%] rounded-full" style={{ background: c.soft }} />
        <span className="h-[6%] w-[75%] rounded-full" style={{ background: c.soft }} />
      </span>
      <span className="flex flex-1 flex-col gap-[7%] p-[8%]">
        <span className="h-[9%] w-[55%] rounded-full" style={{ background: c.ink, opacity: 0.85 }} />
        <span className="flex flex-1 flex-col gap-[10%] rounded-[6px] p-[8%]" style={{ background: c.surface, border: `1px solid ${c.line}` }}>
          <span className="h-[12%] w-[80%] rounded-full" style={{ background: c.soft }} />
          <span className="h-[12%] w-[65%] rounded-full" style={{ background: c.soft }} />
          <span className="h-[12%] w-[40%] rounded-full" style={{ background: c.accent }} />
        </span>
      </span>
    </span>
  );
}
