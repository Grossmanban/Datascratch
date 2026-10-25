import { Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import type * as Y from "yjs";
import { DEFAULT_STYLE, setNoteMeta } from "@/domain/note";
import type { NoteStyle } from "@/lib/shared";
import { cn, IconButton, Popover, SegmentedControl } from "@/ui";

export function StylePopover({ doc, style, disabled }: { doc: Y.Doc; style: NoteStyle; disabled?: boolean }) {
  const { t } = useTranslation();
  const set = (patch: Partial<NoteStyle>) => setNoteMeta(doc, { style: { ...DEFAULT_STYLE, ...style, ...patch } });
  return (
    <Popover
      align="end"
      className="w-[300px]"
      trigger={
        <IconButton label={t("docs.style")} disabled={disabled} data-testid="style-button">
          <Type className="size-4" />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Row label={t("style.font")}>
          <div className="grid grid-cols-3 gap-1.5">
            {(["serif", "sans", "mono"] as const).map((f) => (
              <button
                key={f}
                onClick={() => set({ font: f })}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-md border text-[11px] text-ink-2 transition",
                  style.font === f ? "border-accent/60 bg-accent/[0.06] text-ink" : "border-line hover:border-ink/20",
                )}
              >
                <span
                  className="text-[20px] leading-none text-ink"
                  style={{ fontFamily: f === "serif" ? "var(--ds-font-display)" : f === "mono" ? "var(--ds-font-mono)" : "var(--ds-font-text)" }}
                >
                  Aa
                </span>
                <span className="mt-1">{t(`style.${f}`)}</span>
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("style.width")}>
          <SegmentedControl
            className="w-full [&>button]:flex-1"
            value={style.width}
            onChange={(w) => set({ width: w })}
            options={(["normal", "wide", "full"] as const).map((w) => ({ value: w, label: t(`style.${w}`) }))}
          />
        </Row>
        <Row label={t("style.paper")}>
          <div className="grid grid-cols-4 gap-1.5">
            {(["plain", "dots", "grid", "lines"] as const).map((p) => (
              <button
                key={p}
                onClick={() => set({ paper: p })}
                title={t(`style.${p}`)}
                className={cn(
                  "h-11 rounded-md border bg-surface transition",
                  p !== "plain" && `paper-${p}`,
                  style.paper === p ? "border-accent/60 ring-2 ring-accent/15" : "border-line hover:border-ink/20",
                )}
                aria-label={t(`style.${p}`)}
              />
            ))}
          </div>
        </Row>
      </div>
    </Popover>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</div>
      {children}
    </div>
  );
}
