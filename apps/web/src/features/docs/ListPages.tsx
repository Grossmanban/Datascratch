import { useShallow } from "zustand/react/shallow";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowDownUp, ChevronRight, FilePlus2, Folder as FolderIcon, Hash, LayoutGrid, Layers, List, Search, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { runtime } from "@/data/runtime";
import { useIndexVersion } from "@/data/indexer";
import { useTranslation } from "react-i18next";
import { folderPath, notesInSpace, useWorkspace, visibleNotes, type NoteEntry } from "@/domain/workspace";
import { TopBar, PageTitle } from "@/features/shell/PageHeader";
import { setDocView, useUi } from "@/hooks/useUi";
import { tintFg } from "@/lib/tokens";
import { Button, DropdownMenu, EmptyState, IconButton, SegmentedControl } from "@/ui";
import { DocCollection } from "./DocCards";
import { FolderStrip } from "./FolderStrip";
import { UnreadableNote } from "./UnreadableNote";
import { newDocTarget, newNoteAndOpen } from "./menus";
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
  // The list's own filter (title and text, as you type); the space's global search stays in ⌘K.
  const [q, setQ] = useState("");
  const indexV = useIndexVersion((s) => s.v);
  const shown = useMemo(() => {
    const query = q.trim();
    if (!query) return sorted;
    const ids = runtime().indexer.matching(query);
    const lower = query.toLowerCase();
    return sorted.filter((n) => ids.has(n.id) || n.title.toLowerCase().includes(lower));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, q, indexV]);
  const filtering = !!q.trim();
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
      {notes.length > 0 && <ListFilter value={q} onChange={setQ} found={filtering ? shown.length : null} />}
      {!filtering && extra}
      {shown.length ? (
        <DocCollection notes={shown} view={view} scrollRef={scrollRef} />
      ) : filtering ? (
        <EmptyState icon={<Search className="size-7" />} title={t("docs.noMatches")} description={t("docs.noMatchesHint")} />
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

/**
 * Filters the list on screen by title and text as you type (current space only, like the list).
 * «/» or ⌘F focuses it while no text field has the focus; Esc or × clears it.
 */
function ListFilter({ value, onChange, found }: { value: string; onChange: (v: string) => void; found: number | null }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const mod = e.metaKey || e.ctrlKey;
      // Only while the list has the focus: never steal keys from a text field (the filter included).
      if (typing) return;
      if ((e.key === "/" && !mod && !e.altKey) || (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f")) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="px-5 pb-6 sm:px-10">
      <div className="relative max-w-[560px] text-ink-2" data-testid="list-filter">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
        {/* The field itself carries the focus ring (keyboard users see where they are). */}
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            if (value) onChange("");
            else e.currentTarget.blur();
          }}
          placeholder={t("docs.filterPlaceholder")}
          aria-label={t("docs.filterPlaceholder")}
          className="h-10 w-full rounded-xl bg-ink/[0.045] pl-10 pr-28 text-[14.5px] text-ink outline-none transition placeholder:text-ink-3 focus:bg-surface focus:shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(40_30_10/0.06)] focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent)_45%,transparent)] [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-2">
          {found !== null && <span className="text-[12.5px] tabular-nums text-ink-2">{t("docs.count", { count: found })}</span>}
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                ref.current?.focus();
              }}
              aria-label={t("docs.filterClear")}
              className="flex size-6 items-center justify-center rounded-md text-ink-2 transition hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              data-testid="list-filter-clear"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="mr-1 hidden rounded border border-line px-1.5 text-[11px] text-ink-2 sm:inline" aria-hidden>
              /
            </kbd>
          )}
        </div>
      </div>
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
  // The same place as the sidebar's «Новый документ»: the notebook last used in this space.
  const target = useMemo(() => newDocTarget("/all"), [notebooks, spaceId]);
  return (
    <ListPage
      title={t("nav.allDocs")}
      crumbs={space ? <span className="truncate">{withIcon(space.icon, space.name)}</span> : null}
      notes={list}
      empty={{ icon: <Layers className="size-7" />, title: t("docs.emptyTitle"), text: t("docs.emptyText") }}
      newIn={target ? { notebookId: target.notebookId, folderId: null } : null}
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
      extra={
        <>
          <UnreadableNote notebookId={notebookId} />
          <FolderStrip folders={subfolders} tint={nb.color} />
        </>
      }
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
      extra={
        <>
          <UnreadableNote notebookId={nb.id} />
          <FolderStrip folders={subfolders} tint={nb.color} />
        </>
      }
    />
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
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const list = useMemo(() => {
    const nbs = new Set(notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
    return visibleNotes(starred.filter((s) => s.kind === "note" && notes[s.id] && nbs.has(notes[s.id]!.notebookId)).map((s) => notes[s.id]!));
  }, [starred, notes, notebooks, spaceId]);
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
