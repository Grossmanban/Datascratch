import { CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSyncStatus } from "@/sync/engine";
import { cn, Tooltip } from "@/ui";

export function SyncIndicator({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const status = useSyncStatus((s) => s.status);
  const pending = useSyncStatus((s) => s.pending);
  const label =
    status === "offline"
      ? t("sync.offline")
      : status === "connecting"
        ? t("sync.connecting")
        : status === "syncing"
          ? t("sync.syncing")
          : pending > 0
            ? t("sync.pending", { count: pending })
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
        className="flex h-7 items-center gap-2 rounded-md px-2 text-[12px] text-ink-3"
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
