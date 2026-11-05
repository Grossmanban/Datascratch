import { CloudAlert, CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAttachmentUploads } from "@/data/attachments";
import { runtime } from "@/data/runtime";
import { useSyncStatus } from "@/sync/engine";
import { cn, Tooltip } from "@/ui";

export function SyncIndicator({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const status = useSyncStatus((s) => s.status);
  const pending = useSyncStatus((s) => s.pending);
  const notSent = useSyncStatus((s) => Object.keys(s.failed).length);
  const unreadable = useSyncStatus((s) => Object.keys(s.skipped).length);
  // Attachments going up: «Отправляются картинки: 3 из 8» rather than a bare «ждёт отправки».
  const uploads = useAttachmentUploads((s) => {
    const ids = Object.keys(s.batch);
    const done = ids.filter((id) => s.done[id]).length;
    return done < ids.length ? `${done}/${ids.length}/${ids.every((id) => s.batch[id]!.image) ? 1 : 0}` : "";
  });
  // Undelivered changes are an alert: shown with text even in the compact sidebar footer (as on iOS).
  if (notSent > 0) return <NotSent count={notSent} />;
  const label =
    status === "offline"
      ? t("sync.offline")
      : uploads
        ? uploadLabel(t, uploads)
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
    status === "online" && pending === 0 && !uploads
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
        ) : status === "syncing" || status === "connecting" || uploads ? (
          <RefreshCw className="size-3.5 animate-spin [animation-duration:1.6s]" />
        ) : (
          <span className={cn("size-2 rounded-full", dot)} />
        )}
        {!compact && <span className="truncate">{status === "offline" ? t("sync.offline").split(" — ")[0] : label}</span>}
      </div>
    </Tooltip>
  );
}

function uploadLabel(t: (key: string, opts?: Record<string, unknown>) => string, packed: string): string {
  const [done, total, images] = packed.split("/").map(Number) as [number, number, number];
  if (total === 1) return t(images ? "sync.uploadingImage" : "sync.uploadingFile");
  return t(images ? "sync.uploadingImages" : "sync.uploadingFiles", { done, total });
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

/** «Хранилище браузера заполнено»: shown above the screen while SyncClient cannot save to IndexedDB. */
export function StorageFullBanner() {
  const { t } = useTranslation();
  const full = useSyncStatus((s) => s.storageFull);
  if (!full) return null;
  return (
    <div
      role="status"
      data-testid="storage-full"
      className="flex shrink-0 items-center gap-2 border-b border-warning/25 bg-warning/10 px-4 py-2 text-[13px] text-ink"
    >
      <CloudAlert className="size-4 shrink-0 text-warning" />
      <span className="min-w-0">
        <span className="font-medium">{t("sync.storageFull")}</span>
        <span className="text-ink-2"> {t("sync.storageFullHint")}</span>
      </span>
    </div>
  );
}
