import { useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, History, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { closeOtherTabs, closeTab, openTab } from "@/domain/actions";
import { noteTitle, tabsInSpace, useWorkspace, type NoteEntry } from "@/domain/workspace";
import { useCardThumb, useSnippets } from "@/features/docs/DocCards";
import { useUi } from "@/hooks/useUi";
import { useClosedTabs } from "@/lib/closedTabs";
import { formatRelative } from "@/lib/dates";
import { iconGlyph } from "@/lib/glyph";
import { tintBg, tintFg } from "@/lib/tokens";
import { Button, cn, Dialog, SegmentedControl } from "@/ui";

// The tab overview (spec/12 §12.6): every open tab of the space as a card (cover or first lines,
// title, notebook tint), with search, closing, grouping by notebook, «Закрыть остальные» and
// «Недавно закрытые». Opened from «+N», ⌘⇧\ or the tab count on a phone.

export function TabOverview() {
  const { t } = useTranslation();
  const open = useUi((s) => s.tabOverviewOpen);
  const setOpen = (o: boolean) => useUi.setState({ tabOverviewOpen: o });
  return (
    <Dialog open={open} onOpenChange={setOpen} title={t("tabs.overview")} wide className="sm:max-w-[920px]">
      {open && <OverviewBody onDone={() => setOpen(false)} />}
    </Dialog>
  );
}

function OverviewBody({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeId = pathname.startsWith("/doc/") ? pathname.slice(5) : null;
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const ids = useWorkspace(useShallow((s) => tabsInSpace(s, s.activeSpaceId).map((x) => x.noteId)));
  const notes = useWorkspace((s) => s.notes);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const closed = useClosedTabs((s) => (spaceId ? s[spaceId] : undefined));
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<"all" | "notebook">("all");
  const snippet = useSnippets(ids);

  const list = useMemo(() => {
    const lower = q.trim().toLowerCase();
    const all = ids.map((id) => notes[id]).filter((n): n is NoteEntry => !!n);
    return lower ? all.filter((n) => noteTitle(n, "").toLowerCase().includes(lower) || (snippet(n.id) ?? "").toLowerCase().includes(lower)) : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, notes, q]);
  const groups = useMemo(() => {
    if (group === "all") return [{ key: "all", title: null as string | null, color: null as string | null, notes: list }];
    return notebooks
      .map((nb) => ({ key: nb.id, title: nb.name, color: nb.color, notes: list.filter((n) => n.notebookId === nb.id) }))
      .filter((g) => g.notes.length);
  }, [group, list, notebooks]);
  const recent = (closed ?? []).filter((c) => notes[c.noteId] && !notes[c.noteId]!.trashedAt && !ids.includes(c.noteId)).slice(0, 8);

  const go = (id: string) => {
    openTab(id);
    onDone();
    void navigate({ to: "/doc/$noteId", params: { noteId: id } });
  };
  const close = (id: string) => {
    const next = closeTab(id);
    if (id === activeId) void navigate(next ? { to: "/doc/$noteId", params: { noteId: next } } : { to: "/all" });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="tab-overview">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg bg-ink/[0.05] px-3 text-ink-2 focus-within:ring-2 focus-within:ring-accent/40">
          <Search className="size-4 shrink-0" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("tabs.search")}
            aria-label={t("tabs.search")}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        <SegmentedControl
          value={group}
          onChange={setGroup}
          options={[
            { value: "all", label: t("tabs.groupNone") },
            { value: "notebook", label: t("tabs.groupNotebook") },
          ]}
        />
        <Button size="sm" disabled={!activeId || ids.length < 2} onClick={() => activeId && closeOtherTabs(activeId)} data-testid="tab-close-others">
          {t("tabs.closeOthers")}
        </Button>
      </div>

      <div className="scrollbar-thin -mx-1 max-h-[min(62vh,560px)] overflow-y-auto px-1 pb-1">
        {list.length ? (
          groups.map((g) => (
            <section key={g.key} className="mb-4 last:mb-0">
              {g.title && (
                <h3 className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: tintFg(g.color) }} aria-hidden />
                  {g.title}
                </h3>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                <AnimatePresence initial={false}>
                  {g.notes.map((n) => (
                    <TabCard
                      key={n.id}
                      note={n}
                      tint={notebooks.find((nb) => nb.id === n.notebookId)?.color ?? null}
                      notebook={notebooks.find((nb) => nb.id === n.notebookId)?.name ?? ""}
                      snippet={snippet(n.id)}
                      active={n.id === activeId}
                      onOpen={() => go(n.id)}
                      onClose={() => close(n.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))
        ) : (
          <p className="py-10 text-center text-[14px] text-ink-2">{ids.length ? t("palette.noResults") : t("tabs.none")}</p>
        )}

        {recent.length > 0 && !q && (
          <section className="mt-5 border-t border-line pt-4" data-testid="tab-recently-closed">
            <h3 className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
              <History className="size-3.5" aria-hidden />
              {t("tabs.recentlyClosed")}
            </h3>
            <div className="flex flex-col">
              {recent.map((c) => {
                const n = notes[c.noteId]!;
                return (
                  <button
                    key={c.noteId}
                    type="button"
                    onClick={() => go(c.noteId)}
                    className="flex h-9 items-center gap-2.5 rounded-md px-2 text-left text-[14px] text-ink transition-colors hover:bg-ink/[0.05]"
                  >
                    <span className="flex size-4 items-center justify-center text-[13px]" aria-hidden>
                      {iconGlyph(n.icon) || <FileText className="size-3.5 text-ink-2" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{noteTitle(n, t("app.untitled"))}</span>
                    <span className="text-[12.5px] text-ink-2">{formatRelative(new Date(c.closedAt).toISOString())}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TabCard({
  note,
  tint,
  notebook,
  snippet,
  active,
  onOpen,
  onClose,
}: {
  note: NoteEntry;
  tint: string | null;
  notebook: string;
  snippet?: string;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cover = useCardThumb(note.id, note.coverThumb);
  const title = noteTitle(note, t("app.untitled"));
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group relative flex h-[168px] flex-col overflow-hidden rounded-xl bg-surface text-left shadow-[0_1px_2px_rgb(40_30_10/0.06)] ring-1 transition-shadow hover:shadow-[0_6px_18px_rgb(40_30_10/0.1)]",
        active ? "ring-2 ring-accent" : "ring-line",
      )}
      data-testid="tab-card"
    >
      <button type="button" onClick={onOpen} className="flex min-h-0 flex-1 flex-col text-left focus-visible:outline-none" aria-label={title}>
        <div className="relative h-[84px] shrink-0 overflow-hidden" style={{ background: tintBg(tint) }}>
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          ) : (
            <p className="line-clamp-4 px-3 pt-2.5 text-[11.5px] leading-[1.45] text-ink-2">{snippet || " "}</p>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-3">
          <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
            {iconGlyph(note.icon) && <span className="text-[12.5px] leading-none">{iconGlyph(note.icon)}</span>}
            <span className="truncate">{title}</span>
          </span>
          <span className="flex items-center gap-1.5 truncate text-[12px] text-ink-2">
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: tintFg(tint) }} aria-hidden />
            <span className="truncate">{notebook}</span>
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={`${t("docs.closeTab")} «${title}»`}
        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-canvas/85 text-ink-2 opacity-0 shadow-sm backdrop-blur transition hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
        data-testid="tab-card-close"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
