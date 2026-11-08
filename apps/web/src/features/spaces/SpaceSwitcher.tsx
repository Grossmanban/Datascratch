import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datascratch/ui";
import { ChevronDown, LogOut, Plus, Settings2, Trash2, UserPlus, Users } from "lucide-react";
import { Tooltip as T } from "radix-ui";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useSharedNewCount } from "@/features/share/SharedWithMePage";
import { useTranslation } from "react-i18next";
import { deleteSpace } from "@/domain/actions";
import type { SpaceEntry } from "@/domain/account";
import { activeSpace, notesInSpace, SHARED_WITH_ME, setActiveSpace, useWorkspace, visibleNotes } from "@/domain/workspace";
import { useUi } from "@/hooks/useUi";
import { iconGlyph } from "@/lib/glyph";
import { tintName } from "@/lib/tokens";
import { cn, DropdownMenu as ActionsMenu, SpaceTile, toast, type MenuItem } from "@/ui";
import { deleteSharedSpace, inviteToSpace, SpaceAvatars } from "./SharedSpaces";

/** Emoji of a space (or a stand-in for an iOS SF Symbol), else its first letter. */
export function spaceGlyph(space: { icon: string | null; name: string } | undefined): string {
  return iconGlyph(space?.icon) || space?.name?.[0]?.toUpperCase() || "✦";
}

/** One-line text that shows its whole self in a tooltip — only when it does not fit. */
function Truncated({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <T.Root open={open} onOpenChange={(o) => setOpen(o && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)} delayDuration={350}>
      <T.Trigger asChild>
        <span ref={ref} className={cn("min-w-0 truncate", className)}>
          {text}
        </span>
      </T.Trigger>
      <T.Portal>
        <T.Content
          side="right"
          sideOffset={10}
          collisionPadding={8}
          className="animate-pop z-[60] max-w-[320px] break-words rounded-sm bg-fg px-2 py-1 text-footnote font-medium text-canvas shadow-popover"
          data-testid="space-name-tooltip"
        >
          {text}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

const show = (patch: Partial<ReturnType<typeof useUi.getState>>) => () => useUi.setState(patch);

/**
 * The space switcher (spec/05 «Пространства»): a popover of spaces — tile, name in one line,
 * people of a shared one, ✓ on the current — then «Создать пространство» and the current space's
 * settings. ↑↓ / Enter / Esc come from the menu; a right click on a space offers its actions.
 */
export function SpaceSwitcher() {
  const { t } = useTranslation();
  const spaces = useWorkspace((s) => s.account.spaces);
  const current = useWorkspace(activeSpace);
  const inShared = useWorkspace((s) => s.activeSpaceId === SHARED_WITH_ME);
  const newShared = useSharedNewCount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState<{ space: SpaceEntry; x: number; y: number } | null>(null);
  const personal = spaces.filter((s) => !s.shared);
  const shared = spaces.filter((s) => s.shared);

  const actionsOf = (s: SpaceEntry): MenuItem[] => {
    if (s.memberOf)
      return [
        { label: t("spaces.members"), icon: <Users className="size-3.5" />, onSelect: show({ spaceMembersFor: s.id }) },
        { label: t("spaces.leave"), icon: <LogOut className="size-3.5" />, danger: true, onSelect: show({ spaceMembersFor: s.id }) },
      ];
    return [
      { label: t("spaceDialog.editTitle"), icon: <Settings2 className="size-3.5" />, onSelect: show({ spaceDialog: { mode: "edit", spaceId: s.id } }) },
      s.shared
        ? { label: t("spaces.members"), icon: <Users className="size-3.5" />, onSelect: show({ spaceMembersFor: s.id }) }
        : { label: t("spaces.invite"), icon: <UserPlus className="size-3.5" />, onSelect: () => void inviteToSpace(t, s.id) },
      { kind: "separator" },
      {
        label: t("common.delete"),
        icon: <Trash2 className="size-3.5" />,
        danger: true,
        disabled: personal.length <= 1 && !s.shared,
        onSelect: () => {
          if (s.shared) void deleteSharedSpace(t, s.id);
          else if (!deleteSpace(s.id)) toast(t("space.deleteNotEmpty"));
        },
      },
    ];
  };

  // Spaces with the same name (e.g. after a migration) are told apart by their document count.
  const sameName = new Set(spaces.filter((s, i) => spaces.some((o, j) => j !== i && o.name === s.name)).map((s) => s.id));
  const label = (s: SpaceEntry) =>
    sameName.has(s.id) ? `${s.name} · ${t("docs.count", { count: visibleNotes(notesInSpace(useWorkspace.getState(), s.id)).length })}` : s.name || "…";

  const row = (s: SpaceEntry) => {
    const isCurrent = s.id === current?.id;
    return (
        <DropdownMenuItem
          key={s.id}
          onContextMenu={(e) => {
            // A space's actions: the switcher closes and they open where the click was.
            e.preventDefault();
            setOpen(false);
            setActions({ space: s, x: e.clientX, y: e.clientY });
          }}
          onSelect={() => setActiveSpace(s.id)}
          icon={<SpaceTile icon={spaceGlyph(s)} tint={tintName(s.color)} size={22} />}
          trailing={s.shared ? <SpaceAvatars spaceId={s.id} size={16} /> : undefined}
          checked={isCurrent}
          className="h-9 gap-2.5"
          data-testid="space-option"
          data-current={isCurrent || undefined}
        >
          <Truncated text={label(s)} className={cn("text-[14px]", isCurrent && "font-semibold")} />
        </DropdownMenuItem>
    );
  };

  const settings: { label: string; icon: ReactNode; run: () => void } | null = !current
    ? null
    : current.memberOf
      ? { label: t("spaces.members"), icon: <Users className="size-4" />, run: show({ spaceMembersFor: current.id }) }
      : { label: t("spaceDialog.editTitle"), icon: <Settings2 className="size-4" />, run: show({ spaceDialog: { mode: "edit", spaceId: current.id } }) };

  return (
    <>
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 min-w-0 max-w-[190px] items-center gap-2 rounded-md px-1.5 text-[14px] font-semibold text-ink transition-colors hover:bg-ink/5 data-[state=open]:bg-ink/[0.07]"
          data-testid="space-switcher"
        >
          {inShared ? <SpaceTile icon="👤" tint="indigo" /> : <SpaceTile icon={spaceGlyph(current)} tint={tintName(current?.color)} />}
          <Truncated text={inShared ? t("sharedWithMe.title") : current?.name || "…"} />
          {newShared > 0 && <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label={t("sharedWithMe.newCount", { count: newShared })} />}
          <ChevronDown className="size-3.5 shrink-0 text-ink-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] max-w-[calc(100vw-24px)] p-1.5" data-testid="space-menu">
        <DropdownMenuLabel>{t("nav.spaces")}</DropdownMenuLabel>
        {personal.map(row)}
        {shared.length > 0 && (
          <>
            <DropdownMenuLabel className="mt-1">{t("spaces.shared")}</DropdownMenuLabel>
            {shared.map(row)}
          </>
        )}
        <DropdownMenuSeparator />
        {/* D-63: shared one by one — its own section, below the spaces, with the new ones counted. */}
        <DropdownMenuItem
          icon={<SpaceTile icon="👤" tint="indigo" size={22} />}
          onSelect={() => {
            setActiveSpace(SHARED_WITH_ME);
            void navigate({ to: "/shared" });
          }}
          trailing={newShared > 0 ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-[18px] text-white tabular-nums" data-testid="shared-new-count">{newShared}</span> : undefined}
          checked={inShared}
          className="h-9 gap-2.5"
          data-testid="shared-with-me-option"
        >
          <span className={cn("text-[14px]", inShared && "font-semibold")}>{t("sharedWithMe.title")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<Plus className="size-4" />} onSelect={show({ spaceDialog: { mode: "create" } })} data-testid="space-create">
          {t("spaceDialog.create")}
        </DropdownMenuItem>
        {settings && (
          <DropdownMenuItem icon={settings.icon} onSelect={settings.run} data-testid="space-settings">
            {settings.label}
          </DropdownMenuItem>
        )}
        {current && !current.memberOf && (
          <DropdownMenuItem
            icon={current.shared ? <Users className="size-4" /> : <UserPlus className="size-4" />}
            onSelect={current.shared ? show({ spaceMembersFor: current.id }) : () => void inviteToSpace(t, current.id)}
          >
            {current.shared ? t("spaces.members") : t("spaces.invite")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    {actions && (
      <ActionsMenu
        open
        onOpenChange={(o) => !o && setActions(null)}
        items={actionsOf(actions.space)}
        trigger={<span aria-hidden className="pointer-events-none fixed size-0" style={{ left: actions.x, top: actions.y }} />}
      />
    )}
    </>
  );
}
