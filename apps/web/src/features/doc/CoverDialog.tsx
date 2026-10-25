import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/domain/workspace";
import { useUi } from "@/hooks/useUi";
import { Button, cn, Dialog, DialogActions, Spinner } from "@/ui";
import { coverError, imageFrom, pickImage, removeCover, setCoverImage } from "./Cover";

/**
 * «…» → «Обложка» (spec/12 §12.7): the cover is the user's own image only — a file,
 * a pasted screenshot or a dropped picture. No presets.
 */
export function CoverDialog() {
  const { t } = useTranslation();
  const noteId = useUi((s) => s.coverFor);
  const hasCover = useWorkspace((s) => !!(noteId && s.notes[noteId]?.coverThumb));
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const close = () => useUi.setState({ coverFor: null });

  const apply = async (file: File | null) => {
    if (!file || !noteId) return;
    setBusy(true);
    try {
      await setCoverImage(noteId, file);
      close();
    } catch (e) {
      coverError(e, t);
    } finally {
      setBusy(false);
    }
  };

  // Paste anywhere while the dialog is open.
  useEffect(() => {
    if (!noteId) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFrom(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      void apply(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  return (
    <Dialog open={!!noteId} onOpenChange={(o) => !o && !busy && close()} title={t("style.cover")} description={t("cover.description")}>
      <div
        className={cn(
          "flex h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center transition-colors",
          over ? "border-accent bg-accent/[0.06]" : "border-line bg-ink/[0.02]",
        )}
        data-testid="cover-drop"
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void apply(imageFrom(e.dataTransfer));
        }}
      >
        {busy ? (
          <Spinner className="size-5" />
        ) : (
          <>
            <ImagePlus className="size-6 text-ink-2" />
            <p className="max-w-[260px] text-[13.5px] leading-snug text-ink-2">{t("cover.hint")}</p>
            <Button size="sm" onClick={() => void pickImage().then(apply)} data-testid="cover-pick">
              {t("cover.choose")}
            </Button>
          </>
        )}
      </div>
      {hasCover && (
        <DialogActions>
          <Button
            variant="ghost"
            icon={<Trash2 className="size-4" />}
            disabled={busy}
            onClick={() => {
              if (noteId) void removeCover(noteId);
              close();
            }}
          >
            {t("style.removeCover")}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
