import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { signIn } from "@/auth/flows";
import { Button, Field, Input } from "@/ui";
import { authErrorMessage } from "./errors";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ strict: false }) as { next?: string };
  const [email, setEmail] = useState("");
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
        <span className="text-ink-3">
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            {t("auth.signUp")}
          </Link>
        </span>
      </div>
    </form>
  );
}
