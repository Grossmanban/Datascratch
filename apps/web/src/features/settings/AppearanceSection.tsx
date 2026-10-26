import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { currentLang, setLang } from "@/i18n";
import { setTheme, useTheme } from "@/lib/theme";
import { setSetting, TAB_TIDY_DEFAULT } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { SegmentedControl } from "@/ui";
import { Card, Row } from "./SettingsPage";

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const pref = useTheme((s) => s.pref);
  void i18n.language;
  // Shared across the account (document-model §2): 1 / 7 / 30 days or never; 7 by default.
  const tidy = useWorkspace((s) => {
    const v = s.account.settings.tabTidyDays;
    return v === null ? null : typeof v === "number" ? v : TAB_TIDY_DEFAULT;
  });
  return (
    <Card>
      <Row label={t("settings.theme")}>
        <SegmentedControl
          value={pref}
          onChange={setTheme}
          options={[
            { value: "system", label: <Monitor className="size-3.5" />, title: t("settings.themeSystem") },
            { value: "light", label: <Sun className="size-3.5" />, title: t("settings.themeLight") },
            { value: "dark", label: <Moon className="size-3.5" />, title: t("settings.themeDark") },
          ]}
        />
      </Row>
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
    </Card>
  );
}
