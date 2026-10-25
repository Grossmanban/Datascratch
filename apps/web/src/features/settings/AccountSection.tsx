import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, KeyRound, LogOut, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { accountApi } from "@/api/endpoints";
import { changePassword, loginKeyFor } from "@/auth/flows";
import { createNewRecoveryKey, dropStaleRecoveryKey, useRecoveryUnconfirmed } from "@/auth/recovery";
import { confirmRecoveryKeySaved, getRecoveryKey, signOut, useAuth } from "@/auth/session";
import { RecoveryKeyPanel } from "@/features/auth/RecoveryKeyPanel";
import { MIN_PASSWORD } from "@/features/auth/SignupPage";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { useSyncStatus } from "@/sync/engine";
import { Button, cn, confirmDialog, Dialog, DialogActions, Field, Input, Spinner, toast } from "@/ui";
import { Card, Row } from "./SettingsPage";

export function AccountSection() {
  const { t } = useTranslation();
  const email = useAuth((s) => s.email);
  const pending = useSyncStatus((s) => s.pending);
  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  return (
    <>
      <Card>
        <Row label={t("settings.email")}>
          <span className="text-[14px] text-ink-2" data-testid="account-email">
            {email}
          </span>
        </Row>
        <Row label={t("settings.changePassword")}>
          <Button size="sm" icon={<KeyRound className="size-3.5" />} onClick={() => setPwOpen(true)}>
            {t("settings.changePassword")}
          </Button>
        </Row>
        <Row label={t("settings.signOut")} hint={pending ? t("sync.pending", { count: pending }) : undefined}>
          <Button
            size="sm"
            icon={<LogOut className="size-3.5" />}
            onClick={async () => {
              const ok = await confirmDialog({
                title: t("settings.signOut"),
                description: t("settings.signOutText"),
                confirmLabel: t("settings.signOut"),
                cancelLabel: t("common.cancel"),
                danger: pending > 0,
              });
              if (ok) await signOut();
            }}
            data-testid="sign-out"
          >
            {t("settings.signOut")}
          </Button>
        </Row>
      </Card>

      <RecoveryKeyCard />

      <DevicesCard />

      <Card title={t("settings.storage")} description={t("settings.storageText")} action={<HardDrive className="size-5 text-ink-3" />} />

      <Card title={t("settings.deleteAccount")} description={t("settings.deleteAccountText")}>
        <Button variant="danger" size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => setDelOpen(true)}>
          {t("settings.deleteAccount")}
        </Button>
      </Card>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <DeleteAccountDialog open={delOpen} onOpenChange={setDelOpen} />
    </>
  );
}

/**
 * spec/07: the recovery key can be shown again on the device that holds it, and a new one can
 * be made on any device (with the password). Until the current key is confirmed, a gentle
 * reminder stays here (and as a dot on the settings icon).
 */
function RecoveryKeyCard() {
  const { t } = useTranslation();
  const onDevice = useAuth((s) => s.recoveryOnDevice);
  const unconfirmed = useRecoveryUnconfirmed();
  const [key, setKey] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  useEffect(() => {
    void dropStaleRecoveryKey();
  }, []);
  const text = onDevice ? (unconfirmed ? t("settings.recoveryUnconfirmed") : t("settings.recoveryConfirmed")) : unconfirmed ? t("settings.recoveryElsewhereUnconfirmed") : t("settings.recoveryElsewhere");
  return (
    <>
      <section
        className={cn(
          "rounded-lg border p-5",
          unconfirmed ? "border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[var(--ds-tint-yellow-bg)]" : "border-line bg-surface",
        )}
        data-testid="recovery-card"
        data-state={unconfirmed ? "unconfirmed" : "confirmed"}
        data-on-device={onDevice}
      >
        <div className="flex items-start gap-3">
          <KeyRound className={cn("mt-0.5 size-5 shrink-0", unconfirmed ? "text-[var(--ds-tint-yellow-fg)]" : "text-ink-2")} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-ink">{t("settings.recoveryTitle")}</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onDevice && (
                <Button
                  size="sm"
                  variant={unconfirmed ? "primary" : "secondary"}
                  onClick={() =>
                    void getRecoveryKey().then((k) => {
                      setFresh(false);
                      setKey(k);
                    })
                  }
                  data-testid="recovery-show"
                >
                  {t("settings.recoveryShow")}
                </Button>
              )}
              <Button size="sm" variant={!onDevice && unconfirmed ? "primary" : "ghost"} onClick={() => setRotateOpen(true)} data-testid="recovery-rotate">
                {t("settings.recoveryNew")}
              </Button>
            </div>
          </div>
        </div>
      </section>
      <Dialog open={!!key} onOpenChange={(o) => !o && setKey(null)} title={fresh ? t("settings.recoveryNewTitle") : t("settings.recoveryTitle")}>
        {key && (
          <RecoveryKeyPanel
            recoveryKey={key}
            showTitle={false}
            onConfirmed={async () => {
              await confirmRecoveryKeySaved();
              setKey(null);
              toast(t("settings.recoveryDone"));
            }}
          />
        )}
      </Dialog>
      <NewRecoveryKeyDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onCreated={(k) => {
          setRotateOpen(false);
          setFresh(true);
          setKey(k);
        }}
      />
    </>
  );
}

function NewRecoveryKeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (key: string) => void }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const key = await createNewRecoveryKey(password);
      setPassword("");
      onCreated(key);
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 403 || err.status === 401) ? t("settings.wrongPassword") : t("auth.serverUnavailable"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("settings.recoveryNewTitle")} description={t("settings.recoveryNewText")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("settings.currentPassword")} error={error}>
          {(id) => (
            <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus data-testid="recovery-rotate-password" />
          )}
        </Field>
        <DialogActions>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={!password}>
            {t("settings.recoveryNewCreate")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function DevicesCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const devices = useQuery({ queryKey: ["devices"], queryFn: accountApi.devices });
  const revoke = useMutation({
    mutationFn: accountApi.revokeDevice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
  return (
    <Card title={t("settings.devices")}>
      {devices.isLoading ? (
        <Spinner className="size-4 text-ink-3" />
      ) : devices.isError ? (
        <p className="text-[13.5px] text-ink-2">{t("common.requiresOnline")}</p>
      ) : (
        (devices.data ?? []).map((d) => (
          <Row
            key={d.id}
            label={
              <span className="flex items-center gap-2">
                {/iPhone|Android/.test(d.name) ? <Smartphone className="size-4 text-ink-3" /> : <Monitor className="size-4 text-ink-3" />}
                {d.name}
                {d.current && <span className="rounded-full bg-accent/10 px-2 py-px text-[11px] font-medium text-accent">{t("settings.thisDevice")}</span>}
              </span>
            }
            hint={t("settings.lastSeen", { when: formatRelative(d.lastSeenAt) })}
          >
            {!d.current && (
              <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === d.id} onClick={() => revoke.mutate(d.id)}>
                {t("settings.revokeDevice")}
              </Button>
            )}
          </Row>
        ))
      )}
      <SecurityLog />
    </Card>
  );
}

/** `GET /me/security-events`: password changes, recoveries, new recovery keys. */
function SecurityLog() {
  const { t } = useTranslation();
  const events = useQuery({ queryKey: ["security-events"], queryFn: accountApi.securityEvents });
  if (!events.data?.length) return null;
  return (
    <div className="mt-4 border-t border-line pt-4" data-testid="security-log">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">{t("settings.securityLog")}</h3>
      <ul className="flex flex-col gap-1.5">
        {events.data.slice(0, 20).map((e, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink">
              {t(`settings.securityEvent.${e.kind}`)}
              {e.deviceName && <span className="text-ink-2"> · {e.deviceName}</span>}
            </span>
            <span className="shrink-0 text-ink-2">{formatDateTime(e.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < MIN_PASSWORD) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast(t("settings.passwordChanged"));
      onOpenChange(false);
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 403 || err.status === 401) ? t("settings.wrongPassword") : t("auth.serverUnavailable"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("settings.changePassword")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("settings.currentPassword")} error={error}>
          {(id) => <Input id={id} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />}
        </Field>
        <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")} error={next && next.length < MIN_PASSWORD ? t("auth.passwordTooShort") : undefined}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <DialogActions>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={!current || next.length < MIN_PASSWORD}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await accountApi.deleteAccount(await loginKeyFor(password));
      await signOut();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? t("settings.wrongPassword") : t("auth.serverUnavailable"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("settings.deleteAccount")} description={t("settings.deleteAccountText")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t("auth.password")} error={error}>
          {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
        </Field>
        <DialogActions>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="danger" loading={busy} disabled={!password}>
            {t("settings.deleteAccount")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
