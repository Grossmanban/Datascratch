import { useTranslation } from "react-i18next";
import { setSetting } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { VOICE_SETTINGS } from "@/features/voice/dictation";
import { SegmentedControl } from "@/ui";
import { Card, Row } from "./SettingsPage";

/** Settings → «Голос» (D-65): quality and profanity, the same keys as on iOS (account settings). */
export function VoiceSection() {
  const { t } = useTranslation();
  const quality = useWorkspace((s) => (s.account.settings[VOICE_SETTINGS.quality] === "fast" ? "fast" : "best"));
  const profanity = useWorkspace((s) => (s.account.settings[VOICE_SETTINGS.profanity] === "keep" ? "keep" : "mask"));
  return (
    <Card description={t("voice.settingsHint")}>
      <Row label={t("voice.quality")}>
        <SegmentedControl
          value={quality}
          onChange={(v) => setSetting(VOICE_SETTINGS.quality, v)}
          options={[
            { value: "best", label: t("voice.qualityBest") },
            { value: "fast", label: t("voice.qualityFast") },
          ]}
        />
      </Row>
      <Row label={t("voice.profanity")}>
        <SegmentedControl
          value={profanity}
          onChange={(v) => setSetting(VOICE_SETTINGS.profanity, v)}
          options={[
            { value: "mask", label: t("voice.profanityMask") },
            { value: "keep", label: t("voice.profanityKeep") },
          ]}
        />
      </Row>
    </Card>
  );
}
