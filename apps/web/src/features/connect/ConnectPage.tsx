import { useNavigate } from "@tanstack/react-router";
import { Bot, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSession, refreshSession, useAuth } from "@/auth/session";
import { apiBase, serverOrigin } from "@/config";
import { Logo } from "@/features/shell/Splash";
import { Button, Spinner } from "@/ui";

/** Only the server's own OAuth consent screen may be a return target (no open redirect). */
export function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.origin !== new URL(serverOrigin()).origin) return null;
    if (!url.pathname.startsWith("/oauth/authorize")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * `/connect?returnTo=…` (agents-api.md §10): an AI agent's OAuth flow sends the browser here
 * when the server has no browser session. We hand the server a short cookie session
 * (`POST /v1/auth/web-session`) and go back to its consent screen.
 */
export function ConnectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAuth((s) => s.status);
  const [error, setError] = useState<string | null>(null);
  const returnTo = safeReturnTo(new URLSearchParams(location.search).get("returnTo"));

  useEffect(() => {
    if (!returnTo || status === "loading") return;
    if (status === "signedOut") {
      void navigate({ to: "/login", search: { next: location.pathname + location.search } as never });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        let session = getSession();
        if (session && Date.parse(session.accessExpiresAt) - Date.now() < 60_000) session = await refreshSession();
        if (!session) throw new Error("no session");
        const res = await fetch(`${apiBase()}/auth/web-session`, {
          method: "POST",
          headers: { authorization: `Bearer ${session.accessToken}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) location.href = returnTo;
      } catch (e) {
        if (!cancelled) setError(String((e as Error).message));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [returnTo, status, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[380px] rounded-xl border border-line bg-surface p-7 text-center shadow-card" data-testid="connect-page">
        <div className="mb-4 flex justify-center gap-3">
          <Logo size={40} />
          <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--ds-tint-purple-bg)] text-[var(--ds-tint-purple-fg)]">
            <Bot className="size-5" />
          </span>
        </div>
        {!returnTo ? (
          <>
            <ShieldAlert className="mx-auto mb-2 size-6 text-danger" />
            <h1 className="font-display text-[20px] font-semibold">{t("connect.badLink")}</h1>
            <p className="mt-2 text-[14px] text-ink-2">{t("connect.badLinkText")}</p>
            <Button className="mt-5" onClick={() => void navigate({ to: "/all" })}>
              {t("nav.allDocs")}
            </Button>
          </>
        ) : error ? (
          <>
            <h1 className="font-display text-[20px] font-semibold">{t("connect.failed")}</h1>
            <p className="mt-2 text-[14px] text-ink-2">{t("auth.serverUnavailable")}</p>
            <Button className="mt-5" onClick={() => location.reload()}>
              {t("common.retry")}
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-display text-[20px] font-semibold">{t("connect.title")}</h1>
            <p className="mt-2 text-[14px] text-ink-2">{t("connect.text")}</p>
            <Spinner className="mx-auto mt-5 size-5 text-ink-3" />
          </>
        )}
      </div>
    </div>
  );
}
