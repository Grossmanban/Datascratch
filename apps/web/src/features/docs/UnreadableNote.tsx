import { LockKeyhole, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
import { useWorkspace, type WorkspaceState } from "@/domain/workspace";
import { useSyncStatus } from "@/sync/engine";

/**
 * The calm «some changes can't be read here yet» note of a notebook (items sealed with a key
 * nobody holds, skipped by sync; wording as on iOS). It can be dismissed; the dismissal is kept on
 * this device per notebook and holds until new unreadable items appear (another document, or more
 * items than when it was dismissed). The notebook's menu shows it again.
 */

type Seen = { docs: string[]; count: number };
const STORAGE_KEY = "ds.unreadableDismissed";

function load(): Record<string, Seen> {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Record<string, Seen>) : {};
  } catch {
    return {};
  }
}

const useDismissed = create<Record<string, Seen>>(() => load());

function save(next: Record<string, Seen>) {
  useDismissed.setState(next, true);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode: dismissed for this tab only
  }
}

/** Unreadable items per document, grouped by the notebook they belong to. */
function unreadableIn(notes: WorkspaceState["notes"], skipped: Record<string, number>, notebookId: string): Seen {
  const docs: string[] = [];
  let count = 0;
  for (const [docId, n] of Object.entries(skipped)) {
    const nb = notes[docId]?.notebookId ?? (docId === notebookId ? notebookId : null);
    if (nb !== notebookId) continue;
    docs.push(docId);
    count += n;
  }
  return { docs: docs.sort(), count };
}

function isNew(cur: Seen, seen: Seen | undefined): boolean {
  if (!cur.docs.length) return false;
  if (!seen) return true;
  return cur.count > seen.count || cur.docs.some((d) => !seen.docs.includes(d));
}

export function useUnreadable(notebookId: string): { has: boolean; shown: boolean } {
  const skipped = useSyncStatus((s) => s.skipped);
  const seen = useDismissed((s) => s[notebookId]);
  const notes = useWorkspace((s) => s.notes);
  const cur = useMemo(() => unreadableIn(notes, skipped, notebookId), [notes, skipped, notebookId]);
  return { has: cur.docs.length > 0, shown: isNew(cur, seen) };
}

/** For the notebook's menu: whether there is something to show again, and how. */
export function unreadableMenuState(notebookId: string): { has: boolean; showAgain: () => void } {
  const cur = unreadableIn(useWorkspace.getState().notes, useSyncStatus.getState().skipped, notebookId);
  return {
    has: cur.docs.length > 0,
    showAgain: () => {
      const { [notebookId]: _, ...rest } = useDismissed.getState();
      void _;
      save(rest);
    },
  };
}

export function UnreadableNote({ notebookId }: { notebookId: string }) {
  const { t } = useTranslation();
  const { shown } = useUnreadable(notebookId);
  if (!shown) return null;
  const dismiss = () => {
    const cur = unreadableIn(useWorkspace.getState().notes, useSyncStatus.getState().skipped, notebookId);
    save({ ...useDismissed.getState(), [notebookId]: cur });
  };
  return (
    <div className="px-5 pb-6 sm:px-10">
      <div
        role="note"
        data-testid="unreadable-note"
        className="flex items-start gap-3 rounded-xl bg-[var(--ds-tint-yellow-bg)] px-4 py-3 ring-1 ring-[color-mix(in_srgb,var(--ds-tint-yellow-fg)_22%,transparent)]"
      >
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[var(--ds-tint-yellow-fg)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">{t("sync.unreadableTitle")}</p>
          <p className="text-[13px] text-ink-2">{t("sync.unreadableText")}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("common.close")}
          className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-ink-2 transition hover:bg-ink/10 hover:text-ink focus-visible:outline-2"
          data-testid="unreadable-dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
