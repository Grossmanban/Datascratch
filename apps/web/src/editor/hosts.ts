import type { useNavigate } from "@tanstack/react-router";
import { attachmentUrl, storeAttachment } from "@/data/attachments";
import { runtime } from "@/data/runtime";
import { createNote, findInbox, getOrCreateInbox, moveTask, openTab } from "@/domain/actions";
import { allTags, noteTitle, spaceOfNote, spaceOfNotebook, useWorkspace } from "@/domain/workspace";
import i18n from "@/i18n";
import type { EditorHost, NoteSummary } from "./index";

type Nav = ReturnType<typeof useNavigate>;

function summary(noteId: string): NoteSummary | null {
  const n = useWorkspace.getState().notes[noteId];
  if (!n || n.trashedAt) return null;
  return { noteId, title: noteTitle(n, i18n.t("app.untitled")), icon: n.icon };
}

/** Callbacks the editor needs, for the signed-in owner of a note. */
export function ownerEditorHost(noteId: string, nav: Nav): EditorHost {
  const key = () => runtime().store.keyFor(noteId);
  const open = (id: string) => {
    openTab(id);
    void nav({ to: "/doc/$noteId", params: { noteId: id } });
  };
  return {
    resolveAttachment: async (id) => {
      const k = await key();
      return k ? attachmentUrl(id, k).catch(() => null) : null;
    },
    uploadAttachment: async (file) => {
      const k = await key();
      if (!k) throw new Error("no key");
      const id = await storeAttachment(noteId, k, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
      return { attachmentId: id, name: file.name, size: file.size, mime: file.type || "application/octet-stream" };
    },
    onOpenAttachment: async ({ attachmentId }) => {
      const k = await key();
      if (k) window.open(await attachmentUrl(attachmentId, k), "_blank", "noopener");
    },
    resolveNote: async (id) => summary(id),
    onOpenNote: open,
    searchNotes: async (q) => {
      const st = useWorkspace.getState();
      const lower = q.trim().toLowerCase();
      // [[ suggests documents of this note's space only (D-48).
      const space = spaceOfNote(st, noteId) ?? st.activeSpaceId;
      const all = Object.values(st.notes).filter(
        (n) => !n.trashedAt && n.kind !== "inbox" && n.id !== noteId && spaceOfNotebook(st, n.notebookId) === space,
      );
      const hits = lower
        ? all.filter((n) => n.title.toLowerCase().includes(lower))
        : all.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      return hits.slice(0, 8).map((n) => summary(n.id)!).filter(Boolean);
    },
    createNote: async (title) => {
      const cur = useWorkspace.getState().notes[noteId];
      const st = useWorkspace.getState();
      const nb = cur?.notebookId ?? st.account.notebooks.find((n) => n.spaceId === st.activeSpaceId)?.id ?? st.account.notebooks[0]!.id;
      const id = await createNote({ notebookId: nb, folderId: cur?.folderId ?? null, title });
      return { noteId: id, title };
    },
    searchTags: async (q) => {
      const st = useWorkspace.getState();
      return allTags(st, spaceOfNote(st, noteId) ?? st.activeSpaceId)
        .map((t) => t.name)
        .filter((t) => t.toLowerCase().startsWith(q.toLowerCase()))
        .slice(0, 8);
    },
    onTagClick: (name) => void nav({ to: "/tag/$", params: { _splat: name } }),
    onTaskAction: async (action, task) => {
      if (action === "open") return open(noteId);
      const inbox = findInbox() ?? (await getOrCreateInbox(i18n.t("tasks.inbox")));
      await moveTask(noteId, task.taskId, inbox);
    },
  };
}
