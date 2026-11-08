import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, ClipboardCopy, CloudOff, FileUp, KeyRound, RefreshCw, Send, Stethoscope, Wifi } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { request } from "@/api/client";
import { APP_VERSION } from "@/config";
import { useAttachmentUploads } from "@/data/attachments";
import { accountDb, hasAccountDb } from "@/data/db";
import { cachedNotebookKey } from "@/data/keys";
import { hasRuntime, runtime } from "@/data/runtime";
import { useWorkspace } from "@/domain/workspace";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { useSyncStatus, type SyncStatus } from "@/sync/engine";
import { Button, cn, toast } from "@/ui";
import { browserInfo, buildReport, clearDiag, recordDiag, useDiagnostics, type DiagSnapshot } from "./diagnostics";
import { Card } from "./SettingsPage";

type Check = NonNullable<DiagSnapshot["check"]>;
type Storage = DiagSnapshot["storage"];

async function estimateStorage(): Promise<Storage> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    const mb = (n = 0) => Math.round((n / 1024 / 1024) * 10) / 10;
    return { usedMb: mb(e.usage), quotaMb: mb(e.quota), persisted };
  } catch {
    return null;
  }
}

/** Keys of the account's notebooks that this device holds (counts only). */
function keyCounts() {
  const nbs = useWorkspace.getState().account.notebooks;
  return { available: nbs.filter((n) => !!cachedNotebookKey(n.id)).length, total: nbs.length };
}

/**
 * «Синхронизация и диагностика» (spec/10): what the connection, the outbox, keys and uploads
 * are doing, the recent errors explained, a check on demand and a report without secrets.
 * Read-only towards sync: it shows the sync status and calls the runtime's own retry.
 */
export function DiagnosticsSection() {
  const { t } = useTranslation();
  const status = useSyncStatus((s) => s.status);
  const pending = useSyncStatus((s) => s.pending);
  const lastSyncedAt = useSyncStatus((s) => s.lastSyncedAt);
  const failed = useSyncStatus((s) => s.failed);
  const skipped = useSyncStatus((s) => s.skipped);
  const storageFull = useSyncStatus((s) => s.storageFull);
  const notebooks = useWorkspace((s) => s.account.notebooks.length);
  const uploads = useAttachmentUploads();
  const waitingFiles = useLiveQuery(
    async () => (!hasAccountDb() ? 0 : (await accountDb().attachments.toArray()).filter((a) => !a.registered || a.uploaded.length < a.chunkCount).length),
    [],
    0,
  );
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [storage, setStorage] = useState<Storage>(null);
  const [keys, setKeys] = useState(keyCounts);
  useEffect(() => {
    void estimateStorage().then(setStorage);
  }, []);
  useEffect(() => setKeys(keyCounts()), [notebooks, status]);

  const failedIds = Object.keys(failed);
  const unreadable = Object.keys(skipped).length;
  const batch = Object.keys(uploads.batch);
  const batchDone = batch.filter((id) => uploads.done[id]).length;
  const uploading = batchDone < batch.length;

  async function runCheck() {
    setChecking(true);
    const t0 = performance.now();
    let serverOk = false;
    let serverMs: number | null = null;
    try {
      await request("GET", "/health", { auth: false });
      serverOk = true;
      serverMs = Math.round(performance.now() - t0);
    } catch {
      recordDiag("server_unreachable");
    }
    const debug = hasRuntime() ? await runtime().syncDebug().catch(() => null) : null;
    setStorage(await estimateStorage());
    setKeys(keyCounts());
    setCheck({ at: Date.now(), serverOk, serverMs, notSynced: debug?.notSynced.length ?? 0 });
    setChecking(false);
  }

  function snapshot(): DiagSnapshot {
    const s = useSyncStatus.getState();
    return {
      version: APP_VERSION,
      browser: browserInfo(),
      now: Date.now(),
      connection: s.status,
      lastSyncedAt: s.lastSyncedAt,
      outbox: s.pending,
      notSent: Object.entries(s.failed).map(([docId, f]) => ({ docId, code: f.code })),
      unreadable: Object.entries(s.skipped).map(([docId, count]) => ({ docId, count })),
      keys: keyCounts(),
      uploads: { waiting: waitingFiles, done: batchDone, total: batch.length },
      storage,
      storageFull: s.storageFull,
      check,
      entries: useDiagnostics.getState().entries,
    };
  }

  async function copyReport() {
    const text = buildReport(snapshot());
    try {
      await navigator.clipboard.writeText(text);
      toast(t("prefs.diag.copied"));
    } catch {
      setShowReport(true);
      toast(t("prefs.diag.copyFailed"));
    }
  }
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <Card title={t("prefs.diag.status")} testId="diag-status">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Tile
            icon={status === "offline" ? <CloudOff /> : <Wifi />}
            label={t("prefs.diag.connection")}
            tone={status === "online" ? "ok" : status === "offline" ? "muted" : "busy"}
            value={t(`prefs.diag.${status satisfies SyncStatus}`)}
            hint={lastSyncedAt ? t("prefs.diag.lastSync", { when: formatRelative(lastSyncedAt) }) : t("prefs.diag.neverSynced")}
            testId="diag-connection"
            state={status}
          />
          <Tile
            icon={<Send />}
            label={t("prefs.diag.outbox")}
            tone={failedIds.length ? "bad" : pending ? "busy" : "ok"}
            value={pending ? t("prefs.diag.outboxWaiting", { count: pending }) : t("prefs.diag.outboxEmpty")}
            hint={failedIds.length ? t("prefs.diag.notSent", { count: failedIds.length }) : undefined}
            testId="diag-outbox"
            state={String(pending)}
          />
          <Tile
            icon={<KeyRound />}
            label={t("prefs.diag.keys")}
            tone={unreadable || keys.available < keys.total ? "warn" : "ok"}
            value={keys.total ? t("prefs.diag.keysOk", keys) : t("prefs.diag.keysNone")}
            hint={unreadable ? t("prefs.diag.unreadable", { count: unreadable }) : undefined}
            testId="diag-keys"
          />
          <Tile
            icon={<FileUp />}
            label={t("prefs.diag.uploads")}
            tone={uploading || waitingFiles ? "busy" : "ok"}
            value={uploading ? t("prefs.diag.uploadsWaiting", { done: batchDone, total: batch.length }) : waitingFiles ? t("prefs.diag.outboxWaiting", { count: waitingFiles }) : t("prefs.diag.uploadsIdle")}
            testId="diag-uploads"
          />
        </div>
        {(storage || storageFull) && (
          <p className={cn("mt-4 text-[12.5px]", storageFull ? "font-medium text-danger" : "text-ink-2")} data-testid="diag-storage">
            {storageFull
              ? t("prefs.diag.storageFull")
              : `${t("prefs.diag.storage")}: ${t("prefs.diag.storageValue", { used: mb(storage!.usedMb), quota: mb(storage!.quotaMb) })} · ${
                  storage!.persisted ? t("prefs.diag.storagePersisted") : t("prefs.diag.storageBestEffort")
                }`}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button
            size="sm"
            variant="primary"
            icon={<Stethoscope className="size-3.5" />}
            loading={checking}
            onClick={() => void runCheck()}
            data-testid="diag-check"
          >
            {checking ? t("prefs.diag.checking") : t("prefs.diag.checkNow")}
          </Button>
          {failedIds.length > 0 && (
            <Button size="sm" icon={<RefreshCw className="size-3.5" />} onClick={() => void runtime().retryFailed()} data-testid="diag-resend">
              {t("prefs.diag.resend")}
            </Button>
          )}
          {check && (
            <div className="ml-1 min-w-0 text-[12.5px] leading-snug text-ink-2" role="status" data-testid="diag-check-result" data-server={check.serverOk ? "ok" : "down"}>
              <span className={cn("font-medium", check.serverOk ? "text-ink" : "text-danger")}>
                {check.serverOk ? t("prefs.diag.serverOk", { ms: check.serverMs }) : t("prefs.diag.serverDown")}
              </span>
              {" · "}
              {check.notSynced ? t("prefs.diag.notSynced", { count: check.notSynced }) : t("prefs.diag.allSynced")}
              {" · "}
              {t("prefs.diag.checkedAt", { when: formatRelative(check.at) })}
            </div>
          )}
        </div>
      </Card>

      <ErrorsCard />

      <Card
        title={t("prefs.diag.report")}
        description={t("prefs.diag.reportText")}
        testId="diag-report"
        action={
          <Button size="sm" icon={<ClipboardCopy className="size-3.5" />} onClick={() => void copyReport()} data-testid="diag-copy">
            {t("prefs.diag.copyReport")}
          </Button>
        }
      >
        <details open={showReport} onToggle={(e) => setShowReport((e.target as HTMLDetailsElement).open)} className="group">
          <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-1 rounded text-[12.5px] text-ink-2 hover:text-ink focus-visible:focus-ring [&::-webkit-details-marker]:hidden">
            <ChevronRight className={cn("size-3.5 transition-transform", showReport && "rotate-90")} aria-hidden />
            report.txt
          </summary>
          {showReport && (
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-line bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-ink-2" data-testid="diag-report-text">
              {buildReport(snapshot())}
            </pre>
          )}
        </details>
      </Card>
    </>
  );
}

const mb = (n: number) => (n >= 1024 ? `${Math.round(n / 102.4) / 10} GB` : `${n} MB`);

function ErrorsCard() {
  const { t } = useTranslation();
  const entries = useDiagnostics((s) => s.entries);
  const explain = useExplain();
  const list = [...entries].reverse().slice(0, 12);
  return (
    <Card
      title={t("prefs.diag.errors")}
      testId="diag-errors"
      action={
        list.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearDiag}>
            {t("prefs.diag.clear")}
          </Button>
        )
      }
    >
      {list.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-ink-2">{t("prefs.diag.errorsEmpty")}</p>
      ) : (
        <ol className="flex flex-col">
          {list.map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0" data-testid="diag-error" data-code={e.code}>
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--ds-warning)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug text-ink">{explain(e.code)}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
                  <time dateTime={new Date(e.at).toISOString()}>{formatDateTime(new Date(e.at).toISOString())}</time>
                  <code className="rounded bg-ink/[0.06] px-1.5 py-px font-mono text-[11px] text-ink-2">{e.code}</code>
                  {e.docId && <span className="truncate font-mono text-[11px]">{t("prefs.diag.doc", { id: e.docId.slice(0, 8) })}</span>}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** A human explanation of an error code. */
function useExplain() {
  const { t, i18n } = useTranslation();
  return (code: string) => {
    if (code.startsWith("client_") && code !== "client_rejection") return t("prefs.diag.err.client", { name: code.slice(7) });
    const key = `prefs.diag.err.${code}`;
    return i18n.exists(key) ? t(key) : t("prefs.diag.err.other", { code });
  };
}

function Tile({
  icon,
  label,
  value,
  hint,
  tone,
  testId,
  state,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "busy" | "warn" | "bad" | "muted";
  testId: string;
  state?: string;
}) {
  const dot = { ok: "bg-success", busy: "bg-[var(--ds-accent)]", warn: "bg-warning", bad: "bg-danger", muted: "bg-ink-3" }[tone];
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-canvas/60 p-3.5" data-testid={testId} data-tone={tone} data-state={state}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-2 shadow-[0_0_0_0.5px_var(--ds-line-separator)] [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-ink-2">{label}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[14.5px] font-medium text-ink">
          <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
          <span className="min-w-0 truncate">{value}</span>
        </div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{hint}</div>}
      </div>
    </div>
  );
}
