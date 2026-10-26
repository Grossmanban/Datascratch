import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CoverDialog } from "@/features/doc/CoverDialog";
import { syncRecoveryFlag } from "@/auth/recovery";
import { consumeFreshAccount, useAuth } from "@/auth/session";
import { hasRuntime, startRuntime } from "@/data/runtime";
import { activeTabOf, bootstrapAccount, migrateSpaceSettings, purgeOldTrash, tidyTabs } from "@/domain/actions";
import { spaceOfNote, spaceOfNotebook, useWorkspace } from "@/domain/workspace";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { ShareDialog } from "@/features/share/ShareDialog";
import { HistoryDialog } from "@/features/doc/HistoryDialog";
import { NewNotebookDialog } from "@/features/shell/NewNotebookDialog";
import { useIsMobile } from "@/hooks/useMedia";
import { focusKindOf, toggleSidebar, useUi } from "@/hooks/useUi";
import { cn } from "@/ui";
import { Sidebar } from "./Sidebar";
import { TabOverview } from "./TabOverview";
import { TabStrip } from "./TabStrip";
import { Splash } from "./Splash";
import { useShortcuts } from "./shortcuts";

export function AppShell() {
  const { t } = useTranslation();
  const accountDocId = useAuth((s) => s.accountDocId);
  const userId = useAuth((s) => s.userId);
  const ready = useWorkspace((s) => s.ready);
  const synced = useWorkspace((s) => s.accountSynced);
  const spaces = useWorkspace((s) => s.account.spaces.length);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const focusKind = focusKindOf(pathname);
  // Full screen on this kind of screen hides the sidebar without changing its own setting.
  const focused = useUi((s) => !!focusKind && s.focus[focusKind]);
  const sidebarOpen = useUi((s) => s.sidebarOpen && !(focusKind && s.focus[focusKind]));
  const mobileNavOpen = useUi((s) => s.mobileNavOpen);
  const isMobile = useIsMobile();
  const bootstrapping = useRef(false);
  const navigate = useNavigate();
  // One key per screen: a document, a notebook or folder, or a section (tasks tabs share one).
  // Keyed by the resolved location (what <Outlet> renders): keying by the pending location
  // remounted the previous screen for a moment, e.g. re-running a document's open-tab effect.
  const resolvedPath = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).pathname });
  const segments = resolvedPath.split("/");
  const screenKey = ["doc", "notebook", "folder", "tag"].includes(segments[1] ?? "") ? resolvedPath : segments[1];

  useEffect(() => {
    if (!accountDocId || !userId) return;
    let cancelled = false;
    void (async () => {
      const fresh = await consumeFreshAccount(userId);
      if (cancelled) return;
      await startRuntime(accountDocId);
      if (fresh) useWorkspace.setState({ accountSynced: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [accountDocId, userId]);

  // A brand-new (or empty, after first full sync) account gets a default space and notebook.
  useEffect(() => {
    if (!ready || !synced || spaces > 0 || bootstrapping.current || !hasRuntime()) return;
    bootstrapping.current = true;
    void bootstrapAccount({
      space: t("app.defaultSpace"),
      notebook: t("app.defaultNotebook"),
      welcomeTitle: t("app.welcomeTitle"),
      welcomeBody: [t("app.welcomeBody1"), t("app.welcomeBody2")],
    });
  }, [ready, synced, spaces, t]);

  useEffect(() => {
    if (ready) void purgeOldTrash();
  }, [ready]);

  // D-48: the legacy account-wide active tab / daily notebook move to their space (once per space).
  const notes = useWorkspace((s) => s.notes);
  const settings = useWorkspace((s) => s.account.settings);
  useEffect(() => {
    if (ready && synced && hasRuntime()) migrateSpaceSettings();
  }, [ready, synced, notes, settings]);

  // Quiet tab tidy-up (spec/12 §12.6): at start and then hourly; never the document on screen.
  useEffect(() => {
    if (!ready || !synced || !hasRuntime()) return;
    const run = () => {
      const p = window.location.pathname;
      tidyTabs(p.startsWith("/doc/") ? p.slice(5) : null);
    };
    run();
    const timer = window.setInterval(run, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [ready, synced]);

  // Switching spaces swaps the screen too: the space's own last tab, or its documents (D-48).
  const activeSpaceId = useWorkspace((s) => s.activeSpaceId);
  const shownSpace = useRef(activeSpaceId);
  useEffect(() => {
    const prev = shownSpace.current;
    shownSpace.current = activeSpaceId;
    // Only a real switch (not the first choice of a space on this device) moves the screen.
    if (!ready || !prev || !activeSpaceId || prev === activeSpaceId) return;
    const st = useWorkspace.getState();
    const [, kind, id] = pathname.split("/");
    const shownIn =
      kind === "doc" && id
        ? spaceOfNote(st, id)
        : kind === "notebook" && id
          ? spaceOfNotebook(st, id)
          : kind === "folder" && id
            ? spaceOfNotebook(st, st.folders[id]?.notebookId)
            : activeSpaceId;
    // Unknown yet (its notebook index has not arrived): leave the screen as it is.
    if (shownIn === null || shownIn === activeSpaceId) return;
    const tab = activeTabOf(activeSpaceId);
    void navigate(tab ? { to: "/doc/$noteId", params: { noteId: tab } } : { to: "/all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId, ready]);

  // The signup screen runs before the account doc syncs: carry its recovery-key note over.
  useEffect(() => {
    if (ready && synced) void syncRecoveryFlag();
  }, [ready, synced]);

  useEffect(() => {
    useUi.setState({ mobileNavOpen: false });
  }, [pathname]);

  useShortcuts(navigate);

  if (!ready) return <Splash />;

  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      {isMobile ? (
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-[rgb(20_18_14/0.3)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => useUi.setState({ mobileNavOpen: false })}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] shadow-popover"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 420, damping: 40 }}
              >
                <Sidebar />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      ) : (
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 268 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 42 }}
          className={cn("relative shrink-0 overflow-hidden", sidebarOpen && "border-r border-line")}
          aria-hidden={!sidebarOpen}
          // A collapsed sidebar must not take keyboard focus either.
          inert={!sidebarOpen}
          data-testid="sidebar-panel"
          data-open={sidebarOpen}
        >
          <div className="h-full w-[268px]">
            <Sidebar onCollapse={toggleSidebar} />
          </div>
        </motion.aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Tabs of the current space above the screen; full screen hides them like the sidebar. */}
        {!isMobile && !(focusKind && focused) && <TabStrip />}
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/* A short fade when the screen changes (tabs inside a screen keep their own motion). */}
          <motion.div
            key={screenKey}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <CommandPalette />
      <TabOverview />
      <ShareDialog />
      <HistoryDialog />
      <CoverDialog />
      <NewNotebookDialog />
    </div>
  );
}
