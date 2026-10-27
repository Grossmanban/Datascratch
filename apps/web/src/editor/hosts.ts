import type { useNavigate } from "@tanstack/react-router";
import { attachmentUrl, openDecrypted, storeAttachment, svgToPng } from "@/data/attachments";
import { runtime } from "@/data/runtime";
import { createNote, findInbox, getOrCreateInbox, moveTask, openTab } from "@/domain/actions";
import { allTags, noteTitle, spaceOfNote, spaceOfNotebook, useWorkspace } from "@/domain/workspace";
import i18n from "@/i18n";
import { defaultNoteTitle } from "@/domain/note";
import { features } from "@/lib/features";
import { isFreshNote } from "@/lib/freshNotes";
import { isSvg } from "@/lib/safeMime";
import { fetchRemoteImage } from "@/lib/remoteImage";
import type { EditorHost, NoteSummary } from "./index";

type Nav = ReturnType<typeof useNavigate>;

function summary(noteId: string): NoteSummary | null {
  const n = useWorkspace.getState().notes[noteId];
  if (!n || n.trashedAt) return null;
  return { noteId, title: noteTitle(n, i18n.t("app.untitled")), icon: n.icon };
}

/** Encrypts a file into a note's attachments; `onProgress` gets 0…1 while the chunks are sealed. */
export async function uploadNoteFile(noteId: string, input: File, onProgress?: (done: number) => void) {
  const k = await runtime().store.keyFor(noteId);
  if (!k) throw new Error("no key");
  // An SVG (a picked file or a pasted data:image/svg+xml) is stored as a PNG, never as SVG.
  const file = isSvg(input) ? await svgToPng(input, input.name) : input;
  onProgress?.(0);
  const mime = file.type || "application/octet-stream";
  const id = await storeAttachment(noteId, k, new Uint8Array(await file.arrayBuffer()), mime, onProgress);
  return { attachmentId: id, name: file.name, size: file.size, mime };
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
    // `onProgress` (0…1) feeds the editor's upload placeholder while the file is encrypted; a
    // rejection lets the editor offer «Повторить» (it calls this again with the same file).
    // The agreed form is uploadAttachment(file, { onProgress }); a bare callback is accepted too.
    // Rich paste: images linked from pasted HTML are fetched through the server (D-52) and stored
    // like a dropped file; a rejection keeps the image as a link.
    fetchRemoteImage: (url: string) => fetchRemoteImage(url),
    uploadAttachment: (file: File, progress?: ((done: number) => void) | { onProgress?: (done: number) => void }) =>
      uploadNoteFile(noteId, file, typeof progress === "function" ? progress : progress?.onProgress),
    // Only a raster image, PDF or text opens in a tab; anything else is downloaded (audit 2026-10-27).
    onOpenAttachment: async ({ attachmentId, name, mime }) => {
      const k = await key();
      if (k) await openDecrypted(await attachmentUrl(attachmentId, k), name, mime);
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
    // D-51: task dates belong to the extended mode; in a minimal build they are plain labels.
    taskDates: features.tasks ? "full" : "inert",
    // spec/04: an empty title becomes «Заметка 26 октября 2026» (interface language, creation day) —
    // only for a note the user created here in this session; an existing note is never renamed.
    defaultTitle: () => (isFreshNote(noteId) ? defaultNoteTitle(useWorkspace.getState().notes[noteId]?.createdAt ?? new Date(), i18n.language) : ""),
    onTaskAction: async (action, task) => {
      if (!features.tasks) return;
      if (action === "open") return open(noteId);
      const inbox = findInbox() ?? (await getOrCreateInbox(i18n.t("tasks.inbox")));
      await moveTask(noteId, task.taskId, inbox);
    },
  };
}
