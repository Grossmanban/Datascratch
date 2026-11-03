import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError, NetworkError } from "@/api/client";
import { membersApi } from "@/api/endpoints";
import { sharingApi } from "@/data/sharing";
import { useAuth } from "@/auth/session";
import { leaveSpace, makeSpaceShared, moveNotebookIn, moveNotebookOut, refreshSpaces } from "@/data/sharedSpaces";
import { accountMaps } from "@/domain/account";
import { createNotebook, createSpace, deleteSpace } from "@/domain/actions";
import { setActiveSpace, useWorkspace } from "@/domain/workspace";
import { runtime } from "@/data/runtime";
import { PeopleSection } from "@/features/share/People";
import { useUi } from "@/hooks/useUi";
import { colorFor } from "@/data/presence";
import { Button, cn, confirmDialog, Dialog, Tooltip, toast } from "@/ui";

const spaceTarget = (id: string) => ({ kind: "space" as const, id });

/** Members of a shared space (owner first), for avatars and the members list (D-62). */
export function useSpacePeople(spaceId: string | null) {
  const access = useWorkspace((s) => (spaceId ? s.spaceAccess[spaceId] : undefined));
  const myEmail = useAuth((s) => s.email) ?? "";
  const members = useQuery({
    queryKey: ["members", `space:${spaceId}`],
    queryFn: () => membersApi.list(spaceTarget(spaceId!)),
    enabled: !!spaceId && !!access,
    staleTime: 30_000,
    retry: false,
  });
  const owner = access?.role === "owner" ? myEmail : (access?.ownerEmail ?? "");
  return { access, owner, members: members.data ?? [], loading: members.isLoading };
}

/** Up to three round initials of the people in a shared space, as in the space switcher. */
export function SpaceAvatars({ spaceId, size = 18 }: { spaceId: string; size?: number }) {
  const { owner, members } = useSpacePeople(spaceId);
  const people = [owner, ...members.map((m) => m.email)].filter(Boolean);
  if (people.length < 2) return null;
  const shown = people.slice(0, 3);
  return (
    <span className="ml-auto flex shrink-0 -space-x-1" data-testid="space-avatars" aria-label={people.join(", ")}>
      {shown.map((email) => (
        <span
          key={email}
          className="flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface"
          style={{ width: size, height: size, fontSize: size * 0.5, background: colorFor(email) }}
        >
          {email[0]?.toUpperCase()}
        </span>
      ))}
      {people.length > shown.length && (
        <span
          className="flex items-center justify-center rounded-full bg-ink/10 font-semibold text-ink-2 ring-2 ring-surface"
          style={{ width: size, height: size, fontSize: size * 0.45 }}
        >
          +{people.length - shown.length}
        </span>
      )}
    </span>
  );
}

const offline = (e: unknown) => e instanceof NetworkError || (e instanceof ApiError && e.status === 0);

function failed(t: TFunction, e: unknown, fallback = "spaces.failed") {
  if (offline(e)) return toast(t("common.requiresOnline"), { tone: "danger" });
  if (e instanceof ApiError && e.status === 409) return toast(t("spaces.conflict"), { tone: "danger" });
  console.warn("[ds] shared space:", e);
  toast(t(fallback), { tone: "danger" });
}

/** «Новое общее пространство»: a space made shared at once, with a first notebook, then «Участники». */
export async function createSharedSpaceInteractive(t: TFunction) {
  const id = createSpace({ name: t("spaces.newSharedName"), icon: "👥" });
  try {
    await makeSpaceShared(id);
  } catch (e) {
    deleteSpace(id);
    failed(t, e);
    return;
  }
  await createNotebook({ spaceId: id, name: t("notebook.newName"), icon: "📓" });
  setActiveSpace(id);
  useUi.setState({ spaceMembersFor: id });
}

/** «Пригласить в пространство…» on a personal space: it becomes shared — after a plain warning. */
export async function inviteToSpace(t: TFunction, spaceId: string) {
  const space = useWorkspace.getState().account.spaces.find((s) => s.id === spaceId);
  if (!space) return;
  if (space.shared) return useUi.setState({ spaceMembersFor: spaceId });
  const ok = await confirmDialog({
    title: t("spaces.makeSharedTitle", { name: space.name }),
    description: t("spaces.makeSharedText"),
    confirmLabel: t("spaces.makeShared"),
    cancelLabel: t("common.cancel"),
  });
  if (!ok) return;
  try {
    await makeSpaceShared(spaceId);
  } catch (e) {
    return failed(t, e);
  }
  useUi.setState({ spaceMembersFor: spaceId });
}

/** A personal notebook into a shared space: members will see all of it, its history too. */
export async function moveNotebookIntoSharedSpace(t: TFunction, notebookId: string, spaceId: string) {
  const st = useWorkspace.getState();
  const nb = st.account.notebooks.find((n) => n.id === notebookId);
  const space = st.account.spaces.find((s) => s.id === spaceId);
  if (!nb || !space) return;
  const ok = await confirmDialog({
    title: t("spaces.moveInTitle", { notebook: nb.name, space: space.name }),
    description: t("spaces.moveInText"),
    confirmLabel: t("spaces.moveIn"),
    cancelLabel: t("common.cancel"),
  });
  if (!ok) return;
  try {
    await moveNotebookIn(spaceId, notebookId);
    await refreshSpaces();
    toast(t("spaces.movedIn", { space: space.name }));
  } catch (e) {
    failed(t, e);
  }
}

/** Out of a shared space into a personal one: a new key, members keep only what they saw. */
export async function moveNotebookToPersonalSpace(t: TFunction, notebookId: string, toSpaceId: string) {
  const st = useWorkspace.getState();
  const nb = st.account.notebooks.find((n) => n.id === notebookId);
  const to = st.account.spaces.find((s) => s.id === toSpaceId);
  if (!nb || !to) return;
  const ok = await confirmDialog({
    title: t("spaces.moveOutTitle", { notebook: nb.name, space: to.name }),
    description: t("spaces.moveOutText"),
    confirmLabel: t("spaces.moveOut"),
    cancelLabel: t("common.cancel"),
  });
  if (!ok) return;
  try {
    await moveNotebookOut(nb.spaceId, notebookId, toSpaceId);
    toast(t("spaces.movedOut", { space: to.name }));
  } catch (e) {
    failed(t, e);
  }
}

/** The owner deletes a shared space for everyone: its notebooks and notes go too. */
export async function deleteSharedSpace(t: TFunction, spaceId: string) {
  const space = useWorkspace.getState().account.spaces.find((s) => s.id === spaceId);
  if (!space) return;
  const ok = await confirmDialog({
    title: t("spaces.deleteTitle", { name: space.name }),
    description: t("spaces.deleteText"),
    confirmLabel: t("common.delete"),
    cancelLabel: t("common.cancel"),
    danger: true,
  });
  if (!ok) return;
  try {
    await sharingApi.deleteSpace(spaceId);
  } catch (e) {
    return failed(t, e);
  }
  const rt = runtime();
  const a = accountMaps(rt.account);
  const other = useWorkspace.getState().account.spaces.find((s) => s.id !== spaceId);
  rt.account.transact(() => a.spaces.delete(spaceId));
  if (other) setActiveSpace(other.id);
  await rt.dropSpaceDoc(spaceId);
  await refreshSpaces();
}

/** «Участники пространства»: the owner manages people as for a notebook; a member sees them and can leave. */
export function SpaceMembersDialog() {
  const { t } = useTranslation();
  const spaceId = useUi((s) => s.spaceMembersFor);
  const space = useWorkspace((s) => s.account.spaces.find((x) => x.id === spaceId));
  const { access, owner, members } = useSpacePeople(spaceId);
  const close = () => useUi.setState({ spaceMembersFor: null });
  const isOwner = access?.role === "owner";

  async function leave() {
    if (!spaceId || !space) return;
    const ok = await confirmDialog({
      title: t("spaces.leaveTitle", { name: space.name }),
      description: t("spaces.leaveText"),
      confirmLabel: t("spaces.leave"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
    try {
      await leaveSpace(spaceId);
      close();
      toast(t("spaces.left"));
    } catch (e) {
      failed(t, e);
    }
  }

  return (
    <Dialog open={!!spaceId && !!space} onOpenChange={(o) => !o && close()} title={t("spaces.membersTitle", { name: space?.name ?? "" })}>
      <div className="flex flex-col gap-4" data-testid="space-members">
        <p className="text-[13.5px] text-ink-2">{t("spaces.membersHint")}</p>
        {isOwner && spaceId ? (
          <PeopleSection target={spaceTarget(spaceId)} />
        ) : (
          <ul className="flex flex-col gap-1">
            {[{ email: owner, role: "owner" as const }, ...members.map((m) => ({ email: m.email, role: m.role }))].map((p) => (
              <li key={p.email} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[13.5px]" data-testid="space-member">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                  style={{ background: colorFor(p.email) }}
                >
                  {p.email[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{p.email}</span>
                <span className="shrink-0 text-ink-2">{t(`spaces.role.${p.role}`)}</span>
              </li>
            ))}
          </ul>
        )}
        {!isOwner && (
          <div className="flex justify-end border-t border-line pt-3">
            <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={() => void leave()} data-testid="leave-space">
              {t("spaces.leave")}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/** A small «Общее» mark with the people's initials, for the space switcher and the sidebar. */
export function SharedMark({ spaceId, className }: { spaceId: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <Tooltip content={t("spaces.sharedHint")}>
      <span className={cn("inline-flex items-center", className)}>
        <SpaceAvatars spaceId={spaceId} size={16} />
      </span>
    </Tooltip>
  );
}
