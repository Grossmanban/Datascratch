import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { setSetting } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { minutesLeft, useVoiceAccess } from "@/features/voice/access";
import { VOICE_SETTINGS } from "@/features/voice/dictation";
import { DEFAULT_VOICE_MONTHLY_MINUTES, voiceApi, type AdminVoicePut, type AdminVoiceRow } from "@/features/voice/voiceApi";
import { colorFor } from "@/data/presence";
import { SegmentedControl, Switch, toast } from "@/ui";
import { Card, Row } from "./SettingsPage";

/** Settings → «Голос» (D-65): quality, profanity and what is left; for the server admin, who may use it. */
export function VoiceSection() {
  const { t } = useTranslation();
  const quality = useWorkspace((s) => (s.account.settings[VOICE_SETTINGS.quality] === "best" ? "best" : "standard"));
  const profanity = useWorkspace((s) => (s.account.settings[VOICE_SETTINGS.profanity] === "keep" ? "keep" : "soften"));
  const me = useVoiceAccess((s) => s.me);
  return (
    <>
      <Card description={t("voice.settingsHint")}>
        {me && (
          <p className="px-1 pb-2 text-[14px] font-medium text-ink" data-testid="voice-left">
            {me.available === false ? t("voice.error.unavailable") : me.enabled ? t("voice.left", { minutes: minutesLeft(me) }) : t("voice.offHere")}
          </p>
        )}
        <Row label={t("voice.quality")} hint={t("voice.qualityHint")}>
          <SegmentedControl
            value={quality}
            onChange={(v) => setSetting(VOICE_SETTINGS.quality, v)}
            options={[
              { value: "standard", label: t("voice.qualityStandard") },
              { value: "best", label: t("voice.qualityBest") },
            ]}
          />
        </Row>
        <Row label={t("voice.profanity")}>
          <SegmentedControl
            value={profanity}
            onChange={(v) => setSetting(VOICE_SETTINGS.profanity, v)}
            options={[
              { value: "soften", label: t("voice.profanitySoften") },
              { value: "keep", label: t("voice.profanityKeep") },
            ]}
          />
        </Row>
      </Card>
      <AdminVoice />
    </>
  );
}

const PRESETS = [60, 300, 600, 1200];
const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(0)}`;

/**
 * «Кто может пользоваться» (server admin only; `isAdmin` in /voice/me, else the 403 of the list says
 * no). Names are encrypted on the server: the email is shown, a name only when the server has one.
 */
function AdminVoice() {
  const { t } = useTranslation();
  const isAdmin = useVoiceAccess((s) => s.me?.isAdmin);
  const list = useQuery({
    queryKey: ["admin-voice"],
    queryFn: voiceApi.adminList,
    enabled: isAdmin !== false,
    retry: false,
    staleTime: 0,
  });
  if (isAdmin === false) return null;
  if (list.error instanceof ApiError && (list.error.status === 403 || list.error.status === 404)) return null;
  if (!list.data) return null;
  const { totals } = list.data;
  return (
    <Card title={t("voice.admin.title")} description={t("voice.admin.hint")}>
      <p className="px-1 pb-2 text-[13.5px] font-medium text-ink-2" data-testid="admin-voice-total">
        {t("voice.admin.total", { minutes: Math.round(totals.usedMinutes), cost: usd(totals.costUsd) })}
      </p>
      <ul className="flex flex-col divide-y divide-line" data-testid="admin-voice">
        {list.data.accounts.map((a) => (
          <AdminRow key={a.userId} account={a} />
        ))}
      </ul>
    </Card>
  );
}

function AdminRow({ account }: { account: AdminVoiceRow }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  // Empty = the default limit; a number = this account's own (customMinutes).
  const custom = account.customMinutes ? account.monthlyMinutes : null;
  const fallback = account.admin ? DEFAULT_VOICE_MONTHLY_MINUTES.admin : DEFAULT_VOICE_MONTHLY_MINUTES.others;
  const [limit, setLimit] = useState(custom == null ? "" : String(custom));
  const save = useMutation({
    mutationFn: (body: AdminVoicePut) => voiceApi.adminPut(account.userId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-voice"] }),
    onError: () => toast(t("voice.admin.failed"), { tone: "danger" }),
  });
  const commitLimit = (raw: string) => {
    const n = raw.trim() === "" ? null : Math.max(0, Math.min(100_000, Math.round(Number(raw) || 0)));
    setLimit(n == null ? "" : String(n));
    if (n !== custom) save.mutate({ enabled: account.enabled, monthlyMinutes: n });
  };
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 py-3" data-testid="admin-voice-row" data-email={account.email}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
        style={{ background: colorFor(account.email) }}
        aria-hidden
      >
        {(account.name || account.email)[0]?.toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-ink">{account.name || account.email}</span>
        <span className="truncate text-[12.5px] text-ink-3">
          {account.name ? `${account.email} · ` : ""}
          {t("voice.admin.used", { used: Math.round(account.usedMinutes), limit: account.monthlyMinutes, cost: usd(account.costUsd) })}
        </span>
      </span>
      <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
        <span className="sr-only">{t("voice.admin.limit")}</span>
        <input
          type="number"
          min={0}
          max={100000}
          step={60}
          list="voice-presets"
          value={limit}
          placeholder={String(fallback)}
          title={t("voice.admin.defaultHint")}
          onChange={(e) => setLimit(e.target.value)}
          onBlur={(e) => commitLimit(e.target.value)}
          // Enter takes the value and lets go of the field (the presets list closes with it).
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8 w-20 rounded-md border border-line bg-surface px-2 text-right text-[13.5px] tabular-nums text-ink placeholder:text-ink-3"
          aria-label={`${t("voice.admin.limit")} — ${account.email}`}
          data-testid="admin-voice-limit"
        />
        <datalist id="voice-presets">
          {PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {t("voice.admin.min")}
      </label>
      <Switch
        checked={account.enabled}
        onCheckedChange={(enabled) => save.mutate({ enabled })}
        aria-label={`${t("voice.admin.on")} — ${account.email}`}
      />
    </li>
  );
}
