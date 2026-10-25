import { Lock, Sparkles, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NotebookMode } from "@/lib/shared";
import { cn } from "@/ui";

export function ModeChoice({ value, onChange }: { value: NotebookMode; onChange: (m: NotebookMode) => void }) {
  const { t } = useTranslation();
  const opts: { mode: NotebookMode; icon: React.ReactNode; title: string; hint: string }[] = [
    { mode: "private", icon: <Lock className="size-4" />, title: t("notebook.private"), hint: t("notebook.privateHint") },
    { mode: "agent", icon: <Sparkles className="size-4" />, title: t("notebook.agent"), hint: t("notebook.agentHint") },
  ];
  return (
    <div className="flex flex-col gap-2" role="radiogroup">
      {opts.map((o) => (
        <button
          key={o.mode}
          type="button"
          role="radio"
          aria-checked={value === o.mode}
          onClick={() => onChange(o.mode)}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3 text-left transition-[border,background,box-shadow]",
            value === o.mode ? "border-accent/60 bg-accent/[0.05] shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-accent)_12%,transparent)]" : "border-line hover:border-ink/20",
          )}
        >
          <span className={cn("mt-0.5", value === o.mode ? "text-accent" : "text-ink-3")}>{o.icon}</span>
          <span className="flex-1">
            <span className="block text-[14px] font-medium text-ink">{o.title}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{o.hint}</span>
          </span>
        </button>
      ))}
      {value === "agent" && <AgentWarning />}
    </div>
  );
}

export function AgentWarning() {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2.5 rounded-lg bg-[var(--ds-tint-yellow-bg)] p-3 text-[12.5px] leading-snug text-ink" role="alert">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--ds-tint-yellow-fg)]" />
      <span>{t("notebook.agentWarning")}</span>
    </div>
  );
}
