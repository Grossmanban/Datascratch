import { useQuery } from "@tanstack/react-query";
import { DatabaseBackup } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { ApiError, request } from "@/api/client";
import { useVoiceAccess } from "@/features/voice/access";
import { cn } from "@/ui";
import { Card } from "./SettingsPage";

/** `GET /v1/admin/backup` (api.md «Администрирование»), server admins only. */
export type BackupStatus = {
  available: boolean;
  lastRun: {
    finishedAt: string;
    ok: boolean;
    error: null | "db" | "files" | "check" | "prune";
  } | null;
  lastSuccess: {
    finishedAt: string;
    dbBytes: number;
    filesBytes: number | null;
    count: number;
  } | null;
  ageHours: number | null;
  stale: boolean;
};

export const backupApi = { status: () => request<BackupStatus>("GET", "/admin/backup") };

const MB = 1024 * 1024;
/** 12 МБ, 1,4 ГБ, 300 КБ — sizes in the interface's words. */
export function formatSize(bytes: number, t: TFunction): string {
  if (bytes >= 1024 * MB)
    return t("prefs.backup.gb", {
      n: (Math.round((bytes / 1024 / MB) * 10) / 10).toLocaleString(),
    });
  if (bytes >= MB) return t("prefs.backup.mb", { n: Math.round(bytes / MB) });
  return t("prefs.backup.kb", { n: Math.max(1, Math.round(bytes / 1024)) });
}

/** «меньше часа», «5 ч», «2 дн.» (24 h and more — in days). */
export function formatAge(hours: number, t: TFunction): string {
  if (hours < 1) return t("prefs.backup.lessThanHour");
  if (hours < 24) return t("prefs.backup.hours", { n: Math.floor(hours) });
  return t("prefs.backup.days", { n: Math.floor(hours / 24) });
}

/**
 * «Резервная копия» for the server admin (spec/06 «Резервные копии», D-55): how long ago the last
 * good backup was, its size and how many copies are kept; red when it is stale or the last run failed.
 */
export function BackupCard() {
  const isAdmin = useVoiceAccess((s) => s.me?.isAdmin);
  return isAdmin === true ? <AdminBackupCard /> : null;
}

function AdminBackupCard() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["admin-backup"],
    queryFn: backupApi.status,
    retry: false,
    staleTime: 60_000,
  });
  if (q.error instanceof ApiError && (q.error.status === 403 || q.error.status === 404))
    return null;
  const b = q.data;
  if (!b) return null;

  let text: string;
  let danger = false;
  if (!b.available) text = t("prefs.backup.unavailable");
  else {
    danger = b.stale;
    const s = b.lastSuccess;
    text =
      s && b.ageHours !== null
        ? t("prefs.backup.summary", {
            age: formatAge(b.ageHours, t),
            size: formatSize(s.dbBytes + (s.filesBytes ?? 0), t),
            copies: t("prefs.backup.copies", { count: s.count }),
          })
        : t("prefs.backup.none");
    if (b.lastRun && !b.lastRun.ok)
      text += ` · ${t("prefs.backup.failed", { reason: b.lastRun.error ?? "?" })}`;
  }
  return (
    <Card
      title={t("prefs.backup.title")}
      description={t("prefs.backup.hint")}
      testId="backup-card"
      tone={danger ? "danger" : undefined}
    >
      <p
        className={cn(
          "flex items-start gap-2.5 text-[14px] leading-snug",
          danger ? "text-danger" : b.available ? "text-ink" : "text-ink-2",
        )}
        data-testid="backup-status"
        data-state={!b.available ? "unknown" : danger ? "stale" : "ok"}
      >
        <DatabaseBackup className="mt-px size-4 shrink-0" aria-hidden />
        <span>{text}</span>
      </p>
    </Card>
  );
}
