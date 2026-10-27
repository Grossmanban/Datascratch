import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { signIn } from "@/auth/flows";
import { forgetRevokedData, useAuth } from "@/auth/session";
import { Button, confirmDialog, Field, Input } from "@/ui";
import { authErrorMessage } from "./errors";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ strict: false }) as { next?: string };
  const revoked = useAuth((s) => s.revoked);
  const restoreFailed = useAuth((s) => s.restoreFailed);
  const [email, setEmail] = useState(revoked?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      const next = search.next && search.next.startsWith("/") && !search.next.startsWith("/login") ? search.next : "/all";
      // `next` may carry a query string (e.g. /connect?returnTo=…): push it as a full href.
      if (next.includes("?")) router.history.push(next);
      else await navigate({ to: next });
    } catch (err) {
      setError(authErrorMessage(err, "auth.wrongCredentials"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" data-testid="login-form">
      {revoked?.reason === "wiped" && <WipedNotice />}
      {revoked && revoked.reason !== "wiped" && <RevokedNotice unsent={revoked.unsent} signedOut={revoked.reason === "signedOut"} />}
      {!revoked && restoreFailed && (
        <p role="status" className="rounded-lg bg-[var(--ds-tint-yellow-bg)] px-3.5 py-3 text-[13.5px] text-ink" data-testid="restore-failed">
          {t("app.restoreFailed")}
        </p>
      )}
      <Field label={t("auth.email")}>
        {(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
      </Field>
      <Field label={t("auth.password")} error={error}>
        {(id) => (
          <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-1 w-full">
        {busy ? t("auth.deriving") : t("auth.signIn")}
      </Button>
      <div className="mt-1 flex items-center justify-between text-[13px]">
        <Link to="/recover" className="text-ink-2 hover:text-ink">
          {t("auth.forgot")}
        </Link>
        <span className="text-ink-2">
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            {t("auth.signUp")}
          </Link>
        </span>
      </div>
    </form>
  );
}

/** D-53: the device was disconnected from another device and its data deleted; say so plainly. */
function WipedNotice() {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-lg bg-[var(--ds-tint-yellow-bg)] px-3.5 py-3 text-[13.5px] text-ink" data-testid="wiped-notice">
      <p className="font-semibold">{t("auth.wipedTitle")}</p>
      <p className="mt-0.5 text-ink-2">{t("auth.wipedText")}</p>
    </div>
  );
}

/** The session was ended from another device (spec/07): say so plainly, keep local data until sign-in. */
function RevokedNotice({ unsent, signedOut }: { unsent: number; signedOut?: boolean }) {
  const { t } = useTranslation();
  async function forget() {
    const ok = await confirmDialog({
      title: t("auth.revokedForget"),
      description: t("auth.revokedForgetConfirm", { unsent: unsent ? t("auth.revokedForgetUnsent") : "" }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (ok) await forgetRevokedData();
  }
  return (
    <div role="alert" className="rounded-lg bg-[var(--ds-tint-yellow-bg)] px-3.5 py-3 text-[13.5px] text-ink" data-testid="revoked-notice">
      <p className="font-semibold">{signedOut ? t("auth.keptTitle") : t("auth.revokedTitle")}</p>
      <p className="mt-0.5 text-ink-2">{signedOut ? t("auth.keptText") : t("auth.revokedText")}</p>
      {unsent > 0 && <p className="mt-1.5 text-ink-2">{t("auth.revokedUnsent", { count: unsent })}</p>}
      <button type="button" onClick={() => void forget()} className="mt-2 text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline">
        {t("auth.revokedForget")}
      </button>
    </div>
  );
}
