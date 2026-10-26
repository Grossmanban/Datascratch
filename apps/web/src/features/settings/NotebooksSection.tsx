import { Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NetworkError } from "@/api/client";
import { dailyNotebookId, setNotebookMode, setSetting } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { AgentWarning } from "@/features/shell/ModeChoice";
import type { NotebookMode, NotebookRef } from "@/lib/shared";
import { Button, Dialog, DialogActions, DropdownMenu, toast } from "@/ui";
import { Card, Row } from "./SettingsPage";
import { iconGlyph, withIcon } from "@/lib/glyph";

export function NotebooksSection() {
  const { t } = useTranslation();
  const spaces = useWorkspace((s) => s.account.spaces);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const dailyId = useWorkspace(() => dailyNotebookId());
  const [switching, setSwitching] = useState<{ nb: NotebookRef; to: NotebookMode } | null>(null);
  const [busy, setBusy] = useState(false);
  const daily = notebooks.find((n) => n.id === dailyId);

  async function apply() {
    if (!switching) return;
    setBusy(true);
    try {
      await setNotebookMode(switching.nb.id, switching.to);
      setSwitching(null);
    } catch (e) {
      console.warn("[ds] notebook mode change failed", e, (e as { cause?: unknown }).cause);
      // The confirmation stays open: its button is the retry.
      toast(e instanceof NetworkError ? t("notebook.modeNotChangedOffline") : t("notebook.modeNotChanged", { reason: (e as Error).message }), {
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {spaces.map((space) => {
        const list = notebooks.filter((n) => n.spaceId === space.id);
        if (!list.length) return null;
        return (
          <Card key={space.id} title={withIcon(space.icon, space.name)}>
            {list.map((nb) => (
              <Row
                key={nb.id}
                label={
                  <span className="flex items-center gap-2">
                    <span>{iconGlyph(nb.icon)}</span>
                    {nb.name}
                  </span>
                }
                hint={
                  <span className="inline-flex items-center gap-1">
                    {nb.mode === "agent" ? <Sparkles className="size-3 text-[var(--ds-tint-purple-fg)]" /> : <Lock className="size-3" />}
                    {nb.mode === "agent" ? t("notebook.agent") : t("notebook.private")}
                  </span>
                }
              >
                <Button
                  size="sm"
                  variant={nb.mode === "agent" ? "secondary" : "subtle"}
                  onClick={() => setSwitching({ nb, to: nb.mode === "agent" ? "private" : "agent" })}
                  data-testid={`mode-${nb.id}`}
                >
                  {nb.mode === "agent" ? t("notebook.switchToPrivate") : t("notebook.switchToAgent")}
                </Button>
              </Row>
            ))}
          </Card>
        );
      })}

      <Card title={t("settings.dailyNotebook")} description={t("notebook.dailyHere")}>
        <DropdownMenu
          items={notebooks.map((nb) => ({
            label: withIcon(nb.icon, nb.name),
            checked: nb.id === dailyId,
            onSelect: () => setSetting("dailyNotebookId", nb.id),
          }))}
          trigger={<Button size="sm">{daily ? withIcon(daily.icon, daily.name) : "—"}</Button>}
        />
      </Card>

      <Dialog
        open={!!switching}
        onOpenChange={(o) => !o && setSwitching(null)}
        title={switching?.to === "agent" ? t("notebook.switchToAgent") : t("notebook.switchToPrivate")}
        description={switching ? withIcon(switching.nb.icon, switching.nb.name) : undefined}
      >
        {switching?.to === "agent" ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-ink-2">{t("notebook.agentHint")}</p>
            <AgentWarning />
          </div>
        ) : (
          <p className="text-[14px] text-ink-2">{t("notebook.switchToPrivateText")}</p>
        )}
        <DialogActions>
          <Button onClick={() => setSwitching(null)}>{t("common.cancel")}</Button>
          <Button variant="primary" loading={busy} onClick={apply} data-testid="confirm-mode">
            {switching?.to === "agent" ? t("notebook.switchToAgent") : t("notebook.switchToPrivate")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
