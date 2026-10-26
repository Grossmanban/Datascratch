import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, LayoutGrid, X } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { closeTab } from "@/domain/actions";
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

export function TabStrip() {
  const { t } = useTranslation();
  const tabs = useWorkspace(useShallow((s) => tabsInSpace(s, s.activeSpaceId).map((x) => x.noteId)));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeId = pathname.startsWith("/doc/") ? pathname.slice(5) : null;
  const [ref, width] = useWidth();
  const { shown, hidden } = fitTabs(tabs, activeId, width);
  if (!tabs.length) return null;
  return (
    <nav
      ref={ref}
      aria-label={t("nav.tabs")}
      className="flex h-10 shrink-0 items-end gap-1 border-b border-line bg-sidebar/60 px-2 pt-1.5"
      data-testid="tab-strip"
    >
      <LayoutGroup>
        <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-clip">
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

function Tab({ noteId, active }: { noteId: string; active: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const note = useWorkspace((s) => s.notes[noteId]);
  const tint = useWorkspace((s) => s.account.notebooks.find((n) => n.id === note?.notebookId)?.color);
  if (!note) return null;
  const title = noteTitle(note, t("app.untitled"));
  const glyph = iconGlyph(note.icon);
  return (
    <ContextMenu items={() => noteMenuItems(noteId, t, navigate)}>
      <motion.div
        layout="position"
        transition={{ type: "spring", stiffness: 520, damping: 42 }}
        data-active={active}
        className={cn(
          "group relative -mb-px flex h-[34px] min-w-[128px] max-w-[220px] flex-1 basis-[200px] items-center gap-1.5 rounded-t-lg border border-b-0 pl-2.5 pr-1 text-[13px] transition-colors",
          active
            ? "border-line bg-canvas font-medium text-ink"
            : "border-transparent text-ink-2 hover:bg-ink/[0.045] hover:text-ink",
        )}
        onAuxClick={(e) => {
          // Middle click closes, as in a browser.
          if (e.button === 1) {
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
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 focus-visible:outline-none"
          title={title}
          aria-current={active ? "page" : undefined}
          // Drag a tab onto a folder or notebook in the sidebar to move the note.
          onDragStart={(e) => dragNote(e, noteId)}
        >
          <span className="flex size-4 shrink-0 items-center justify-center text-[12.5px] leading-none" aria-hidden>
            {glyph || <FileText className="size-3.5" style={{ color: tintFg(tint) }} />}
          </span>
          <span className="truncate">{title}</span>
        </Link>
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
      </motion.div>
    </ContextMenu>
  );
}
