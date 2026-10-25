import { Check, Copy, Download, KeyRound } from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/session";
import { Button, Field, Input } from "@/ui";

/**
 * The recovery key (crypto.md §4) with copy/download and the optional check that it was
 * written down: the last four characters typed back (spec/07). Used after signup and in
 * the settings.
 */
export function RecoveryKeyPanel({
  recoveryKey,
  onConfirmed,
  showTitle = true,
}: {
  recoveryKey: string;
  onConfirmed: () => void | Promise<void>;
  showTitle?: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState("");
  const tail = recoveryKey.replace(/-/g, "").slice(-4);
  const ok = confirm.trim().toUpperCase() === tail;
  const groups = recoveryKey.split("-");

  async function copy() {
    await navigator.clipboard?.writeText(recoveryKey).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function download() {
    const email = useAuth.getState().email ?? "";
    const text = `Datascratch recovery key\n${email}\n\n${recoveryKey}\n\nKeep this file somewhere safe. Anyone with this key and your email can reset your password.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "datascratch-recovery-key.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function finish(e: FormEvent) {
    e.preventDefault();
    if (ok) await onConfirmed();
  }

  return (
    <form onSubmit={finish} className="flex flex-col gap-4">
      {showTitle && (
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--ds-tint-yellow-bg)] text-[var(--ds-tint-yellow-fg)]">
            <KeyRound className="size-5" />
          </div>
          <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em]">{t("auth.recoveryTitle")}</h2>
        </div>
      )}
      <p className="text-[14px] leading-relaxed text-ink-2">{t("auth.recoveryText")}</p>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="grid grid-cols-4 gap-x-2 gap-y-1.5 rounded-lg border border-line bg-canvas p-4 font-mono text-[14px] tracking-wide text-ink"
        data-testid="recovery-key"
        data-key={recoveryKey}
      >
        {groups.map((g, i) => (
          <span key={i} className={i === 0 ? "font-semibold text-accent" : undefined}>
            {g}
          </span>
        ))}
      </motion.div>
      <div className="flex gap-2">
        <Button type="button" onClick={copy} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} className="flex-1">
          {copied ? t("common.copied") : t("auth.recoveryCopy")}
        </Button>
        <Button type="button" onClick={download} icon={<Download className="size-4" />} className="flex-1">
          {t("auth.recoveryDownload")}
        </Button>
      </div>
      <Field label={t("auth.recoveryConfirmLabel")} error={confirm.length >= 4 && !ok ? t("auth.recoveryConfirmWrong") : undefined}>
        {(id) => (
          <Input
            id={id}
            value={confirm}
            maxLength={4}
            onChange={(e) => setConfirm(e.target.value)}
            className="font-mono uppercase tracking-[0.3em]"
            autoComplete="off"
            data-testid="recovery-confirm"
          />
        )}
      </Field>
      <Button type="submit" variant="primary" size="lg" disabled={!ok} className="w-full">
        {t("auth.recoverySaved")}
      </Button>
    </form>
  );
}
