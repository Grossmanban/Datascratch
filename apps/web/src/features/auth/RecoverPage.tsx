import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { recoverAccount } from "@/auth/flows";
import { decodeRecoveryKey } from "@/lib/shared";
import { Button, Field, Input } from "@/ui";
import { authErrorMessage } from "./errors";
import { MIN_PASSWORD } from "./SignupPage";

export function RecoverPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let keyValid = true;
  try {
    if (key.trim()) decodeRecoveryKey(key);
  } catch {
    keyValid = false;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!keyValid || password.length < MIN_PASSWORD) return;
    setBusy(true);
    setError(null);
    try {
      await recoverAccount(email, key, password);
      await navigate({ to: "/all" });
    } catch (err) {
      setError(authErrorMessage(err, "auth.wrongRecovery"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em]">{t("auth.recoverTitle")}</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{t("auth.recoverText")}</p>
      </div>
      <Field label={t("auth.email")}>
        {(id) => <Input id={id} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Field label={t("auth.recoveryKey")} error={!keyValid && key.length > 10 ? t("auth.recoveryKeyInvalid") : undefined}>
        {(id) => (
          <Input
            id={id}
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="DS1-XXXX-XXXX-…"
            className="font-mono text-[13px]"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Field>
      <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")} error={error}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!keyValid || password.length < MIN_PASSWORD} className="w-full">
        {busy ? t("auth.deriving") : t("auth.recover")}
      </Button>
      <p className="text-center text-[13px]">
        <Link to="/login" className="text-ink-2 hover:text-ink">
          ← {t("common.back")}
        </Link>
      </p>
    </form>
  );
}
