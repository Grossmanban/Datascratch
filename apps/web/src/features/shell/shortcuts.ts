import type { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getOrCreateDaily, openTab } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { newNoteAndOpen } from "@/features/docs/menus";
import { toggleSidebar, useUi } from "@/hooks/useUi";
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
