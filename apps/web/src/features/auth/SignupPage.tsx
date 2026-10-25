import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { signUp } from "@/auth/flows";
import { confirmRecoveryKeySaved, getRecoveryKey, skipRecoveryStep, useAuth } from "@/auth/session";
import { Button, confirmDialog, Field, Input } from "@/ui";
import { RecoveryKeyPanel } from "./RecoveryKeyPanel";
import { authErrorMessage } from "./errors";

export const MIN_PASSWORD = 10;

export function SignupPage() {
  const step = useAuth((s) => s.recoveryStep);
  return step ? <RecoveryKeyStep /> : <SignupForm />;
}

function SignupForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = repeat.length > 0 && repeat !== password;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD || password !== repeat) return;
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password);
    } catch (err) {
      setError(authErrorMessage(err, "auth.wrongCredentials"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" data-testid="signup-form">
      <Field label={t("auth.email")} error={error}>
        {(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}
      </Field>
      <Field label={t("auth.password")} hint={t("auth.passwordHint")} error={tooShort ? t("auth.passwordTooShort") : undefined}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
      </Field>
      <Field label={t("auth.passwordRepeat")} error={mismatch ? t("auth.passwordMismatch") : undefined}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />}
      </Field>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={busy}
        disabled={password.length < MIN_PASSWORD || password !== repeat || !email}
        className="mt-1 w-full"
      >
        {busy ? t("auth.deriving") : t("auth.signUp")}
      </Button>
      <p className="text-center text-[13px] text-ink-2">
        {t("auth.haveAccount")}{" "}
        <Link to="/login" className="font-medium text-accent hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}

function RecoveryKeyStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    void getRecoveryKey().then(setKey);
  }, []);
  if (!key) return null;

  async function skip() {
    const ok = await confirmDialog({
      title: t("auth.recoverySkipTitle"),
      description: t("auth.recoverySkipWarning"),
      confirmLabel: t("auth.recoverySkip"),
      cancelLabel: t("auth.recoveryBack"),
    });
    if (!ok) return;
    await skipRecoveryStep();
    await navigate({ to: "/all" });
  }

  return (
    <div data-testid="recovery-step">
      <RecoveryKeyPanel
        recoveryKey={key}
        onConfirmed={async () => {
          await confirmRecoveryKeySaved();
          await navigate({ to: "/all" });
        }}
      />
      <button
        type="button"
        onClick={() => void skip()}
        className="mx-auto mt-3 block rounded-md px-2 py-1 text-[13px] text-ink-2 transition-colors hover:bg-ink/[0.04] hover:text-ink"
        data-testid="recovery-skip"
      >
        {t("auth.recoverySkip")}
      </button>
    </div>
  );
}
