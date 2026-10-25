import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, KeyRound, LogOut, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { accountApi } from "@/api/endpoints";
import { changePassword, loginKeyFor } from "@/auth/flows";
import { signOut, useAuth } from "@/auth/session";
import { MIN_PASSWORD } from "@/features/auth/SignupPage";
import { formatRelative } from "@/lib/dates";
import { useSyncStatus } from "@/sync/engine";
import { Button, confirmDialog, Dialog, DialogActions, Field, Input, Spinner, toast } from "@/ui";
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
    </Card>
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
