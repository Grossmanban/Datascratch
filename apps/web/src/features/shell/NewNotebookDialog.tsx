import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { createNotebook } from "@/domain/actions";
import { useUi } from "@/hooks/useUi";
import type { NotebookMode } from "@/lib/shared";
import { EMOJI_CHOICES } from "@/lib/tokens";
import { Button, Dialog, DialogActions, Field, Input, Popover } from "@/ui";
import { ModeChoice } from "./ModeChoice";

export function NewNotebookDialog() {
  const { t } = useTranslation();
  const spaceId = useUi((s) => s.newNotebookFor);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📓");
  const [mode, setMode] = useState<NotebookMode>("private");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (spaceId) {
      setName("");
      setIcon("📓");
      setMode("private");
    }
  }, [spaceId]);
  const close = () => useUi.setState({ newNotebookFor: null });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!spaceId) return;
    setBusy(true);
    try {
      await createNotebook({ spaceId, name: name.trim() || t("notebook.newName"), icon, mode });
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!spaceId} onOpenChange={(o) => !o && close()} title={t("nav.newNotebook")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <Popover
            trigger={
              <button type="button" className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-[20px] hover:bg-canvas">
                {icon}
              </button>
            }
          >
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CHOICES.map((e) => (
                <button key={e} type="button" onClick={() => setIcon(e)} className="flex size-8 items-center justify-center rounded-md text-[18px] hover:bg-ink/5">
                  {e}
                </button>
              ))}
            </div>
          </Popover>
          <div className="flex-1">
            <Field label={t("notebook.name")}>
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("notebook.newName")} autoFocus />}
            </Field>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">{t("notebook.mode")}</div>
          <ModeChoice value={mode} onChange={setMode} />
        </div>
        <DialogActions>
          <Button type="button" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {t("common.create")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
