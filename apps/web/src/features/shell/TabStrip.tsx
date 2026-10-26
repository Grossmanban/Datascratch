import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, LayoutGrid, Pin, PinOff, X, XCircle } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { closeOtherTabs, closeTab, setTabPinned } from "@/domain/actions";
import { noteTitle, tabsInSpace, useWorkspace } from "@/domain/workspace";
import { closeDocTab, noteMenuItems } from "@/features/docs/menus";
import { useUi } from "@/hooks/useUi";
import { dragNote } from "@/lib/dnd";
import { iconGlyph } from "@/lib/glyph";
import { tintFg } from "@/lib/tokens";
import { cn, ContextMenu, Tooltip } from "@/ui";

// The tab strip above the screen (spec/12 §12.6): the open documents of the current space (D-48).
// Tabs share the width and shrink down to TAB_MIN; what does not fit folds into a «+N» pill that
// opens the tab overview. The active tab is always in the strip.

const TAB_MIN = 128;
const TAB_GAP = 4;
const PILL = 52;
const SIDE = 8 + 36; // padding + the overview button

function useWidth() {
  // A callback ref: the strip mounts only once there are tabs.
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w] as const;
}

/** Which tabs fit; the active one replaces the last fitting tab when it would be folded. */
export function fitTabs(ids: string[], activeId: string | null, width: number): { shown: string[]; hidden: number } {
  const fits = (n: number, pill: boolean) => n * TAB_MIN + (n - 1) * TAB_GAP + (pill ? PILL + TAB_GAP : 0) <= width - SIDE;
  if (width <= 0 || fits(ids.length, false)) return { shown: ids, hidden: 0 };
  let n = ids.length - 1;
  while (n > 1 && !fits(n, true)) n--;
  const shown = ids.slice(0, n);
  if (activeId && ids.includes(activeId) && !shown.includes(activeId)) shown[shown.length - 1] = activeId;
  return { shown, hidden: ids.length - shown.length };
}

const PINNED_W = 36;

export function TabStrip() {
  const { t } = useTranslation();
  const all = useWorkspace(useShallow((s) => tabsInSpace(s, s.activeSpaceId).map((x) => `${x.pinned ? "p" : "u"}:${x.noteId}`)));
  // Pinned tabs sit compact on the left (spec/12 §12.6); the others share what is left.
  const pinned = all.filter((x) => x.startsWith("p:")).map((x) => x.slice(2));
  const tabs = all.filter((x) => x.startsWith("u:")).map((x) => x.slice(2));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeId = pathname.startsWith("/doc/") ? pathname.slice(5) : null;
  const [ref, width] = useWidth();
  const { shown, hidden } = fitTabs(tabs, activeId, width - pinned.length * (PINNED_W + TAB_GAP));
  if (!all.length) return null;
  return (
    <nav
      ref={ref}
      aria-label={t("nav.tabs")}
      className="flex h-10 shrink-0 items-end gap-1 border-b border-line bg-sidebar/60 px-2 pt-1.5"
      data-testid="tab-strip"
    >
      <LayoutGroup>
        <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-clip">
          {pinned.map((id) => (
            <Tab key={id} noteId={id} active={id === activeId} pinned />
          ))}
          {pinned.length > 0 && tabs.length > 0 && <span className="mx-0.5 mb-2.5 h-4 w-px shrink-0 bg-line" aria-hidden />}
          {shown.map((id) => (
            <Tab key={id} noteId={id} active={id === activeId} />
          ))}
          {hidden > 0 && (
            <motion.button
              layout
              type="button"
              onClick={() => useUi.setState({ tabOverviewOpen: true })}
              className="mb-1 flex h-7 shrink-0 items-center rounded-full bg-ink/[0.06] px-2.5 text-[12.5px] font-semibold tabular-nums text-ink-2 transition-colors hover:bg-ink/[0.1] hover:text-ink"
              aria-label={t("tabs.more", { count: hidden })}
              data-testid="tab-more"
            >
              +{hidden}
            </motion.button>
          )}
        </div>
      </LayoutGroup>
      <Tooltip content={`${t("tabs.overview")} · ⌘⇧\\`} side="bottom">
        <button
          type="button"
          onClick={() => useUi.setState({ tabOverviewOpen: true })}
          aria-label={t("tabs.overview")}
          className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-ink/[0.07] hover:text-ink"
          data-testid="tab-overview-open"
        >
          <LayoutGrid className="size-4" />
        </button>
      </Tooltip>
    </nav>
  );
}

function Tab({ noteId, active, pinned }: { noteId: string; active: boolean; pinned?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const note = useWorkspace((s) => s.notes[noteId]);
  const tint = useWorkspace((s) => s.account.notebooks.find((n) => n.id === note?.notebookId)?.color);
  if (!note) return null;
  const title = noteTitle(note, t("app.untitled"));
  const glyph = iconGlyph(note.icon);
  return (
    <ContextMenu
      items={() => [
        pinned
          ? { label: t("tabs.unpin"), icon: <PinOff className="size-3.5" />, onSelect: () => setTabPinned(noteId, false) }
          : { label: t("tabs.pin"), icon: <Pin className="size-3.5" />, onSelect: () => setTabPinned(noteId, true) },
        ...(pinned ? [] : [{ label: t("docs.closeTab"), icon: <X className="size-3.5" />, onSelect: () => (active ? closeDocTab(noteId, navigate) : closeTab(noteId)) }]),
        { label: t("tabs.closeOthers"), icon: <XCircle className="size-3.5" />, onSelect: () => closeOtherTabs(noteId) },
        { kind: "separator" as const },
        ...noteMenuItems(noteId, t, navigate),
      ]}
    >
      <motion.div
        layout="position"
        transition={{ type: "spring", stiffness: 520, damping: 42 }}
        data-active={active}
        className={cn(
          "group relative -mb-px flex h-[34px] items-center gap-1.5 rounded-t-lg border border-b-0 text-[13px] transition-colors",
          pinned ? "w-9 shrink-0 justify-center" : "min-w-[128px] max-w-[220px] flex-1 basis-[200px] pl-2.5 pr-1",
          active
            ? "border-line bg-canvas font-medium text-ink"
            : "border-transparent text-ink-2 hover:bg-ink/[0.045] hover:text-ink",
        )}
        data-pinned={pinned ? "true" : undefined}
        onAuxClick={(e) => {
          // Middle click closes, as in a browser (not a pinned tab).
          if (e.button === 1 && !pinned) {
            e.preventDefault();
            if (active) closeDocTab(noteId, navigate);
            else closeTab(noteId);
          }
        }}
        data-testid="tab"
      >
        <Link
          to="/doc/$noteId"
          params={{ noteId }}
          className={cn("flex min-w-0 items-center gap-1.5 py-1.5 focus-visible:outline-none", pinned ? "justify-center" : "flex-1")}
          title={title}
          aria-label={pinned ? `${title} · ${t("tabs.pinned")}` : undefined}
          aria-current={active ? "page" : undefined}
          // Drag a tab onto a folder or notebook in the sidebar to move the note.
          onDragStart={(e) => dragNote(e, noteId)}
        >
          <span className="flex size-4 shrink-0 items-center justify-center text-[12.5px] leading-none" aria-hidden>
            {glyph || <FileText className="size-3.5" style={{ color: tintFg(tint) }} />}
          </span>
          {!pinned && <span className="truncate">{title}</span>}
        </Link>
        {!pinned && (
          <button
            type="button"
            aria-label={`${t("docs.closeTab")} «${title}»`}
            onClick={() => (active ? closeDocTab(noteId, navigate) : closeTab(noteId))}
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded text-ink-3 transition hover:bg-ink/10 hover:text-ink focus-visible:opacity-100",
              active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            data-testid="tab-close"
          >
            <X className="size-3" />
          </button>
        )}
      </motion.div>
    </ContextMenu>
  );
}
