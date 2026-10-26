import type { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getOrCreateDaily, openTab } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { closeDocTab, newNoteAndOpen } from "@/features/docs/menus";
import { focusKindOf, toggleFocus, toggleSidebar, useUi } from "@/hooks/useUi";
import { today } from "@/lib/dates";
import { toggleTheme } from "@/lib/theme";

export function useShortcuts(navigate: ReturnType<typeof useNavigate>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "k") {
        e.preventDefault();
        useUi.setState((s) => ({ paletteOpen: !s.paletteOpen }));
        return;
      }
      // ⌘⇧\ — the tab overview (spec/12 §12.6); the shifted key varies by layout, the code does not.
      if (mod && e.shiftKey && e.code === "Backslash") {
        e.preventDefault();
        useUi.setState((s) => ({ tabOverviewOpen: !s.tabOverviewOpen }));
        return;
      }
      if (mod && key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (e.altKey && (e.code === "KeyN" || key === "n") && !mod) {
        e.preventDefault();
        const st = useWorkspace.getState();
        const nb = st.account.notebooks.find((n) => n.spaceId === st.activeSpaceId);
        if (nb) void newNoteAndOpen(navigate, nb.id);
        return;
      }
      if (e.altKey && (e.code === "KeyT" || key === "t") && !mod) {
        e.preventDefault();
        void getOrCreateDaily(today()).then((id) => {
          openTab(id);
          void navigate({ to: "/doc/$noteId", params: { noteId: id } });
        });
        return;
      }
      if (mod && e.shiftKey && key === "l") {
        e.preventDefault();
        toggleTheme();
        return;
      }
      // ⌘⇧F: full screen for the document, calendar or tasks.
      if (mod && e.shiftKey && (key === "f" || e.code === "KeyF")) {
        const kind = focusKindOf(location.pathname);
        if (!kind) return;
        e.preventDefault();
        toggleFocus(kind);
        return;
      }
      // ⌥W: close the open document's tab (⌘W closes the browser tab).
      if (e.altKey && !mod && (e.code === "KeyW" || key === "w")) {
        const m = location.pathname.match(/^\/doc\/([^/]+)/);
        if (!m) return;
        e.preventDefault();
        closeDocTab(m[1]!, navigate);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
