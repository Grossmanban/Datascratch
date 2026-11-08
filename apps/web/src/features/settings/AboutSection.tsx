import { Copy, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@/config";
import { Logo } from "@/features/shell/Splash";
import { IconButton, Kbd, toast } from "@/ui";
import { browserInfo } from "./diagnostics";
import { Card, Row } from "./SettingsPage";

const BUILD = (import.meta.env.VITE_APP_BUILD as string | undefined) ?? null;
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl";

/** «О приложении» (spec/10): the mark, version, browser, shortcuts. */
export function AboutSection() {
  const { t } = useTranslation();
  const b = browserInfo();
  const versionLine = `Datascratch web ${APP_VERSION}${BUILD ? ` (${BUILD})` : ""} · ${b.name} ${b.version} · ${b.os}`;
  return (
    <>
      <Card>
        <div className="flex flex-col items-center py-4 text-center">
          <Logo size={64} />
          <h2 className="mt-4 font-display text-[24px] font-semibold tracking-[-0.015em] text-ink">{t("app.name")}</h2>
          <p className="mt-1 text-[14px] text-ink-2">{t("prefs.about.tagline")}</p>
          <p className="mt-3 rounded-full bg-ink/[0.05] px-3 py-1 font-mono text-[12px] text-ink-2" data-testid="about-version">
            {t("settings.version", { version: APP_VERSION })}
          </p>
        </div>
      </Card>
      <Card>
        <Row label={t("prefs.about.version")} hint={t("prefs.about.platform")}>
          <span className="flex items-center gap-1">
            <span className="font-mono text-[13px] text-ink-2">{APP_VERSION}</span>
            <IconButton
              label={t("common.copy")}
              size="sm"
              onClick={() =>
                void navigator.clipboard.writeText(versionLine).then(
                  () => toast(t("common.copied")),
                  () => undefined,
                )
              }
            >
              <Copy className="size-3.5" />
            </IconButton>
          </span>
        </Row>
        {BUILD && (
          <Row label={t("prefs.about.build")}>
            <span className="font-mono text-[13px] text-ink-2">{BUILD}</span>
          </Row>
        )}
        <Row label={t("prefs.about.browser")}>
          <span className="text-[13.5px] text-ink-2">
            {b.name} {b.version} · {b.os}
          </span>
        </Row>
      </Card>
      <Card title={t("prefs.about.shortcuts")}>
        {(
          [
            [t("prefs.about.shortcutPalette"), [MOD, "K"]],
            [t("prefs.about.shortcutSettings"), [MOD, ","]],
            [t("prefs.about.shortcutSidebar"), [MOD, "\\"]],
            [t("prefs.about.shortcutTheme"), [MOD, "⇧", "L"]],
          ] as const
        ).map(([label, keys]) => (
          <Row key={label} label={label}>
            <span className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </Row>
        ))}
      </Card>
      <p className="flex items-start justify-center gap-2 px-6 text-center text-[12.5px] leading-relaxed text-ink-2">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {t("prefs.about.privacy")}
      </p>
    </>
  );
}
