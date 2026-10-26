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
import { runtime } from "@/data/runtime";
import { useAttachmentUrl } from "@/features/doc/Cover";
import { cn, ContextMenu, UIDocCard } from "@/ui";
import { noteMenuItems } from "./menus";
import { iconGlyph } from "@/lib/glyph";

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
const CARD_HEIGHT = 200;
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
  const coverUrl = useCardThumb(note.id, note.coverThumb);
  return (
    <ContextMenu items={() => noteMenuItems(note.id, t, navigate)}>
      <motion.div
        initial={delay === null ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: delay ?? 0, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* spec/12 §12.7: the cover's thumbnail makes a document recognisable; no cover — a compact card.
            asChild: the router link is the card root, so its accessible name is the title and excerpt. */}
        <UIDocCard
          asChild
          title={noteTitle(note, t("app.untitled"))}
          subtitle={<span className="line-clamp-3 min-h-[3.6em] block">{snippet ?? ""}</span>}
          cover={coverUrl}
          icon={iconGlyph(note.icon) || null}
          meta={
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <span className="truncate">{formatRelative(note.updatedAt)}</span>
              {note.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 truncate rounded-full bg-ink/[0.05] px-1.5 py-px">
                  <Hash className="size-2.5" />
                  {tag}
                </span>
              ))}
            </span>
          }
          footer={starred ? <Star className="size-3.5 fill-[var(--ds-tint-yellow-fg)] text-[var(--ds-tint-yellow-fg)]" aria-label={t("nav.starred")} /> : undefined}
          className="h-full"
        >
          <Link
            to="/doc/$noteId"
            params={{ noteId: note.id }}
            onClick={open}
            draggable
            onDragStart={(e) => dragNote(e, note.id)}
            data-testid="doc-card"
          />
        </UIDocCard>
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
        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink/[0.045] text-[17px]">
          {note.coverThumb ? <CardThumb noteId={note.id} attachmentId={note.coverThumb} /> : (iconGlyph(note.icon) || <FileText className="size-4 text-ink-2" />)}
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

// Keeps the cover strip's place while the encrypted thumbnail is decrypted (no layout jump).
const PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function useCardThumb(noteId: string, attachmentId: string | null | undefined): string | null {
  const { url } = useAttachmentUrl(attachmentId, () => runtime().store.keyFor(noteId));
  return attachmentId ? (url ?? PLACEHOLDER) : null;
}

function CardThumb({ noteId, attachmentId }: { noteId: string; attachmentId: string }) {
  const { url } = useAttachmentUrl(attachmentId, () => runtime().store.keyFor(noteId));
  if (!url) return null;
  return <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />;
}
