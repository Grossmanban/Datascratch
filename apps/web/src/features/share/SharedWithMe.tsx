import { Link } from "@tanstack/react-router";
import { Eye, FileText, Hourglass, LogOut, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { NetworkError } from "@/api/client";
import { leaveShared, useShared } from "@/data/sharedWithMe";
import { findNotebook, noteTitle, useWorkspace } from "@/domain/workspace";
import { openTab } from "@/domain/actions";
import { iconGlyph } from "@/lib/glyph";
import { ApiRequestError } from "@datascratch/shared";
import type { SharedRef } from "@/lib/shared";
import { confirmDialog, ContextMenu, toast, Tooltip, type MenuItem } from "@/ui";

/** Placements of the current space in «Общие со мной» (D-54), in their order. */
export function useSharedRefs(spaceId: string | null): SharedRef[] {
  return useWorkspace(useShallow((s) => s.account.shared.filter((r) => r.spaceId === spaceId)));
}

const rowClass =
  "group/row flex h-8 items-center gap-2 rounded-md px-2 text-ink-2 hover:bg-ink/[0.04] hover:text-ink [&.active]:bg-ink/[0.07] [&.active]:text-ink";

/** One shared notebook or note: a link once its key is here, otherwise a quiet «waiting» row. */
export function SharedRow({ shared }: { shared: SharedRef }) {
  const { t } = useTranslation();
  const item = useShared((s) => s.items[`${shared.kind}:${shared.id}`]);
  const nb = useWorkspace(useShallow((s) => (shared.kind === "notebook" ? findNotebook(s, shared.id) : undefined)));
  const note = useWorkspace((s) => (shared.kind === "note" ? s.notes[shared.id] : undefined));
  const name = shared.kind === "notebook" ? nb?.name || t("app.untitled") : noteTitle(note, t("app.untitled"));
  const icon =
    shared.kind === "notebook" ? (
      iconGlyph(nb?.icon) || <Users className="size-3.5" />
    ) : (
      iconGlyph(note?.icon) || <FileText className="size-3.5" />
    );
  const readOnly = item?.role === "viewer";
  const owner = item ? t("shared.from", { email: item.ownerEmail }) : "";

  async function leave() {
    const ok = await confirmDialog({
      title: t("shared.leaveTitle", { name }),
      description: t("shared.leaveText"),
      confirmLabel: t("shared.leave"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
    try {
      await leaveShared({ kind: shared.kind, id: shared.id });
      toast(t("shared.left"));
    } catch (e) {
      const offline = e instanceof NetworkError || (e instanceof ApiRequestError && e.failure.kind === "network");
      toast(offline ? t("common.requiresOnline") : (e as Error).message, { tone: "danger" });
    }
  }

  const menu = (): MenuItem[] => [
    { kind: "label", label: owner },
    { label: t("shared.leave"), icon: <LogOut className="size-4" />, danger: true, onSelect: () => void leave() },
  ];

  const badge = (
    <>
      {item?.agentsMode && <AgentsBadge />}
      {readOnly && (
        <Tooltip content={t("shared.readOnlyHint")}>
          <Eye className="size-3.5 shrink-0 text-ink-3" aria-label={t("shared.readOnly")} />
        </Tooltip>
      )}
    </>
  );

  // Not opened yet: the owner's client has not delivered the key (or the index is still loading).
  const ready = item?.keyed && (shared.kind === "notebook" ? !!nb : !!note);
  if (!ready) {
    return (
      <ContextMenu items={menu}>
        <Tooltip content={item?.keyed ? owner : t("shared.waitingHint")}>
          <div className={`${rowClass} cursor-default opacity-70`} data-testid="shared-row" data-shared-id={shared.id} data-waiting="">
            <Hourglass className="size-3.5 shrink-0" />
            <span className="truncate">{item?.keyed ? name : t("shared.waiting")}</span>
          </div>
        </Tooltip>
      </ContextMenu>
    );
  }

  const body = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center text-[13px] leading-none">{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {badge}
    </>
  );
  return (
    <ContextMenu items={menu}>
      {shared.kind === "notebook" ? (
        <Link to="/notebook/$notebookId" params={{ notebookId: shared.id }} title={owner} className={rowClass} data-testid="shared-row" data-shared-id={shared.id}>
          {body}
        </Link>
      ) : (
        <Link
          to="/doc/$noteId"
          params={{ noteId: shared.id }}
          title={owner}
          onClick={() => openTab(shared.id)}
          className={rowClass}
          data-testid="shared-row"
          data-shared-id={shared.id}
        >
          {body}
        </Link>
      )}
    </ContextMenu>
  );
}

/** ✨ The owner opened this shared notebook to AI agents (D-54); only the owner can change it. */
export function AgentsBadge({ label = false }: { label?: boolean }) {
  const { t } = useTranslation();
  return (
    <Tooltip content={t("shared.agentsHint")}>
      {label ? (
        <span
          className="flex h-7 items-center gap-1.5 rounded-full bg-[var(--ds-tint-purple-bg)] px-2.5 text-[12.5px] font-medium text-[var(--ds-tint-purple-fg)]"
          data-testid="agents-badge"
        >
          <Sparkles className="size-3.5" />
          {t("shared.agents")}
        </span>
      ) : (
        <Sparkles className="size-3.5 shrink-0 text-[var(--ds-tint-purple-fg)]" aria-label={t("shared.agents")} data-testid="agents-badge" />
      )}
    </Tooltip>
  );
}
