import { Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Hash, Star } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { accountDb } from "@/data/db";
import { openTab } from "@/domain/actions";
import { isStarred, noteTitle, useWorkspace, type NoteEntry } from "@/domain/workspace";
import { dragNote } from "@/lib/dnd";
import { formatRelative } from "@/lib/dates";
import { coverGradient } from "@/lib/tokens";
import { runtime } from "@/data/runtime";
import { useAttachmentUrl } from "@/features/doc/Cover";
import { cn, ContextMenu } from "@/ui";
import { noteMenuItems } from "./menus";

function useSnippets(ids: string[]) {
  const key = ids.join(",");
  return (
    useLiveQuery(
      async () => {
        const rows = await accountDb().noteIndex.bulkGet(ids);
        const out: Record<string, string> = {};
        rows.forEach((r, i) => {
          if (r) out[ids[i]!] = r.text.replace(/\s+/g, " ").slice(0, 200);
        });
        return out;
      },
      [key],
    ) ?? {}
  );
}

export function DocCollection({ notes, view }: { notes: NoteEntry[]; view: "grid" | "list" }) {
  const ids = useMemo(() => notes.map((n) => n.id), [notes]);
  const snippets = useSnippets(ids);
  if (view === "list")
    return (
      <div className="px-3 pb-24 sm:px-8" data-testid="doc-list">
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {notes.map((n, i) => (
            <DocRow key={n.id} note={n} snippet={snippets[n.id]} first={i === 0} />
          ))}
        </div>
      </div>
    );
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 px-5 pb-24 sm:gap-5 sm:px-10" data-testid="doc-grid">
      {notes.map((n, i) => (
        <DocCard key={n.id} note={n} snippet={snippets[n.id]} index={i} />
      ))}
    </div>
  );
}

function useOpen(noteId: string) {
  return () => openTab(noteId);
}

function DocCard({ note, snippet, index }: { note: NoteEntry; snippet?: string; index: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const starred = useWorkspace((s) => isStarred(s, { kind: "note", id: note.id }));
  const open = useOpen(note.id);
  return (
    <ContextMenu items={() => noteMenuItems(note.id, t, navigate)}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: Math.min(index, 12) * 0.02, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Link
          to="/doc/$noteId"
          params={{ noteId: note.id }}
          onClick={open}
          draggable
          onDragStart={(e) => dragNote(e, note.id)}
          className="group block overflow-hidden rounded-xl bg-surface shadow-card ring-1 ring-line/70 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(40_30_10/0.05),0_16px_36px_rgb(40_30_10/0.1)]"
          data-testid="doc-card"
        >
          <div className="relative h-24 overflow-hidden" style={{ background: coverGradient(note.id) }}>
            {note.coverThumb && <CardThumb noteId={note.id} attachmentId={note.coverThumb} />}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay [background-image:radial-gradient(rgb(0_0_0/0.5)_0.6px,transparent_0.8px)] [background-size:3px_3px]" />
            {starred && <Star className="absolute right-3 top-3 size-3.5 fill-white/90 text-white/90 drop-shadow" />}
            <span className="absolute -bottom-4 left-4 flex size-10 items-center justify-center rounded-lg bg-surface text-[20px] shadow-card ring-1 ring-line/70">
              {note.icon ?? <FileText className="size-[18px] text-ink-3" />}
            </span>
          </div>
          <div className="px-4 pb-4 pt-6">
            <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-snug tracking-[-0.005em] text-ink">
              {noteTitle(note, t("app.untitled"))}
            </h3>
            <p className="mt-1.5 line-clamp-3 min-h-[3.6em] text-[13px] leading-[1.45] text-ink-2">{snippet ?? ""}</p>
            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-ink-3">
              <span className="truncate">{formatRelative(note.updatedAt)}</span>
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 truncate rounded-full bg-ink/[0.05] px-1.5 py-px">
                  <Hash className="size-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </motion.div>
    </ContextMenu>
  );
}

function DocRow({ note, snippet, first }: { note: NoteEntry; snippet?: string; first: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useOpen(note.id);
  return (
    <ContextMenu items={() => noteMenuItems(note.id, t, navigate)}>
      <Link
        to="/doc/$noteId"
        params={{ noteId: note.id }}
        onClick={open}
        draggable
        onDragStart={(e) => dragNote(e, note.id)}
        className={cn("flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.025]", !first && "border-t border-line")}
        data-testid="doc-row"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-[17px]" style={{ background: coverGradient(note.id) }}>
          {note.icon ?? <FileText className="size-4 text-ink-2" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-medium text-ink">{noteTitle(note, t("app.untitled"))}</div>
          <div className="truncate text-[12.5px] text-ink-3">{snippet || " "}</div>
        </div>
        <span className="hidden shrink-0 text-[12px] text-ink-3 sm:block">{formatRelative(note.updatedAt)}</span>
      </Link>
    </ContextMenu>
  );
}

function CardThumb({ noteId, attachmentId }: { noteId: string; attachmentId: string }) {
  const { url } = useAttachmentUrl(attachmentId, () => runtime().store.keyFor(noteId));
  if (!url) return null;
  return <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />;
}
