import { Link, useNavigate } from "@tanstack/react-router";
import { Folder as FolderIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateFolder } from "@/domain/actions";
import { folderCounts, useWorkspace, type FolderEntry } from "@/domain/workspace";
import { InlineRename } from "@/features/shell/InlineRename";
import { iconGlyph } from "@/lib/glyph";
import { tintBg, tintFg } from "@/lib/tokens";
import { ContextMenu } from "@/ui";
import { folderMenuItems } from "./menus";

/**
 * The folders of the level shown (a notebook's top level or a folder's children), above its
 * documents: one card per folder with its icon, name and what it holds, in the notebook's tint.
 * Hidden when there are none. The context menu is the sidebar's.
 */
export function FolderStrip({ folders, tint }: { folders: FolderEntry[]; tint: string | null | undefined }) {
  const { t } = useTranslation();
  if (!folders.length) return null;
  return (
    <section aria-label={t("docs.subfolders")} className="px-5 pb-7 sm:px-10" data-testid="folder-strip">
      <h2 className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-ink-2">{t("docs.subfolders")}</h2>
      <div className="scrollbar-thin -mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:overflow-visible sm:px-0">
        {folders.map((f) => (
          <FolderCard key={f.id} folder={f} tint={tint} />
        ))}
      </div>
    </section>
  );
}

function FolderCard({ folder, tint }: { folder: FolderEntry; tint: string | null | undefined }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const docs = useWorkspace((s) => folderCounts(s.notes).get(folder.id) ?? 0);
  const subfolders = useWorkspace((s) => Object.values(s.folders).filter((f) => f.parentId === folder.id).length);
  const glyph = iconGlyph(folder.icon);
  const meta = [docs ? t("docs.count", { count: docs }) : null, subfolders ? t("docs.folders", { count: subfolders }) : null].filter(Boolean).join(" · ");
  const body = (
    <>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[17px] leading-none"
        style={{ background: tintBg(tint) }}
        aria-hidden
      >
        {glyph || <FolderIcon className="size-[18px]" style={{ color: tintFg(folder.color ?? tint) }} fill="currentColor" fillOpacity={0.22} />}
      </span>
      <span className="flex min-w-0 flex-col">
        {renaming ? (
          <InlineRename
            value={folder.name}
            onDone={(v) => {
              if (v) updateFolder(folder.id, { name: v });
              setRenaming(false);
            }}
          />
        ) : (
          <span className="truncate text-[14px] font-semibold text-ink">{folder.name}</span>
        )}
        <span className="truncate text-[12.5px] text-ink-2">{meta || t("docs.emptyShort")}</span>
      </span>
    </>
  );
  const cls =
    "group flex h-[60px] min-w-[184px] snap-start items-center gap-3 rounded-xl bg-surface px-3 shadow-[0_1px_2px_rgb(40_30_10/0.06)] ring-1 ring-line transition duration-150 hover:-translate-y-px hover:shadow-[0_4px_14px_rgb(40_30_10/0.09)] hover:ring-ink/15 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-w-0";
  return (
    <ContextMenu items={() => folderMenuItems(folder.id, t, navigate, () => setRenaming(true))}>
      {renaming ? (
        <div className={cls}>{body}</div>
      ) : (
        <Link to="/folder/$folderId" params={{ folderId: folder.id }} className={cls} data-testid="folder-card">
          {body}
        </Link>
      )}
    </ContextMenu>
  );
}
