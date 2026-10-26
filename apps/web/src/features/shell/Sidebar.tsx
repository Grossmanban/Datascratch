import { useShallow } from "zustand/react/shallow";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  Hash,
  Inbox,
  Layers,
  Lock,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  SquareCheck,
  Star,
  Sun,
  Trash2,
  X,
  Pencil,
  FileText,
  LockKeyhole,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { accountDb } from "@/data/db";
import {
  closeTab,
  createFolder,
  deleteNotebook,
  deleteSpace,
  moveFolder,
  moveNote,
  moveNotebookToSpace,
  openTab,
  updateFolder,
  updateNotebook,
  updateSpace,
} from "@/domain/actions";
import {
  activeSpace,
  allTags,
  folderCounts,
  noteTitle,
  setActiveSpace,
  notesInSpace,
  spaceNotebooks,
  starredInSpace,
  tabsInSpace,
  useWorkspace,
  visibleNotes,
  type FolderEntry,
} from "@/domain/workspace";
import { useRecoveryUnconfirmed } from "@/auth/recovery";
import { folderMenuItems, newNoteAndOpen, noteMenuItems } from "@/features/docs/menus";
import { useUi } from "@/hooks/useUi";
import { DND_FOLDER, DND_NOTE, dragFolder, dragNote, dropKind } from "@/lib/dnd";
import { today } from "@/lib/dates";
import { tintFg, tintName } from "@/lib/tokens";
import { cn, confirmDialog, ContextMenu, DropdownMenu, IconButton, Kbd, SpaceTile, toast, Tooltip, type MenuItem } from "@/ui";
import type { NotebookRef } from "@/lib/shared";
import { InlineRename } from "./InlineRename";
import { AllTagsDialog, MoreList, TagRow, useSpaceCollapsed, useTagTree } from "./SidebarLists";
import { unreadableMenuState, useUnreadable } from "@/features/docs/UnreadableNote";
import { SyncIndicator } from "./SyncIndicator";
import { createSpaceInteractive } from "./spaces";
import { iconGlyph } from "@/lib/glyph";

function useCollapsed(key: string, def = false) {
  const storageKey = `ds.collapsed.${key}`;
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s === null ? def : s === "1";
    } catch {
      return def;
    }
  });
  const toggle = () =>
    setV((x) => {
      try {
        localStorage.setItem(storageKey, x ? "0" : "1");
      } catch {
        // ignore
      }
      return !x;
    });
  return [v, toggle] as const;
}

export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const space = useWorkspace(activeSpace);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const nbs = useMemo(() => notebooks.filter((n) => n.spaceId === spaceId), [notebooks, spaceId]);
  const recoveryUnconfirmed = useRecoveryUnconfirmed();
  const todayCount = useLiveQuery(
    async () => {
      const d = today();
      const rows = await accountDb().tasks.where("state").equals("open").toArray();
      return rows.filter((r) => (r.scheduled && r.scheduled <= d) || (r.deadline && r.deadline <= d)).length;
    },
    [],
    0,
  );

  // The open notebook stays visible even when folded behind «Ещё N».
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openNotebook = useWorkspace((s) => {
    const [, kind, id] = pathname.split("/");
    if (!id) return null;
    if (kind === "notebook") return id;
    if (kind === "folder") return s.folders[id]?.notebookId ?? null;
    if (kind === "doc") return s.notes[id]?.notebookId ?? null;
    return null;
  });

  const newDoc = () => {
    const nb = nbs[0];
    if (nb) void newNoteAndOpen(navigate, nb.id);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-[13.5px] text-ink" data-testid="sidebar">
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <SpaceSwitcher />
        <div className="flex-1" />
        <IconButton label={t("nav.search")} size="sm" onClick={() => useUi.setState({ paletteOpen: true })}>
          <Search className="size-4" />
        </IconButton>
        {onCollapse ? (
          <IconButton label={t("nav.collapseSidebar")} size="sm" onClick={onCollapse}>
            <PanelLeftClose className="size-4" />
          </IconButton>
        ) : (
          <IconButton label={t("common.close")} size="sm" onClick={() => useUi.setState({ mobileNavOpen: false })}>
            <X className="size-4" />
          </IconButton>
        )}
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={newDoc}
          className="group flex h-8 w-full items-center gap-2 rounded-md bg-surface px-2.5 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_rgb(40_30_10/0.06)] ring-1 ring-line transition hover:ring-ink/15 active:scale-[0.99]"
          data-testid="new-doc"
        >
          <Plus className="size-4 text-ink-2" />
          <span className="flex-1 text-left">{t("nav.newDoc")}</span>
          <span className="hidden gap-0.5 group-hover:flex">
            <Kbd>⌥</Kbd>
            <Kbd>N</Kbd>
          </span>
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
        <div className="flex flex-col gap-px">
          <NavLink to="/all" icon={<Layers className="size-4" />} label={t("nav.allDocs")} />
          <NavLink to="/tasks/today" match="/tasks" icon={<SquareCheck className="size-4" />} label={t("nav.tasks")} badge={todayCount || undefined} />
          <NavLink to="/calendar" icon={<Calendar className="size-4" />} label={t("nav.calendar")} />
        </div>

        <StarredSection />

        <Section
          id="folders"
          title={t("nav.folders")}
          action={
            <IconButton
              label={t("nav.newNotebook")}
              size="sm"
              className="size-6"
              onClick={() => useUi.setState({ newNotebookFor: spaceId })}
            >
              <Plus className="size-3.5" />
            </IconButton>
          }
        >
          <MoreList testId="notebooks" rows={nbs.map((nb) => ({ key: nb.id, node: <NotebookNode nb={nb} />, keep: nb.id === openNotebook }))} />
          {!nbs.length && space && (
            <button
              className="mx-2 my-1 text-left text-[12.5px] text-ink-2 hover:text-ink"
              onClick={() => useUi.setState({ newNotebookFor: spaceId })}
            >
              + {t("nav.newNotebook")}
            </button>
          )}
        </Section>

        <TagsSection />
      </nav>

      <div className="flex items-center gap-1 border-t border-line px-2 py-2">
        <NavLink to="/trash" icon={<Trash2 className="size-4" />} label={t("nav.trash")} compact />
        <NavLink
          to="/settings/account"
          match="/settings"
          icon={
            <span className="relative">
              <Settings className="size-4" />
              {/* Gentle reminder while the recovery key is not confirmed (spec/07). */}
              {recoveryUnconfirmed && (
                <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--ds-warning)]" data-testid="recovery-dot" />
              )}
            </span>
          }
          label={recoveryUnconfirmed ? `${t("nav.settings")} · ${t("settings.recoveryTitle")}` : t("nav.settings")}
          compact
        />
        <div className="flex-1" />
        <SyncIndicator compact />
      </div>
    </div>
  );
}

function NavLink({
  to,
  match,
  icon,
  label,
  badge,
  compact,
}: {
  to: string;
  match?: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  compact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = match ? pathname.startsWith(match) : pathname === to;
  return (
    <Link
      to={to}
      title={compact ? label : undefined}
      aria-label={compact ? label : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2 transition-colors",
        compact && "w-8 justify-center px-0",
        active ? "bg-ink/[0.07] font-medium text-ink" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
      )}
    >
      <span className={cn("shrink-0", active ? "text-ink" : "text-ink-3")}>{icon}</span>
      {!compact && <span className="flex-1 truncate">{label}</span>}
      {!compact && badge ? <span className="rounded-full bg-ink/[0.07] px-1.5 text-[11px] font-semibold text-ink-2">{badge}</span> : null}
    </Link>
  );
}

function Section({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  // Kept per space on this device (spec/12 §12.6, D-48).
  const [collapsed, toggle] = useSpaceCollapsed(id);
  return (
    <section className="mt-5">
      <div className="group flex h-7 items-center px-2">
        <button
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-1 text-[12.5px] font-semibold text-ink-3 hover:text-ink-2"
        >
          {title}
          {/* The chevron shows on hover (and while collapsed, so the section can be found again). */}
          <ChevronDown
            className={cn(
              "size-3 transition-[transform,opacity]",
              collapsed ? "-rotate-90 opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            )}
          />
        </button>
        <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">{action}</div>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-px pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Emoji of a space (or a stand-in for an iOS SF Symbol), else its first letter. */
function spaceGlyph(space: { icon: string | null; name: string } | undefined): string {
  return iconGlyph(space?.icon) || space?.name?.[0]?.toUpperCase() || "✦";
}

function SpaceSwitcher() {
  const { t } = useTranslation();
  const spaces = useWorkspace((s) => s.account.spaces);
  const current = useWorkspace(activeSpace);
  const [renaming, setRenaming] = useState(false);
  // Spaces with the same name (e.g. after a migration) are told apart by their document count.
  const sameName = new Set(spaces.filter((s, i) => spaces.some((o, j) => j !== i && o.name === s.name)).map((s) => s.id));
  const items: MenuItem[] = [
    { kind: "label", label: t("nav.spaces") },
    ...spaces.map((s) => ({
      label: sameName.has(s.id)
        ? `${s.name} · ${t("docs.count", { count: visibleNotes(notesInSpace(useWorkspace.getState(), s.id)).length })}`
        : s.name,
      icon: <SpaceTile icon={spaceGlyph(s)} tint={tintName(s.color)} size={18} />,
      checked: s.id === current?.id,
      onSelect: () => setActiveSpace(s.id),
    })),
    { kind: "separator" },
    { label: t("nav.newSpace"), icon: <Plus className="size-3.5" />, onSelect: () => void createSpaceInteractive(t) },
    ...(current
      ? [
          { label: t("common.rename"), icon: <Pencil className="size-3.5" />, onSelect: () => setRenaming(true) },
          {
            label: t("common.delete"),
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            disabled: spaces.length <= 1,
            onSelect: () => {
              if (!deleteSpace(current.id)) toast(t("space.deleteNotEmpty"));
            },
          },
        ]
      : []),
  ];
  if (renaming && current)
    return (
      <div className="w-40">
        <InlineRename
          value={current.name}
          onDone={(v) => {
            if (v) updateSpace(current.id, { name: v });
            setRenaming(false);
          }}
        />
      </div>
    );
  return (
    <DropdownMenu
      items={items}
      trigger={
        <button
          className="flex h-8 min-w-0 max-w-[170px] items-center gap-2 rounded-md px-1.5 text-[14px] font-semibold text-ink hover:bg-ink/5"
          data-testid="space-switcher"
        >
          <SpaceTile icon={spaceGlyph(current)} tint={tintName(current?.color)} />
          <span className="truncate">{current?.name ?? "…"}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-3" />
        </button>
      }
    />
  );
}

function StarredSection() {
  const { t } = useTranslation();
  const starred = useWorkspace((s) => s.account.starred);
  const notes = useWorkspace((s) => s.notes);
  const folders = useWorkspace((s) => s.folders);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const navigate = useNavigate();
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const items = starred.filter(
    (s) =>
      (s.kind === "note" ? notes[s.id] && !notes[s.id]!.trashedAt : s.kind === "folder" ? folders[s.id] : notebooks.some((n) => n.id === s.id)) &&
      starredInSpace(useWorkspace.getState(), s, spaceId),
  );
  if (!items.length) return null;
  return (
    <Section id="starred" title={t("nav.starred")}>
      <MoreList testId="starred" rows={items.map((s) => ({ key: `${s.kind}:${s.id}`, node: starredRow(s) }))} />
    </Section>
  );

  function starredRow(s: (typeof items)[number]) {
        if (s.kind === "note") {
          const n = notes[s.id]!;
          return (
            <ContextMenu key={s.id} items={() => noteMenuItems(s.id, t, navigate)}>
              <Link
                to="/doc/$noteId"
                params={{ noteId: s.id }}
                onClick={() => openTab(s.id)}
                className="flex h-8 items-center gap-2 rounded-md px-2 text-ink-2 hover:bg-ink/[0.04] hover:text-ink [&.active]:bg-ink/[0.07] [&.active]:text-ink"
              >
                <span className="shrink-0 text-[13px] leading-none">{iconGlyph(n.icon) || <Star className="size-3.5 text-[var(--ds-tint-yellow-fg)]" />}</span>
                <span className="truncate">{noteTitle(n, t("app.untitled"))}</span>
              </Link>
            </ContextMenu>
          );
        }
        if (s.kind === "folder") {
          const f = folders[s.id]!;
          return (
            <Link
              key={s.id}
              to="/folder/$folderId"
              params={{ folderId: s.id }}
              className="flex h-8 items-center gap-2 rounded-md px-2 text-ink-2 hover:bg-ink/[0.04] hover:text-ink [&.active]:bg-ink/[0.07] [&.active]:text-ink"
            >
              <FolderIcon className="size-3.5 shrink-0" style={{ color: tintFg(f.color) }} fill="currentColor" fillOpacity={0.18} />
              <span className="truncate">{f.name}</span>
            </Link>
          );
        }
        const nb = notebooks.find((n) => n.id === s.id)!;
        return (
          <Link
            key={s.id}
            to="/notebook/$notebookId"
            params={{ notebookId: s.id }}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-ink-2 hover:bg-ink/[0.04] hover:text-ink"
          >
            <span className="text-[13px] leading-none">{iconGlyph(nb.icon)}</span>
            <span className="truncate">{nb.name}</span>
          </Link>
        );
  }
}

function useDropTarget(onDrop: (kind: "note" | "folder", id: string) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (!dropKind(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        setOver(false);
        const note = e.dataTransfer.getData(DND_NOTE);
        const folder = e.dataTransfer.getData(DND_FOLDER);
        if (note) {
          e.preventDefault();
          onDrop("note", note);
        } else if (folder) {
          e.preventDefault();
          e.stopPropagation();
          onDrop("folder", folder);
        }
      },
    },
  };
}

function NotebookNode({ nb }: { nb: NotebookRef }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collapsed, toggle] = useCollapsed(`nb.${nb.id}`);
  const [renaming, setRenaming] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const folders = useWorkspace((s) => s.folders);
  const roots = useMemo(
    () => Object.values(folders).filter((f) => f.notebookId === nb.id && !f.parentId).sort((a, b) => a.order - b.order),
    [folders, nb.id],
  );
  const { t: _t } = { t };
  void _t;
  const drop = useDropTarget((kind, id) => {
    const st = useWorkspace.getState();
    if (kind === "note" && st.notes[id]?.notebookId === nb.id) moveNote(id, null);
    if (kind === "folder" && st.folders[id]?.notebookId === nb.id) moveFolder(id, null);
  });
  const active = pathname === `/notebook/${nb.id}`;
  const unreadable = useUnreadable(nb.id);
  const spaces = useWorkspace((s) => s.account.spaces);
  const menu: MenuItem[] = [
    { label: t("nav.newDoc"), icon: <FileText className="size-3.5" />, onSelect: () => void newNoteAndOpen(navigate, nb.id) },
    {
      label: t("nav.newFolder"),
      icon: <FolderPlus className="size-3.5" />,
      onSelect: () => createFolder({ notebookId: nb.id, parentId: null, name: t("folder.newName") }),
    },
    { kind: "separator" },
    { label: t("common.rename"), icon: <Pencil className="size-3.5" />, onSelect: () => setRenaming(true) },
    { label: t("docs.share"), icon: <Share2 className="size-3.5" />, onSelect: () => useUi.setState({ shareFor: { kind: "notebook", id: nb.id } }) },
    {
      label: nb.mode === "agent" ? t("notebook.agent") : t("notebook.private"),
      icon: nb.mode === "agent" ? <Sparkles className="size-3.5" /> : <Lock className="size-3.5" />,
      onSelect: () => void navigate({ to: "/settings/$section", params: { section: "notebooks" } }),
    },
    ...(spaces.length > 1
      ? [
          {
            kind: "sub" as const,
            label: t("docs.moveToSpace"),
            icon: <Layers className="size-3.5" />,
            items: spaces
              .filter((s) => s.id !== nb.spaceId)
              .map((s) => ({
                label: s.name,
                icon: <SpaceTile icon={spaceGlyph(s)} tint={tintName(s.color)} size={16} />,
                onSelect: () => {
                  moveNotebookToSpace(nb.id, s.id);
                  toast(t("docs.movedTo", { name: s.name }));
                },
              })),
          },
        ]
      : []),
    ...(unreadable.has
      ? [
          {
            label: t("sync.unreadableShow"),
            icon: <LockKeyhole className="size-3.5" />,
            onSelect: () => {
              unreadableMenuState(nb.id).showAgain();
              void navigate({ to: "/notebook/$notebookId", params: { notebookId: nb.id } });
            },
          },
        ]
      : []),
    { kind: "separator" },
    {
      label: t("common.delete"),
      icon: <Trash2 className="size-3.5" />,
      danger: true,
      onSelect: async () => {
        const ok = await confirmDialog({
          title: `${t("common.delete")} «${nb.name}»`,
          description: t("notebook.deleteConfirm"),
          confirmLabel: t("common.delete"),
          cancelLabel: t("common.cancel"),
          danger: true,
        });
        if (ok) await deleteNotebook(nb.id);
      },
    },
  ];
  return (
    <div>
      <ContextMenu items={menu}>
        <div
          {...drop.props}
          className={cn(
            "group flex h-8 items-center gap-1 rounded-md pl-0.5 pr-1 transition-colors",
            active ? "bg-ink/[0.07] text-ink" : "text-ink hover:bg-ink/[0.04]",
            drop.over && "bg-accent/10 ring-1 ring-accent/40",
          )}
        >
          {/* Only a notebook with folders has something to unfold (no dead chevrons). */}
          {roots.length ? (
            <button
              onClick={toggle}
              aria-label={`${collapsed ? t("common.expand") : t("common.collapse")} «${nb.name}»`}
              aria-expanded={!collapsed}
              className="flex size-6 shrink-0 items-center justify-center rounded text-ink-3 hover:text-ink"
            >
              <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-90")} />
            </button>
          ) : (
            <span className="size-6 shrink-0" aria-hidden />
          )}
          {renaming ? (
            <InlineRename
              value={nb.name}
              onDone={(v) => {
                if (v) updateNotebook(nb.id, { name: v });
                setRenaming(false);
              }}
            />
          ) : (
            <Link
              to="/notebook/$notebookId"
              params={{ notebookId: nb.id }}
              className="flex min-w-0 flex-1 items-center gap-2 font-medium"
              onDoubleClick={() => setRenaming(true)}
            >
              <span className="text-[14px] leading-none">{iconGlyph(nb.icon)}</span>
              <span className="truncate">{nb.name}</span>
              {nb.mode === "agent" && <Sparkles className="size-3 shrink-0 text-[var(--ds-tint-purple-fg)]" aria-label={t("notebook.agent")} />}
            </Link>
          )}
          <DropdownMenu
            items={menu}
            align="end"
            trigger={
              <button
                aria-label={t("nav.addToNotebook")}
                className="flex size-6 items-center justify-center rounded text-ink-3 opacity-0 focus-visible:opacity-100 hover:bg-ink/10 hover:text-ink group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <Plus className="size-3.5" />
              </button>
            }
          />
        </div>
      </ContextMenu>
      <AnimatePresence initial={false}>
        {!collapsed && roots.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {roots.map((f) => (
              <FolderNode key={f.id} folder={f} depth={1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FolderNode({ folder, depth }: { folder: FolderEntry; depth: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collapsed, toggle] = useCollapsed(`f.${folder.id}`, true);
  const [renaming, setRenaming] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const folders = useWorkspace((s) => s.folders);
  const count = useWorkspace((s) => folderCounts(s.notes).get(folder.id) ?? 0);
  const children = useMemo(
    () => Object.values(folders).filter((f) => f.parentId === folder.id).sort((a, b) => a.order - b.order),
    [folders, folder.id],
  );
  const drop = useDropTarget((kind, id) => {
    const st = useWorkspace.getState();
    if (kind === "note") {
      if (st.notes[id]?.notebookId !== folder.notebookId) return;
      moveNote(id, folder.id);
      toast(t("docs.moved"));
    } else if (id !== folder.id) moveFolder(id, folder.id);
  });
  const active = pathname === `/folder/${folder.id}`;
  return (
    <div>
      <ContextMenu items={() => folderMenuItems(folder.id, t, navigate, () => setRenaming(true))}>
        <div
          {...drop.props}
          draggable={!renaming}
          onDragStart={(e) => {
            e.stopPropagation();
            dragFolder(e, folder.id);
          }}
          style={{ paddingLeft: depth * 14 }}
          className={cn(
            "group flex h-8 items-center gap-1 rounded-md pr-1 transition-colors",
            active ? "bg-ink/[0.07] text-ink" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
            drop.over && "bg-accent/10 ring-1 ring-accent/40",
          )}
          data-testid="folder-node"
        >
          <button
            onClick={toggle}
            aria-label={`${collapsed ? t("common.expand") : t("common.collapse")} «${folder.name}»`}
            aria-expanded={!collapsed}
            className={cn("flex size-5 shrink-0 items-center justify-center rounded text-ink-3 hover:text-ink", !children.length && "invisible")}
          >
            <ChevronRight className={cn("size-3 transition-transform", !collapsed && "rotate-90")} />
          </button>
          {iconGlyph(folder.icon) ? (
            <span className="text-[13px] leading-none">{iconGlyph(folder.icon)}</span>
          ) : (
            <FolderIcon className="size-3.5 shrink-0" style={{ color: tintFg(folder.color) }} fill="currentColor" fillOpacity={0.2} />
          )}
          {renaming ? (
            <InlineRename
              value={folder.name}
              onDone={(v) => {
                if (v) updateFolder(folder.id, { name: v });
                setRenaming(false);
              }}
            />
          ) : (
            <Link
              to="/folder/$folderId"
              params={{ folderId: folder.id }}
              className="min-w-0 flex-1 truncate pl-1"
              onDoubleClick={() => setRenaming(true)}
            >
              {folder.name}
            </Link>
          )}
          {count > 0 && <span className="pr-1 text-[11.5px] text-ink-2 group-hover:hidden">{count}</span>}
          <button
            aria-label={t("nav.newDoc")}
            onClick={() => void newNoteAndOpen(navigate, folder.notebookId, folder.id)}
            className="hidden size-6 items-center justify-center rounded text-ink-3 hover:bg-ink/10 hover:text-ink group-hover:flex"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </ContextMenu>
      {!collapsed && children.map((c) => <FolderNode key={c.id} folder={c} depth={depth + 1} />)}
    </div>
  );
}

function TagsSection() {
  const { t } = useTranslation();
  const { roots, flat } = useTagTree();
  const [all, setAll] = useState(false);
  if (!roots.length) return null;
  return (
    <Section id="tags" title={t("nav.tags")}>
      <MoreList testId="tags" rows={roots.map((n) => ({ key: n.path, node: <TagRow node={n} /> }))} />
      <button
        type="button"
        onClick={() => setAll(true)}
        className="flex h-7 items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-ink/[0.04] hover:text-ink"
        data-testid="all-tags-open"
      >
        <Hash className="size-3" aria-hidden />
        {t("nav.allTags")}
      </button>
      <AllTagsDialog open={all} onOpenChange={setAll} tags={flat} />
    </Section>
  );
}

export const SidebarIcons = { Inbox, Sun };
export { spaceNotebooks };
