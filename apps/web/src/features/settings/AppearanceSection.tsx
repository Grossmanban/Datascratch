import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { currentLang, setLang } from "@/i18n";
import { setTheme, useTheme } from "@/lib/theme";
import { SegmentedControl } from "@/ui";
import { Card, Row } from "./SettingsPage";

export function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const pref = useTheme((s) => s.pref);
  void i18n.language;
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
    </Card>
  );
}
