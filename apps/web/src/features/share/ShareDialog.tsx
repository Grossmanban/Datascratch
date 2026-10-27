import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Lock, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NetworkError } from "@/api/client";
import { sharesApi } from "@/api/endpoints";
import { notebookKey } from "@/data/keys";
import { runtime } from "@/data/runtime";
import { noteTitle, useWorkspace } from "@/domain/workspace";
import { useUi } from "@/hooks/useUi";
import { formatDay, localDate } from "@/lib/dates";
import { toBase64Url, uuidv7, type Share, type SharePermission } from "@/lib/shared";
import { Button, Dialog, IconButton, SegmentedControl, Spinner, toast } from "@/ui";
import { withIcon } from "@/lib/glyph";
import { PeopleSection } from "./People";

type Expiry = "never" | "1d" | "7d" | "30d";
const EXPIRY_DAYS: Record<Expiry, number | null> = { never: null, "1d": 1, "7d": 7, "30d": 30 };

export function shareUrl(shareId: string, key: Uint8Array): string {
  return `${location.origin}/s/${shareId}#k=${toBase64Url(key)}`;
}

export function ShareDialog() {
  const target = useUi((s) => s.shareFor);
  return <ShareDialogInner key={target ? `${target.kind}:${target.id}` : "none"} />;
}

function ShareDialogInner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const target = useUi((s) => s.shareFor);
  const close = () => useUi.setState({ shareFor: null });
  const note = useWorkspace((s) => (target?.kind === "note" ? s.notes[target.id] : undefined));
  const notebookId = target?.kind === "note" ? note?.notebookId : target?.id;
  const nb = useWorkspace((s) => s.account.notebooks.find((n) => n.id === notebookId));
  const [permission, setPermission] = useState<SharePermission>("edit");
  const [expiry, setExpiry] = useState<Expiry>("never");
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    void (target.kind === "note" ? runtime().store.keyFor(target.id) : notebookKey(target.id)).then((k) => alive && setKey(k));
    return () => {
      alive = false;
    };
  }, [target]);

  const shares = useQuery({ queryKey: ["shares"], queryFn: sharesApi.list, enabled: !!target });
  const mine = (shares.data ?? []).filter((s) => target && s.target.kind === target.kind && s.target.id === target.id);

  const create = useMutation({
    mutationFn: async () => {
      const days = EXPIRY_DAYS[expiry];
      return sharesApi.create({
        shareId: uuidv7(),
        target: target!,
        permission,
        expiresAt: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
      });
    },
    onSuccess: (share) => {
      void qc.invalidateQueries({ queryKey: ["shares"] });
      if (key) void copy(share);
    },
    onError: (e) => toast(e instanceof NetworkError ? t("common.requiresOnline") : String((e as Error).message), { tone: "danger" }),
  });
  const revoke = useMutation({
    mutationFn: sharesApi.revoke,
    onSuccess: () => {
      toast(t("share.revoked"));
      void qc.invalidateQueries({ queryKey: ["shares"] });
    },
  });

  async function copy(share: Share) {
    if (!key) return;
    await navigator.clipboard?.writeText(shareUrl(share.id, key)).catch(() => undefined);
    setCopied(share.id);
    setTimeout(() => setCopied(null), 1600);
  }

  const name = target?.kind === "note" ? noteTitle(note, t("app.untitled")) : nb ? withIcon(nb.icon, nb.name) : "";

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => !o && close()}
      title={t("share.title")}
      description={`${target?.kind === "note" ? t("share.note") : t("share.notebook")} · ${name}`}
    >
      <div className="flex flex-col gap-4" data-testid="share-dialog">
        {target && <PeopleSection target={target} />}
        <div className="border-t border-line pt-4 text-[13px] font-semibold text-ink">{t("share.guestLink")}</div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">{t("share.permission")}</div>
          <SegmentedControl
            className="w-full [&>button]:flex-1"
            value={permission}
            onChange={setPermission}
            options={[
              { value: "edit", label: t("share.edit") },
              { value: "view", label: t("share.view") },
            ]}
          />
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">{t("share.expires")}</div>
          <SegmentedControl
            className="w-full [&>button]:flex-1"
            value={expiry}
            onChange={setExpiry}
            options={[
              { value: "never", label: t("share.expiresNever") },
              { value: "1d", label: t("share.expires1d") },
              { value: "7d", label: t("share.expires7d") },
              { value: "30d", label: t("share.expires30d") },
            ]}
          />
        </div>
        <Button variant="primary" size="lg" icon={<Link2 className="size-4" />} loading={create.isPending} disabled={!key} onClick={() => create.mutate()} data-testid="create-share">
          {t("share.createLink")}
        </Button>
        <p className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
          {nb?.mode === "agent" ? <Sparkles className="mt-0.5 size-3.5 shrink-0" /> : <Lock className="mt-0.5 size-3.5 shrink-0" />}
          <span>
            {t("share.keyHint")} {nb?.mode === "agent" && t("share.agentModeNote")}
          </span>
        </p>

        <div className="border-t border-line pt-4">
          <div className="mb-2 text-[12.5px] font-semibold text-ink-2">{t("share.active")}</div>
          {shares.isLoading ? (
            <Spinner className="size-4 text-ink-3" />
          ) : shares.isError ? (
            <p className="text-[13px] text-ink-2">{t("common.requiresOnline")}</p>
          ) : mine.length ? (
            <ul className="flex flex-col gap-1.5" data-testid="share-list">
              {mine.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg bg-ink/[0.035] py-1.5 pl-3 pr-1.5" data-url={key ? shareUrl(s.id, key) : undefined}>
                  <Link2 className="size-3.5 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <span className="font-medium text-ink">{s.permission === "edit" ? t("share.edit") : t("share.view")}</span>
                    <span className="text-ink-2">
                      {" · "}
                      {s.expiresAt ? t("share.expiresAt", { date: formatDay(localDate(new Date(s.expiresAt))) }) : t("share.expiresNever")}
                    </span>
                  </div>
                  <IconButton size="sm" label={t("share.copyLink")} onClick={() => void copy(s)} data-testid="copy-share">
                    {copied === s.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                  </IconButton>
                  <IconButton size="sm" label={t("share.revoke")} onClick={() => revoke.mutate(s.id)} className="hover:text-danger">
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-2">{t("share.noLinks")}</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
