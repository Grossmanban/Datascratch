import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Mail, UserPlus, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, NetworkError } from "@/api/client";
import { membersApi } from "@/api/endpoints";
import { useAuth } from "@/auth/session";
import { giveAccessNow, maintainShares } from "@/data/ownerShares";
import { formatDay, localDate } from "@/lib/dates";
import { uuidv7, type Member, type MemberRole, type OutgoingInvitation, type ShareTarget } from "@/lib/shared";
import { Button, confirmDialog, DropdownMenu, IconButton, Input, Spinner, toast } from "@/ui";

/** The link a person without the app (or not signed in) opens to reach the invitation (api.md). */
export const inviteUrl = (id: string) => `${location.origin}/invite/${id}`;

const keyOf = (t: ShareTarget) => `${t.kind}:${t.id}`;

/**
 * D-54 «Люди»: the owner invites a person by email with a role, sees who has access and who is
 * invited, changes a role, closes access, withdraws an invitation or copies its link.
 */
export function PeopleSection({ target }: { target: ShareTarget }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const myEmail = useAuth((s) => s.email);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [copied, setCopied] = useState<string | null>(null);
  // Who has access changes on other devices (an invitation accepted): always fresh when opened.
  const members = useQuery({ queryKey: ["members", keyOf(target)], queryFn: () => membersApi.list(target), staleTime: 0, refetchOnWindowFocus: true });
  const invitations = useQuery({ queryKey: ["invitations", keyOf(target)], queryFn: () => membersApi.outgoing(target), staleTime: 0, refetchOnWindowFocus: true });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["members", keyOf(target)] });
    void qc.invalidateQueries({ queryKey: ["invitations", keyOf(target)] });
  };
  // Someone accepted and waits for the key: deliver it now rather than on the next upkeep pass.
  const waiting = (members.data ?? []).filter((m) => m.status === "awaiting_key" && !m.accountCreatedAfterInvite).length;
  useEffect(() => {
    if (!waiting) return;
    void maintainShares().then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);
  const failed = (e: unknown) =>
    toast(
      e instanceof NetworkError
        ? t("common.requiresOnline")
        : e instanceof ApiError && e.status === 429
          ? t("share.people.tooMany")
          : e instanceof ApiError && e.status === 409
            ? t("share.people.limit")
            : String((e as Error).message),
      { tone: "danger" },
    );

  const invite = useMutation({
    mutationFn: (to: string) => membersApi.invite({ invitationId: uuidv7(), target, email: to, role }),
    onSuccess: () => {
      toast(t("share.people.invited"));
      setEmail("");
      refresh();
    },
    onError: failed,
  });
  const setMemberRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) => membersApi.setRole(target, userId, role),
    onSuccess: refresh,
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => membersApi.remove(target, userId),
    onSuccess: async () => {
      toast(t("share.people.removed"));
      refresh();
      // The key changes now (crypto.md §10.3), and guest links are re-created with it.
      await maintainShares();
      refresh();
    },
    onError: failed,
  });
  const cancel = useMutation({ mutationFn: membersApi.cancelInvitation, onSuccess: refresh, onError: failed });

  const normalized = email.trim().toLowerCase();
  const own = !!myEmail && normalized === myEmail.toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && !own;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) invite.mutate(normalized);
  }

  async function closeAccess(m: Member) {
    const ok = await confirmDialog({
      title: t("share.people.removeTitle", { email: m.email }),
      description: t("share.people.removeText"),
      confirmLabel: t("share.people.remove"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (ok) remove.mutate(m.userId);
  }

  async function copy(inv: OutgoingInvitation) {
    await navigator.clipboard?.writeText(inviteUrl(inv.id)).catch(() => undefined);
    setCopied(inv.id);
    setTimeout(() => setCopied(null), 1600);
  }

  const roleLabel = (r: MemberRole) => (r === "editor" ? t("share.people.editor") : t("share.people.viewer"));
  const roleItems = (current: MemberRole, pick: (r: MemberRole) => void) =>
    (["editor", "viewer"] as const).map((r) => ({ label: roleLabel(r), checked: r === current, onSelect: () => pick(r) }));
  const pending = (invitations.data ?? []).filter((i) => i.status === "pending");
  const offline = members.isError && members.error instanceof NetworkError;

  return (
    <section className="flex flex-col gap-3" data-testid="people">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="text-[13px] font-medium text-ink-2">{t("share.people.title")}</div>
        <div className="flex items-center gap-2">
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={t("share.people.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1"
            aria-label={t("share.people.email")}
            data-testid="invite-email"
          />
          <DropdownMenu
            align="end"
            trigger={
              <Button type="button" variant="ghost" className="shrink-0 gap-1 px-2.5" data-testid="invite-role">
                {roleLabel(role)}
                <ChevronDown className="size-3.5 text-ink-3" />
              </Button>
            }
            items={roleItems(role, setRole)}
          />
        </div>
        {own && <p className="text-[12.5px] text-ink-2">{t("share.people.ownEmail")}</p>}
        <Button type="submit" variant="primary" icon={<UserPlus className="size-4" />} loading={invite.isPending} disabled={!valid} data-testid="invite-submit">
          {t("share.people.invite")}
        </Button>
        <p className="text-[12.5px] leading-snug text-ink-2">{t("share.people.hint")}</p>
      </form>

      {members.isLoading || invitations.isLoading ? (
        <Spinner className="size-4 text-ink-3" />
      ) : offline ? (
        <p className="text-[13px] text-ink-2">{t("common.requiresOnline")}</p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="people-list">
          <li className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
            <Avatar email={myEmail ?? "?"} />
            <div className="min-w-0 flex-1 text-[13.5px]">
              <div className="truncate font-medium text-ink">{t("share.people.you")}</div>
              <div className="truncate text-[12.5px] text-ink-2">{myEmail}</div>
            </div>
            <span className="shrink-0 text-[12.5px] text-ink-2">{t("share.people.owner")}</span>
          </li>
          {(members.data ?? []).map((m) => (
            <li key={m.userId} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5" data-testid="member" data-email={m.email}>
              <Avatar email={m.email} />
              <div className="min-w-0 flex-1 text-[13.5px]">
                <div className="truncate font-medium text-ink">{m.email}</div>
                {m.status === "awaiting_key" && (
                  <div className="truncate text-[12.5px] text-ink-2">
                    {m.accountCreatedAfterInvite ? t("share.people.registeredAfter") : t("share.people.awaitingKey")}
                  </div>
                )}
              </div>
              {m.status === "awaiting_key" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  data-testid="give-access"
                  onClick={async () => {
                    await giveAccessNow(target, m.userId);
                    refresh();
                  }}
                >
                  {t("share.people.giveAccess")}
                </Button>
              )}
              <DropdownMenu
                align="end"
                trigger={
                  <Button size="sm" variant="ghost" className="shrink-0 gap-1 px-2" data-testid="member-role">
                    {roleLabel(m.role)}
                    <ChevronDown className="size-3.5 text-ink-3" />
                  </Button>
                }
                items={[
                  ...roleItems(m.role, (r) => r !== m.role && setMemberRole.mutate({ userId: m.userId, role: r })),
                  { kind: "separator" as const },
                  { label: t("share.people.remove"), danger: true, onSelect: () => void closeAccess(m) },
                ]}
              />
            </li>
          ))}
          {pending.map((i) => (
            <li key={i.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5" data-testid="invitation" data-email={i.email}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-ink-3">
                <Mail className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 text-[13.5px]">
                <div className="truncate text-ink">{i.email}</div>
                <div className="truncate text-[12.5px] text-ink-2">
                  {t("share.people.invitedUntil", { role: roleLabel(i.role), date: formatDay(localDate(new Date(i.expiresAt))) })}
                </div>
              </div>
              <IconButton size="sm" label={t("share.people.copyInvite")} onClick={() => void copy(i)} data-testid="copy-invite">
                {copied === i.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </IconButton>
              <IconButton size="sm" label={t("share.people.cancelInvite")} onClick={() => cancel.mutate(i.id)} className="hover:text-danger" data-testid="cancel-invite">
                <X className="size-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Avatar({ email }: { email: string }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/12 text-[12.5px] font-semibold uppercase text-accent" aria-hidden>
      {email.trim()[0] ?? "?"}
    </span>
  );
}
