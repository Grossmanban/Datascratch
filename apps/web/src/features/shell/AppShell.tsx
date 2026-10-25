import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { consumeFreshAccount, useAuth } from "@/auth/session";
import { hasRuntime, startRuntime } from "@/data/runtime";
import { bootstrapAccount, purgeOldTrash } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { ShareDialog } from "@/features/share/ShareDialog";
import { HistoryDialog } from "@/features/doc/HistoryDialog";
import { NewNotebookDialog } from "@/features/shell/NewNotebookDialog";
import { useIsMobile } from "@/hooks/useMedia";
import { toggleSidebar, useUi } from "@/hooks/useUi";
import { cn } from "@/ui";
import { Sidebar } from "./Sidebar";
import { Splash } from "./Splash";
import { useShortcuts } from "./shortcuts";

export function AppShell() {
  const { t } = useTranslation();
  const accountDocId = useAuth((s) => s.accountDocId);
  const userId = useAuth((s) => s.userId);
  const ready = useWorkspace((s) => s.ready);
  const synced = useWorkspace((s) => s.accountSynced);
  const spaces = useWorkspace((s) => s.account.spaces.length);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const mobileNavOpen = useUi((s) => s.mobileNavOpen);
  const isMobile = useIsMobile();
  const bootstrapping = useRef(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  // One key per screen: a document, a notebook or folder, or a section (tasks tabs share one).
  const segments = pathname.split("/");
  const screenKey = ["doc", "notebook", "folder", "tag"].includes(segments[1] ?? "") ? pathname : segments[1];

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
        >
          <div className="h-full w-[268px]">
            <Sidebar onCollapse={toggleSidebar} />
          </div>
        </motion.aside>
      )}
      <main className="relative flex min-w-0 flex-1 flex-col">
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
      <CommandPalette />
      <ShareDialog />
      <HistoryDialog />
      <NewNotebookDialog />
    </div>
  );
}
