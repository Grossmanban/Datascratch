import type { EditorApi } from "@datascratch/web-editor";
import { ChevronDown, Undo2, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, cn, Dialog, IconButton } from "@/ui";
import { errorOf } from "./dictation";
import { FORMAT_STYLES, formatNote, undoFormat, useFormat, type FormatStyle } from "./format";
import { DEFAULT_VOICE_STYLE } from "./voiceApi";

/** «Как оформить?»: a style, then the note (or the selection) is tidied as one highlighted edit. */
export function FormatDialog({ api, noteId }: { api: EditorApi; noteId: string }) {
  const { t } = useTranslation();
  const { openFor, busy, error } = useFormat();
  const [style, setStyle] = useState<FormatStyle>(DEFAULT_VOICE_STYLE);
  const aborter = useRef<AbortController | null>(null);
  const open = openFor === noteId;
  const close = () => {
    aborter.current?.abort();
    useFormat.setState({ openFor: null, busy: false, error: null });
  };

  async function run() {
    aborter.current = new AbortController();
    useFormat.setState({ busy: true, error: null });
    try {
      await formatNote(api, noteId, style, aborter.current.signal);
      useFormat.setState({ openFor: null, busy: false });
    } catch (e) {
      if (aborter.current.signal.aborted) return;
      useFormat.setState({ busy: false, error: t(`voice.error.${errorOf(e)}`) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} title={t("voice.formatTitle")}>
      <div className="flex flex-col gap-4" data-testid="format-dialog">
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={t("voice.formatTitle")}>
          {FORMAT_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style === s}
              onClick={() => setStyle(s)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg border px-3 text-left text-[14px] transition-colors",
                style === s ? "border-[var(--ds-accent)] bg-[color-mix(in_srgb,var(--ds-accent)_6%,transparent)] text-ink" : "border-line text-ink-2 hover:bg-ink/[0.03]",
              )}
              data-testid={`format-style-${s}`}
            >
              <span className={cn("size-3.5 shrink-0 rounded-full border-2", style === s ? "border-[var(--ds-accent)] bg-[var(--ds-accent)]" : "border-ink/25")} />
              {t(`voice.styles.${s}`)}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="primary" icon={<Wand2 className="size-4" />} loading={busy} onClick={() => void run()} data-testid="format-run">
            {busy ? t("voice.formatting") : t("voice.format")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** After «Оформить»: what happened, «Отменить», and the draft before it, folded. */
export function FormatResult({ api, noteId }: { api: EditorApi; noteId: string }) {
  const { t } = useTranslation();
  const last = useFormat((s) => (s.last?.noteId === noteId ? s.last : null));
  const [openDraft, setOpenDraft] = useState(false);
  if (!last) return null;
  return (
    <div className="mx-auto mt-4 w-full max-w-[720px] rounded-xl border border-line bg-surface/80 px-4 py-3 text-[13.5px] shadow-card" data-testid="format-result">
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 shrink-0 text-[var(--ds-accent)]" />
        <span className="flex-1 text-ink-2">{t("voice.formatDone")}</span>
        <Button type="button" variant="ghost" icon={<Undo2 className="size-4" />} onClick={() => undoFormat(api)} data-testid="format-undo">
          {t("voice.reject")}
        </Button>
        <IconButton label={t("common.close")} size="sm" onClick={() => useFormat.setState({ last: null })}>
          <X className="size-4" />
        </IconButton>
      </div>
      <button
        type="button"
        onClick={() => setOpenDraft((o) => !o)}
        aria-expanded={openDraft}
        className="mt-2 flex items-center gap-1 text-[12.5px] font-medium text-ink-3 hover:text-ink-2"
        data-testid="format-draft-toggle"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", !openDraft && "-rotate-90")} />
        {openDraft ? t("voice.hideSource") : t("voice.showSource")}
      </button>
      {openDraft && (
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-ink/[0.04] p-3 font-sans text-[13px] text-ink-2" data-testid="format-draft">
          {last.draft}
        </pre>
      )}
    </div>
  );
}
