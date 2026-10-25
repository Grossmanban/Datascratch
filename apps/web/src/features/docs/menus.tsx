import type { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import {
  Copy,
  FileText,
  FolderInput,
  FolderPlus,
  BookCopy,
  History,
  Palette,
  Pencil,
  Share2,
  Star,
  StarOff,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  createFolder,
  createNote,
  deleteFolder,
  deleteNoteForever,
  duplicateNote,
  moveNote,
  moveNoteToOtherNotebook,
  openTab,
  restoreNote,
  toggleStar,
  trashNote,
  updateFolder,
} from "@/domain/actions";
import { isStarred, useWorkspace, type FolderEntry } from "@/domain/workspace";
import { TINTS, tintFg } from "@/lib/tokens";
import { useUi } from "@/hooks/useUi";
import { confirmDialog, toast, type MenuItem } from "@/ui";

type Nav = ReturnType<typeof useNavigate>;

export async function newNoteAndOpen(nav: Nav, notebookId: string, folderId: string | null = null) {
  const id = await createNote({ notebookId, folderId });
  openTab(id);
  await nav({ to: "/doc/$noteId", params: { noteId: id } });
  return id;
}

function folderTargets(notebookId: string, onPick: (folderId: string | null) => void, t: TFunction, exclude?: string): MenuItem[] {
  const st = useWorkspace.getState();
  const folders = Object.values(st.folders).filter((f) => f.notebookId === notebookId && f.id !== exclude);
  const depth = (f: FolderEntry): number => {
    let d = 0;
    let cur: FolderEntry | undefined = f;
    while (cur?.parentId && d < 10) {
      cur = st.folders[cur.parentId];
      d++;
    }
    return d;
  };
  const ordered: FolderEntry[] = [];
  const visit = (parent: string | null) => {
    for (const f of folders.filter((x) => x.parentId === parent).sort((a, b) => a.order - b.order)) {
      ordered.push(f);
      visit(f.id);
    }
  };
  visit(null);
  return [
    { label: t("docs.moveToRoot"), icon: <FileText className="size-3.5" />, onSelect: () => onPick(null) },
    ...(ordered.length ? [{ kind: "separator" as const }] : []),
    ...ordered.map((f) => ({
      label: `${" ".repeat(depth(f))}${f.name}`,
      icon: <span className="size-2.5 rounded-[3px]" style={{ background: tintFg(f.color) }} />,
      onSelect: () => onPick(f.id),
    })),
  ];
}

/** Other notebooks (grouped by space), each with its folders as move targets. */
function notebookTargets(noteId: string, fromNotebookId: string, t: TFunction): MenuItem[] {
  const { account } = useWorkspace.getState();
  const items: MenuItem[] = [];
  for (const space of [...account.spaces].sort((a, b) => a.order - b.order)) {
    const nbs = account.notebooks.filter((nb) => nb.spaceId === space.id && nb.id !== fromNotebookId).sort((a, b) => a.order - b.order);
    if (!nbs.length) continue;
    if (account.spaces.length > 1) items.push({ kind: "label", label: space.name });
    for (const nb of nbs) {
      items.push({
        kind: "sub",
        label: nb.name,
        icon: nb.icon ? <span className="text-[12px] leading-none">{nb.icon}</span> : <BookCopy className="size-3.5" />,
        items: folderTargets(nb.id, (folderId) => void moveToNotebook(noteId, fromNotebookId, nb.id, folderId, t), t),
      });
    }
  }
  return items;
}

async function moveToNotebook(noteId: string, fromNotebookId: string, toNotebookId: string, folderId: string | null, t: TFunction) {
  const { account } = useWorkspace.getState();
  const from = account.notebooks.find((nb) => nb.id === fromNotebookId);
  const to = account.notebooks.find((nb) => nb.id === toNotebookId);
  if (!to) return;
  // Honest warning: in an agent notebook the server can read the note (crypto.md §8).
  if (to.mode === "agent" && from?.mode !== "agent") {
    const ok = await confirmDialog({
      title: t("docs.moveToAgentTitle", { name: to.name }),
      description: t("docs.moveToAgentWarning"),
      confirmLabel: t("docs.moveConfirm"),
      cancelLabel: t("common.cancel"),
    });
    if (!ok) return;
  }
  if (!navigator.onLine) {
    toast(t("docs.moveNeedsNetwork"));
    return;
  }
  try {
    await moveNoteToOtherNotebook(noteId, toNotebookId, folderId);
    toast(t("docs.movedTo", { name: to.name }));
  } catch {
    toast(t("docs.moveFailed"));
  }
}

export function noteMenuItems(noteId: string, t: TFunction, nav: Nav, opts: { inDoc?: boolean } = {}): MenuItem[] {
  const st = useWorkspace.getState();
  const n = st.notes[noteId];
  if (!n) return [];
  if (n.trashedAt) {
    return [
      { label: t("docs.restore"), icon: <Undo2 className="size-3.5" />, onSelect: () => restoreNote(noteId) },
      { kind: "separator" },
      {
        label: t("docs.deleteForever"),
        icon: <Trash2 className="size-3.5" />,
        danger: true,
        onSelect: async () => {
          const ok = await confirmDialog({
            title: t("docs.deleteForever"),
            description: t("docs.deleteForeverConfirm"),
            confirmLabel: t("common.delete"),
            cancelLabel: t("common.cancel"),
            danger: true,
          });
          if (ok) void deleteNoteForever(noteId);
        },
      },
    ];
  }
  const starred = isStarred(st, { kind: "note", id: noteId });
  return [
    ...(!opts.inDoc
      ? [
          {
            label: t("docs.openInTab"),
            icon: <FileText className="size-3.5" />,
            onSelect: () => {
              openTab(noteId);
              void nav({ to: "/doc/$noteId", params: { noteId } });
            },
          },
        ]
      : []),
    {
      label: starred ? t("docs.unstar") : t("docs.star"),
      icon: starred ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />,
      onSelect: () => toggleStar({ kind: "note", id: noteId }),
    },
    { label: t("docs.share"), icon: <Share2 className="size-3.5" />, onSelect: () => useUi.setState({ shareFor: { kind: "note", id: noteId } }) },
    { label: t("docs.history"), icon: <History className="size-3.5" />, onSelect: () => useUi.setState({ historyFor: noteId }) },
    {
      kind: "sub",
      label: t("docs.moveTo"),
      icon: <FolderInput className="size-3.5" />,
      items: folderTargets(
        n.notebookId,
        (folderId) => {
          moveNote(noteId, folderId);
          toast(t("docs.moved"));
        },
        t,
      ),
    },
    ...(st.account.notebooks.length > 1
      ? [
          {
            kind: "sub" as const,
            label: t("docs.moveToNotebook"),
            icon: <BookCopy className="size-3.5" />,
            items: notebookTargets(noteId, n.notebookId, t),
          },
        ]
      : []),
    {
      label: t("docs.duplicate"),
      icon: <Copy className="size-3.5" />,
      onSelect: async () => {
        const id = await duplicateNote(noteId);
        if (id) {
          openTab(id);
          void nav({ to: "/doc/$noteId", params: { noteId: id } });
        }
      },
    },
    { kind: "separator" },
    {
      label: t("docs.toTrash"),
      icon: <Trash2 className="size-3.5" />,
      danger: true,
      onSelect: () => {
        trashNote(noteId);
        toast(t("docs.trashedToast"), { action: { label: t("docs.undo"), run: () => restoreNote(noteId) } });
        if (opts.inDoc) void nav({ to: "/all" });
      },
    },
  ];
}

export function folderMenuItems(folderId: string, t: TFunction, nav: Nav, startRename: () => void): MenuItem[] {
  const st = useWorkspace.getState();
  const f = st.folders[folderId];
  if (!f) return [];
  const starred = isStarred(st, { kind: "folder", id: folderId });
  return [
    { label: t("nav.newDoc"), icon: <FileText className="size-3.5" />, onSelect: () => void newNoteAndOpen(nav, f.notebookId, folderId) },
    {
      label: t("folder.addSub"),
      icon: <FolderPlus className="size-3.5" />,
      onSelect: () => createFolder({ notebookId: f.notebookId, parentId: folderId, name: t("folder.newName") }),
    },
    { kind: "separator" },
    { label: t("common.rename"), icon: <Pencil className="size-3.5" />, onSelect: startRename },
    {
      kind: "sub",
      label: t("folder.color"),
      icon: <Palette className="size-3.5" />,
      items: TINTS.map((c) => ({
        label: c,
        checked: f.color === `tint.${c}`,
        icon: <span className="size-3 rounded-full" style={{ background: tintFg(`tint.${c}`) }} />,
        onSelect: () => updateFolder(folderId, { color: `tint.${c}` }),
      })),
    },
    {
      label: starred ? t("docs.unstar") : t("docs.star"),
      icon: starred ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />,
      onSelect: () => toggleStar({ kind: "folder", id: folderId }),
    },
    { kind: "separator" },
    {
      label: t("common.delete"),
      icon: <Trash2 className="size-3.5" />,
      danger: true,
      onSelect: async () => {
        const ok = await confirmDialog({
          title: `${t("common.delete")} «${f.name}»`,
          description: t("folder.deleteConfirm"),
          confirmLabel: t("common.delete"),
          cancelLabel: t("common.cancel"),
          danger: true,
        });
        if (ok) deleteFolder(folderId);
      },
    },
  ];
}
