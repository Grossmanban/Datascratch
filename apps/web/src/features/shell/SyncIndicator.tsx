import { CloudAlert, CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { runtime } from "@/data/runtime";
import { useSyncStatus } from "@/sync/engine";
import { cn, Tooltip } from "@/ui";

export function SyncIndicator({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const status = useSyncStatus((s) => s.status);
  const pending = useSyncStatus((s) => s.pending);
  const notSent = useSyncStatus((s) => Object.keys(s.failed).length);
  const unreadable = useSyncStatus((s) => Object.keys(s.skipped).length);
  // Undelivered changes are an alert: shown with text even in the compact sidebar footer (as on iOS).
  if (notSent > 0) return <NotSent count={notSent} />;
  const label =
    status === "offline"
      ? t("sync.offline")
      : status === "connecting"
        ? t("sync.connecting")
        : status === "syncing"
          ? t("sync.syncing")
          : pending > 0
            ? t("sync.pending", { count: pending })
            : unreadable > 0
              ? `${t("sync.online")} · ${t("sync.unreadable", { count: unreadable })}`
              : t("sync.online");
  const dot =
    status === "online" && pending === 0
      ? "bg-success"
      : status === "offline"
        ? "bg-ink-3"
        : "bg-warning";
  return (
    <Tooltip content={label} side="top">
      <div
        className="flex h-7 items-center gap-2 rounded-md px-2 text-[12px] text-ink-2"
        data-testid="sync-status"
        data-status={status}
        aria-label={label}
        role="status"
      >
        {status === "offline" ? (
          <CloudOff className="size-3.5" />
        ) : status === "syncing" || status === "connecting" ? (
          <RefreshCw className="size-3.5 animate-spin [animation-duration:1.6s]" />
        ) : (
          <span className={cn("size-2 rounded-full", dot)} />
        )}
        {!compact && <span className="truncate">{status === "offline" ? t("sync.offline").split(" — ")[0] : label}</span>}
      </div>
    </Tooltip>
  );
}

/** Changes the server refused: how many documents, why, and a way to send them again (as on iOS). */
function NotSent({ count }: { count: number }) {
  const { t } = useTranslation();
  const label = t("sync.notSent", { count });
  return (
    <div className="flex h-7 items-center gap-1 text-[12px]">
      <Tooltip content={t("sync.notSentHint")} side="top">
        <div
          className="flex h-7 min-w-0 items-center gap-2 rounded-md px-2 text-ink-2"
          data-testid="sync-status"
          data-status="not-sent"
          aria-label={`${label}. ${t("sync.notSentHint")}`}
          role="status"
        >
          <CloudAlert className="size-3.5 shrink-0 text-danger" />
          <span className="truncate">{label}</span>
        </div>
      </Tooltip>
      <button
        type="button"
        className="h-6 shrink-0 rounded-md px-1.5 font-semibold text-accent transition hover:bg-ink/5 focus-visible:outline-2"
        onClick={() => void runtime().retryFailed()}
        data-testid="sync-retry"
      >
        {t("sync.retry")}
      </button>
    </div>
  );
}
