import { Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Hash, Star } from "lucide-react";
import { motion } from "motion/react";
import { memo, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

// Snippets are read from the index only for rows on screen; results are kept so that
// scrolling back does not flash empty text.
const snippetCache = new Map<string, string>();

function useSnippets(ids: string[]) {
  const key = ids.join(",");
  const fresh = useLiveQuery(
    async () => {
      const rows = await accountDb().noteIndex.bulkGet(ids);
      const out: Record<string, string> = {};
      rows.forEach((r, i) => {
        if (r) out[ids[i]!] = r.text.replace(/\s+/g, " ").slice(0, 200);
      });
      return out;
    },
    [key],
  );
  if (fresh) for (const [id, text] of Object.entries(fresh)) snippetCache.set(id, text);
  return (id: string) => fresh?.[id] ?? snippetCache.get(id);
}

const CARD_MIN = 210;
const GRID_GAP = { sm: 20, base: 16 };
const CARD_HEIGHT = 236;
const ROW_HEIGHT = 61;

/** Cards (or rows) of a document list, virtualised: only what is on screen is rendered. */
export function DocCollection({
  notes,
  view,
  scrollRef,
}: {
  notes: NoteEntry[];
  view: "grid" | "list";
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);
  const wide = width >= 600;
  const gap = view === "grid" ? (wide ? GRID_GAP.sm : GRID_GAP.base) : 0;
  const cols = view === "grid" ? Math.max(1, Math.floor((width + gap) / (CARD_MIN + gap))) : 1;
  const rows = Math.ceil(notes.length / cols);
  const mountedAt = useRef(performance.now());
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const scroller = scrollRef.current;
    if (box && scroller) setMargin(box.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop);
  });
  const virtual = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === "grid" ? CARD_HEIGHT + gap : ROW_HEIGHT),
    overscan: 4,
    scrollMargin: margin,
  });
  const items = virtual.getVirtualItems();
  const visibleIds = useMemo(
    () => items.flatMap((r) => notes.slice(r.index * cols, r.index * cols + cols).map((n) => n.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.map((r) => r.index).join(","), notes, cols],
  );
  const snippet = useSnippets(visibleIds);
  // Only the first screen animates in; rows that scroll into view appear at once.
  const animate = performance.now() - mountedAt.current < 800;

  return (
    <div
      ref={boxRef}
      className={view === "grid" ? "px-5 pb-24 sm:px-10" : "px-3 pb-24 sm:px-8"}
      data-testid={view === "grid" ? "doc-grid" : "doc-list"}
    >
      <div
        className={cn("relative", view === "list" && "overflow-hidden rounded-xl border border-line bg-surface")}
        style={{ height: virtual.getTotalSize() }}
      >
        {items.map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtual.measureElement}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${row.start - virtual.options.scrollMargin}px)` }}
          >
            {view === "grid" ? (
              <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gap, paddingBottom: gap }}>
                {notes.slice(row.index * cols, row.index * cols + cols).map((n, i) => (
                  <DocCard key={n.id} note={n} snippet={snippet(n.id)} delay={animate ? Math.min(row.index * cols + i, 12) * 0.02 : null} />
                ))}
              </div>
            ) : (
              notes[row.index] && <DocRow note={notes[row.index]!} snippet={snippet(notes[row.index]!.id)} first={row.index === 0} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(1024);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const cs = getComputedStyle(el);
      setWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function useOpen(noteId: string) {
  return () => openTab(noteId);
}

const DocCard = memo(function DocCard({ note, snippet, delay }: { note: NoteEntry; snippet?: string; delay: number | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const starred = useWorkspace((s) => isStarred(s, { kind: "note", id: note.id }));
  const open = useOpen(note.id);
  return (
    <ContextMenu items={() => noteMenuItems(note.id, t, navigate)}>
      <motion.div
        initial={delay === null ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: delay ?? 0, ease: [0.2, 0.8, 0.2, 1] }}
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
          <div className="relative">
            <div className="relative h-24 overflow-hidden" style={{ background: coverGradient(note.id) }}>
              {note.coverThumb && <CardThumb noteId={note.id} attachmentId={note.coverThumb} />}
              <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay [background-image:radial-gradient(rgb(0_0_0/0.5)_0.6px,transparent_0.8px)] [background-size:3px_3px]" />
              {starred && <Star className="absolute right-3 top-3 size-3.5 fill-white/90 text-white/90 drop-shadow" />}
            </div>
            <span className="absolute -bottom-4 left-4 flex size-10 items-center justify-center rounded-lg bg-surface text-[20px] shadow-card ring-1 ring-line/70">
              {note.icon ?? <FileText className="size-[18px] text-ink-3" />}
            </span>
          </div>
          <div className="px-4 pb-4 pt-6">
            <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-snug tracking-[-0.005em] text-ink">
              {noteTitle(note, t("app.untitled"))}
            </h3>
            <p className="mt-1.5 line-clamp-3 min-h-[3.6em] text-[13px] leading-[1.45] text-ink-2">{snippet ?? ""}</p>
            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-ink-2">
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
});

const DocRow = memo(function DocRow({ note, snippet, first }: { note: NoteEntry; snippet?: string; first: boolean }) {
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
          <div className="truncate text-[12.5px] text-ink-2">{snippet || " "}</div>
        </div>
        <span className="hidden shrink-0 text-[12px] text-ink-2 sm:block">{formatRelative(note.updatedAt)}</span>
      </Link>
    </ContextMenu>
  );
});

function CardThumb({ noteId, attachmentId }: { noteId: string; attachmentId: string }) {
  const { url } = useAttachmentUrl(attachmentId, () => runtime().store.keyFor(noteId));
  if (!url) return null;
  return <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />;
}
