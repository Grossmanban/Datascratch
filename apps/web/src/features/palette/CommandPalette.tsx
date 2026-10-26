import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Calendar, FilePlus2, FileText, Inbox, Moon, PanelLeft, Settings, SquareCheck, Sun, Layers } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useIndexVersion } from "@/data/indexer";
import { runtime } from "@/data/runtime";
import { createNote, getOrCreateDaily, openTab } from "@/domain/actions";
import { markFreshNote } from "@/features/docs/menus";
import { noteTitle, setActiveSpace, useWorkspace } from "@/domain/workspace";
import { toggleSidebar, useUi } from "@/hooks/useUi";
import { today } from "@/lib/dates";
import { toggleTheme, useTheme } from "@/lib/theme";
import { Kbd } from "@/ui";
import { iconGlyph, withIcon } from "@/lib/glyph";
import { features } from "@/lib/features";

export function CommandPalette() {
  const { t } = useTranslation();
  const open = useUi((s) => s.paletteOpen);
  const close = () => useUi.setState({ paletteOpen: false });
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-[rgb(20_18_14/0.22)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          <motion.div
            className="fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-24px)] max-w-[640px] -translate-x-1/2"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 600, damping: 40 }}
          >
            <PaletteBody onClose={close} label={t("palette.placeholder")} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PaletteBody({ onClose, label }: { onClose: () => void; label: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const notes = useWorkspace((s) => s.notes);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  const spaces = useWorkspace((s) => s.account.spaces);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const theme = useTheme((s) => s.resolved);
  const v = useIndexVersion((s) => s.v);

  const results = useMemo(() => {
    void v;
    // Search and recents cover the current space only (D-48).
    const nbs = new Set(notebooks.filter((n) => n.spaceId === spaceId).map((n) => n.id));
    const visible = Object.values(notes).filter((n) => !n.trashedAt && n.kind !== "inbox" && nbs.has(n.notebookId));
    if (!q.trim()) {
      return visible
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 8)
        .map((n) => ({ noteId: n.id, title: noteTitle(n, t("app.untitled")), snippet: "" }));
    }
    const hits = runtime().indexer.query(q, 20);
    const seen = new Set(hits.map((h) => h.noteId));
    const lower = q.toLowerCase();
    const byTitle = visible.filter((n) => !seen.has(n.id) && n.title.toLowerCase().includes(lower)).map((n) => ({ noteId: n.id, title: n.title, snippet: "" }));
    return [...hits.filter((h) => notes[h.noteId] && !notes[h.noteId]!.trashedAt && nbs.has(notes[h.noteId]!.notebookId)), ...byTitle].slice(0, 20).map((h) => ({
      noteId: h.noteId,
      title: noteTitle(notes[h.noteId], t("app.untitled")),
      snippet: h.snippet,
    }));
  }, [q, notes, notebooks, spaceId, v, t]);

  const go = (fn: () => void | Promise<void>) => {
    onClose();
    void fn();
  };
  const openNote = (id: string) =>
    go(() => {
      openTab(id);
      return navigate({ to: "/doc/$noteId", params: { noteId: id } });
    });
  const nb = notebooks.find((n) => n.spaceId === spaceId);

  return (
    <Command
      label={label}
      shouldFilter={false}
      className="overflow-hidden rounded-xl border border-line glass shadow-popover"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Command.Input
          autoFocus
          value={q}
          onValueChange={setQ}
          placeholder={t("palette.placeholder")}
          className="h-14 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
          data-testid="palette-input"
        />
        <Kbd>esc</Kbd>
      </div>
      <Command.List className="scrollbar-thin max-h-[min(60vh,440px)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-[14px] text-ink-2">{t("palette.noResults")}</Command.Empty>
        {results.length > 0 && (
          <Command.Group heading={t("palette.docs")} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-2">
            {results.map((r) => (
              <Item key={r.noteId} value={`note-${r.noteId}`} onSelect={() => openNote(r.noteId)} icon={iconGlyph(notes[r.noteId]?.icon) || <FileText className="size-4" />}>
                <span className="truncate font-medium">{r.title}</span>
                {r.snippet && <span className="ml-2 truncate text-[13px] text-ink-2">{r.snippet}</span>}
              </Item>
            ))}
          </Command.Group>
        )}
        <Command.Group heading={t("palette.commands")} className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-2">
          {nb && (
            <Item
              value="new-doc"
              icon={<FilePlus2 className="size-4" />}
              shortcut="⌥N"
              onSelect={() =>
                go(async () => {
                  const id = await createNote({ notebookId: nb.id, title: q.trim() || undefined });
                  if (!q.trim()) markFreshNote(id);
                  openNote(id);
                })
              }
            >
              {q.trim() ? t("palette.newDocTitled", { title: q.trim() }) : t("palette.newDoc")}
            </Item>
          )}
          {features.calendar && (
            <Item
              value="today"
              icon={<Sun className="size-4" />}
              shortcut="⌥T"
              onSelect={() => go(async () => openNote(await getOrCreateDaily(today())))}
            >
              {t("palette.goToday")}
            </Item>
          )}
          {features.tasks && (
            <>
              <Item value="tasks" icon={<SquareCheck className="size-4" />} onSelect={() => go(() => navigate({ to: "/tasks/$view", params: { view: "today" } }))}>
                {t("palette.goTasks")}
              </Item>
              <Item value="inbox" icon={<Inbox className="size-4" />} onSelect={() => go(() => navigate({ to: "/tasks/$view", params: { view: "inbox" } }))}>
                {t("palette.newTask")}
              </Item>
            </>
          )}
          {features.calendar && (
            <Item value="calendar" icon={<Calendar className="size-4" />} onSelect={() => go(() => navigate({ to: "/calendar" }))}>
              {t("palette.goCalendar")}
            </Item>
          )}
          <Item value="settings" icon={<Settings className="size-4" />} onSelect={() => go(() => navigate({ to: "/settings/$section", params: { section: "account" } }))}>
            {t("palette.goSettings")}
          </Item>
          <Item value="theme" icon={theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />} shortcut="⇧⌘L" onSelect={() => go(toggleTheme)}>
            {t("palette.toggleTheme")}
          </Item>
          <Item value="sidebar" icon={<PanelLeft className="size-4" />} shortcut="⌘\" onSelect={() => go(toggleSidebar)}>
            {t("palette.toggleSidebar")}
          </Item>
          {spaces
            .filter((s) => s.id !== spaceId)
            .map((s) => (
              <Item key={s.id} value={`space-${s.id}`} icon={<Layers className="size-4" />} onSelect={() => go(() => setActiveSpace(s.id))}>
                {t("palette.switchSpace", { name: withIcon(s.icon, s.name) })}
              </Item>
            ))}
        </Command.Group>
      </Command.List>
    </Command>
  );
}

function Item({ value, icon, children, shortcut, onSelect }: { value: string; icon: ReactNode; children: ReactNode; shortcut?: string; onSelect: () => void }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex h-10 cursor-default items-center gap-3 rounded-lg px-2.5 text-[14px] text-ink data-[selected=true]:bg-ink/[0.06]"
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-ink-2">{icon}</span>
      <span className="flex min-w-0 flex-1 items-baseline">{children}</span>
      {shortcut && <span className="text-[12px] text-ink-2">{shortcut}</span>}
    </Command.Item>
  );
}
