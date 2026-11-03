import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NetworkError } from "@/api/client";
import { membersApi } from "@/api/endpoints";
import { refreshShared } from "@/data/sharedWithMe";
import { OpenInApp } from "./OpenInApp";
import { useUi } from "@/hooks/useUi";
import { formatDay, localDate } from "@/lib/dates";
import type { IncomingInvitation } from "@/lib/shared";
import { Button, cn, Dialog, Spinner, toast } from "@/ui";

/** Pending invitations to this account (D-54); refreshed every minute and when the tab is back. */
export function useIncomingInvitations() {
  return useQuery({
    queryKey: ["incoming-invitations"],
    queryFn: membersApi.incoming,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

/** Sidebar row «Приглашения N», shown only while there are some. */
export function InvitationsRow() {
  const { t } = useTranslation();
  const count = useIncomingInvitations().data?.length ?? 0;
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={() => useUi.setState({ invitationsOpen: true })}
      className="mx-2 mb-1 flex h-8 items-center gap-2.5 rounded-md bg-accent/10 px-2 text-left text-[13.5px] font-medium text-accent hover:bg-accent/15"
      data-testid="invitations-row"
    >
      <Mail className="size-4" />
      <span className="flex-1 truncate">{t("invitations.row")}</span>
      <span className="rounded-full bg-accent px-1.5 text-[11.5px] font-semibold text-canvas">{count}</span>
    </button>
  );
}

/** The list of incoming invitations: who, what, which role — «Принять» / «Отклонить». */
export function InvitationsDialog() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const open = useUi((s) => s.invitationsOpen);
  const incoming = useIncomingInvitations();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["incoming-invitations"] });
    void refreshShared();
  };
  const failed = (e: unknown) => toast(e instanceof NetworkError ? t("common.requiresOnline") : String((e as Error).message), { tone: "danger" });
  const accept = useMutation({
    mutationFn: (i: IncomingInvitation) => membersApi.accept(i.id),
    onSuccess: (item) => {
      toast(item.wrappedKey ? t("invitations.accepted") : t("invitations.acceptedWaiting"));
      done();
    },
    onError: failed,
  });
  const decline = useMutation({
    mutationFn: (i: IncomingInvitation) => membersApi.decline(i.id),
    onSuccess: done,
    onError: failed,
  });
  const list = incoming.data ?? [];
  const highlight = typeof open === "string" ? open : null;

  return (
    <Dialog open={!!open} onOpenChange={(o) => !o && useUi.setState({ invitationsOpen: false })} title={t("invitations.title")}>
      <div className="flex flex-col gap-2" data-testid="invitations">
        {highlight && <OpenInApp target={{ kind: "invite", id: highlight }} className="mb-1" />}
        {incoming.isLoading ? (
          <Spinner className="size-4 text-ink-3" />
        ) : incoming.isError ? (
          <p className="text-[13.5px] text-ink-2">{t("common.requiresOnline")}</p>
        ) : !list.length ? (
          <p className="text-[13.5px] text-ink-2">{highlight ? t("invitations.gone") : t("invitations.none")}</p>
        ) : (
          list.map((i) => (
            <div
              key={i.id}
              data-testid="invitation-in"
              className={cn("flex flex-col gap-2.5 rounded-lg border border-line p-3", highlight === i.id && "border-accent/50 bg-accent/5")}
            >
              <div className="text-[13.5px] leading-snug">
                <span className="font-medium text-ink">{i.from.email}</span>{" "}
                <span className="text-ink-2">{i.target.kind === "notebook" ? t("invitations.toNotebook") : t("invitations.toNote")}</span>
                <div className="mt-0.5 text-[12.5px] text-ink-2">
                  {i.role === "editor" ? t("share.people.editor") : t("share.people.viewer")}
                  {" · "}
                  {t("invitations.until", { date: formatDay(localDate(new Date(i.expiresAt))) })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" loading={accept.isPending && accept.variables?.id === i.id} onClick={() => accept.mutate(i)} data-testid="accept-invitation">
                  {t("invitations.accept")}
                </Button>
                <Button size="sm" variant="ghost" loading={decline.isPending && decline.variables?.id === i.id} onClick={() => decline.mutate(i)} data-testid="decline-invitation">
                  {t("invitations.decline")}
                </Button>
              </div>
            </div>
          ))
        )}
        <p className="pt-1 text-[12.5px] leading-snug text-ink-2">{t("invitations.hint")}</p>
      </div>
    </Dialog>
  );
}
