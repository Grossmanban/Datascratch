import { useShallow } from "zustand/react/shallow";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowDownUp, ChevronRight, FilePlus2, Folder as FolderIcon, Hash, LayoutGrid, Layers, List, Star, Trash2 } from "lucide-react";
import { useMemo, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { folderPath, notesInSpace, useWorkspace, visibleNotes, type NoteEntry } from "@/domain/workspace";
import { TopBar, PageTitle } from "@/features/shell/PageHeader";
import { setDocView, useUi } from "@/hooks/useUi";
import { tintFg } from "@/lib/tokens";
import { Button, DropdownMenu, EmptyState, IconButton, SegmentedControl } from "@/ui";
import { DocCollection } from "./DocCards";
import { newNoteAndOpen } from "./menus";
import { iconGlyph, withIcon } from "@/lib/glyph";

function sortNotes(notes: NoteEntry[], sort: "updated" | "created" | "title"): NoteEntry[] {
  const out = [...notes];
  if (sort === "title") out.sort((a, b) => (a.title || "￿").localeCompare(b.title || "￿"));
  else if (sort === "created") out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  else out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return out;
}

function ListPage({
  title,
  icon,
  crumbs,
  notes,
  empty,
  newIn,
  extra,
  sortable = true,
}: {
  title: ReactNode;
  icon?: ReactNode;
  crumbs?: ReactNode;
  notes: NoteEntry[];
  empty: { icon: ReactNode; title: string; text?: string };
  newIn?: { notebookId: string; folderId: string | null } | null;
  extra?: ReactNode;
  sortable?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const view = useUi((s) => s.docView);
  const sort = useUi((s) => s.sort);
  const sorted = useMemo(() => (sortable ? sortNotes(notes, sort) : notes), [notes, sort, sortable]);
  const create = newIn ? () => void newNoteAndOpen(navigate, newIn.notebookId, newIn.folderId) : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef} className="scrollbar-thin h-full overflow-y-auto">
      <TopBar
        actions={
          <>
            {sortable && (
              <DropdownMenu
                align="end"
                items={(["updated", "created", "title"] as const).map((s) => ({
                  label: t(`docs.sort${s[0]!.toUpperCase()}${s.slice(1)}` as "docs.sortUpdated"),
                  checked: sort === s,
                  onSelect: () => useUi.setState({ sort: s }),
                }))}
                trigger={
                  <IconButton label={t("docs.sortUpdated")}>
                    <ArrowDownUp className="size-4" />
                  </IconButton>
                }
              />
            )}
            <SegmentedControl
              value={view}
              onChange={setDocView}
              options={[
                { value: "grid", label: <LayoutGrid className="size-3.5" />, title: t("docs.grid") },
                { value: "list", label: <List className="size-3.5" />, title: t("docs.list") },
              ]}
            />
            {create && (
              <IconButton label={t("nav.newDoc")} onClick={create}>
                <FilePlus2 className="size-4" />
              </IconButton>
            )}
          </>
        }
      >
        {crumbs}
      </TopBar>
      <PageTitle icon={icon} title={title} subtitle={notes.length ? t("docs.count", { count: notes.length }) : undefined} />
      {extra}
      {sorted.length ? (
        <DocCollection notes={sorted} view={view} scrollRef={scrollRef} />
      ) : (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.text}
          action={
            create ? (
              <Button variant="primary" onClick={create} icon={<FilePlus2 className="size-4" />}>
                {t("nav.newDoc")}
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

export function AllDocsPage() {
  const { t } = useTranslation();
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notes = useWorkspace((s) => s.notes);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const space = useWorkspace((s) => s.account.spaces.find((x) => x.id === s.activeSpaceId));
  const list = useMemo(
    () => visibleNotes(notesInSpace({ ...useWorkspace.getState(), notes, account: { ...useWorkspace.getState().account, notebooks } }, spaceId)),
    [notes, notebooks, spaceId],
  );
  const firstNb = notebooks.find((n) => n.spaceId === spaceId);
  return (
    <ListPage
      title={t("nav.allDocs")}
      crumbs={space ? <span className="truncate">{withIcon(space.icon, space.name)}</span> : null}
      notes={list}
      empty={{ icon: <Layers className="size-7" />, title: t("docs.emptyTitle"), text: t("docs.emptyText") }}
      newIn={firstNb ? { notebookId: firstNb.id, folderId: null } : null}
    />
  );
}

export function NotebookPage() {
  const { t } = useTranslation();
  const { notebookId } = useParams({ from: "/app/notebook/$notebookId" });
  const nb = useWorkspace((s) => s.account.notebooks.find((n) => n.id === notebookId));
  const notes = useWorkspace((s) => s.notes);
  const folders = useWorkspace((s) => s.folders);
  const list = useMemo(() => visibleNotes(Object.values(notes).filter((n) => n.notebookId === notebookId && !n.folderId)), [notes, notebookId]);
  const subfolders = useMemo(
    () => Object.values(folders).filter((f) => f.notebookId === notebookId && !f.parentId).sort((a, b) => a.order - b.order),
    [folders, notebookId],
  );
  if (!nb) return <Missing />;
  return (
    <ListPage
      title={nb.name}
      icon={iconGlyph(nb.icon) || undefined}
      notes={list}
      empty={{ icon: <FolderIcon className="size-7" />, title: t("docs.emptyFolder") }}
      newIn={{ notebookId, folderId: null }}
      extra={<FolderChips folders={subfolders} />}
    />
  );
}

export function FolderPage() {
  const { t } = useTranslation();
  const { folderId } = useParams({ from: "/app/folder/$folderId" });
  const folder = useWorkspace((s) => s.folders[folderId]);
  const nb = useWorkspace((s) => s.account.notebooks.find((n) => n.id === folder?.notebookId));
  const path = useWorkspace(useShallow((s) => folderPath(s, folderId)));
  const notes = useWorkspace((s) => s.notes);
  const folders = useWorkspace((s) => s.folders);
  const list = useMemo(() => visibleNotes(Object.values(notes).filter((n) => n.folderId === folderId)), [notes, folderId]);
  const subfolders = useMemo(
    () => Object.values(folders).filter((f) => f.parentId === folderId).sort((a, b) => a.order - b.order),
    [folders, folderId],
  );
  if (!folder || !nb) return <Missing />;
  return (
    <ListPage
      title={folder.name}
      icon={iconGlyph(folder.icon) || <FolderIcon className="size-8" style={{ color: tintFg(folder.color) }} fill="currentColor" fillOpacity={0.18} />}
      crumbs={
        <nav className="flex min-w-0 items-center gap-1">
          <Link to="/notebook/$notebookId" params={{ notebookId: nb.id }} className="truncate hover:text-ink">
            {withIcon(nb.icon, nb.name)}
          </Link>
          {path.slice(0, -1).map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRight className="size-3 text-ink-3" />
              <Link to="/folder/$folderId" params={{ folderId: p.id }} className="truncate hover:text-ink">
                {p.name}
              </Link>
            </span>
          ))}
        </nav>
      }
      notes={list}
      empty={{ icon: <FolderIcon className="size-7" />, title: t("docs.emptyFolder") }}
      newIn={{ notebookId: folder.notebookId, folderId }}
      extra={<FolderChips folders={subfolders} />}
    />
  );
}

function FolderChips({ folders }: { folders: { id: string; name: string; color: string | null; icon: string | null }[] }) {
  if (!folders.length) return null;
  return (
    <div className="-mt-1 flex flex-wrap gap-2 px-5 pb-6 sm:px-10">
      {folders.map((f) => (
        <Link
          key={f.id}
          to="/folder/$folderId"
          params={{ folderId: f.id }}
          className="flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_rgb(40_30_10/0.06)] ring-1 ring-line transition hover:ring-ink/20"
        >
          {iconGlyph(f.icon) ? <span>{iconGlyph(f.icon)}</span> : <FolderIcon className="size-4" style={{ color: tintFg(f.color) }} fill="currentColor" fillOpacity={0.2} />}
          {f.name}
        </Link>
      ))}
    </div>
  );
}

export function TagPage() {
  const { t } = useTranslation();
  const params = useParams({ from: "/app/tag/$" });
  const tag = decodeURIComponent(params._splat ?? "");
  const notes = useWorkspace((s) => s.notes);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const list = useMemo(() => {
    const nbs = new Set(notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
    // Nested tags: #work includes #work/project.
    return visibleNotes(Object.values(notes).filter((n) => nbs.has(n.notebookId) && n.tags.some((x) => x === tag || x.startsWith(`${tag}/`))));
  }, [notes, notebooks, spaceId, tag]);
  return (
    <ListPage
      title={
        <span className="inline-flex items-center gap-2">
          <Hash className="size-7 text-ink-3" />
          {tag}
        </span>
      }
      notes={list}
      empty={{ icon: <Hash className="size-7" />, title: t("docs.emptyTag") }}
    />
  );
}

export function StarredPage() {
  const { t } = useTranslation();
  const starred = useWorkspace((s) => s.account.starred);
  const notes = useWorkspace((s) => s.notes);
  const list = useMemo(
    () => visibleNotes(starred.filter((s) => s.kind === "note" && notes[s.id]).map((s) => notes[s.id]!)),
    [starred, notes],
  );
  return (
    <ListPage
      title={t("nav.starred")}
      notes={list}
      empty={{ icon: <Star className="size-7" />, title: t("nav.starred"), text: t("docs.emptyStarred") }}
    />
  );
}

export function TrashPage() {
  const { t } = useTranslation();
  const notes = useWorkspace((s) => s.notes);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const list = useMemo(() => {
    const nbs = new Set(notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
    return Object.values(notes)
      .filter((n) => n.trashedAt && nbs.has(n.notebookId))
      .sort((a, b) => Date.parse(b.trashedAt!) - Date.parse(a.trashedAt!));
  }, [notes, notebooks, spaceId]);
  return (
    <ListPage
      title={t("nav.trash")}
      notes={list}
      sortable={false}
      empty={{ icon: <Trash2 className="size-7" />, title: t("docs.emptyTrash"), text: t("docs.trashHint") }}
      extra={list.length ? <p className="-mt-3 px-5 pb-5 text-[13px] text-ink-2 sm:px-10">{t("docs.trashHint")}</p> : null}
    />
  );
}

function Missing() {
  const { t } = useTranslation();
  return (
    <div className="h-full">
      <TopBar />
      <EmptyState icon={<FolderIcon className="size-7" />} title={t("docs.notFound")} description={t("docs.notFoundText")} />
    </div>
  );
}
